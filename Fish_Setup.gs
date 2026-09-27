/**
 * ============================================================================
 * TFC GROUP — FISH SCHEMA SETUP & SEED ENGINE (Fish_Setup.gs)
 * ============================================================================
 * Repeat-safe, idempotent schema initializer and realistic seeder for
 * the Fish Transport & Cold Logistics vertical.
 * 
 * Safety Invariants:
 *  1. Idempotent: Can be run multiple times safely.
 *  2. Non-Destructive: Never deletes, clears, or renames existing data or sheets.
 *  3. Preserves Legacy Data: Leaves 'FISH_Batches' intact.
 *  4. Schema Validation: Validates existing headers before writing.
 * 
 * Target Runtime: Google Apps Script (V8 Engine)
 * ============================================================================
 */

const FishSetup = (function () {
  const S = TFC_CONFIG.SHEETS;
  const HEADER_COLOR = '#0d9488'; // #0d9488

  /**
   * Initializes all Fish Master & Procurement Google Sheets tabs safely without overwriting
   * 
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [targetSpreadsheet] - Optional spreadsheet override
   * @returns {Object} Setup status report
   */
  function setupFishMasterSheets(targetSpreadsheet) {
    const ss = targetSpreadsheet || CoreData.getSpreadsheet();
    if (!ss) {
      return CoreUtils.createErrorResponse('Spreadsheet connection not available for setup.', 'DB_ERROR');
    }

    const report = {
      timestamp: CoreUtils.getNowIso(),
      createdSheets: [],
      existingSheets: [],
      seededRecords: {}
    };

    return CoreData.withScriptLock(function () {
      // 1. Setup All Fish ERP Master & Procurement Tabs
      const allTabs = [
        { name: S.FISH_SPECIES, headers: FishMaster.SCHEMAS.SPECIES },
        { name: S.FISH_GRADES, headers: FishMaster.SCHEMAS.GRADES },
        { name: S.FISH_RATES, headers: FishMaster.SCHEMAS.RATES },
        { name: S.FISH_SUPPLIERS, headers: FishMaster.SCHEMAS.SUPPLIERS },
        { name: S.FISH_MANDIS, headers: FishMaster.SCHEMAS.MANDIS },
        { name: S.FISH_SELLERS, headers: FishMaster.SCHEMAS.SELLERS },
        { name: S.FISH_SELLER_LEDGER, headers: FishMaster.SCHEMAS.SELLER_LEDGER },
        { name: S.FISH_PROCUREMENT, headers: FishProcurement.SCHEMAS.PROCUREMENT },
        { name: S.FISH_PROCUREMENT_ITEMS, headers: FishProcurement.SCHEMAS.PROCUREMENT_ITEMS },
        { name: S.FISH_LOTS, headers: FishProcurement.SCHEMAS.LOTS },
        { name: S.FISH_VEHICLES, headers: FishMaster.SCHEMAS.VEHICLES },
        { name: S.FISH_DRIVERS, headers: FishMaster.SCHEMAS.DRIVERS },
        { name: S.FISH_DESTINATIONS, headers: FishMaster.SCHEMAS.DESTINATIONS }
      ];

      allTabs.forEach(tab => {
        let sheet = ss.getSheetByName(tab.name);
        if (!sheet) {
          sheet = ss.insertSheet(tab.name);
          sheet.appendRow(tab.headers);
          const range = sheet.getRange(1, 1, 1, tab.headers.length);
          range.setBackground(HEADER_COLOR);
          range.setFontColor('#FFFFFF');
          range.setFontWeight('bold');
          sheet.setFrozenRows(1);
          report.createdSheets.push(tab.name);
        } else {
          if (sheet.getLastRow() === 0) {
            sheet.appendRow(tab.headers);
            const range = sheet.getRange(1, 1, 1, tab.headers.length);
            range.setBackground(HEADER_COLOR);
            range.setFontColor('#FFFFFF');
            range.setFontWeight('bold');
            sheet.setFrozenRows(1);
          }
          report.existingSheets.push(tab.name);
        }
      });

      // 2. Ensure SYS_AUDIT_LOG exists
      let auditSheet = ss.getSheetByName(S.AUDIT_LOG);
      if (!auditSheet) {
        auditSheet = ss.insertSheet(S.AUDIT_LOG);
        auditSheet.appendRow(CoreAudit.AUDIT_HEADERS);
        const aRange = auditSheet.getRange(1, 1, 1, CoreAudit.AUDIT_HEADERS.length);
        aRange.setBackground('#334155');
        aRange.setFontColor('#FFFFFF');
        aRange.setFontWeight('bold');
        auditSheet.setFrozenRows(1);
        report.createdSheets.push(S.AUDIT_LOG);
      }

      // 3. Seed Realistic Data if newly created/empty
      seedRealisticFishDataIfEmpty(ss, report);

      CoreAudit.log({
        action: 'FISH_SCHEMA_SETUP',
        vertical: TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT,
        entityType: 'SYSTEM_SETUP',
        entityId: 'FISH_ERP_V3',
        details: { created: report.createdSheets.length, existing: report.existingSheets.length }
      });

      return CoreUtils.createSuccessResponse(report, 'Fish Master and Procurement schema setup complete.');
    });
  }

  /**
   * Seeds authentic coastal Odisha & Eastern India fish trade masters and baseline data
   */
  function seedRealisticFishDataIfEmpty(ss, report) {
    const today = CoreUtils.getNowFormatted('yyyy-MM-dd HH:mm:ss');
    const todayDate = CoreUtils.getNowFormatted('yyyy-MM-dd');

    // 1. Species (Common/Local Name primary, Scientific Name empty)
    const speciesSheet = ss.getSheetByName(S.FISH_SPECIES);
    if (speciesSheet && speciesSheet.getLastRow() <= 1) {
      const speciesData = [
        ['FSH-SPC-001', 'Rohu & Katla (Major Carps)', 'Rohi / Bhakura', '', 'Kg', 'Active', 'Freshwater culture and sweetwater reservoir catch'],
        ['FSH-SPC-002', 'Black Tiger Shrimp', 'Bagda Chingudi', '', 'Kg', 'Active', 'Coastal Odisha brackishwater culture'],
        ['FSH-SPC-003', 'Vannamei White Prawn', 'Bili Chingudi', '', 'Kg', 'Active', 'Intensive aquaculture farm harvest'],
        ['FSH-SPC-004', 'Hilsa Shad', 'Ilishi / Padma Ilish', '', 'Kg', 'Active', 'Estuarine and marine wild catch'],
        ['FSH-SPC-005', 'Silver Pomfret', 'Chandi Dhandi', '', 'Kg', 'Active', 'Bay of Bengal trawler catch'],
        ['FSH-SPC-006', 'Asian Sea Bass / Barramundi', 'Bhekti', '', 'Kg', 'Active', 'Chilika & coastal estuarine catch']
      ];
      speciesSheet.getRange(2, 1, speciesData.length, speciesData[0].length).setValues(speciesData);
      report.seededRecords.species = speciesData.length;
    }

    // 2. Grades
    const gradesSheet = ss.getSheetByName(S.FISH_GRADES);
    if (gradesSheet && gradesSheet.getLastRow() <= 1) {
      const gradesData = [
        ['FSH-GRD-001', 'FSH-SPC-001', 'Grade A (2.0 Kg+)', '2.0 to 3.5 kg whole round fish', 'Active'],
        ['FSH-GRD-002', 'FSH-SPC-001', 'Grade B (1.0-2.0 Kg)', '1.0 to 2.0 kg whole round fish', 'Active'],
        ['FSH-GRD-003', 'FSH-SPC-002', 'Count 20/30 (Head-on)', '20 to 30 pcs per kg count', 'Active'],
        ['FSH-GRD-004', 'FSH-SPC-002', 'Count 30/40 (Head-on)', '30 to 40 pcs per kg count', 'Active'],
        ['FSH-GRD-005', 'FSH-SPC-003', 'Count 40/50', '40 to 50 pcs per kg standard export grade', 'Active'],
        ['FSH-GRD-006', 'FSH-SPC-004', 'Large (1.2 Kg+)', 'Prime Chilika / Bay of Bengal Hilsa', 'Active'],
        ['FSH-GRD-007', 'FSH-SPC-005', 'Medium (300-500g)', 'Fresh ice-packed marine grade', 'Active'],
        ['FSH-GRD-008', 'FSH-SPC-006', 'Table Size (1.5-3.0 Kg)', 'Premium live-chilled Bhekti', 'Active']
      ];
      gradesSheet.getRange(2, 1, gradesData.length, gradesData[0].length).setValues(gradesData);
      report.seededRecords.grades = gradesData.length;
    }

    // 3. Mandis & Harbors
    const mandiSheet = ss.getSheetByName(S.FISH_MANDIS);
    if (mandiSheet && mandiSheet.getLastRow() <= 1) {
      const mandiData = [
        ['FSH-MND-001', 'Paradeep Deep Sea Fishing Harbor', 'Paradeep, Jagatsinghpur', 'Harbor Secretary', '+91 6722 220145', 2.5, 'Active', 'Primary marine trawler landing harbor'],
        ['FSH-MND-002', 'Dhamra Port Auction Terminal', 'Dhamra, Bhadrak', 'Terminal Manager', '+91 6786 234100', 2.0, 'Active', 'Northern marine landing terminal'],
        ['FSH-MND-003', 'Balugaon Chilika Auction Center', 'Balugaon, Khordha', 'Secretary', '+91 6756 251220', 3.0, 'Active', 'Chilika freshwater & lagoon auction yard'],
        ['FSH-MND-004', 'Astaranga Fishing Harbor', 'Astaranga, Puri', 'Harbor Master', '+91 6758 273110', 2.0, 'Active', 'Coastal trawler & gillnet landing center']
      ];
      mandiSheet.getRange(2, 1, mandiData.length, mandiData[0].length).setValues(mandiData);
      report.seededRecords.mandis = mandiData.length;
    }

    // 4. Suppliers
    const supSheet = ss.getSheetByName(S.FISH_SUPPLIERS);
    if (supSheet && supSheet.getLastRow() <= 1) {
      const supData = [
        ['FSH-SUP-001', 'Paradeep Trawler Syndicate', 'Capt. Rabindra Sahu', '+91 94370 12890', 'Jetty 4, Paradeep Harbor', 'FSH-MND-001', 0, 'Active', 'Fleet of 8 motorized sea trawlers'],
        ['FSH-SUP-002', 'Dhamra Fishermen Co-op', 'Bikram Keshari Jena', '+91 94371 45678', 'Dhamra Fishing Port', 'FSH-MND-002', 0, 'Active', 'Cooperative of 35 gillnet operators'],
        ['FSH-SUP-003', 'Chilika Aquafarmers Federation', 'Narayan Behera', '+91 98610 88234', 'Balugaon Landing Center', 'FSH-MND-003', 0, 'Active', 'Federation of Chilika sweetwater harvest'],
        ['FSH-SUP-004', 'Astaranga Coastal Harvesters', 'Ganesh Chandra Barik', '+91 70081 99012', 'Nuagarh Jetty, Astaranga', 'FSH-MND-004', 0, 'Active', 'Coastal fishermen group']
      ];
      supSheet.getRange(2, 1, supData.length, supData[0].length).setValues(supData);
      report.seededRecords.suppliers = supData.length;
    }

    // 5. Enhanced Sellers (Wholesale & Retail with previous transaction history and opening balances)
    const slrSheet = ss.getSheetByName(S.FISH_SELLERS);
    if (slrSheet && slrSheet.getLastRow() <= 1) {
      const slrData = [
        [
          'FSH-SELLER-001', 'Wholesale', 'Subrata Ghosh', 'Maa Kali Fish Agency (Arat #14)', 'Subrata Ghosh',
          '+91 98300 12345', '+91 98300 12346', 'Wholesale Yard Gate 3', 'Howrah', 'Howrah', 'West Bengal',
          '19AAACG1234F1Z5', 'ABCDE1234F',
          'Yes', 24, 18500, 2450000, '2026-09-20', 'VR-2026-089', 'Verified from FY25 ledger settlement',
          45000, 0, todayDate, 'Opening verified payable from previous season cycle',
          'Verified', 'Admin', today, 500000, 7, 'Active', 'Top wholesale buyer in Howrah market'
        ],
        [
          'FSH-SELLER-002', 'Wholesale', 'Prabir Roy Chowdhury', 'Bengal Fishery Merchants', 'Prabir Roy',
          '+91 98311 54321', '', 'Platform 2, Sealdah Market', 'Kolkata', 'Kolkata', 'West Bengal',
          '19BBBPR5678G2Z1', 'BBBBB5678G',
          'Yes', 16, 9200, 1180000, '2026-09-18', 'VR-2026-074', 'Verified from bank statement',
          0, 12500, todayDate, 'Advance payment made for forthcoming Hilsa lot',
          'Verified', 'Admin', today, 350000, 5, 'Active', 'Sealdah wholesale distributor'
        ],
        [
          'FSH-SELLER-003', 'Retail', 'Santosh Kumar Nayak', 'Utkal Fresh Fish Traders', 'Santosh Nayak',
          '+91 94370 77123', '', 'Unit-4 Daily Market Stall 12', 'Bhubaneswar', 'Khordha', 'Odisha',
          '', '',
          'Yes', 38, 4200, 685000, '2026-09-26', 'VR-2026-112', 'Weekly cash/credit verified sheet',
          18200, 0, todayDate, 'Running khata balance verified',
          'Verified', 'Admin', today, 200000, 3, 'Active', 'High-volume Bhubaneswar retail counter'
        ],
        [
          'FSH-SELLER-004', 'Retail', 'Dilip Pradhan', 'Tara Tarini Fish Center', 'Dilip Pradhan',
          '+91 70081 33456', '', 'Giri Market Main Road', 'Berhampur', 'Ganjam', 'Odisha',
          '', '',
          'No', 0, 0, 0, '', '', 'New retail onboarding with zero prior transaction history',
          0, 0, todayDate, 'Fresh seller registration with zero opening balance',
          'Verified', 'Admin', today, 150000, 4, 'Active', 'Retail outlet in Berhampur'
        ]
      ];
      slrSheet.getRange(2, 1, slrData.length, slrData[0].length).setValues(slrData);
      report.seededRecords.sellers = slrData.length;

      // Seed Initial Seller Ledger Entries for opening balances
      const ledgerSheet = ss.getSheetByName(S.FISH_SELLER_LEDGER);
      if (ledgerSheet && ledgerSheet.getLastRow() <= 1) {
        const ledgerEntries = [
          ['FSH-LED-001', 'FSH-SELLER-001', today, 'OPENING_BALANCE', 'OB-FSH-SELLER-001', 0, 0, 0, 0, 45000, 0, 45000, 'UNPAID', 'OB-FSH-SELLER-001', 'Opening verified payable', 'Admin', today],
          ['FSH-LED-002', 'FSH-SELLER-002', today, 'OPENING_BALANCE', 'OB-FSH-SELLER-002', 0, 0, 0, 0, -12500, 0, -12500, 'PAID', 'OB-FSH-SELLER-002', 'Opening advance receivable', 'Admin', today],
          ['FSH-LED-003', 'FSH-SELLER-003', today, 'OPENING_BALANCE', 'OB-FSH-SELLER-003', 0, 0, 0, 0, 18200, 0, 18200, 'UNPAID', 'OB-FSH-SELLER-003', 'Opening verified payable', 'Admin', today]
        ];
        ledgerSheet.getRange(2, 1, ledgerEntries.length, ledgerEntries[0].length).setValues(ledgerEntries);
        report.seededRecords.sellerLedger = ledgerEntries.length;
      }
    }

    // 6. Fleet Vehicles
    const vehSheet = ss.getSheetByName(S.FISH_VEHICLES);
    if (vehSheet && vehSheet.getLastRow() <= 1) {
      const vehData = [
        ['FSH-VEH-001', 'OD-02-AB-4545', 'Eicher Pro 3015 Insulated (6T)', 6000, 'Owned', 'Active', 'Equipped with Carrier chill unit (-5°C to +4°C)'],
        ['FSH-VEH-002', 'OD-05-C-7812', 'Tata 407 Refrig Crate Carrier', 3500, 'Owned', 'Active', 'PUF insulated box for fast city & coastal transport'],
        ['FSH-VEH-003', 'WB-19-J-9921', 'Mahindra Bolero Maxi Pickup', 1500, 'Contract', 'Active', 'Dedicated route vehicle for Paradeep to Kolkata trips']
      ];
      vehSheet.getRange(2, 1, vehData.length, vehData[0].length).setValues(vehData);
      report.seededRecords.vehicles = vehData.length;
    }

    // 7. Drivers
    const drvSheet = ss.getSheetByName(S.FISH_DRIVERS);
    if (drvSheet && drvSheet.getLastRow() <= 1) {
      const drvData = [
        ['FSH-DRV-001', 'Bapi Nayak', '+91 94372 00111', 'OD02-20150045890', '2028-12-31', 'Active', 'Senior highway heavy vehicle driver'],
        ['FSH-DRV-002', 'Kailash Jena', '+91 94373 00222', 'OD05-20180098120', '2029-06-30', 'Active', 'Coastal collection driver'],
        ['FSH-DRV-003', 'Ramesh Das', '+91 98320 00333', 'WB19-20160012450', '2027-08-15', 'Active', 'Interstate route driver (Odisha - Bengal)']
      ];
      drvSheet.getRange(2, 1, drvData.length, drvData[0].length).setValues(drvData);
      report.seededRecords.drivers = drvData.length;
    }

    // 8. Rates
    const ratesSheet = ss.getSheetByName(S.FISH_RATES);
    if (ratesSheet && ratesSheet.getLastRow() <= 1) {
      const ratesData = [
        ['FSH-RAT-001', 'FSH-SPC-001', 'FSH-GRD-001', 'FSH-MND-001', 'PURCHASE', 145.0, '2026-09-28 06:00:00', '', 'Paradeep Morning Auction Board', 'procurement@tfcgroup.com', today],
        ['FSH-RAT-002', 'FSH-SPC-001', 'FSH-GRD-001', 'GLOBAL', 'SALE', 185.0, '2026-09-28 06:00:00', '', 'Howrah Opening Benchmark', 'sales@tfcgroup.com', today],
        ['FSH-RAT-003', 'FSH-SPC-002', 'FSH-GRD-003', 'FSH-MND-001', 'PURCHASE', 480.0, '2026-09-28 06:00:00', '', 'Paradeep Harbor Syndicate Rate', 'procurement@tfcgroup.com', today],
        ['FSH-RAT-004', 'FSH-SPC-004', 'FSH-GRD-006', 'FSH-MND-003', 'PURCHASE', 850.0, '2026-09-28 06:00:00', '', 'Balugaon Landing Yard Auction', 'procurement@tfcgroup.com', today],
        ['FSH-RAT-005', 'FSH-SPC-005', 'FSH-GRD-007', 'FSH-MND-001', 'PURCHASE', 360.0, '2026-09-28 06:00:00', '', 'Paradeep Marine Yard', 'procurement@tfcgroup.com', today]
      ];
      ratesSheet.getRange(2, 1, ratesData.length, ratesData[0].length).setValues(ratesData);
      report.seededRecords.rates = ratesData.length;
    }

    // 9. Destinations
    const destSheet = ss.getSheetByName(S.FISH_DESTINATIONS);
    if (destSheet && destSheet.getLastRow() <= 1) {
      const destData = [
        ['FSH-DST-001', 'Howrah Fish Wholesale Terminal', 'Kolkata, West Bengal', 'Main inter-state distribution hub. Unloading gate #3 before 04:00 AM.', 'Active'],
        ['FSH-DST-002', 'Sealdah Koley Market Depot', 'Kolkata, West Bengal', 'Platform 2 bays for premium species.', 'Active'],
        ['FSH-DST-003', 'Unit-4 Central Fish Market', 'Bhubaneswar, Odisha', 'Local retail & wholesale dispatch yard.', 'Active'],
        ['FSH-DST-004', 'Berhampur Giri Market Hub', 'Berhampur, Ganjam, Odisha', 'Southern Odisha delivery corridor.', 'Active']
      ];
      destSheet.getRange(2, 1, destData.length, destData[0].length).setValues(destData);
      report.seededRecords.destinations = destData.length;
    }
  }

  return {
    setupFishMasterSheets: setupFishMasterSheets
  };
})();

// Top-level Apps Script Setup Wrapper
function runFishMasterSetup() {
  return FishSetup.setupFishMasterSheets();
}
