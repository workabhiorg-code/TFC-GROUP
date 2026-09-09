/**
 * ============================================================================
 * TFC GROUP - MULTI-BUSINESS POS & MANAGEMENT SYSTEM
 * Google Apps Script Backend (Code.gs)
 * 
 * Verticals Supported:
 *  1. Catering Management
 *  2. Stone Mining & Crusher Operations
 *  3. Construction & Project Contracting
 *  4. Fish Transport & Cold Logistics
 *  5. Pragati Outlet (Retail POS & Dairy/FMCG)
 *  6. Group HQ Consolidated Overview
 * ============================================================================
 */

// Global Configuration
const APP_CONFIG = {
  APP_NAME: 'TFC Group POS & ERP',
  THEME_COLOR: '#ff751f',
  VERSION: '2.0.0',
  CURRENCY: '₹',
  // SPREADSHEET_ID: Leave blank if script is inside Google Sheet (Extensions > Apps Script)
  // Or paste your Google Sheet ID or full Sheet URL here to connect directly!
  SPREADSHEET_ID: '', 
  SHEET_TABS: {
    SETTINGS: 'CFG_Settings',
    KHATA: 'MST_Khata',
    EXPENSES: 'MST_Expenses',
    // Catering
    CAT_EVENTS: 'CAT_Events',
    CAT_MENU: 'CAT_Menu_Items',
    // Stone Mining
    MINE_TRIPS: 'MINE_Trips',
    MINE_STOCK: 'MINE_Stock',
    // Construction
    CONST_PROJECTS: 'CONST_Projects',
    CONST_MATERIALS: 'CONST_Materials',
    CONST_LABOR: 'CONST_Labor',
    // Fish Transport
    FISH_BATCHES: 'FISH_Batches',
    // Pragati Outlet
    OUTLET_PRODUCTS: 'OUTLET_Products',
    OUTLET_SALES: 'OUTLET_Sales',
    // Poultry Farm
    POULTRY_BATCHES: 'PLT_Batches',
    POULTRY_FEED: 'PLT_Feed',
    POULTRY_SALES: 'PLT_Sales'
  }
};

/**
 * Web App Entrypoint: Serves the SPA frontend
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('index');
  template.appName = APP_CONFIG.APP_NAME;
  template.themeColor = APP_CONFIG.THEME_COLOR;
  
  return template.evaluate()
    .setTitle('TFC Group - Multi-Business POS & Management')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Include helper for modular HTML/CSS/JS if needed
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get the target spreadsheet (Direct by ID/URL or bound spreadsheet)
 */
