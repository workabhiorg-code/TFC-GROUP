/**
 * ============================================================================
 * TFC GROUP — FISH MASTER DATA MODULE (Fish_Master.gs)
 * ============================================================================
 * Master Data Management for the flagship Fish Transport & Cold Logistics vertical:
 *  1. Fish Species (Catalog - Common/Local name primary, scientific name omitted)
 *  2. Fish Grades & Sizes
 *  3. Historical Rate Registry (Deterministic Rate Engine)
 *  4. Suppliers & Coastal Harbors
 *  5. Mandis & Wholesale Auctions
 *  6. Sellers (Wholesale & Retail with previous transaction history & opening balances)
 *  7. Seller Ledger Integration (Opening balance & live financial ledger)
 *  8. Transport Fleet Vehicles (Refrigerated & Insulated Trucks)
 *  9. Transport Drivers
 * 10. Destination Markets & Distribution Hubs
 * 
 * Target Runtime: Google Apps Script (V8 Engine)
 * ============================================================================
 */

const FishMaster = (function () {
  const S = TFC_CONFIG.SHEETS;
  const P = TFC_CONFIG.ID_PREFIXES;
  const HEADER_COLOR = '#0d9488'; // TFC Fish Teal

  // Standard Header Schemas
  const SCHEMAS = Object.freeze({
    SPECIES: ['Species ID', 'Common Name', 'Local Name', 'Scientific Name', 'Default Unit', 'Status', 'Notes'],
    GRADES: ['Grade ID', 'Species ID', 'Grade Code', 'Size / Quality Description', 'Status'],
    RATES: ['Rate ID', 'Species ID', 'Grade ID', 'Market / Mandi Scope', 'Rate Type', 'Rate/Kg (₹)', 'Effective From', 'Effective To', 'Source / Reference', 'Created By', 'Created At'],
    SUPPLIERS: ['Supplier ID', 'Supplier Name', 'Contact Person', 'Phone', 'Address / Location', 'Associated Mandi', 'Opening Balance (₹)', 'Status', 'Notes'],
    MANDIS: ['Mandi ID', 'Mandi Name', 'Location / Harbor', 'Contact Person', 'Phone', 'Commission Rate (%)', 'Status', 'Notes'],
    SELLERS: [
      'Seller ID',
      'Seller Type',
      'Seller Name',
      'Shop / Business Name',
      'Contact Person',
      'Phone',
      'Alternate Phone',
      'Address / Locality',
      'Village / Town',
      'District',
      'State',
      'GSTIN',
      'PAN',
      'Has Prior Procurement',
      'Prior Procurement Count',
      'Prior Procurement Qty (Kg)',
      'Prior Procurement Value (₹)',
      'Last Procurement Date',
      'Last Procurement Ref',
      'History Remarks',
      'Opening Payable (₹)',
      'Opening Receivable (₹)',
      'Opening Balance Date',
      'Opening Balance Notes',
      'Balance Verification Status',
      'Verified By',
      'Verification Date',
      'Credit Limit (₹)',
      'Credit Period (Days)',
      'Status',
      'Notes'
    ],
    SELLER_LEDGER: [
      'Entry ID',
      'Seller ID',
      'Entry Date',
      'Voucher Type',
      'Voucher Ref No',
      'Quantity (Kg)',
      'Rate/Kg (₹)',
      'Gross Amount (₹)',
      'Deductions (₹)',
      'Net Amount (₹)',
      'Payment Amount (₹)',
      'Outstanding Balance (₹)',
      'Payment Status',
      'Idempotency Key',
      'Notes',
      'Created By',
      'Created At'
    ],
    VEHICLES: ['Vehicle ID', 'Registration No', 'Vehicle Type', 'Capacity (Kg)', 'Ownership Type', 'Status', 'Notes'],
    DRIVERS: ['Driver ID', 'Driver Name', 'Phone', 'License No', 'License Expiry', 'Status', 'Notes'],
    DESTINATIONS: ['Destination ID', 'Market Name', 'City / Area', 'Delivery Notes / Address', 'Status']
  });

  // --------------------------------------------------------------------------
  // 1. FISH SPECIES OPERATIONS (SCIENTIFIC NAME REMOVED FROM UI / VALIDATION)
  // --------------------------------------------------------------------------

  function createSpecies(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_CREATE);
    const req = CoreValidation.validateRequiredFields(data, ['commonName']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const commonName = CoreUtils.sanitizeString(data.commonName, 100);
    const localName = CoreUtils.sanitizeString(data.localName || '', 100);
    // Scientific name is omitted from required fields; stored as empty string or passthrough for backward compatibility
    const scientificName = CoreUtils.sanitizeString(data.scientificName || '', 150);
    const defaultUnit = (data.defaultUnit || 'Kg').trim();
    const notes = CoreUtils.sanitizeString(data.notes || '', 500);
    const status = data.status === 'Inactive' ? 'Inactive' : 'Active';

    const speciesId = data.speciesId 
      ? CoreUtils.normalizeCode(data.speciesId) 
      : CoreUtils.generateId(P.FISH_SPECIES, { includeDate: false, entropyLength: 5 });

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      // Check duplicate ID or Name
      const existing = CoreData.readAllRowsAsObjects(ss, S.FISH_SPECIES);
      if (existing.some(r => r['Species ID'] === speciesId || (r['Common Name'] && r['Common Name'].toLowerCase() === commonName.toLowerCase()))) {
        return CoreUtils.createErrorResponse(`Species with ID "${speciesId}" or Name "${commonName}" already exists.`, 'DUPLICATE_ERROR');
      }

      const row = [speciesId, commonName, localName, scientificName, defaultUnit, status, notes];
      CoreData.appendRowSafe(ss, S.FISH_SPECIES, row, SCHEMAS.SPECIES);

      CoreAudit.log({
        action: 'SPECIES_CREATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'SPECIES',
        entityId: speciesId,
        actor: actor,
        details: { commonName, localName, defaultUnit, status }
      });

      return CoreUtils.createSuccessResponse({ speciesId, commonName, localName, defaultUnit, status }, 'Species created successfully.');
    });
  }

  function updateSpecies(speciesId, updateData, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_EDIT);
    if (!speciesId) return CoreUtils.createErrorResponse('Species ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.findRowById(ss, S.FISH_SPECIES, 'Species ID', speciesId);
      if (!existing) return CoreUtils.createErrorResponse(`Species "${speciesId}" not found.`, 'NOT_FOUND');

      const fieldsToUpdate = {};
      if (updateData.commonName) fieldsToUpdate['Common Name'] = CoreUtils.sanitizeString(updateData.commonName, 100);
      if (updateData.localName !== undefined) fieldsToUpdate['Local Name'] = CoreUtils.sanitizeString(updateData.localName, 100);
      if (updateData.scientificName !== undefined) fieldsToUpdate['Scientific Name'] = CoreUtils.sanitizeString(updateData.scientificName, 150);
      if (updateData.defaultUnit) fieldsToUpdate['Default Unit'] = updateData.defaultUnit.trim();
      if (updateData.notes !== undefined) fieldsToUpdate['Notes'] = CoreUtils.sanitizeString(updateData.notes, 500);
      if (updateData.status) fieldsToUpdate['Status'] = updateData.status === 'Inactive' ? 'Inactive' : 'Active';

      CoreData.updateRowById(ss, S.FISH_SPECIES, 'Species ID', speciesId, fieldsToUpdate);

      CoreAudit.log({
        action: 'SPECIES_UPDATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'SPECIES',
        entityId: speciesId,
        actor: actor,
        details: fieldsToUpdate
      });

      return CoreUtils.createSuccessResponse({ speciesId, updatedFields: fieldsToUpdate }, 'Species updated successfully.');
    });
  }

  function setSpeciesStatus(speciesId, newStatus, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_DEACTIVATE);
    const targetStatus = newStatus === 'Inactive' ? 'Inactive' : 'Active';
    return updateSpecies(speciesId, { status: targetStatus }, actor);
  }

  function getAllSpecies(includeInactive) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const all = CoreData.readAllRowsAsObjects(ss, S.FISH_SPECIES);
    return includeInactive ? all : all.filter(r => r['Status'] !== 'Inactive');
  }

  function getSpeciesById(speciesId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return null;
    return CoreData.findRowById(ss, S.FISH_SPECIES, 'Species ID', speciesId);
  }

  // --------------------------------------------------------------------------
  // 2. FISH GRADES OPERATIONS
  // --------------------------------------------------------------------------

  function createGrade(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_CREATE);
    const req = CoreValidation.validateRequiredFields(data, ['gradeCode', 'speciesId']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const gradeCode = CoreUtils.sanitizeString(data.gradeCode, 50);
    const speciesId = CoreUtils.sanitizeString(data.speciesId, 50);
    const description = CoreUtils.sanitizeString(data.description || '', 200);
    const status = data.status === 'Inactive' ? 'Inactive' : 'Active';

    const gradeId = data.gradeId 
      ? CoreUtils.normalizeCode(data.gradeId)
      : CoreUtils.generateId(P.FISH_GRADE, { includeDate: false, entropyLength: 5 });

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      if (speciesId !== 'ALL') {
        const species = CoreData.findRowById(ss, S.FISH_SPECIES, 'Species ID', speciesId);
        if (!species) return CoreUtils.createErrorResponse(`Referenced Species "${speciesId}" does not exist.`, 'FK_ERROR');
      }

      const existing = CoreData.readAllRowsAsObjects(ss, S.FISH_GRADES);
      if (existing.some(r => r['Grade ID'] === gradeId)) {
        return CoreUtils.createErrorResponse(`Grade with ID "${gradeId}" already exists.`, 'DUPLICATE_ERROR');
      }

      const row = [gradeId, speciesId, gradeCode, description, status];
      CoreData.appendRowSafe(ss, S.FISH_GRADES, row, SCHEMAS.GRADES);

      CoreAudit.log({
        action: 'GRADE_CREATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'GRADE',
        entityId: gradeId,
        actor: actor,
        details: { gradeCode, speciesId, status }
      });

      return CoreUtils.createSuccessResponse({ gradeId, gradeCode, speciesId, status }, 'Grade created successfully.');
    });
  }

  function updateGrade(gradeId, updateData, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_EDIT);
    if (!gradeId) return CoreUtils.createErrorResponse('Grade ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.findRowById(ss, S.FISH_GRADES, 'Grade ID', gradeId);
      if (!existing) return CoreUtils.createErrorResponse(`Grade "${gradeId}" not found.`, 'NOT_FOUND');

      const fieldsToUpdate = {};
      if (updateData.gradeCode) fieldsToUpdate['Grade Code'] = CoreUtils.sanitizeString(updateData.gradeCode, 50);
      if (updateData.description !== undefined) fieldsToUpdate['Size / Quality Description'] = CoreUtils.sanitizeString(updateData.description, 200);
      if (updateData.speciesId) fieldsToUpdate['Species ID'] = CoreUtils.sanitizeString(updateData.speciesId, 50);
      if (updateData.status) fieldsToUpdate['Status'] = updateData.status === 'Inactive' ? 'Inactive' : 'Active';

      CoreData.updateRowById(ss, S.FISH_GRADES, 'Grade ID', gradeId, fieldsToUpdate);

      CoreAudit.log({
        action: 'GRADE_UPDATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'GRADE',
        entityId: gradeId,
        actor: actor,
        details: fieldsToUpdate
      });

      return CoreUtils.createSuccessResponse({ gradeId, updatedFields: fieldsToUpdate }, 'Grade updated successfully.');
    });
  }

  function setGradeStatus(gradeId, newStatus, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_DEACTIVATE);
    return updateGrade(gradeId, { status: newStatus === 'Inactive' ? 'Inactive' : 'Active' }, actor);
  }

  function getAllGrades(includeInactive) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const all = CoreData.readAllRowsAsObjects(ss, S.FISH_GRADES);
    return includeInactive ? all : all.filter(r => r['Status'] !== 'Inactive');
  }

  function getGradesBySpecies(speciesId, includeInactive) {
    const all = getAllGrades(includeInactive);
    return all.filter(g => g['Species ID'] === speciesId || g['Species ID'] === 'ALL');
  }

  // --------------------------------------------------------------------------
  // 3. HISTORICAL MARKET RATES & DETERMINISTIC RATE ENGINE
  // --------------------------------------------------------------------------

  function recordRate(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_CREATE);
    const req = CoreValidation.validateRequiredFields(data, ['speciesId', 'ratePerKg']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const speciesId = CoreUtils.sanitizeString(data.speciesId, 50);
    const gradeId = CoreUtils.sanitizeString(data.gradeId || 'ALL', 50);
    const mandiScope = CoreUtils.sanitizeString(data.mandiScope || 'GLOBAL', 100);
    const rateType = (data.rateType || 'PURCHASE').toString().trim().toUpperCase();
    
    let ratePerKg;
    try {
      ratePerKg = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(data.ratePerKg, 'Rate Per Kg'));
      if (ratePerKg <= 0) return CoreUtils.createErrorResponse('Rate per kg must be greater than 0.', 'VALIDATION_ERROR');
    } catch (e) {
      return CoreUtils.createErrorResponse(e.message, 'VALIDATION_ERROR');
    }

    const effectiveFrom = data.effectiveFrom ? CoreUtils.sanitizeString(data.effectiveFrom, 30) : CoreUtils.getNowFormatted('yyyy-MM-dd HH:mm:ss');
    const effectiveTo = data.effectiveTo ? CoreUtils.sanitizeString(data.effectiveTo, 30) : '';
    const source = CoreUtils.sanitizeString(data.source || 'Market Auction Circular', 200);
    const createdBy = actor || 'System';
    const createdAt = CoreUtils.getNowIso();

    const rateId = CoreUtils.generateId(P.FISH_RATE, { includeDate: true, entropyLength: 4 });

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const row = [rateId, speciesId, gradeId, mandiScope, rateType, ratePerKg, effectiveFrom, effectiveTo, source, createdBy, createdAt];
      CoreData.appendRowSafe(ss, S.FISH_RATES, row, SCHEMAS.RATES);

      CoreAudit.log({
        action: 'RATE_RECORD',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'RATE',
        entityId: rateId,
        actor: actor,
        details: { speciesId, gradeId, mandiScope, rateType, ratePerKg, effectiveFrom }
      });

      return CoreUtils.createSuccessResponse({
        rateId, speciesId, gradeId, mandiScope, rateType, ratePerKg, effectiveFrom
      }, 'Market rate entry recorded successfully.');
    });
  }

  function getEffectiveRate(speciesId, gradeId, mandiScope, rateType, asOfDate) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return null;

    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    const targetType = (rateType || 'PURCHASE').toString().trim().toUpperCase();
    const targetSpecies = String(speciesId || '').trim();
    const targetGrade = String(gradeId || 'ALL').trim();
    const targetMandi = String(mandiScope || 'GLOBAL').trim();

    const allRates = CoreData.readAllRowsAsObjects(ss, S.FISH_RATES);
    const candidates = allRates.filter(r => {
      if (r['Species ID'] !== targetSpecies) return false;
      if (r['Rate Type'] !== targetType) return false;

      const fromDate = new Date(r['Effective From']);
      if (isNaN(fromDate.getTime()) || fromDate > targetDate) return false;

      if (r['Effective To'] && r['Effective To'] !== '') {
        const toDate = new Date(r['Effective To']);
        if (!isNaN(toDate.getTime()) && toDate < targetDate) return false;
      }

      return true;
    });

    if (candidates.length === 0) return null;

    // Specificity score
    candidates.forEach(c => {
      let score = 0;
      if (c['Grade ID'] === targetGrade && targetGrade !== 'ALL') score += 10;
      if (c['Market / Mandi Scope'] === targetMandi && targetMandi !== 'GLOBAL') score += 5;
      c._score = score;
      c._fromTime = new Date(c['Effective From']).getTime();
    });

    candidates.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      return b._fromTime - a._fromTime;
    });

    return candidates[0];
  }

  function getRateHistory(speciesId, gradeId, rateType, limit) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    let all = CoreData.readAllRowsAsObjects(ss, S.FISH_RATES);

    if (speciesId) all = all.filter(r => r['Species ID'] === speciesId);
    if (gradeId && gradeId !== 'ALL') all = all.filter(r => r['Grade ID'] === gradeId || r['Grade ID'] === 'ALL');
    if (rateType) all = all.filter(r => r['Rate Type'] === rateType.toUpperCase());

    all.reverse();
    const max = limit && limit > 0 ? limit : 100;
    return all.slice(0, max);
  }

  // --------------------------------------------------------------------------
  // 4. SUPPLIERS OPERATIONS
  // --------------------------------------------------------------------------

  function createSupplier(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_CREATE);
    const req = CoreValidation.validateRequiredFields(data, ['supplierName', 'phone']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const supplierName = CoreUtils.sanitizeString(data.supplierName, 150);
    const contactPerson = CoreUtils.sanitizeString(data.contactPerson || '', 100);
    const phone = CoreUtils.sanitizeString(data.phone, 30);
    const address = CoreUtils.sanitizeString(data.address || '', 250);
    const associatedMandi = CoreUtils.sanitizeString(data.associatedMandi || '', 100);
    const openingBal = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(data.openingBalance, 'Opening Balance', 0));
    const status = data.status === 'Inactive' ? 'Inactive' : 'Active';
    const notes = CoreUtils.sanitizeString(data.notes || '', 500);

    const supplierId = data.supplierId 
      ? CoreUtils.normalizeCode(data.supplierId)
      : CoreUtils.generateId(P.FISH_SUPPLIER, { includeDate: false, entropyLength: 5 });

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.readAllRowsAsObjects(ss, S.FISH_SUPPLIERS);
      if (existing.some(r => r['Supplier ID'] === supplierId)) {
        return CoreUtils.createErrorResponse(`Supplier ID "${supplierId}" already exists.`, 'DUPLICATE_ERROR');
      }

      const row = [supplierId, supplierName, contactPerson, phone, address, associatedMandi, openingBal, status, notes];
      CoreData.appendRowSafe(ss, S.FISH_SUPPLIERS, row, SCHEMAS.SUPPLIERS);

      CoreAudit.log({
        action: 'SUPPLIER_CREATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'SUPPLIER',
        entityId: supplierId,
        actor: actor,
        details: { supplierName, phone, associatedMandi, openingBal }
      });

      return CoreUtils.createSuccessResponse({ supplierId, supplierName, status }, 'Supplier registered successfully.');
    });
  }

  function updateSupplier(supplierId, updateData, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_EDIT);
    if (!supplierId) return CoreUtils.createErrorResponse('Supplier ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.findRowById(ss, S.FISH_SUPPLIERS, 'Supplier ID', supplierId);
      if (!existing) return CoreUtils.createErrorResponse(`Supplier "${supplierId}" not found.`, 'NOT_FOUND');

      const fieldsToUpdate = {};
      if (updateData.supplierName) fieldsToUpdate['Supplier Name'] = CoreUtils.sanitizeString(updateData.supplierName, 150);
      if (updateData.contactPerson !== undefined) fieldsToUpdate['Contact Person'] = CoreUtils.sanitizeString(updateData.contactPerson, 100);
      if (updateData.phone) fieldsToUpdate['Phone'] = CoreUtils.sanitizeString(updateData.phone, 30);
      if (updateData.address !== undefined) fieldsToUpdate['Address / Location'] = CoreUtils.sanitizeString(updateData.address, 250);
      if (updateData.associatedMandi !== undefined) fieldsToUpdate['Associated Mandi'] = CoreUtils.sanitizeString(updateData.associatedMandi, 100);
      if (updateData.notes !== undefined) fieldsToUpdate['Notes'] = CoreUtils.sanitizeString(updateData.notes, 500);
      if (updateData.status) fieldsToUpdate['Status'] = updateData.status === 'Inactive' ? 'Inactive' : 'Active';

      CoreData.updateRowById(ss, S.FISH_SUPPLIERS, 'Supplier ID', supplierId, fieldsToUpdate);

      CoreAudit.log({
        action: 'SUPPLIER_UPDATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'SUPPLIER',
        entityId: supplierId,
        actor: actor,
        details: fieldsToUpdate
      });

      return CoreUtils.createSuccessResponse({ supplierId, updatedFields: fieldsToUpdate }, 'Supplier updated successfully.');
    });
  }

  function getAllSuppliers(includeInactive) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const all = CoreData.readAllRowsAsObjects(ss, S.FISH_SUPPLIERS);
    return includeInactive ? all : all.filter(r => r['Status'] !== 'Inactive');
  }

  function getSupplierById(supplierId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return null;
    return CoreData.findRowById(ss, S.FISH_SUPPLIERS, 'Supplier ID', supplierId);
  }

  // --------------------------------------------------------------------------
  // 5. MANDIS & AUCTION HARBORS
  // --------------------------------------------------------------------------

  function createMandi(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_CREATE);
    const req = CoreValidation.validateRequiredFields(data, ['mandiName', 'location']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const mandiName = CoreUtils.sanitizeString(data.mandiName, 150);
    const location = CoreUtils.sanitizeString(data.location, 150);
    const contactPerson = CoreUtils.sanitizeString(data.contactPerson || '', 100);
    const phone = CoreUtils.sanitizeString(data.phone || '', 30);
    const commissionRate = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(data.commissionRate, 'Commission Rate', 0));
    const status = data.status === 'Inactive' ? 'Inactive' : 'Active';
    const notes = CoreUtils.sanitizeString(data.notes || '', 500);

    const mandiId = data.mandiId 
      ? CoreUtils.normalizeCode(data.mandiId)
      : CoreUtils.generateId(P.FISH_MANDI, { includeDate: false, entropyLength: 5 });

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.readAllRowsAsObjects(ss, S.FISH_MANDIS);
      if (existing.some(r => r['Mandi ID'] === mandiId || (r['Mandi Name'] && r['Mandi Name'].toLowerCase() === mandiName.toLowerCase()))) {
        return CoreUtils.createErrorResponse(`Mandi with ID "${mandiId}" or Name "${mandiName}" already exists.`, 'DUPLICATE_ERROR');
      }

      const row = [mandiId, mandiName, location, contactPerson, phone, commissionRate, status, notes];
      CoreData.appendRowSafe(ss, S.FISH_MANDIS, row, SCHEMAS.MANDIS);

      CoreAudit.log({
        action: 'MANDI_CREATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'MANDI',
        entityId: mandiId,
        actor: actor,
        details: { mandiName, location, commissionRate }
      });

      return CoreUtils.createSuccessResponse({ mandiId, mandiName, status }, 'Mandi registered successfully.');
    });
  }

  function updateMandi(mandiId, updateData, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_EDIT);
    if (!mandiId) return CoreUtils.createErrorResponse('Mandi ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.findRowById(ss, S.FISH_MANDIS, 'Mandi ID', mandiId);
      if (!existing) return CoreUtils.createErrorResponse(`Mandi "${mandiId}" not found.`, 'NOT_FOUND');

      const fieldsToUpdate = {};
      if (updateData.mandiName) fieldsToUpdate['Mandi Name'] = CoreUtils.sanitizeString(updateData.mandiName, 150);
      if (updateData.location) fieldsToUpdate['Location / Harbor'] = CoreUtils.sanitizeString(updateData.location, 150);
      if (updateData.contactPerson !== undefined) fieldsToUpdate['Contact Person'] = CoreUtils.sanitizeString(updateData.contactPerson, 100);
      if (updateData.phone) fieldsToUpdate['Phone'] = CoreUtils.sanitizeString(updateData.phone, 30);
      if (updateData.commissionRate !== undefined) fieldsToUpdate['Commission Rate (%)'] = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(updateData.commissionRate, 'Commission Rate', 0));
      if (updateData.notes !== undefined) fieldsToUpdate['Notes'] = CoreUtils.sanitizeString(updateData.notes, 500);
      if (updateData.status) fieldsToUpdate['Status'] = updateData.status === 'Inactive' ? 'Inactive' : 'Active';

      CoreData.updateRowById(ss, S.FISH_MANDIS, 'Mandi ID', mandiId, fieldsToUpdate);

      CoreAudit.log({
        action: 'MANDI_UPDATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'MANDI',
        entityId: mandiId,
        actor: actor,
        details: fieldsToUpdate
      });

      return CoreUtils.createSuccessResponse({ mandiId, updatedFields: fieldsToUpdate }, 'Mandi updated successfully.');
    });
  }

  function getAllMandis(includeInactive) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const all = CoreData.readAllRowsAsObjects(ss, S.FISH_MANDIS);
    return includeInactive ? all : all.filter(r => r['Status'] !== 'Inactive');
  }

  function getMandiById(mandiId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return null;
    return CoreData.findRowById(ss, S.FISH_MANDIS, 'Mandi ID', mandiId);
  }

  // --------------------------------------------------------------------------
  // 6. ENHANCED SELLERS OPERATIONS (WHOLESALE, RETAIL, HISTORY & OPENING BALANCES)
  // --------------------------------------------------------------------------

  function createSeller(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_CREATE);
    const req = CoreValidation.validateRequiredFields(data, ['sellerName', 'phone']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const sellerName = CoreUtils.sanitizeString(data.sellerName, 150);
    const sellerType = (data.sellerType === 'Retail') ? 'Retail' : 'Wholesale';
    const shopName = CoreUtils.sanitizeString(data.shopName || data.sellerName, 150);
    const contactPerson = CoreUtils.sanitizeString(data.contactPerson || '', 100);
    const phone = CoreUtils.sanitizeString(data.phone, 30);
    const altPhone = CoreUtils.sanitizeString(data.alternatePhone || data.altPhone || '', 30);
    const address = CoreUtils.sanitizeString(data.address || data.market || '', 200);
    const villageTown = CoreUtils.sanitizeString(data.villageTown || '', 100);
    const district = CoreUtils.sanitizeString(data.district || '', 100);
    const state = CoreUtils.sanitizeString(data.state || 'Odisha', 100);
    const gstin = CoreUtils.sanitizeString(data.gstin || '', 30);
    const pan = CoreUtils.sanitizeString(data.pan || '', 30);

    // Historical Procurement Tracking
    const hasPriorProc = (data.hasPriorProcurement === 'Yes' || data.hasPriorProcurement === true) ? 'Yes' : 'No';
    const priorCount = Math.max(0, parseInt(CoreUtils.parseStrictNumber(data.priorProcurementCount, 'Prior Count', 0), 10));
    const priorQtyKg = CoreUtils.roundWeight(CoreUtils.parseStrictNumber(data.priorProcurementQtyKg || data.priorQtyKg, 'Prior Qty', 0));
    const priorValue = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(data.priorProcurementValue || data.priorValue, 'Prior Value', 0));
    const lastProcDate = CoreUtils.sanitizeString(data.lastProcurementDate || '', 30);
    const lastProcRef = CoreUtils.sanitizeString(data.lastProcurementRef || '', 50);
    const historyRemarks = CoreUtils.sanitizeString(data.historyRemarks || '', 300);

    // Opening Financial Position (Strictly Separate Payable and Receivable >= 0)
    let openingPayable = 0;
    let openingReceivable = 0;
    try {
      openingPayable = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(data.openingPayableBalance || data.openingPayable, 'Opening Payable', 0));
      openingReceivable = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(data.openingReceivableBalance || data.openingReceivable, 'Opening Receivable', 0));
      if (openingPayable < 0 || openingReceivable < 0) {
        return CoreUtils.createErrorResponse('Opening balances must be non-negative.', 'VALIDATION_ERROR');
      }
    } catch (e) {
      return CoreUtils.createErrorResponse(e.message, 'VALIDATION_ERROR');
    }

    const openingDate = data.openingBalanceDate || CoreUtils.getNowFormatted('yyyy-MM-dd');
    const openingNotes = CoreUtils.sanitizeString(data.openingBalanceNotes || '', 300);
    const verificationStatus = (data.balanceVerificationStatus === 'Verified') ? 'Verified' : 'Unverified';
    const verifiedBy = (verificationStatus === 'Verified') ? (actor || 'System') : '';
    const verificationDate = (verificationStatus === 'Verified') ? CoreUtils.getNowFormatted('yyyy-MM-dd HH:mm:ss') : '';

    const creditLimit = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(data.creditLimit, 'Credit Limit', 0));
    const creditPeriod = Math.max(0, parseInt(CoreUtils.parseStrictNumber(data.creditPeriod, 'Credit Period', 0), 10));
    const status = data.status === 'Inactive' ? 'Inactive' : 'Active';
    const notes = CoreUtils.sanitizeString(data.notes || '', 500);

    const sellerId = data.sellerId 
      ? CoreUtils.normalizeCode(data.sellerId)
      : CoreUtils.generateId(P.FISH_SELLER, { includeDate: false, entropyLength: 5 });

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.readAllRowsAsObjects(ss, S.FISH_SELLERS);
      if (existing.some(r => r['Seller ID'] === sellerId)) {
        return CoreUtils.createErrorResponse(`Seller ID "${sellerId}" already exists.`, 'DUPLICATE_ERROR');
      }

      const row = [
        sellerId, sellerType, sellerName, shopName, contactPerson, phone, altPhone,
        address, villageTown, district, state, gstin, pan,
        hasPriorProc, priorCount, priorQtyKg, priorValue, lastProcDate, lastProcRef, historyRemarks,
        openingPayable, openingReceivable, openingDate, openingNotes,
        verificationStatus, verifiedBy, verificationDate,
        creditLimit, creditPeriod, status, notes
      ];

      CoreData.appendRowSafe(ss, S.FISH_SELLERS, row, SCHEMAS.SELLERS);

      // If opening balance > 0, post initial ledger record
      if (openingPayable > 0 || openingReceivable > 0) {
        const netOpening = openingPayable - openingReceivable; // Positive means org owes seller (Payable)
        postSellerLedgerEntryInternal(ss, {
          sellerId: sellerId,
          entryDate: openingDate,
          voucherType: 'OPENING_BALANCE',
          voucherRefNo: `OB-${sellerId}`,
          quantityKg: 0,
          ratePerKg: 0,
          grossAmount: 0,
          deductions: 0,
          netAmount: netOpening,
          paymentAmount: 0,
          notes: openingNotes || 'Initial opening balance',
          idempotencyKey: `OB-${sellerId}`
        }, actor);
      }

      CoreAudit.log({
        action: 'SELLER_CREATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'SELLER',
        entityId: sellerId,
        actor: actor,
        details: { sellerName, sellerType, phone, openingPayable, openingReceivable, verificationStatus }
      });

      return CoreUtils.createSuccessResponse({ sellerId, sellerName, sellerType, status }, 'Seller profile registered successfully.');
    });
  }

  function updateSeller(sellerId, updateData, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_EDIT);
    if (!sellerId) return CoreUtils.createErrorResponse('Seller ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.findRowById(ss, S.FISH_SELLERS, 'Seller ID', sellerId);
      if (!existing) return CoreUtils.createErrorResponse(`Seller "${sellerId}" not found.`, 'NOT_FOUND');

      const fieldsToUpdate = {};
      if (updateData.sellerName) fieldsToUpdate['Seller Name'] = CoreUtils.sanitizeString(updateData.sellerName, 150);
      if (updateData.sellerType) fieldsToUpdate['Seller Type'] = updateData.sellerType === 'Retail' ? 'Retail' : 'Wholesale';
      if (updateData.shopName !== undefined) fieldsToUpdate['Shop / Business Name'] = CoreUtils.sanitizeString(updateData.shopName, 150);
      if (updateData.contactPerson !== undefined) fieldsToUpdate['Contact Person'] = CoreUtils.sanitizeString(updateData.contactPerson, 100);
      if (updateData.phone) fieldsToUpdate['Phone'] = CoreUtils.sanitizeString(updateData.phone, 30);
      if (updateData.alternatePhone !== undefined) fieldsToUpdate['Alternate Phone'] = CoreUtils.sanitizeString(updateData.alternatePhone, 30);
      if (updateData.address !== undefined) fieldsToUpdate['Address / Locality'] = CoreUtils.sanitizeString(updateData.address, 200);
      if (updateData.villageTown !== undefined) fieldsToUpdate['Village / Town'] = CoreUtils.sanitizeString(updateData.villageTown, 100);
      if (updateData.district !== undefined) fieldsToUpdate['District'] = CoreUtils.sanitizeString(updateData.district, 100);
      if (updateData.state !== undefined) fieldsToUpdate['State'] = CoreUtils.sanitizeString(updateData.state, 100);
      if (updateData.gstin !== undefined) fieldsToUpdate['GSTIN'] = CoreUtils.sanitizeString(updateData.gstin, 30);
      if (updateData.pan !== undefined) fieldsToUpdate['PAN'] = CoreUtils.sanitizeString(updateData.pan, 30);

      if (updateData.creditLimit !== undefined) fieldsToUpdate['Credit Limit (₹)'] = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(updateData.creditLimit, 'Credit Limit', 0));
      if (updateData.creditPeriod !== undefined) fieldsToUpdate['Credit Period (Days)'] = Math.max(0, parseInt(CoreUtils.parseStrictNumber(updateData.creditPeriod, 'Credit Period', 0), 10));
      if (updateData.notes !== undefined) fieldsToUpdate['Notes'] = CoreUtils.sanitizeString(updateData.notes, 500);
      if (updateData.status) fieldsToUpdate['Status'] = updateData.status === 'Inactive' ? 'Inactive' : 'Active';

      CoreData.updateRowById(ss, S.FISH_SELLERS, 'Seller ID', sellerId, fieldsToUpdate);

      CoreAudit.log({
        action: 'SELLER_UPDATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'SELLER',
        entityId: sellerId,
        actor: actor,
        details: fieldsToUpdate
      });

      return CoreUtils.createSuccessResponse({ sellerId, updatedFields: fieldsToUpdate }, 'Seller profile updated successfully.');
    });
  }

  function verifySellerOpeningBalance(sellerId, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.DAILY_CLOSE_APPROVE);
    if (!sellerId) return CoreUtils.createErrorResponse('Seller ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.findRowById(ss, S.FISH_SELLERS, 'Seller ID', sellerId);
      if (!existing) return CoreUtils.createErrorResponse(`Seller "${sellerId}" not found.`, 'NOT_FOUND');

      const fieldsToUpdate = {
        'Balance Verification Status': 'Verified',
        'Verified By': actor || 'Manager',
        'Verification Date': CoreUtils.getNowFormatted('yyyy-MM-dd HH:mm:ss')
      };

      CoreData.updateRowById(ss, S.FISH_SELLERS, 'Seller ID', sellerId, fieldsToUpdate);

      CoreAudit.log({
        action: 'SELLER_BALANCE_VERIFY',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'SELLER',
        entityId: sellerId,
        actor: actor,
        details: fieldsToUpdate
      });

      return CoreUtils.createSuccessResponse({ sellerId, verificationStatus: 'Verified' }, 'Seller opening balance verified.');
    });
  }

  function getAllSellers(includeInactive) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const all = CoreData.readAllRowsAsObjects(ss, S.FISH_SELLERS);
    return includeInactive ? all : all.filter(r => r['Status'] !== 'Inactive');
  }

  function getSellerById(sellerId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return null;
    return CoreData.findRowById(ss, S.FISH_SELLERS, 'Seller ID', sellerId);
  }

  // --------------------------------------------------------------------------
  // 7. SELLER LEDGER & FINANCIAL MOVEMENTS
  // --------------------------------------------------------------------------

  function postSellerLedgerEntryInternal(ss, entryData, actor) {
    const sellerId = entryData.sellerId;
    const voucherRefNo = entryData.voucherRefNo || '';
    const idempotencyKey = entryData.idempotencyKey || `${entryData.voucherType}_${voucherRefNo}`;

    // Read existing ledger
    const existingLedger = CoreData.readAllRowsAsObjects(ss, S.FISH_SELLER_LEDGER);
    
    // Idempotency check: prevent duplicate financial movements
    const duplicate = existingLedger.find(r => (r['Idempotency Key'] && r['Idempotency Key'] === idempotencyKey) || (r['Voucher Ref No'] === voucherRefNo && r['Voucher Type'] === entryData.voucherType && voucherRefNo !== ''));
    if (duplicate) {
      return { success: true, entryId: duplicate['Entry ID'], duplicate: true };
    }

    // Calculate running balance for this seller
    const sellerEntries = existingLedger.filter(r => r['Seller ID'] === sellerId);
    let previousBalance = 0;
    if (sellerEntries.length > 0) {
      const lastEntry = sellerEntries[sellerEntries.length - 1];
      previousBalance = CoreUtils.parseStrictNumber(lastEntry['Outstanding Balance (₹)'], 'Prev Balance', 0);
    }

    const netAmount = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(entryData.netAmount, 'Net Amount', 0));
    const paymentAmount = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(entryData.paymentAmount, 'Payment Amount', 0));
    const newOutstanding = CoreUtils.roundCurrency(previousBalance + netAmount - paymentAmount);

    const entryId = CoreUtils.generateId('FSH-LED', { includeDate: true, entropyLength: 4 });
    const entryDate = entryData.entryDate || CoreUtils.getNowFormatted('yyyy-MM-dd HH:mm:ss');
    const voucherType = entryData.voucherType || 'PROCUREMENT';
    const qtyKg = CoreUtils.roundWeight(CoreUtils.parseStrictNumber(entryData.quantityKg, 'Quantity Kg', 0));
    const ratePerKg = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(entryData.ratePerKg, 'Rate/Kg', 0));
    const grossAmount = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(entryData.grossAmount, 'Gross Amount', 0));
    const deductions = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(entryData.deductions, 'Deductions', 0));
    const paymentStatus = entryData.paymentStatus || (paymentAmount >= netAmount && netAmount > 0 ? 'PAID' : (paymentAmount > 0 ? 'PARTIAL' : 'UNPAID'));
    const notes = CoreUtils.sanitizeString(entryData.notes || '', 300);
    const createdBy = actor || 'System';
    const createdAt = CoreUtils.getNowIso();

    const row = [
      entryId, sellerId, entryDate, voucherType, voucherRefNo,
      qtyKg, ratePerKg, grossAmount, deductions, netAmount,
      paymentAmount, newOutstanding, paymentStatus, idempotencyKey,
      notes, createdBy, createdAt
    ];

    CoreData.appendRowSafe(ss, S.FISH_SELLER_LEDGER, row, SCHEMAS.SELLER_LEDGER);

    return { success: true, entryId, newOutstanding };
  }

  function postSellerLedgerEntry(entryData, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.PAYMENT_COLLECT);
    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');
      const res = postSellerLedgerEntryInternal(ss, entryData, actor);
      return CoreUtils.createSuccessResponse(res, 'Seller ledger entry recorded successfully.');
    });
  }

  function getSellerLedger(sellerId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const all = CoreData.readAllRowsAsObjects(ss, S.FISH_SELLER_LEDGER);
    return sellerId ? all.filter(r => r['Seller ID'] === sellerId) : all;
  }

  function getSellerFinancialSummary(sellerId) {
    const seller = getSellerById(sellerId);
    if (!seller) return null;

    const ledger = getSellerLedger(sellerId);
    const priorCount = CoreUtils.parseStrictNumber(seller['Prior Procurement Count'], 'Prior Count', 0);
    const priorValue = CoreUtils.parseStrictNumber(seller['Prior Procurement Value (₹)'], 'Prior Value', 0);
    const priorQty = CoreUtils.parseStrictNumber(seller['Prior Procurement Qty (Kg)'], 'Prior Qty', 0);

    const openingPayable = CoreUtils.parseStrictNumber(seller['Opening Payable (₹)'], 'Opening Payable', 0);
    const openingReceivable = CoreUtils.parseStrictNumber(seller['Opening Receivable (₹)'], 'Opening Receivable', 0);

    // Live ledger movements
    let liveProcurementCount = 0;
    let liveProcurementValue = 0;
    let liveProcurementQty = 0;
    let currentOutstanding = openingPayable - openingReceivable;
    let lastTransDate = seller['Opening Balance Date'] || '';
    let lastVoucherRef = seller['Last Procurement Ref'] || '';

    ledger.forEach(entry => {
      if (entry['Voucher Type'] === 'PROCUREMENT') {
        liveProcurementCount += 1;
        liveProcurementValue += CoreUtils.parseStrictNumber(entry['Gross Amount (₹)'], 'Gross', 0);
        liveProcurementQty += CoreUtils.parseStrictNumber(entry['Quantity (Kg)'], 'Qty', 0);
      }
      currentOutstanding = CoreUtils.parseStrictNumber(entry['Outstanding Balance (₹)'], 'Balance', currentOutstanding);
      if (entry['Entry Date']) lastTransDate = entry['Entry Date'];
      if (entry['Voucher Ref No']) lastVoucherRef = entry['Voucher Ref No'];
    });

    return {
      sellerId: seller['Seller ID'],
      sellerName: seller['Seller Name'],
      sellerType: seller['Seller Type'] || 'Wholesale',
      phone: seller['Phone'],
      district: seller['District'] || '',
      hasPriorProcurement: seller['Has Prior Procurement'] || 'No',
      priorProcurementCount: priorCount,
      priorProcurementValue: priorValue,
      priorProcurementQty: priorQty,
      liveProcurementCount: liveProcurementCount,
      liveProcurementValue: liveProcurementValue,
      liveProcurementQty: liveProcurementQty,
      totalProcurementCount: priorCount + liveProcurementCount,
      lifetimeProcurementValue: priorValue + liveProcurementValue,
      openingPayable: openingPayable,
      openingReceivable: openingReceivable,
      balanceVerificationStatus: seller['Balance Verification Status'] || 'Unverified',
      currentOutstandingBalance: currentOutstanding,
      currentPayable: currentOutstanding > 0 ? currentOutstanding : 0,
      currentReceivable: currentOutstanding < 0 ? Math.abs(currentOutstanding) : 0,
      lastTransactionDate: lastTransDate,
      lastVoucherRef: lastVoucherRef
    };
  }

  // --------------------------------------------------------------------------
  // 8. TRANSPORT FLEET VEHICLES
  // --------------------------------------------------------------------------

  function createVehicle(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_CREATE);
    const req = CoreValidation.validateRequiredFields(data, ['registrationNo', 'capacityKg']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const regNo = CoreUtils.sanitizeString(data.registrationNo, 30).toUpperCase().replace(/\s+/g, '-');
    const vehicleType = CoreUtils.sanitizeString(data.vehicleType || 'Insulated Truck', 100);
    
    let capacityKg;
    try {
      capacityKg = CoreUtils.roundWeight(CoreUtils.parseStrictNumber(data.capacityKg, 'Vehicle Capacity (Kg)'));
      if (capacityKg <= 0) return CoreUtils.createErrorResponse('Vehicle capacity must be greater than 0 kg.', 'VALIDATION_ERROR');
    } catch (e) {
      return CoreUtils.createErrorResponse(e.message, 'VALIDATION_ERROR');
    }

    const ownershipType = CoreUtils.sanitizeString(data.ownershipType || data.ownership || 'Owned', 50);
    const status = data.status === 'Inactive' ? 'Inactive' : 'Active';
    const notes = CoreUtils.sanitizeString(data.notes || '', 500);

    const vehicleId = data.vehicleId 
      ? CoreUtils.normalizeCode(data.vehicleId)
      : CoreUtils.generateId(P.FISH_VEHICLE, { includeDate: false, entropyLength: 5 });

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.readAllRowsAsObjects(ss, S.FISH_VEHICLES);
      if (existing.some(r => r['Registration No'] && r['Registration No'].toUpperCase() === regNo)) {
        return CoreUtils.createErrorResponse(`Vehicle registration "${regNo}" is already registered.`, 'DUPLICATE_ERROR');
      }

      const row = [vehicleId, regNo, vehicleType, capacityKg, ownershipType, status, notes];
      CoreData.appendRowSafe(ss, S.FISH_VEHICLES, row, SCHEMAS.VEHICLES);

      CoreAudit.log({
        action: 'VEHICLE_CREATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'VEHICLE',
        entityId: vehicleId,
        actor: actor,
        details: { regNo, vehicleType, capacityKg, ownershipType }
      });

      return CoreUtils.createSuccessResponse({ vehicleId, regNo, capacityKg, status }, 'Fleet vehicle registered successfully.');
    });
  }

  function updateVehicle(vehicleId, updateData, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_EDIT);
    if (!vehicleId) return CoreUtils.createErrorResponse('Vehicle ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.findRowById(ss, S.FISH_VEHICLES, 'Vehicle ID', vehicleId);
      if (!existing) return CoreUtils.createErrorResponse(`Vehicle "${vehicleId}" not found.`, 'NOT_FOUND');

      const fieldsToUpdate = {};
      if (updateData.registrationNo) fieldsToUpdate['Registration No'] = CoreUtils.sanitizeString(updateData.registrationNo, 30).toUpperCase().replace(/\s+/g, '-');
      if (updateData.vehicleType) fieldsToUpdate['Vehicle Type'] = CoreUtils.sanitizeString(updateData.vehicleType, 100);
      if (updateData.capacityKg) fieldsToUpdate['Capacity (Kg)'] = CoreUtils.roundWeight(CoreUtils.parseStrictNumber(updateData.capacityKg, 'Capacity'));
      if (updateData.ownershipType) fieldsToUpdate['Ownership Type'] = CoreUtils.sanitizeString(updateData.ownershipType, 50);
      if (updateData.notes !== undefined) fieldsToUpdate['Notes'] = CoreUtils.sanitizeString(updateData.notes, 500);
      if (updateData.status) fieldsToUpdate['Status'] = updateData.status === 'Inactive' ? 'Inactive' : 'Active';

      CoreData.updateRowById(ss, S.FISH_VEHICLES, 'Vehicle ID', vehicleId, fieldsToUpdate);

      CoreAudit.log({
        action: 'VEHICLE_UPDATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'VEHICLE',
        entityId: vehicleId,
        actor: actor,
        details: fieldsToUpdate
      });

      return CoreUtils.createSuccessResponse({ vehicleId, updatedFields: fieldsToUpdate }, 'Vehicle profile updated successfully.');
    });
  }

  function getAllVehicles(includeInactive) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const all = CoreData.readAllRowsAsObjects(ss, S.FISH_VEHICLES);
    return includeInactive ? all : all.filter(r => r['Status'] !== 'Inactive');
  }

  function getVehicleById(vehicleId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return null;
    return CoreData.findRowById(ss, S.FISH_VEHICLES, 'Vehicle ID', vehicleId);
  }

  // --------------------------------------------------------------------------
  // 9. TRANSPORT DRIVERS
  // --------------------------------------------------------------------------

  function createDriver(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_CREATE);
    const req = CoreValidation.validateRequiredFields(data, ['driverName', 'phone']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const driverName = CoreUtils.sanitizeString(data.driverName, 100);
    const phone = CoreUtils.sanitizeString(data.phone, 30);
    const licenseNo = CoreUtils.sanitizeString(data.licenseNo || data.licenseNumber || '', 50);
    const licenseExpiry = CoreUtils.sanitizeString(data.licenseExpiry || '', 30);
    const status = data.status === 'Inactive' ? 'Inactive' : 'Active';
    const notes = CoreUtils.sanitizeString(data.notes || '', 500);

    const driverId = data.driverId 
      ? CoreUtils.normalizeCode(data.driverId)
      : CoreUtils.generateId(P.FISH_DRIVER, { includeDate: false, entropyLength: 5 });

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.readAllRowsAsObjects(ss, S.FISH_DRIVERS);
      if (existing.some(r => r['Driver ID'] === driverId)) {
        return CoreUtils.createErrorResponse(`Driver ID "${driverId}" already exists.`, 'DUPLICATE_ERROR');
      }

      const row = [driverId, driverName, phone, licenseNo, licenseExpiry, status, notes];
      CoreData.appendRowSafe(ss, S.FISH_DRIVERS, row, SCHEMAS.DRIVERS);

      CoreAudit.log({
        action: 'DRIVER_CREATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'DRIVER',
        entityId: driverId,
        actor: actor,
        details: { driverName, phone, licenseNo }
      });

      return CoreUtils.createSuccessResponse({ driverId, driverName, status }, 'Driver registered successfully.');
    });
  }

  function updateDriver(driverId, updateData, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_EDIT);
    if (!driverId) return CoreUtils.createErrorResponse('Driver ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.findRowById(ss, S.FISH_DRIVERS, 'Driver ID', driverId);
      if (!existing) return CoreUtils.createErrorResponse(`Driver "${driverId}" not found.`, 'NOT_FOUND');

      const fieldsToUpdate = {};
      if (updateData.driverName) fieldsToUpdate['Driver Name'] = CoreUtils.sanitizeString(updateData.driverName, 100);
      if (updateData.phone) fieldsToUpdate['Phone'] = CoreUtils.sanitizeString(updateData.phone, 30);
      if (updateData.licenseNo !== undefined) fieldsToUpdate['License No'] = CoreUtils.sanitizeString(updateData.licenseNo, 50);
      if (updateData.licenseExpiry !== undefined) fieldsToUpdate['License Expiry'] = CoreUtils.sanitizeString(updateData.licenseExpiry, 30);
      if (updateData.notes !== undefined) fieldsToUpdate['Notes'] = CoreUtils.sanitizeString(updateData.notes, 500);
      if (updateData.status) fieldsToUpdate['Status'] = updateData.status === 'Inactive' ? 'Inactive' : 'Active';

      CoreData.updateRowById(ss, S.FISH_DRIVERS, 'Driver ID', driverId, fieldsToUpdate);

      CoreAudit.log({
        action: 'DRIVER_UPDATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'DRIVER',
        entityId: driverId,
        actor: actor,
        details: fieldsToUpdate
      });

      return CoreUtils.createSuccessResponse({ driverId, updatedFields: fieldsToUpdate }, 'Driver profile updated successfully.');
    });
  }

  function getAllDrivers(includeInactive) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const all = CoreData.readAllRowsAsObjects(ss, S.FISH_DRIVERS);
    return includeInactive ? all : all.filter(r => r['Status'] !== 'Inactive');
  }

  function getDriverById(driverId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return null;
    return CoreData.findRowById(ss, S.FISH_DRIVERS, 'Driver ID', driverId);
  }

  // --------------------------------------------------------------------------
  // 10. DESTINATION MARKETS & HUBS
  // --------------------------------------------------------------------------

  function createDestination(data, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_CREATE);
    const req = CoreValidation.validateRequiredFields(data, ['marketName', 'city']);
    if (!req.isValid) return CoreUtils.createErrorResponse(req.message, 'VALIDATION_ERROR');

    const marketName = CoreUtils.sanitizeString(data.marketName || data.destinationName, 150);
    const city = CoreUtils.sanitizeString(data.city, 100);
    const notes = CoreUtils.sanitizeString(data.notes || data.deliveryNotes || '', 500);
    const status = data.status === 'Inactive' ? 'Inactive' : 'Active';

    const destId = data.destinationId 
      ? CoreUtils.normalizeCode(data.destinationId)
      : CoreUtils.generateId(P.FISH_DESTINATION, { includeDate: false, entropyLength: 5 });

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.readAllRowsAsObjects(ss, S.FISH_DESTINATIONS);
      if (existing.some(r => r['Destination ID'] === destId || (r['Market Name'] && r['Market Name'].toLowerCase() === marketName.toLowerCase() && r['City / Area'] && r['City / Area'].toLowerCase() === city.toLowerCase()))) {
        return CoreUtils.createErrorResponse(`Destination "${marketName} (${city})" already exists.`, 'DUPLICATE_ERROR');
      }

      const row = [destId, marketName, city, notes, status];
      CoreData.appendRowSafe(ss, S.FISH_DESTINATIONS, row, SCHEMAS.DESTINATIONS);

      CoreAudit.log({
        action: 'DESTINATION_CREATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'DESTINATION',
        entityId: destId,
        actor: actor,
        details: { marketName, city, status }
      });

      return CoreUtils.createSuccessResponse({ destId, marketName, city, status }, 'Destination registered successfully.');
    });
  }

  function updateDestination(destId, updateData, actor) {
    CoreAuth.assertPermission(actor, TFC_CONFIG.ACTIONS.MASTER_EDIT);
    if (!destId) return CoreUtils.createErrorResponse('Destination ID is required', 'VALIDATION_ERROR');

    return CoreData.withScriptLock(function () {
      const ss = CoreData.getSpreadsheet();
      if (!ss) return CoreUtils.createErrorResponse('Database connection not available', 'DB_ERROR');

      const existing = CoreData.findRowById(ss, S.FISH_DESTINATIONS, 'Destination ID', destId);
      if (!existing) return CoreUtils.createErrorResponse(`Destination "${destId}" not found.`, 'NOT_FOUND');

      const fieldsToUpdate = {};
      if (updateData.marketName) fieldsToUpdate['Market Name'] = CoreUtils.sanitizeString(updateData.marketName, 150);
      if (updateData.city) fieldsToUpdate['City / Area'] = CoreUtils.sanitizeString(updateData.city, 100);
      if (updateData.notes !== undefined) fieldsToUpdate['Delivery Notes / Address'] = CoreUtils.sanitizeString(updateData.notes, 500);
      if (updateData.status) fieldsToUpdate['Status'] = updateData.status === 'Inactive' ? 'Inactive' : 'Active';

      CoreData.updateRowById(ss, S.FISH_DESTINATIONS, 'Destination ID', destId, fieldsToUpdate);

      CoreAudit.log({
        action: 'DESTINATION_UPDATE',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'DESTINATION',
        entityId: destId,
        actor: actor,
        details: fieldsToUpdate
      });

      return CoreUtils.createSuccessResponse({ destId, updatedFields: fieldsToUpdate }, 'Destination updated successfully.');
    });
  }

  function getAllDestinations(includeInactive) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];
    const all = CoreData.readAllRowsAsObjects(ss, S.FISH_DESTINATIONS);
    return includeInactive ? all : all.filter(r => r['Status'] !== 'Inactive');
  }

  function getDestinationById(destId) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return null;
    return CoreData.findRowById(ss, S.FISH_DESTINATIONS, 'Destination ID', destId);
  }

  // --------------------------------------------------------------------------
  // 11. UNIFIED MASTER DATA STATE LOADER
  // --------------------------------------------------------------------------

  function getAllFishMasterData(includeInactive) {
    const inc = includeInactive === true;
    return {
      success: true,
      species: getAllSpecies(inc),
      grades: getAllGrades(inc),
      suppliers: getAllSuppliers(inc),
      mandis: getAllMandis(inc),
      sellers: getAllSellers(inc),
      vehicles: getAllVehicles(inc),
      drivers: getAllDrivers(inc),
      destinations: getAllDestinations(inc),
      recentRates: getRateHistory(null, null, null, 50),
      timestamp: CoreUtils.getNowIso()
    };
  }

  // Public API
  return {
    SCHEMAS: SCHEMAS,
    HEADER_COLOR: HEADER_COLOR,
    // Species
    createSpecies: createSpecies,
    updateSpecies: updateSpecies,
    setSpeciesStatus: setSpeciesStatus,
    getAllSpecies: getAllSpecies,
    getSpeciesById: getSpeciesById,
    // Grades
    createGrade: createGrade,
    updateGrade: updateGrade,
    setGradeStatus: setGradeStatus,
    getAllGrades: getAllGrades,
    getGradesBySpecies: getGradesBySpecies,
    // Rates
    recordRate: recordRate,
    getEffectiveRate: getEffectiveRate,
    getRateHistory: getRateHistory,
    // Suppliers
    createSupplier: createSupplier,
    updateSupplier: updateSupplier,
    getAllSuppliers: getAllSuppliers,
    getSupplierById: getSupplierById,
    // Mandis
    createMandi: createMandi,
    updateMandi: updateMandi,
    getAllMandis: getAllMandis,
    getMandiById: getMandiById,
    // Sellers & History
    createSeller: createSeller,
    updateSeller: updateSeller,
    getAllSellers: getAllSellers,
    getSellerById: getSellerById,
    verifySellerOpeningBalance: verifySellerOpeningBalance,
    // Seller Ledger
    postSellerLedgerEntry: postSellerLedgerEntry,
    postSellerLedgerEntryInternal: postSellerLedgerEntryInternal,
    getSellerLedger: getSellerLedger,
    getSellerFinancialSummary: getSellerFinancialSummary,
    // Vehicles
    createVehicle: createVehicle,
    updateVehicle: updateVehicle,
    getAllVehicles: getAllVehicles,
    getVehicleById: getVehicleById,
    // Drivers
    createDriver: createDriver,
    updateDriver: updateDriver,
    getAllDrivers: getAllDrivers,
    getDriverById: getDriverById,
    // Destinations
    createDestination: createDestination,
    updateDestination: updateDestination,
    getAllDestinations: getAllDestinations,
    getDestinationById: getDestinationById,
    // Unified Loader
    getAllFishMasterData: getAllFishMasterData
  };
})();

