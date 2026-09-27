/**
 * ============================================================================
 * TFC GROUP — FISH PROCUREMENT & WEIGHBRIDGE MODULE (Fish_Procurement.gs)
 * ============================================================================
 * Handles inward procurement vouchers, weighbridge double-weighing calculations
 * (Gross, Tare, Shrinkage -> Net), automatic fish lot creation, and seamless
 * seller ledger financial movement posting.
 * 
 * Safety Invariants:
 *  1. Double-Weighing: Gross > Tare >= 0, Shrinkage >= 0, Net > 0.
 *  2. Immutable Lot Binding: Every procurement creates a traceable FSH-LOT.
 *  3. Idempotent Ledger: Never duplicates financial ledger movements.
 *  4. Strict Decimal & Financial Precision: INR 2 decimals, Weight 3 decimals.
 * 
 * Target Runtime: Google Apps Script (V8 Engine)
 * ============================================================================
 */

const FishProcurement = (function () {
  const S = TFC_CONFIG.SHEETS;
  const P = TFC_CONFIG.ID_PREFIXES;
  const HEADER_COLOR = '#0d9488'; // TFC Fish Teal

  // Standard Header Schemas
  const SCHEMAS = Object.freeze({
    PROCUREMENT: [
      'Procurement ID',
      'Voucher Date',
      'Seller ID',
      'Seller Name',
      'Seller Type',
      'Mandi ID',
      'Mandi Name',
      'Species ID',
      'Species Name',
      'Grade ID',
      'Grade Code',
      'Vehicle ID',
      'Driver Name',
      'Gross Weight (Kg)',
      'Tare Weight (Kg)',
      'Shrinkage Deduction (Kg)',
      'Net Weight (Kg)',
      'Crate Count',
      'Rate/Kg (₹)',
      'Gross Total (₹)',
      'Deductions (₹)',
      'Net Payable (₹)',
      'Payment Status',
      'Amount Paid (₹)',
      'Balance Due (₹)',
      'Payment Mode',
      'Status',
      'Lot ID',
      'Weighbridge Operator',
      'Notes',
      'Created At',
      'Updated At'
    ],
    PROCUREMENT_ITEMS: [
      'Item ID',
      'Procurement ID',
      'Species ID',
      'Species Name',
      'Grade ID',
      'Grade Code',
      'Gross Weight (Kg)',
      'Tare Weight (Kg)',
      'Shrinkage (Kg)',
      'Net Weight (Kg)',
      'Rate/Kg (₹)',
      'Total Amount (₹)',
      'Lot ID',
      'Status'
    ],
    LOTS: [
      'Lot ID',
      'Procurement ID',
      'Species ID',
      'Species Name',
      'Grade ID',
      'Grade Code',
      'Initial Qty (Kg)',
      'Available Qty (Kg)',
      'Allocated Qty (Kg)',
      'Cost Rate/Kg (₹)',
      'Total Cost (₹)',
      'Source Mandi',
      'Origin Seller ID',
      'Inward Date',
      'Status',
      'Notes',
      'Created At',
      'Updated At'
    ]
  });

  // --------------------------------------------------------------------------
  // 1. CREATE INWARD PROCUREMENT VOUCHER
  // --------------------------------------------------------------------------

  function createProcurementVoucher(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.PROCURE_CREATE);
    
    // Required base fields
    const req = CoreValidation.validateRequiredFields(data, ['sellerId', 'speciesId', 'grossWeightKg', 'tareWeightKg', 'ratePerKg']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const sellerId = CoreUtils.sanitizeString(data.sellerId, 50);
    const speciesId = CoreUtils.sanitizeString(data.speciesId, 50);
    const gradeId = CoreUtils.sanitizeString(data.gradeId || 'ALL', 50);
    const mandiId = CoreUtils.sanitizeString(data.mandiId || 'GLOBAL', 50);
    const vehicleId = CoreUtils.sanitizeString(data.vehicleId || '', 50);
    const driverName = CoreUtils.sanitizeString(data.driverName || '', 100);
    const crateCount = Math.max(0, parseInt(CoreUtils.parseStrictNumber(data.crateCount, 'Crate Count', 0), 10));

    // Double-weighing weighbridge validation
    let grossWeight, tareWeight, shrinkageKg, netWeight;
    try {
      grossWeight = CoreUtils.parseStrictNumber(data.grossWeightKg, 'Gross Weight');
      tareWeight = CoreUtils.parseStrictNumber(data.tareWeightKg, 'Tare Weight');
      shrinkageKg = CoreUtils.parseStrictNumber(data.shrinkageDeductionKg || data.shrinkageKg, 'Shrinkage Deduction', 0);
      
      const weightVal = CoreValidation.validateWeightTriple(grossWeight, tareWeight, data.netWeightKg, {
        shrinkage: shrinkageKg,
        toleranceKg: 0.05
      });

      if (!weightVal.isValid) {
        return CoreUtils.createErrorResponse(weightVal.message, 'WEIGHT_VALIDATION_ERROR');
      }
      netWeight = weightVal.net !== undefined ? weightVal.net : weightVal.calculatedNet;
    } catch (e) {
      return CoreUtils.createErrorResponse(e.message, 'VALIDATION_ERROR');
    }

    // Rate & Total calculation
    let ratePerKg, deductions, amountPaid, grossTotal, netPayable, balanceDue;
    try {
      ratePerKg = CoreUtils.parseStrictNumber(data.ratePerKg, 'Rate Per Kg');
      if (ratePerKg <= 0) return CoreUtils.createErrorResponse('Rate per kg must be greater than zero.', 'VALIDATION_ERROR');

      deductions = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(data.deductions, 'Deductions', 0));
      if (deductions < 0) return CoreUtils.createErrorResponse('Deductions cannot be negative.', 'VALIDATION_ERROR');

      grossTotal = CoreUtils.roundCurrency(netWeight * ratePerKg);
      netPayable = CoreUtils.roundCurrency(grossTotal - deductions);
      if (netPayable < 0) return CoreUtils.createErrorResponse('Net payable cannot be negative. Deductions exceed gross amount.', 'VALIDATION_ERROR');

      amountPaid = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(data.amountPaid, 'Amount Paid', 0));
      if (amountPaid < 0) return CoreUtils.createErrorResponse('Amount paid cannot be negative.', 'VALIDATION_ERROR');

      balanceDue = CoreUtils.roundCurrency(netPayable - amountPaid);
    } catch (e) {
      return CoreUtils.createErrorResponse(e.message, 'VALIDATION_ERROR');
    }

    const paymentMode = data.paymentMode ? CoreUtils.sanitizeString(data.paymentMode, 50) : (amountPaid > 0 ? 'Cash' : 'Khata Credit');
    const paymentStatus = amountPaid >= netPayable && netPayable > 0 ? 'PAID' : (amountPaid > 0 ? 'PARTIAL' : 'UNPAID');
    const voucherDate = data.voucherDate ? CoreUtils.sanitizeString(data.voucherDate, 30) : CoreUtils.getNowFormatted('yyyy-MM-dd HH:mm:ss');
    const weighbridgeOperator = CoreUtils.sanitizeString(data.weighbridgeOperator || actor || 'Weighbridge Till #1', 100);
    const notes = CoreUtils.sanitizeString(data.notes || '', 500);

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      // 1. Resolve Seller Details
      const seller = FishMaster.getSellerById(sellerId);
      if (!seller) return CoreUtils.createErrorResponse(`Seller ID "${sellerId}" not found in Seller Directory.`, 'FK_ERROR');
      if (seller['Status'] === 'Inactive') return CoreUtils.createErrorResponse(`Seller "${seller['Seller Name']}" is Inactive. Inactive sellers cannot be selected for new procurements.`, 'INACTIVE_ERROR');

      const sellerName = seller['Seller Name'];
      const sellerType = seller['Seller Type'] || 'Wholesale';

      // 2. Resolve Species & Grade Names
      const species = FishMaster.getSpeciesById(speciesId);
      if (!species) return CoreUtils.createErrorResponse(`Species ID "${speciesId}" not found.`, 'FK_ERROR');
      if (species['Status'] === 'Inactive') return CoreUtils.createErrorResponse(`Species "${species['Common Name']}" is Inactive.`, 'INACTIVE_ERROR');

      const speciesName = species['Common Name'];
      let gradeCode = 'All Grades';
      if (gradeId && gradeId !== 'ALL') {
        const grades = FishMaster.getGradesBySpecies(speciesId, false);
        const matchGrd = grades.find(g => g['Grade ID'] === gradeId);
        if (matchGrd) gradeCode = matchGrd['Grade Code'];
      }

      // 3. Resolve Mandi Name
      let mandiName = 'Direct Harbor / Landing Center';
      if (mandiId && mandiId !== 'GLOBAL') {
        const mandi = FishMaster.getMandiById(mandiId);
        if (mandi) mandiName = mandi['Mandi Name'];
      }

      // 4. Generate Unique Sequential IDs
      const voucherId = CoreUtils.generateId(P.FISH_PURCHASE, { includeDate: true, entropyLength: 4 });
      const lotId = CoreUtils.generateId(P.FISH_LOT, { includeDate: true, entropyLength: 4 });
      const nowIso = CoreUtils.getNowIso();

      // 5. Append Procurement Voucher Row
      const procRow = [
        voucherId, voucherDate, sellerId, sellerName, sellerType,
        mandiId, mandiName, speciesId, speciesName, gradeId, gradeCode,
        vehicleId, driverName, grossWeight, tareWeight, shrinkageKg, netWeight,
        crateCount, ratePerKg, grossTotal, deductions, netPayable,
        paymentStatus, amountPaid, balanceDue, paymentMode,
        TFC_CONFIG.LIFECYCLE_STATUS.PROCUREMENT.LOT_CREATED,
        lotId, weighbridgeOperator, notes, nowIso, nowIso
      ];
      CoreData.appendRowSafe(ss, S.FISH_PROCUREMENT, procRow, SCHEMAS.PROCUREMENT);

      // 6. Append Fish Lot Row (Automatic Lot Creation for Phase 4-5 Tracking)
      const lotRow = [
        lotId, voucherId, speciesId, speciesName, gradeId, gradeCode,
        netWeight, netWeight, 0, ratePerKg, grossTotal,
        mandiName, sellerId, voucherDate,
        TFC_CONFIG.LIFECYCLE_STATUS.LOT.ACTIVE,
        `Created from Inward Voucher ${voucherId}`, nowIso, nowIso
      ];
      CoreData.appendRowSafe(ss, S.FISH_LOTS, lotRow, SCHEMAS.LOTS);

      // 7. Idempotently Post Financial Movement to Seller Ledger
      FishMaster.postSellerLedgerEntryInternal(ss, {
        sellerId: sellerId,
        entryDate: voucherDate,
        voucherType: 'PROCUREMENT',
        voucherRefNo: voucherId,
        quantityKg: netWeight,
        ratePerKg: ratePerKg,
        grossAmount: grossTotal,
        deductions: deductions,
        netAmount: netPayable,
        paymentAmount: amountPaid,
        paymentStatus: paymentStatus,
        notes: `Procurement inward: ${speciesName} (${netWeight} Kg @ ₹${ratePerKg}/Kg)`,
        idempotencyKey: `PROCURE_${voucherId}`
      }, actor);

      // 8. Audit Log
      CoreAudit.log({
        action: TFC_CONFIG.ACTIONS.PROCURE_CREATE,
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'PROCUREMENT',
        entityId: voucherId,
        actor: actor,
        details: {
          sellerId, sellerName, speciesName, netWeight, ratePerKg, grossTotal, netPayable, lotId
        }
      });

      // 9. Fetch Updated Seller Summary
      const updatedSellerSummary = FishMaster.getSellerFinancialSummary(sellerId);

      const voucherResult = {
        voucherId,
        voucherDate,
        sellerId,
        sellerName,
        sellerType,
        speciesName,
        gradeCode,
        grossWeight,
        tareWeight,
        shrinkageKg,
        netWeight,
        ratePerKg,
        grossTotal,
        deductions,
        netPayable,
        amountPaid,
        balanceDue,
        paymentStatus,
        paymentMode,
        lotId,
        status: TFC_CONFIG.LIFECYCLE_STATUS.PROCUREMENT.LOT_CREATED,
        sellerSummary: updatedSellerSummary
      };

      return CoreUtils.createSuccessResponse(voucherResult, `Procurement Voucher ${voucherId} created with Lot ${lotId}.`);
    });
  }

  // --------------------------------------------------------------------------
  // 2. RETRIEVAL & LISTING
  // --------------------------------------------------------------------------

  function getProcurementVoucher(voucherId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return null;
    return CoreData.findRowById(ss, S.FISH_PROCUREMENT, 'Procurement ID', voucherId);
  }

  function listProcurements(filters) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    let rows = CoreData.readAllRowsAsObjects(ss, S.FISH_PROCUREMENT);

    if (filters) {
      if (filters.sellerId) rows = rows.filter(r => r['Seller ID'] === filters.sellerId);
      if (filters.speciesId) rows = rows.filter(r => r['Species ID'] === filters.speciesId);
      if (filters.status) rows = rows.filter(r => r['Status'] === filters.status);
      if (filters.paymentStatus) rows = rows.filter(r => r['Payment Status'] === filters.paymentStatus);
      if (filters.dateFrom) {
        const fromTime = new Date(filters.dateFrom).getTime();
        rows = rows.filter(r => new Date(r['Voucher Date']).getTime() >= fromTime);
      }
      if (filters.dateTo) {
        const toTime = new Date(filters.dateTo).getTime();
        rows = rows.filter(r => new Date(r['Voucher Date']).getTime() <= toTime);
      }
    }

    rows.reverse();
    const limit = (filters && filters.limit > 0) ? filters.limit : 200;
    return rows.slice(0, limit);
  }

  function getProcurementLots(procurementId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    return CoreData.findRowsByColumn(ss, S.FISH_LOTS, 'Procurement ID', procurementId);
  }

  function getAllActiveLots() {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const lots = CoreData.readAllRowsAsObjects(ss, S.FISH_LOTS);
    return lots.filter(l => l['Status'] === TFC_CONFIG.LIFECYCLE_STATUS.LOT.ACTIVE);
  }

  // --------------------------------------------------------------------------
  // 3. CANCEL PROCUREMENT VOUCHER
  // --------------------------------------------------------------------------

  function cancelProcurementVoucher(voucherId, reason, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.PROCURE_CANCEL);
    if (!voucherId) return CoreUtils.createErrorResponse('Procurement Voucher ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const voucher = CoreData.findRowById(ss, S.FISH_PROCUREMENT, 'Procurement ID', voucherId);
      if (!voucher) return CoreUtils.createErrorResponse(`Voucher "${voucherId}" not found.`, 'NOT_FOUND');

      if (voucher['Status'] === TFC_CONFIG.LIFECYCLE_STATUS.PROCUREMENT.CANCELLED) {
        return CoreUtils.createErrorResponse(`Voucher "${voucherId}" is already cancelled.`, 'STATE_ERROR');
      }

      // Check Lot availability: Cannot cancel if lot has already been distributed or dispatched in shipment
      const lotId = voucher['Lot ID'];
      if (lotId) {
        const lot = CoreData.findRowById(ss, S.FISH_LOTS, 'Lot ID', lotId);
        if (lot && CoreUtils.parseStrictNumber(lot['Allocated Qty (Kg)'], 'Allocated Qty', 0) > 0) {
          return CoreUtils.createErrorResponse(`Cannot cancel voucher "${voucherId}". Linked Lot "${lotId}" has already been partially allocated/dispatched.`, 'LOT_ALLOCATED_ERROR');
        }
        if (lot) {
          CoreData.updateRowById(ss, S.FISH_LOTS, 'Lot ID', lotId, {
            'Status': TFC_CONFIG.LIFECYCLE_STATUS.LOT.CLOSED,
            'Notes': `Closed due to cancellation of voucher ${voucherId}: ${reason || 'Cancelled'}`
          });
        }
      }

      // Update voucher status
      CoreData.updateRowById(ss, S.FISH_PROCUREMENT, 'Procurement ID', voucherId, {
        'Status': TFC_CONFIG.LIFECYCLE_STATUS.PROCUREMENT.CANCELLED,
        'Notes': `${voucher['Notes'] || ''} [CANCELLED: ${reason || 'User requested'}]`.trim(),
        'Updated At': CoreUtils.getNowIso()
      });

      // Post reverse ledger adjustment
      const sellerId = voucher['Seller ID'];
      const netPayable = CoreUtils.parseStrictNumber(voucher['Net Payable (₹)'], 'Net Payable', 0);
      const amountPaid = CoreUtils.parseStrictNumber(voucher['Amount Paid (₹)'], 'Amount Paid', 0);
      
      FishMaster.postSellerLedgerEntryInternal(ss, {
        sellerId: sellerId,
        entryDate: CoreUtils.getNowFormatted('yyyy-MM-dd HH:mm:ss'),
        voucherType: 'ADJUSTMENT',
        voucherRefNo: `CANCEL-${voucherId}`,
        quantityKg: 0,
        ratePerKg: 0,
        grossAmount: 0,
        deductions: 0,
        netAmount: -netPayable, // Deduct the payable amount
        paymentAmount: -amountPaid,
        notes: `Cancellation of Voucher ${voucherId}: ${reason || 'Voucher cancelled'}`,
        idempotencyKey: `CANCEL_${voucherId}`
      }, actor);

      CoreAudit.log({
        action: TFC_CONFIG.ACTIONS.PROCURE_CANCEL,
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'PROCUREMENT',
        entityId: voucherId,
        actor: actor,
        details: { reason, netPayable, lotId }
      });

      return CoreUtils.createSuccessResponse({ voucherId, status: 'CANCELLED' }, `Voucher ${voucherId} cancelled successfully.`);
    });
  }

  // Public API
  return {
    SCHEMAS: SCHEMAS,
    createProcurementVoucher: createProcurementVoucher,
    getProcurementVoucher: getProcurementVoucher,
    listProcurements: listProcurements,
    getProcurementLots: getProcurementLots,
    getAllActiveLots: getAllActiveLots,
    cancelProcurementVoucher: cancelProcurementVoucher
  };
})();

// Top-level Apps Script API Wrappers for client-side RPC (google.script.run)
function apiCreateFishProcurement(data) {
  return FishProcurement.createProcurementVoucher(data);
}

function apiGetFishProcurements(filters) {
  return FishProcurement.listProcurements(filters);
}

function apiGetProcurementById(voucherId) {
  return FishProcurement.getProcurementVoucher(voucherId);
}

function apiGetActiveLots() {
  return FishProcurement.getAllActiveLots();
}

function apiCancelFishProcurement(voucherId, reason) {
  return FishProcurement.cancelProcurementVoucher(voucherId, reason);
}