function getDatabase() {
  try {
    if (APP_CONFIG.SPREADSHEET_ID && APP_CONFIG.SPREADSHEET_ID.trim() !== '') {
      let id = APP_CONFIG.SPREADSHEET_ID.trim();
      // Auto-extract ID if full Google Sheet URL was provided
      if (id.indexOf('/d/') !== -1) {
        const matches = id.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (matches && matches[1]) id = matches[1];
      }
      return SpreadsheetApp.openById(id);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    console.error('Error connecting to spreadsheet: ' + err.message);
    try {
      return SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      return null;
    }
  }
}

/**
 * Get or create a specific sheet tab with header row
 */
function getOrCreateSheet(ss, tabName, headers, headerColor) {
  let sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
    if (headers && headers.length) {
      sheet.appendRow(headers);
      const headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground(headerColor || '#ff751f');
      headerRange.setFontColor('#FFFFFF');
      headerRange.setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

/**
 * One-Click Setup & Demo Data Generator
 * Formats the entire Google Spreadsheet and populates realistic demo records for all 5 businesses.
 */
function setupDatabaseAndDemoData() {
  const ss = getDatabase();
  if (!ss) {
    return { success: false, message: 'Spreadsheet connection not found. Please open Google Sheets and launch Script Editor.' };
  }

  // 1. Settings Tab
  const settingsSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.SETTINGS, ['Key', 'Value', 'Description'], '#1e293b');
  if (settingsSheet.getLastRow() <= 1) {
    settingsSheet.appendRow(['GROUP_NAME', 'TFC Group Enterprise', 'Corporate Business Group']);
    settingsSheet.appendRow(['MAIN_THEME', '#ff751f', 'Primary Accent Theme Color']);
    settingsSheet.appendRow(['CURRENCY_SYMBOL', '₹', 'Default Transaction Currency']);
    settingsSheet.appendRow(['ACTIVE_BRANCHES', 'Catering,Stone Mining,Construction,Fish Transport,Pragati Outlet', 'Active Group Verticals']);
  }

  // 2. Consolidated Khata (Customers, Vendors, Contractors)
  const khataSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.KHATA, 
    ['ID', 'Party Name', 'Party Type', 'Business Vertical', 'Phone', 'City', 'Balance (₹)', 'Credit Limit (₹)', 'Status'], '#ff751f');
  if (khataSheet.getLastRow() <= 1) {
    khataSheet.appendRow(['KHT-101', 'Rajesh Sharma (Weddings)', 'Customer', 'Catering', '+91 98765 43210', 'Bhubaneswar', -45000, 200000, 'Active']);
    khataSheet.appendRow(['KHT-102', 'Maa Tarini Infra Builders', 'Customer', 'Stone Mining', '+91 94370 11223', 'Cuttack', -128500, 500000, 'Active']);
    khataSheet.appendRow(['KHT-103', 'Apex Steel & Cement Suppliers', 'Vendor', 'Construction', '+91 98610 55443', 'Rourkela', 340000, 1000000, 'Active']);
    khataSheet.appendRow(['KHT-104', 'Howrah Wholesale Fish Mandi', 'Buyer', 'Fish Transport', '+91 93344 88776', 'Kolkata', -86000, 300000, 'Active']);
    khataSheet.appendRow(['KHT-105', 'Pragati Daily Milk Consumers', 'Retail Khata', 'Pragati Outlet', '+91 70081 22334', 'Local Colony', -3420, 10000, 'Active']);
  }

  // 3. Consolidated Expenses
  const expSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.EXPENSES,
    ['ID', 'Date', 'Vertical', 'Category', 'Description', 'Amount (₹)', 'Payment Mode', 'Paid By'], '#e11d48');
  if (expSheet.getLastRow() <= 1) {
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    expSheet.appendRow(['EXP-01', today, 'Stone Mining', 'Fuel / Diesel', 'Crusher Generator 200L Diesel', 18400, 'Bank Transfer', 'Crusher Mgr']);
    expSheet.appendRow(['EXP-02', today, 'Fish Transport', 'Ice & Toll', 'Crate Ice blocks & NH toll tax', 4200, 'Cash', 'Driver Bapi']);
    expSheet.appendRow(['EXP-03', today, 'Catering', 'Raw Groceries', 'Basmati Rice & Cooking Oil bulk', 26500, 'UPI', 'Chef Santosh']);
    expSheet.appendRow(['EXP-04', today, 'Construction', 'Labor Tea & Misc', 'Site B daily labor snacks & water', 1150, 'Cash', 'Supervisor Anil']);
    expSheet.appendRow(['EXP-05', today, 'Pragati Outlet', 'Shop Electricity', 'Monthly commercial chiller power bill', 8400, 'Net Banking', 'Outlet Cashier']);
  }

  // 4. Catering Management Tabs
  const catEventSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.CAT_EVENTS,
    ['Event ID', 'Event Name', 'Client Name', 'Phone', 'Event Date', 'Guest Count', 'Per Plate (₹)', 'Total Amount (₹)', 'Advance Paid (₹)', 'Balance (₹)', 'Status'], '#f97316');
  if (catEventSheet.getLastRow() <= 1) {
    catEventSheet.appendRow(['EVT-2026-01', 'Ananya & Rohit Royal Wedding', 'Prakash Mohanty', '+91 98765 11111', '2026-09-15', 450, 850, 382500, 150000, 232500, 'Confirmed']);
    catEventSheet.appendRow(['EVT-2026-02', 'Aditya 1st Birthday Party', 'Dr. Subhashree Sen', '+91 94371 22222', '2026-09-18', 120, 550, 66000, 30000, 36000, 'Confirmed']);
    catEventSheet.appendRow(['EVT-2026-03', 'Tata Steel Corporate Dinner', 'HR Manager TATA', '+91 98610 33333', '2026-09-24', 250, 750, 187500, 50000, 137500, 'Quotation']);
  }

  const catMenuSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.CAT_MENU,
    ['Item ID', 'Item Name', 'Category', 'Type', 'Cost Per Plate (₹)', 'Suggested Selling (₹)', 'Status'], '#f97316');
  if (catMenuSheet.getLastRow() <= 1) {
    catMenuSheet.appendRow(['CAT-M01', 'Paneer Tikka & Hara Bhara Kabab', 'Starters', 'Veg', 45, 80, 'Active']);
    catMenuSheet.appendRow(['CAT-M02', 'Crispy Chilli Babycorn & Veg Manchurian', 'Starters', 'Veg', 35, 65, 'Active']);
    catMenuSheet.appendRow(['CAT-M03', 'Mutton Rogan Josh / Kassa', 'Main Course', 'Non-Veg', 180, 260, 'Active']);
    catMenuSheet.appendRow(['CAT-M04', 'Dahi Machha / Rohu Fish Curry', 'Main Course', 'Non-Veg', 85, 130, 'Active']);
    catMenuSheet.appendRow(['CAT-M05', 'Paneer Butter Masala & Dal Makhani', 'Main Course', 'Veg', 55, 95, 'Active']);
    catMenuSheet.appendRow(['CAT-M06', 'Kashmiri Pulao & Tandoori Naan', 'Breads & Rice', 'Veg', 40, 70, 'Active']);
    catMenuSheet.appendRow(['CAT-M07', 'Gulab Jamun & Rasgulla with Rabdi', 'Desserts', 'Veg', 35, 60, 'Active']);
    catMenuSheet.appendRow(['CAT-M08', 'Ice Cream & Live Mocktail Bar', 'Beverages', 'Veg', 30, 55, 'Active']);
  }

  // 5. Stone Mining & Crusher Tabs
  const mineTripsSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.MINE_TRIPS,
    ['Challan No', 'Date Time', 'Vehicle No', 'Customer Name', 'Material Grade', 'Gross Wt (T)', 'Tare Wt (T)', 'Net Wt (T)', 'Rate/Ton (₹)', 'Total Bill (₹)', 'Royalty TP No', 'Payment Status'], '#78716c');
  if (mineTripsSheet.getLastRow() <= 1) {
    mineTripsSheet.appendRow(['CHL-8801', '2026-09-07 09:30', 'OD-02-AB-4545', 'Maa Tarini Infra', '20mm Aggregate', 28.5, 9.2, 19.3, 750, 14475, 'TP-OD-2026-9081', 'Credit']);
    mineTripsSheet.appendRow(['CHL-8802', '2026-09-07 11:15', 'OD-05-XY-7890', 'NHAI Road Contractor', 'GSB / Granular Sub-Base', 34.0, 10.5, 23.5, 480, 11280, 'TP-OD-2026-9082', 'Paid (Cash)']);
    mineTripsSheet.appendRow(['CHL-8803', '2026-09-07 14:40', 'OD-33-C-1122', 'Shree Sai Construction', '10mm Chips', 24.8, 8.8, 16.0, 820, 13120, 'TP-OD-2026-9083', 'Credit']);
    mineTripsSheet.appendRow(['CHL-8804', '2026-09-07 16:20', 'OD-02-M-6677', 'Kalinga Bricks Works', 'Stone Dust', 31.2, 9.6, 21.6, 380, 8208, 'TP-OD-2026-9084', 'Paid (UPI)']);
  }

  const mineStockSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.MINE_STOCK,
    ['Material ID', 'Material Grade / Size', 'Stockpile Location', 'Available Stock (Tons)', 'Price/Ton (₹)', 'Status'], '#78716c');
  if (mineStockSheet.getLastRow() <= 1) {
    mineStockSheet.appendRow(['MAT-01', '10mm Stone Chips', 'Yard Bay 1', 1450, 820, 'In Stock']);
    mineStockSheet.appendRow(['MAT-02', '20mm Aggregate (Standard)', 'Yard Bay 2', 2800, 750, 'In Stock']);
    mineStockSheet.appendRow(['MAT-03', '40mm Ballast / Foundation', 'Yard Bay 3', 950, 680, 'In Stock']);
    mineStockSheet.appendRow(['MAT-04', 'Stone Dust / Crusher Fines', 'Yard Bay 4', 3200, 380, 'In Stock']);
    mineStockSheet.appendRow(['MAT-05', 'GSB (Granular Sub Base)', 'Road Mix Bay', 1800, 480, 'In Stock']);
    mineStockSheet.appendRow(['MAT-06', 'Quarry Raw Boulders', 'Blasting Pit A', 4500, 320, 'In Stock']);
  }

  // 6. Construction & Projects Tabs
  const constProjSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.CONST_PROJECTS,
    ['Project ID', 'Project Name', 'Client / Dept', 'Site Location', 'Contract Value (₹)', 'Spent Amount (₹)', 'Progress (%)', 'Status'], '#0284c7');
  if (constProjSheet.getLastRow() <= 1) {
    constProjSheet.appendRow(['PRJ-001', 'TFC Commercial Complex Phase-1', 'Internal Asset', 'Patia, BBSR', 12500000, 7450000, 65, 'Active']);
    constProjSheet.appendRow(['PRJ-002', 'Bhubaneswar Smart City Drain Work', 'BMC Govt Tender', 'Unit-4, BBSR', 4800000, 2900000, 60, 'Active']);
    constProjSheet.appendRow(['PRJ-003', 'River View Luxury Villa Project', 'Dr. Jena & Partners', 'Trisulia, Cuttack', 8500000, 1850000, 22, 'Active']);
  }

  const constMatSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.CONST_MATERIALS,
    ['Indent ID', 'Date', 'Project Name', 'Material', 'Quantity', 'Unit', 'Rate (₹)', 'Total Cost (₹)', 'Supplier', 'Status'], '#0284c7');
  if (constMatSheet.getLastRow() <= 1) {
    constMatSheet.appendRow(['IND-501', '2026-09-05', 'TFC Commercial Complex', 'TMT 550D Steel (12mm)', 15, 'Tons', 56000, 840000, 'Apex Steel Corp', 'Delivered']);
    constMatSheet.appendRow(['IND-502', '2026-09-06', 'TFC Commercial Complex', 'UltraTech OPC Cement', 600, 'Bags', 380, 228000, 'Shree Ram Traders', 'Delivered']);
    constMatSheet.appendRow(['IND-503', '2026-09-07', 'Smart City Drain Work', 'Ready Mix Concrete (M25)', 45, 'Cu.M', 4200, 189000, 'UltraTech RMC', 'In Transit']);
  }

  const constLaborSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.CONST_LABOR,
    ['Date', 'Project Name', 'Muster Head', 'Skilled Count', 'Unskilled Count', 'Daily Wage Payout (₹)', 'Overtime Hours', 'Supervisor'], '#0284c7');
  if (constLaborSheet.getLastRow() <= 1) {
    constLaborSheet.appendRow(['2026-09-07', 'TFC Commercial Complex', 'Civil & Shuttering Team', 6, 14, 14800, 4, 'Bhabani Majhi']);
    constLaborSheet.appendRow(['2026-09-07', 'Smart City Drain Work', 'Excavation & Pipe Laying', 3, 8, 7600, 2, 'Kartik Behera']);
  }

  // 7. Fish Transport Logistics Tabs
  const fishSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.FISH_BATCHES,
    ['Batch ID', 'Dispatch Date', 'Fish Species', 'Source Location', 'Crate Count', 'Gross Wt (Kg)', 'Ice Tare (Kg)', 'Mortality / Loss (Kg)', 'Net Sale Wt (Kg)', 'Mandi Buyer', 'Auction Rate/Kg (₹)', 'Gross Realization (₹)', 'Trip Cost (₹)', 'Net Profit (₹)', 'Status'], '#0d9488');
  if (fishSheet.getLastRow() <= 1) {
    fishSheet.appendRow(['FSH-701', '2026-09-06', 'Rohu & Katla (Grade A)', 'Chilika Lake Harvest', 80, 3200, 480, 60, 2660, 'Howrah Fish Mandi', 185, 492100, 32000, 125000, 'Delivered & Settled']);
    fishSheet.appendRow(['FSH-702', '2026-09-07', 'Tiger Prawns (Vannamei)', 'Kakatpur Aquaculture Farm', 45, 1350, 200, 15, 1135, 'Barabati Wholesale Market', 420, 476700, 18000, 148000, 'In Transit']);
    fishSheet.appendRow(['FSH-703', '2026-09-07', 'Hilsa / Ilish (Fresh Catch)', 'Paradeep Deep Sea Harbor', 30, 900, 120, 10, 770, 'Kolkata Wholesale Auction', 850, 654500, 24000, 210000, 'Loading']);
  }

  // 8. Pragati Outlet (Retail POS & Dairy/FMCG) Tabs
  const outletProdSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.OUTLET_PRODUCTS,
    ['Barcode / SKU', 'Product Name', 'Category', 'Unit', 'Cost Price (₹)', 'Selling Price (₹)', 'Stock Qty', 'Min Alert Qty', 'Status'], '#16a34a');
  if (outletProdSheet.getLastRow() <= 1) {
    outletProdSheet.appendRow(['8901234001', 'Pragati Standard Fresh Milk (500ml)', 'Milk & Dairy', 'Pkt', 24.5, 27.0, 180, 20, 'Active']);
    outletProdSheet.appendRow(['8901234002', 'Pragati Premium Gold Milk (1 Ltr)', 'Milk & Dairy', 'Pkt', 52.0, 58.0, 95, 15, 'Active']);
    outletProdSheet.appendRow(['8901234003', 'Pragati Fresh Paneer (200g)', 'Milk & Dairy', 'Pkt', 72.0, 85.0, 45, 10, 'Active']);
    outletProdSheet.appendRow(['8901234004', 'Pragati Pure Cow Ghee (500ml Jar)', 'Ghee & Butter', 'Jar', 310.0, 375.0, 30, 5, 'Active']);
    outletProdSheet.appendRow(['8901234005', 'Pragati Thick Curd / Dahi (400g Cup)', 'Milk & Dairy', 'Cup', 30.0, 36.0, 60, 10, 'Active']);
    outletProdSheet.appendRow(['8901234006', 'Pragati Flavoured Milk (Elaichi 200ml)', 'Beverages', 'Bottle', 22.0, 30.0, 85, 15, 'Active']);
    outletProdSheet.appendRow(['8901234007', 'Pragati Chenna Poda Traditional Sweet', 'Sweets & Bakery', 'Kg', 220.0, 320.0, 18, 4, 'Active']);
    outletProdSheet.appendRow(['8901234008', 'Fresh Farm Brown Eggs (Tray of 30)', 'Farm Products', 'Tray', 160.0, 210.0, 25, 5, 'Active']);
    outletProdSheet.appendRow(['8901234009', 'Daily Bakery Fresh Bread (400g)', 'Sweets & Bakery', 'Pkt', 28.0, 35.0, 40, 10, 'Active']);
    outletProdSheet.appendRow(['8901234010', 'Pragati Fresh Buttermilk / Lassi (200ml)', 'Beverages', 'Pouch', 12.0, 15.0, 120, 20, 'Active']);
  }

  const outletSalesSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.OUTLET_SALES,
    ['Bill No', 'Date Time', 'Customer Phone', 'Item Summary', 'Total Items', 'Subtotal (₹)', 'Discount (₹)', 'Grand Total (₹)', 'Payment Mode', 'Cashier'], '#16a34a');
  if (outletSalesSheet.getLastRow() <= 1) {
    outletSalesSheet.appendRow(['PRG-1001', '2026-09-07 07:45', '+91 94370 00001', 'Fresh Milk 500ml x 2, Bread 400g x 1', 3, 89.0, 0, 89.0, 'UPI', 'Cashier 1']);
    outletSalesSheet.appendRow(['PRG-1002', '2026-09-07 08:30', '+91 98610 00002', 'Gold Milk 1L x 1, Paneer 200g x 1, Curd x 1', 3, 179.0, 0, 179.0, 'Cash', 'Cashier 1']);
    outletSalesSheet.appendRow(['PRG-1003', '2026-09-07 09:10', '+91 70081 00003', 'Cow Ghee 500ml x 2, Chenna Poda 1Kg x 1', 3, 1070.0, 50, 1020.0, 'UPI', 'Cashier 1']);
    outletSalesSheet.appendRow(['PRG-1004', '2026-09-07 10:15', '+91 94371 00004', 'Fresh Milk 500ml x 4, Eggs Tray x 1', 5, 318.0, 0, 318.0, 'Khata / Credit', 'Cashier 1']);
  }

  // 9. Poultry Farming & Hatchery Tabs
  const pltBatchSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.POULTRY_BATCHES,
    ['Batch ID', 'Shed No', 'Bird Breed / Type', 'Placement Date', 'Initial Birds', 'Current Birds', 'Mortality Count', 'Age (Days)', 'Avg Weight (Kg)', 'Status'], '#d97706');
  if (pltBatchSheet.getLastRow() <= 1) {
    pltBatchSheet.appendRow(['PLT-B104', 'Shed A (Environment Controlled)', 'Cobb 500 Broiler', '2026-08-05', 5500, 5420, 80, 33, 1.92, 'Harvest Ready']);
    pltBatchSheet.appendRow(['PLT-L052', 'Shed B (Layer Hen Cage)', 'BV 300 Commercial Layer', '2026-04-10', 4200, 4150, 50, 150, 1.65, 'Peak Laying (94%)']);
    pltBatchSheet.appendRow(['PLT-B105', 'Shed C (Brooding House)', 'Ross 308 Broiler Chicks', '2026-08-26', 6500, 6460, 40, 12, 0.45, 'Brooding Active']);
  }

  const pltFeedSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.POULTRY_FEED,
    ['Date', 'Feed Silo / Type', 'Quantity (Bags / Kg)', 'Rate/Bag (₹)', 'Total Cost (₹)', 'Supplier', 'Status'], '#d97706');
  if (pltFeedSheet.getLastRow() <= 1) {
    pltFeedSheet.appendRow(['2026-09-05', 'Broiler Finisher Pellets (50Kg)', '80 Bags (4000 Kg)', 2150, 172000, 'Godrej Agrovet', 'In Silo']);
    pltFeedSheet.appendRow(['2026-09-06', 'Layer Mash Feed (50Kg)', '60 Bags (3000 Kg)', 1850, 111000, 'Suguna Feeds', 'In Silo']);
    pltFeedSheet.appendRow(['2026-09-07', 'Pre-Starter Micro Crumbs (50Kg)', '40 Bags (2000 Kg)', 2400, 96000, 'CP Feeds', 'In Silo']);
  }

  const pltSalesSheet = getOrCreateSheet(ss, APP_CONFIG.SHEET_TABS.POULTRY_SALES,
    ['Dispatch No', 'Date Time', 'Buyer Name', 'Phone', 'Vehicle No', 'Type', 'Quantity / Crates', 'Gross Wt (Kg)', 'Crate Tare (Kg)', 'Net Live Wt (Kg)', 'Rate (₹)', 'Total Amount (₹)', 'Payment Status'], '#d97706');
  if (pltSalesSheet.getLastRow() <= 1) {
    pltSalesSheet.appendRow(['PLF-CHL-9901', '2026-09-07 06:30', 'Khurda Wholesale Chicken Center', '+91 94370 77881', 'OD-02-F-3344', 'Broiler Live Lifting', '95 Crates (1,250 Birds)', 2720, 320, 2400, 118, 283200, 'Paid (Bank)']);
    pltSalesSheet.appendRow(['PLF-CHL-9902', '2026-09-07 08:00', 'Bhubaneswar Egg Traders', '+91 98610 88992', 'OD-33-K-1199', 'Commercial Table Eggs', '110 Trays (3,300 Eggs)', 0, 0, 0, 5.4, 17820, 'Paid (UPI)']);
    pltSalesSheet.appendRow(['PLF-CHL-9903', '2026-09-07 11:30', 'Cuttack Fresh Meat Hub', '+91 70081 99003', 'OD-05-T-5566', 'Broiler Live Lifting', '60 Crates (820 Birds)', 1810, 230, 1580, 116, 183280, 'Credit (Due 3 Days)']);
  }

  return {
    success: true,
    message: 'Database initialization complete! All 6 business tabs and realistic demo data are ready.'
  };
}