// Top-level Apps Script API Wrappers for client-side RPC (google.script.run)
function apiGetAllFishMasterData(includeInactive) {
  return FishMaster.getAllFishMasterData(includeInactive);
}

function apiCreateFishSpecies(data) {
  return FishMaster.createSpecies(data);
}

function apiCreateFishGrade(data) {
  return FishMaster.createGrade(data);
}

function apiRecordFishRate(data) {
  return FishMaster.recordRate(data);
}

function apiCreateFishSupplier(data) {
  return FishMaster.createSupplier(data);
}

function apiCreateFishMandi(data) {
  return FishMaster.createMandi(data);
}

function apiCreateFishSeller(data) {
  return FishMaster.createSeller(data);
}

function apiCreateFishVehicle(data) {
  return FishMaster.createVehicle(data);
}

function apiCreateFishDriver(data) {
  return FishMaster.createDriver(data);
}

function apiCreateFishDestination(data) {
  return FishMaster.createDestination(data);
}

function apiGetSellerFinancialSummary(sellerId) {
  return FishMaster.getSellerFinancialSummary(sellerId);
}

function apiVerifySellerOpeningBalance(sellerId) {
  return FishMaster.verifySellerOpeningBalance(sellerId);
}

function apiSetFishMasterStatus(entityKey, id, status) {
  if (entityKey === 'species') return FishMaster.setSpeciesStatus(id, status);
  if (entityKey === 'grades') return FishMaster.setGradeStatus(id, status);
  if (entityKey === 'suppliers') return FishMaster.updateSupplier(id, { status: status });
  if (entityKey === 'mandis') return FishMaster.updateMandi(id, { status: status });
  if (entityKey === 'sellers') return FishMaster.updateSeller(id, { status: status });
  if (entityKey === 'vehicles') return FishMaster.updateVehicle(id, { status: status });
  if (entityKey === 'drivers') return FishMaster.updateDriver(id, { status: status });
  if (entityKey === 'destinations') return FishMaster.updateDestination(id, { status: status });
  return CoreUtils.createErrorResponse('Unknown master entity key: ' + entityKey, 'VALIDATION_ERROR');
}