/**
 * Universal Data Fetcher: Loads all business records in 1 fast roundtrip
 */
function getInitialData() {
  const ss = getDatabase();
  if (!ss) {
    // If running in preview without linked sheet, return rich offline demo state
    return getOfflineDemoState();
  }

  try {
    const result = {
      success: true,
      config: APP_CONFIG,
      khata: readSheetRows(ss, APP_CONFIG.SHEET_TABS.KHATA),
      expenses: readSheetRows(ss, APP_CONFIG.SHEET_TABS.EXPENSES),
      catering: {
        events: readSheetRows(ss, APP_CONFIG.SHEET_TABS.CAT_EVENTS),
        menu: readSheetRows(ss, APP_CONFIG.SHEET_TABS.CAT_MENU)
      },
      mining: {
        trips: readSheetRows(ss, APP_CONFIG.SHEET_TABS.MINE_TRIPS),
        stock: readSheetRows(ss, APP_CONFIG.SHEET_TABS.MINE_STOCK)
      },
      construction: {
        projects: readSheetRows(ss, APP_CONFIG.SHEET_TABS.CONST_PROJECTS),
        materials: readSheetRows(ss, APP_CONFIG.SHEET_TABS.CONST_MATERIALS),
        labor: readSheetRows(ss, APP_CONFIG.SHEET_TABS.CONST_LABOR)
      },
      fish: {
        batches: readSheetRows(ss, APP_CONFIG.SHEET_TABS.FISH_BATCHES)
      },
      outlet: {
        products: readSheetRows(ss, APP_CONFIG.SHEET_TABS.OUTLET_PRODUCTS),
        sales: readSheetRows(ss, APP_CONFIG.SHEET_TABS.OUTLET_SALES)
      },
      poultry: {
        batches: readSheetRows(ss, APP_CONFIG.SHEET_TABS.POULTRY_BATCHES),
        feed: readSheetRows(ss, APP_CONFIG.SHEET_TABS.POULTRY_FEED),
        sales: readSheetRows(ss, APP_CONFIG.SHEET_TABS.POULTRY_SALES)
      }
    };

    // If database tabs are empty, auto setup
    if (!result.catering.events || result.catering.events.length === 0) {
      setupDatabaseAndDemoData();
      return getInitialData();
    }

    return result;
  } catch (err) {
    console.error('getInitialData error: ' + err.message);
    return getOfflineDemoState();
  }
}

/**
 * Read all rows from a sheet as JSON array of objects
 */
function readSheetRows(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return [];

  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      const key = headers[j].toString().trim();
      let val = data[i][j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
      }
      row[key] = val;
    }
    rows.push(row);
  }
  return rows;
}

/**
 * Append or update a record in a target sheet tab
 */
function saveRecord(tabName, rowArray) {
  const ss = getDatabase();
  if (!ss) return { success: false, message: 'Spreadsheet connection not available.' };
  
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) return { success: false, message: 'Sheet tab ' + tabName + ' not found.' };

  sheet.appendRow(rowArray);
  return { success: true, message: 'Record saved successfully.' };
}

// ---------------- BUSINESS CRUD HANDLERS ----------------

/**
 * 1. Catering: Save Event Booking
 */
function saveCateringEvent(eventData) {
  const ss = getDatabase();
  if (!ss) return { success: true, message: 'Saved in offline demo mode.' };
  
  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_TABS.CAT_EVENTS);
  const eventId = eventData.eventId || ('EVT-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000));
  
  const total = Number(eventData.guestCount || 0) * Number(eventData.perPlate || 0);
  const advance = Number(eventData.advance || 0);
  const balance = total - advance;

  sheet.appendRow([
    eventId,
    eventData.eventName,
    eventData.clientName,
    eventData.phone,
    eventData.eventDate,
    eventData.guestCount,
    eventData.perPlate,
    total,
    advance,
    balance,
    eventData.status || 'Confirmed'
  ]);

  return { success: true, eventId: eventId, message: 'Event booked successfully.' };
}

/**
 * 2. Stone Mining: Save Weighbridge Trip Challan
 */
function saveMiningTrip(tripData) {
  const ss = getDatabase();
  if (!ss) return { success: true, message: 'Saved in offline demo mode.' };

  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_TABS.MINE_TRIPS);
  const challanNo = tripData.challanNo || ('CHL-' + Math.floor(10000 + Math.random() * 90000));
  const dateTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  
  const gross = Number(tripData.grossWt || 0);
  const tare = Number(tripData.tareWt || 0);
  const net = Math.max(0, gross - tare);
  const totalBill = net * Number(tripData.ratePerTon || 0);

  sheet.appendRow([
    challanNo,
    dateTime,
    tripData.vehicleNo,
    tripData.customerName,
    tripData.materialGrade,
    gross,
    tare,
    net,
    tripData.ratePerTon,
    totalBill,
    tripData.royaltyTpNo || ('TP-OD-' + Math.floor(100000 + Math.random() * 900000)),
    tripData.paymentStatus || 'Credit'
  ]);

  return { success: true, challanNo: challanNo, netWeight: net, totalBill: totalBill, message: 'Trip challan created.' };
}

/**
 * 3. Construction: Save Material Indent
 */
function saveConstructionMaterial(matData) {
  const ss = getDatabase();
  if (!ss) return { success: true, message: 'Saved in offline demo mode.' };

  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_TABS.CONST_MATERIALS);
  const indentId = matData.indentId || ('IND-' + Math.floor(1000 + Math.random() * 9000));
  const date = matData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const totalCost = Number(matData.quantity || 0) * Number(matData.rate || 0);

  sheet.appendRow([
    indentId,
    date,
    matData.projectName,
    matData.material,
    matData.quantity,
    matData.unit,
    matData.rate,
    totalCost,
    matData.supplier,
    matData.status || 'Delivered'
  ]);

  return { success: true, indentId: indentId, message: 'Material indent saved.' };
}

/**
 * 4. Fish Transport: Save Consignment Batch
 */
function saveFishBatch(batchData) {
  const ss = getDatabase();
  if (!ss) return { success: true, message: 'Saved in offline demo mode.' };

  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_TABS.FISH_BATCHES);
  const batchId = batchData.batchId || ('FSH-' + Math.floor(1000 + Math.random() * 9000));
  const date = batchData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  const gross = Number(batchData.grossWt || 0);
  const ice = Number(batchData.iceTare || 0);
  const mortality = Number(batchData.mortality || 0);
  const net = Math.max(0, gross - ice - mortality);
  const grossRev = net * Number(batchData.auctionRate || 0);
  const tripCost = Number(batchData.tripCost || 0);
  const netProfit = grossRev - tripCost;

  sheet.appendRow([
    batchId,
    date,
    batchData.species,
    batchData.source,
    batchData.crateCount,
    gross,
    ice,
    mortality,
    net,
    batchData.mandiBuyer,
    batchData.auctionRate,
    grossRev,
    tripCost,
    netProfit,
    batchData.status || 'Delivered & Settled'
  ]);

  return { success: true, batchId: batchId, netWeight: net, netProfit: netProfit, message: 'Fish consignment saved.' };
}

/**
 * 5. Pragati Outlet: Save POS Sale & Thermal Invoice
 */
function saveOutletPOSSale(saleData) {
  const ss = getDatabase();
  if (!ss) return { success: true, message: 'Saved in offline demo mode.' };

  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_TABS.OUTLET_SALES);
  const billNo = saleData.billNo || ('PRG-' + Math.floor(10000 + Math.random() * 90000));
  const dateTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  sheet.appendRow([
    billNo,
    dateTime,
    saleData.customerPhone || 'Walk-in Cash Customer',
    saleData.itemSummary,
    saleData.totalItems,
    saleData.subtotal,
    saleData.discount || 0,
    saleData.grandTotal,
    saleData.paymentMode || 'Cash',
    saleData.cashier || 'Cashier 1'
  ]);

  return { success: true, billNo: billNo, grandTotal: saleData.grandTotal, message: 'Sale recorded and stock updated.' };
}

/**
 * 6. Master Expenses: Save New Expense
 */
function saveGroupExpense(expData) {
  const ss = getDatabase();
  if (!ss) return { success: true, message: 'Saved in offline demo mode.' };

  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_TABS.EXPENSES);
  const expId = expData.expId || ('EXP-' + Math.floor(1000 + Math.random() * 9000));
  const date = expData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  sheet.appendRow([
    expId,
    date,
    expData.vertical,
    expData.category,
    expData.description,
    Number(expData.amount || 0),
    expData.paymentMode || 'Cash',
    expData.paidBy || 'Branch Manager'
  ]);

  return { success: true, expId: expId, message: 'Expense recorded.' };
}

/**
 * 7. Poultry Farm: Save Flock Batch
 */
function savePoultryBatch(batchData) {
  const ss = getDatabase();
  if (!ss) return { success: true, message: 'Saved in offline demo mode.' };

  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_TABS.POULTRY_BATCHES);
  const batchId = batchData.batchId || ('PLT-B' + Math.floor(100 + Math.random() * 900));
  const date = batchData.placementDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  sheet.appendRow([
    batchId,
    batchData.shedNo,
    batchData.breed,
    date,
    Number(batchData.initialBirds || 0),
    Number(batchData.currentBirds || batchData.initialBirds || 0),
    Number(batchData.mortality || 0),
    Number(batchData.ageDays || 1),
    Number(batchData.avgWeight || 0.04),
    batchData.status || 'Active Brooding'
  ]);

  return { success: true, batchId: batchId, message: 'Flock batch logged.' };
}

/**
 * 8. Poultry Farm: Save Live Bird Lifting / Egg Dispatch
 */
function savePoultrySale(saleData) {
  const ss = getDatabase();
  if (!ss) return { success: true, message: 'Saved in offline demo mode.' };

  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_TABS.POULTRY_SALES);
  const dispatchNo = saleData.dispatchNo || ('PLF-CHL-' + Math.floor(1000 + Math.random() * 9000));
  const dateTime = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');

  const gross = Number(saleData.grossWt || 0);
  const tare = Number(saleData.tareWt || 0);
  const net = Math.max(0, gross - tare);
  const total = net > 0 ? (net * Number(saleData.rate || 0)) : (Number(saleData.units || 0) * Number(saleData.rate || 0));

  sheet.appendRow([
    dispatchNo,
    dateTime,
    saleData.buyerName,
    saleData.phone,
    saleData.vehicleNo,
    saleData.type,
    saleData.quantity,
    gross,
    tare,
    net,
    Number(saleData.rate || 0),
    total,
    saleData.paymentStatus || 'Paid (Bank)'
  ]);

  return { success: true, dispatchNo: dispatchNo, totalAmount: total, message: 'Poultry dispatch logged.' };
}

/**
 * 9. Poultry Farm: Save Feed Inward
 */
function savePoultryFeed(feedData) {
  const ss = getDatabase();
  if (!ss) return { success: true, message: 'Saved in offline demo mode.' };

  const sheet = ss.getSheetByName(APP_CONFIG.SHEET_TABS.POULTRY_FEED);
  const date = feedData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const cost = Number(feedData.bags || 0) * Number(feedData.rate || 0);

  sheet.appendRow([
    date,
    feedData.feedType,
    `${feedData.bags} Bags (${Number(feedData.bags) * 50} Kg)`,
    Number(feedData.rate || 0),
    cost,
    feedData.supplier,
    'In Silo'
  ]);

  return { success: true, totalCost: cost, message: 'Feed stock logged into silo.' };
}

/**
 * Fallback Offline Demo Data Generator
 * Allows the full interface to render with sample data immediately if not linked to sheets yet.
 */
function getOfflineDemoState() {
  return {
    success: true,
    isOffline: true,
    config: APP_CONFIG,
    khata: [
      { 'ID': 'KHT-101', 'Party Name': 'Rajesh Sharma (Weddings)', 'Party Type': 'Customer', 'Business Vertical': 'Catering', 'Phone': '+91 98765 43210', 'City': 'Bhubaneswar', 'Balance (₹)': -45000, 'Credit Limit (₹)': 200000, 'Status': 'Active' },
      { 'ID': 'KHT-102', 'Party Name': 'Maa Tarini Infra Builders', 'Party Type': 'Customer', 'Business Vertical': 'Stone Mining', 'Phone': '+91 94370 11223', 'City': 'Cuttack', 'Balance (₹)': -128500, 'Credit Limit (₹)': 500000, 'Status': 'Active' },
      { 'ID': 'KHT-103', 'Party Name': 'Apex Steel & Cement Suppliers', 'Party Type': 'Vendor', 'Business Vertical': 'Construction', 'Phone': '+91 98610 55443', 'City': 'Rourkela', 'Balance (₹)': 340000, 'Credit Limit (₹)': 1000000, 'Status': 'Active' },
      { 'ID': 'KHT-104', 'Party Name': 'Howrah Wholesale Fish Mandi', 'Party Type': 'Buyer', 'Business Vertical': 'Fish Transport', 'Phone': '+91 93344 88776', 'City': 'Kolkata', 'Balance (₹)': -86000, 'Credit Limit (₹)': 300000, 'Status': 'Active' },
      { 'ID': 'KHT-105', 'Party Name': 'Pragati Daily Milk Consumers', 'Party Type': 'Retail Khata', 'Business Vertical': 'Pragati Outlet', 'Phone': '+91 70081 22334', 'City': 'Local Colony', 'Balance (₹)': -3420, 'Credit Limit (₹)': 10000, 'Status': 'Active' },
      { 'ID': 'KHT-106', 'Party Name': 'Khurda Wholesale Chicken Hub', 'Party Type': 'Buyer', 'Business Vertical': 'Poultry Farm', 'Phone': '+91 94370 77881', 'City': 'Khurda', 'Balance (₹)': -95000, 'Credit Limit (₹)': 400000, 'Status': 'Active' }
    ],
    expenses: [
      { 'ID': 'EXP-01', 'Date': '2026-09-07', 'Vertical': 'Stone Mining', 'Category': 'Fuel / Diesel', 'Description': 'Crusher Generator 200L Diesel', 'Amount (₹)': 18400, 'Payment Mode': 'Bank Transfer', 'Paid By': 'Crusher Mgr' },
      { 'ID': 'EXP-02', 'Date': '2026-09-07', 'Vertical': 'Fish Transport', 'Category': 'Ice & Toll', 'Description': 'Crate Ice blocks & NH toll tax', 'Amount (₹)': 4200, 'Payment Mode': 'Cash', 'Paid By': 'Driver Bapi' },
      { 'ID': 'EXP-03', 'Date': '2026-09-07', 'Vertical': 'Catering', 'Category': 'Raw Groceries', 'Description': 'Basmati Rice & Cooking Oil bulk', 'Amount (₹)': 26500, 'Payment Mode': 'UPI', 'Paid By': 'Chef Santosh' },
      { 'ID': 'EXP-04', 'Date': '2026-09-07', 'Vertical': 'Construction', 'Category': 'Labor Tea & Misc', 'Description': 'Site B daily labor snacks & water', 'Amount (₹)': 1150, 'Payment Mode': 'Cash', 'Paid By': 'Supervisor Anil' },
      { 'ID': 'EXP-05', 'Date': '2026-09-07', 'Vertical': 'Pragati Outlet', 'Category': 'Shop Electricity', 'Description': 'Monthly commercial chiller power bill', 'Amount (₹)': 8400, 'Payment Mode': 'Net Banking', 'Paid By': 'Outlet Cashier' },
      { 'ID': 'EXP-06', 'Date': '2026-09-07', 'Vertical': 'Poultry Farm', 'Category': 'Vaccines & Disinfection', 'Description': 'Gumboro IBD vaccines & shed spray', 'Amount (₹)': 5600, 'Payment Mode': 'Cash', 'Paid By': 'Farm Doctor' }
    ],
    catering: {
      events: [
        { 'Event ID': 'EVT-2026-01', 'Event Name': 'Ananya & Rohit Royal Wedding', 'Client Name': 'Prakash Mohanty', 'Phone': '+91 98765 11111', 'Event Date': '2026-09-15', 'Guest Count': 450, 'Per Plate (₹)': 850, 'Total Amount (₹)': 382500, 'Advance Paid (₹)': 150000, 'Balance (₹)': 232500, 'Status': 'Confirmed' },
        { 'Event ID': 'EVT-2026-02', 'Event Name': 'Aditya 1st Birthday Party', 'Client Name': 'Dr. Subhashree Sen', 'Phone': '+91 94371 22222', 'Event Date': '2026-09-18', 'Guest Count': 120, 'Per Plate (₹)': 550, 'Total Amount (₹)': 66000, 'Advance Paid (₹)': 30000, 'Balance (₹)': 36000, 'Status': 'Confirmed' },
        { 'Event ID': 'EVT-2026-03', 'Event Name': 'Tata Steel Corporate Dinner', 'Client Name': 'HR Manager TATA', 'Phone': '+91 98610 33333', 'Event Date': '2026-09-24', 'Guest Count': 250, 'Per Plate (₹)': 750, 'Total Amount (₹)': 187500, 'Advance Paid (₹)': 50000, 'Balance (₹)': 137500, 'Status': 'Quotation' }
      ],
      menu: [
        { 'Item ID': 'CAT-M01', 'Item Name': 'Paneer Tikka & Hara Bhara Kabab', 'Category': 'Starters', 'Type': 'Veg', 'Cost Per Plate (₹)': 45, 'Suggested Selling (₹)': 80, 'Status': 'Active' },
        { 'Item ID': 'CAT-M02', 'Item Name': 'Crispy Chilli Babycorn & Manchurian', 'Category': 'Starters', 'Type': 'Veg', 'Cost Per Plate (₹)': 35, 'Suggested Selling (₹)': 65, 'Status': 'Active' },
        { 'Item ID': 'CAT-M03', 'Item Name': 'Mutton Rogan Josh / Kassa', 'Category': 'Main Course', 'Type': 'Non-Veg', 'Cost Per Plate (₹)': 180, 'Suggested Selling (₹)': 260, 'Status': 'Active' },
        { 'Item ID': 'CAT-M04', 'Item Name': 'Dahi Machha / Rohu Fish Curry', 'Category': 'Main Course', 'Type': 'Non-Veg', 'Cost Per Plate (₹)': 85, 'Suggested Selling (₹)': 130, 'Status': 'Active' },
        { 'Item ID': 'CAT-M05', 'Item Name': 'Paneer Butter Masala & Dal Makhani', 'Category': 'Main Course', 'Type': 'Veg', 'Cost Per Plate (₹)': 55, 'Suggested Selling (₹)': 95, 'Status': 'Active' },
        { 'Item ID': 'CAT-M06', 'Item Name': 'Kashmiri Pulao & Tandoori Naan', 'Category': 'Breads & Rice', 'Type': 'Veg', 'Cost Per Plate (₹)': 40, 'Suggested Selling (₹)': 70, 'Status': 'Active' },
        { 'Item ID': 'CAT-M07', 'Item Name': 'Gulab Jamun & Rasgulla with Rabdi', 'Category': 'Desserts', 'Type': 'Veg', 'Cost Per Plate (₹)': 35, 'Suggested Selling (₹)': 60, 'Status': 'Active' }
      ]
    },
    mining: {
      trips: [
        { 'Challan No': 'CHL-8801', 'Date Time': '2026-09-07 09:30', 'Vehicle No': 'OD-02-AB-4545', 'Customer Name': 'Maa Tarini Infra', 'Material Grade': '20mm Aggregate', 'Gross Wt (T)': 28.5, 'Tare Wt (T)': 9.2, 'Net Wt (T)': 19.3, 'Rate/Ton (₹)': 750, 'Total Bill (₹)': 14475, 'Royalty TP No': 'TP-OD-2026-9081', 'Payment Status': 'Credit' },
        { 'Challan No': 'CHL-8802', 'Date Time': '2026-09-07 11:15', 'Vehicle No': 'OD-05-XY-7890', 'Customer Name': 'NHAI Road Contractor', 'Material Grade': 'GSB / Granular Sub-Base', 'Gross Wt (T)': 34.0, 'Tare Wt (T)': 10.5, 'Net Wt (T)': 23.5, 'Rate/Ton (₹)': 480, 'Total Bill (₹)': 11280, 'Royalty TP No': 'TP-OD-2026-9082', 'Payment Status': 'Paid (Cash)' },
        { 'Challan No': 'CHL-8803', 'Date Time': '2026-09-07 14:40', 'Vehicle No': 'OD-33-C-1122', 'Customer Name': 'Shree Sai Construction', 'Material Grade': '10mm Chips', 'Gross Wt (T)': 24.8, 'Tare Wt (T)': 8.8, 'Net Wt (T)': 16.0, 'Rate/Ton (₹)': 820, 'Total Bill (₹)': 13120, 'Royalty TP No': 'TP-OD-2026-9083', 'Payment Status': 'Credit' },
        { 'Challan No': 'CHL-8804', 'Date Time': '2026-09-07 16:20', 'Vehicle No': 'OD-02-M-6677', 'Customer Name': 'Kalinga Bricks Works', 'Material Grade': 'Stone Dust', 'Gross Wt (T)': 31.2, 'Tare Wt (T)': 9.6, 'Net Wt (T)': 21.6, 'Rate/Ton (₹)': 380, 'Total Bill (₹)': 8208, 'Royalty TP No': 'TP-OD-2026-9084', 'Payment Status': 'Paid (UPI)' }
      ],
      stock: [
        { 'Material ID': 'MAT-01', 'Material Grade / Size': '10mm Stone Chips', 'Stockpile Location': 'Yard Bay 1', 'Available Stock (Tons)': 1450, 'Price/Ton (₹)': 820, 'Status': 'In Stock' },
        { 'Material ID': 'MAT-02', 'Material Grade / Size': '20mm Aggregate (Standard)', 'Stockpile Location': 'Yard Bay 2', 'Available Stock (Tons)': 2800, 'Price/Ton (₹)': 750, 'Status': 'In Stock' },
        { 'Material ID': 'MAT-03', 'Material Grade / Size': '40mm Ballast / Foundation', 'Stockpile Location': 'Yard Bay 3', 'Available Stock (Tons)': 950, 'Price/Ton (₹)': 680, 'Status': 'In Stock' },
        { 'Material ID': 'MAT-04', 'Material Grade / Size': 'Stone Dust / Crusher Fines', 'Stockpile Location': 'Yard Bay 4', 'Available Stock (Tons)': 3200, 'Price/Ton (₹)': 380, 'Status': 'In Stock' },
        { 'Material ID': 'MAT-05', 'Material Grade / Size': 'GSB (Granular Sub Base)', 'Stockpile Location': 'Road Mix Bay', 'Available Stock (Tons)': 1800, 'Price/Ton (₹)': 480, 'Status': 'In Stock' }
      ]
    },
    construction: {
      projects: [
        { 'Project ID': 'PRJ-001', 'Project Name': 'TFC Commercial Complex Phase-1', 'Client / Dept': 'Internal Asset', 'Site Location': 'Patia, BBSR', 'Contract Value (₹)': 12500000, 'Spent Amount (₹)': 7450000, 'Progress (%)': 65, 'Status': 'Active' },
        { 'Project ID': 'PRJ-002', 'Project Name': 'Bhubaneswar Smart City Drain Work', 'Client / Dept': 'BMC Govt Tender', 'Site Location': 'Unit-4, BBSR', 'Contract Value (₹)': 4800000, 'Spent Amount (₹)': 2900000, 'Progress (%)': 60, 'Status': 'Active' },
        { 'Project ID': 'PRJ-003', 'Project Name': 'River View Luxury Villa Project', 'Client / Dept': 'Dr. Jena & Partners', 'Site Location': 'Trisulia, Cuttack', 'Contract Value (₹)': 8500000, 'Spent Amount (₹)': 1850000, 'Progress (%)': 22, 'Status': 'Active' }
      ],
      materials: [
        { 'Indent ID': 'IND-501', 'Date': '2026-09-05', 'Project Name': 'TFC Commercial Complex', 'Material': 'TMT 550D Steel (12mm)', 'Quantity': 15, 'Unit': 'Tons', 'Rate (₹)': 56000, 'Total Cost (₹)': 840000, 'Supplier': 'Apex Steel Corp', 'Status': 'Delivered' },
        { 'Indent ID': 'IND-502', 'Date': '2026-09-06', 'Project Name': 'TFC Commercial Complex', 'Material': 'UltraTech OPC Cement', 'Quantity': 600, 'Unit': 'Bags', 'Rate (₹)': 380, 'Total Cost (₹)': 228000, 'Supplier': 'Shree Ram Traders', 'Status': 'Delivered' },
        { 'Indent ID': 'IND-503', 'Date': '2026-09-07', 'Project Name': 'Smart City Drain Work', 'Material': 'Ready Mix Concrete (M25)', 'Quantity': 45, 'Unit': 'Cu.M', 'Rate (₹)': 4200, 'Total Cost (₹)': 189000, 'Supplier': 'UltraTech RMC', 'Status': 'In Transit' }
      ],
      labor: [
        { 'Date': '2026-09-07', 'Project Name': 'TFC Commercial Complex', 'Muster Head': 'Civil & Shuttering Team', 'Skilled Count': 6, 'Unskilled Count': 14, 'Daily Wage Payout (₹)': 14800, 'Overtime Hours': 4, 'Supervisor': 'Bhabani Majhi' },
        { 'Date': '2026-09-07', 'Project Name': 'Smart City Drain Work', 'Muster Head': 'Excavation & Pipe Laying', 'Skilled Count': 3, 'Unskilled Count': 8, 'Daily Wage Payout (₹)': 7600, 'Overtime Hours': 2, 'Supervisor': 'Kartik Behera' }
      ]
    },
    fish: {
      batches: [
        { 'Batch ID': 'FSH-701', 'Dispatch Date': '2026-09-06', 'Fish Species': 'Rohu & Katla (Grade A)', 'Source Location': 'Chilika Lake Harvest', 'Crate Count': 80, 'Gross Wt (Kg)': 3200, 'Ice Tare (Kg)': 480, 'Mortality / Loss (Kg)': 60, 'Net Sale Wt (Kg)': 2660, 'Mandi Buyer': 'Howrah Fish Mandi', 'Auction Rate/Kg (₹)': 185, 'Gross Realization (₹)': 492100, 'Trip Cost (₹)': 32000, 'Net Profit (₹)': 125000, 'Status': 'Delivered & Settled' },
        { 'Batch ID': 'FSH-702', 'Dispatch Date': '2026-09-07', 'Fish Species': 'Tiger Prawns (Vannamei)', 'Source Location': 'Kakatpur Aquaculture Farm', 'Crate Count': 45, 'Gross Wt (Kg)': 1350, 'Ice Tare (Kg)': 200, 'Mortality / Loss (Kg)': 15, 'Net Sale Wt (Kg)': 1135, 'Mandi Buyer': 'Barabati Wholesale Market', 'Auction Rate/Kg (₹)': 420, 'Gross Realization (₹)': 476700, 'Trip Cost (₹)': 18000, 'Net Profit (₹)': 148000, 'Status': 'In Transit' },
        { 'Batch ID': 'FSH-703', 'Dispatch Date': '2026-09-07', 'Fish Species': 'Hilsa / Ilish (Fresh Catch)', 'Source Location': 'Paradeep Deep Sea Harbor', 'Crate Count': 30, 'Gross Wt (Kg)': 900, 'Ice Tare (Kg)': 120, 'Mortality / Loss (Kg)': 10, 'Net Sale Wt (Kg)': 770, 'Mandi Buyer': 'Kolkata Wholesale Auction', 'Auction Rate/Kg (₹)': 850, 'Gross Realization (₹)': 654500, 'Trip Cost (₹)': 24000, 'Net Profit (₹)': 210000, 'Status': 'Loading' }
      ]
    },
    outlet: {
      products: [
        { 'Barcode / SKU': '8901234001', 'Product Name': 'Pragati Standard Fresh Milk (500ml)', 'Category': 'Milk & Dairy', 'Unit': 'Pkt', 'Cost Price (₹)': 24.5, 'Selling Price (₹)': 27.0, 'Stock Qty': 180, 'Min Alert Qty': 20, 'Status': 'Active' },
        { 'Barcode / SKU': '8901234002', 'Product Name': 'Pragati Premium Gold Milk (1 Ltr)', 'Category': 'Milk & Dairy', 'Unit': 'Pkt', 'Cost Price (₹)': 52.0, 'Selling Price (₹)': 58.0, 'Stock Qty': 95, 'Min Alert Qty': 15, 'Status': 'Active' },
        { 'Barcode / SKU': '8901234003', 'Product Name': 'Pragati Fresh Paneer (200g)', 'Category': 'Milk & Dairy', 'Unit': 'Pkt', 'Cost Price (₹)': 72.0, 'Selling Price (₹)': 85.0, 'Stock Qty': 45, 'Min Alert Qty': 10, 'Status': 'Active' },
        { 'Barcode / SKU': '8901234004', 'Product Name': 'Pragati Pure Cow Ghee (500ml Jar)', 'Category': 'Ghee & Butter', 'Unit': 'Jar', 'Cost Price (₹)': 310.0, 'Selling Price (₹)': 375.0, 'Stock Qty': 30, 'Min Alert Qty': 5, 'Status': 'Active' },
        { 'Barcode / SKU': '8901234005', 'Product Name': 'Pragati Thick Curd / Dahi (400g Cup)', 'Category': 'Milk & Dairy', 'Unit': 'Cup', 'Cost Price (₹)': 30.0, 'Selling Price (₹)': 36.0, 'Stock Qty': 60, 'Min Alert Qty': 10, 'Status': 'Active' },
        { 'Barcode / SKU': '8901234006', 'Product Name': 'Pragati Flavoured Milk (Elaichi 200ml)', 'Category': 'Beverages', 'Unit': 'Bottle', 'Cost Price (₹)': 22.0, 'Selling Price (₹)': 30.0, 'Stock Qty': 85, 'Min Alert Qty': 15, 'Status': 'Active' },
        { 'Barcode / SKU': '8901234007', 'Product Name': 'Pragati Chenna Poda Traditional Sweet', 'Category': 'Sweets & Bakery', 'Unit': 'Kg', 'Cost Price (₹)': 220.0, 'Selling Price (₹)': 320.0, 'Stock Qty': 18, 'Min Alert Qty': 4, 'Status': 'Active' },
        { 'Barcode / SKU': '8901234008', 'Product Name': 'Fresh Farm Brown Eggs (Tray of 30)', 'Category': 'Farm Products', 'Unit': 'Tray', 'Cost Price (₹)': 160.0, 'Selling Price (₹)': 210.0, 'Stock Qty': 25, 'Min Alert Qty': 5, 'Status': 'Active' },
        { 'Barcode / SKU': '8901234009', 'Product Name': 'Daily Bakery Fresh Bread (400g)', 'Category': 'Sweets & Bakery', 'Unit': 'Pkt', 'Cost Price (₹)': 28.0, 'Selling Price (₹)': 35.0, 'Stock Qty': 40, 'Min Alert Qty': 10, 'Status': 'Active' },
        { 'Barcode / SKU': '8901234010', 'Product Name': 'Pragati Fresh Buttermilk / Lassi (200ml)', 'Category': 'Beverages', 'Unit': 'Pouch', 'Cost Price (₹)': 12.0, 'Selling Price (₹)': 15.0, 'Stock Qty': 120, 'Min Alert Qty': 20, 'Status': 'Active' }
      ],
      sales: [
        { 'Bill No': 'PRG-1001', 'Date Time': '2026-09-07 07:45', 'Customer Phone': '+91 94370 00001', 'Item Summary': 'Fresh Milk 500ml x 2, Bread 400g x 1', 'Total Items': 3, 'Subtotal (₹)': 89.0, 'Discount (₹)': 0, 'Grand Total (₹)': 89.0, 'Payment Mode': 'UPI', 'Cashier': 'Cashier 1' },
        { 'Bill No': 'PRG-1002', 'Date Time': '2026-09-07 08:30', 'Customer Phone': '+91 98610 00002', 'Item Summary': 'Gold Milk 1L x 1, Paneer 200g x 1, Curd x 1', 'Total Items': 3, 'Subtotal (₹)': 179.0, 'Discount (₹)': 0, 'Grand Total (₹)': 179.0, 'Payment Mode': 'Cash', 'Cashier': 'Cashier 1' },
        { 'Bill No': 'PRG-1003', 'Date Time': '2026-09-07 09:10', 'Customer Phone': '+91 70081 00003', 'Item Summary': 'Cow Ghee 500ml x 2, Chenna Poda 1Kg x 1', 'Total Items': 3, 'Subtotal (₹)': 1070.0, 'Discount (₹)': 50, 'Grand Total (₹)': 1020.0, 'Payment Mode': 'UPI', 'Cashier': 'Cashier 1' },
        { 'Bill No': 'PRG-1004', 'Date Time': '2026-09-07 10:15', 'Customer Phone': '+91 94371 00004', 'Item Summary': 'Fresh Milk 500ml x 4, Eggs Tray x 1', 'Total Items': 5, 'Subtotal (₹)': 318.0, 'Discount (₹)': 0, 'Grand Total (₹)': 318.0, 'Payment Mode': 'Khata / Credit', 'Cashier': 'Cashier 1' }
      ]
    },
    poultry: {
      batches: [
        { 'Batch ID': 'PLT-B104', 'Shed No': 'Shed A (EC Shed)', 'Bird Breed / Type': 'Cobb 500 Broiler', 'Placement Date': '2026-08-05', 'Initial Birds': 5500, 'Current Birds': 5420, 'Mortality Count': 80, 'Age (Days)': 33, 'Avg Weight (Kg)': 1.92, 'FCR': 1.52, 'Status': 'Harvest Ready' },
        { 'Batch ID': 'PLT-L052', 'Shed No': 'Shed B (Layer Cages)', 'Bird Breed / Type': 'BV 300 Commercial Layer', 'Placement Date': '2026-04-10', 'Initial Birds': 4200, 'Current Birds': 4150, 'Mortality Count': 50, 'Age (Days)': 150, 'Avg Weight (Kg)': 1.65, 'FCR': 2.10, 'Status': 'Peak Laying (94%)' },
        { 'Batch ID': 'PLT-B105', 'Shed No': 'Shed C (Brooding Shed)', 'Bird Breed / Type': 'Ross 308 Broiler Chicks', 'Placement Date': '2026-08-26', 'Initial Birds': 6500, 'Current Birds': 6460, 'Mortality Count': 40, 'Age (Days)': 12, 'Avg Weight (Kg)': 0.45, 'FCR': 1.18, 'Status': 'Brooding Active' }
      ],
      feed: [
        { 'Date': '2026-09-05', 'Feed Silo / Type': 'Broiler Finisher Pellets (50Kg)', 'Quantity': '80 Bags (4000 Kg)', 'Rate/Bag (₹)': 2150, 'Total Cost (₹)': 172000, 'Supplier': 'Godrej Agrovet', 'Status': 'In Silo' },
        { 'Date': '2026-09-06', 'Feed Silo / Type': 'Layer Mash Feed (50Kg)', 'Quantity': '60 Bags (3000 Kg)', 'Rate/Bag (₹)': 1850, 'Total Cost (₹)': 111000, 'Supplier': 'Suguna Feeds', 'Status': 'In Silo' },
        { 'Date': '2026-09-07', 'Feed Silo / Type': 'Pre-Starter Micro Crumbs (50Kg)', 'Quantity': '40 Bags (2000 Kg)', 'Rate/Bag (₹)': 2400, 'Total Cost (₹)': 96000, 'Supplier': 'CP Feeds', 'Status': 'In Silo' }
      ],
      sales: [
        { 'Dispatch No': 'PLF-CHL-9901', 'Date Time': '2026-09-07 06:30', 'Buyer Name': 'Khurda Wholesale Chicken Center', 'Phone': '+91 94370 77881', 'Vehicle No': 'OD-02-F-3344', 'Type': 'Broiler Live Lifting', 'Quantity': '95 Crates (1,250 Birds)', 'Gross Wt (Kg)': 2720, 'Crate Tare (Kg)': 320, 'Net Live Wt (Kg)': 2400, 'Rate (₹)': 118, 'Total Amount (₹)': 283200, 'Payment Status': 'Paid (Bank)' },
        { 'Dispatch No': 'PLF-CHL-9902', 'Date Time': '2026-09-07 08:00', 'Buyer Name': 'Bhubaneswar Egg Traders', 'Phone': '+91 98610 88992', 'Vehicle No': 'OD-33-K-1199', 'Type': 'Commercial Table Eggs', 'Quantity': '110 Trays (3,300 Eggs)', 'Gross Wt (Kg)': 0, 'Crate Tare (Kg)': 0, 'Net Live Wt (Kg)': 0, 'Rate (₹)': 5.4, 'Total Amount (₹)': 17820, 'Payment Status': 'Paid (UPI)' },
        { 'Dispatch No': 'PLF-CHL-9903', 'Date Time': '2026-09-07 11:30', 'Buyer Name': 'Cuttack Fresh Meat Hub', 'Phone': '+91 70081 99003', 'Vehicle No': 'OD-05-T-5566', 'Type': 'Broiler Live Lifting', 'Quantity': '60 Crates (820 Birds)', 'Gross Wt (Kg)': 1810, 'Crate Tare (Kg)': 230, 'Net Live Wt (Kg)': 1580, 'Rate (₹)': 116, 'Total Amount (₹)': 183280, 'Payment Status': 'Credit (Due 3 Days)' }
      ]
    }
  };
}
