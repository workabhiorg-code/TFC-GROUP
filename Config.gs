/**
 * ============================================================================
 * TFC GROUP — CENTRALIZED CONFIGURATION (Config.gs)
 * ============================================================================
 * Defines global constants, business priority hierarchy, Google Sheets tab
 * names, transaction statuses, payment modes, role definitions, and ID prefixes.
 * 
 * Target Runtime: Google Apps Script (V8 Engine)
 * Timezone: Asia/Kolkata
 * ============================================================================
 */

const TFC_CONFIG = Object.freeze({
  // Application Metadata
  APP: Object.freeze({
    NAME: 'TFC Group POS & ERP',
    VERSION: '2.1.0',
    TIMEZONE: 'Asia/Kolkata',
    CURRENCY_SYMBOL: '₹',
    CURRENCY_CODE: 'INR',
    LOCALE: 'en-IN',
    PRIMARY_COLOR: '#ff751f',
    FISH_COLOR: '#0d9488'
  }),

  // Strict Business Priority Order
  BUSINESS_PRIORITY: Object.freeze([
    Object.freeze({ rank: 1, id: 'FISH', code: 'FISH_TRANSPORT', name: 'Fish Transport & Cold Logistics', isFlagship: true }),
    Object.freeze({ rank: 2, id: 'CAT', code: 'CATERING', name: 'Catering & Event Management', isFlagship: false }),
    Object.freeze({ rank: 3, id: 'MINE', code: 'STONE_CRUSHING', name: 'Stone Mining & Crusher Operations', isFlagship: false }),
    Object.freeze({ rank: 4, id: 'CONST', code: 'CONSTRUCTION', name: 'Construction & Project Contracting', isFlagship: false }),
    Object.freeze({ rank: 5, id: 'OUTLET', code: 'PRAGATI_OUTLET', name: 'Pragati Outlet (Retail POS & Dairy)', isFlagship: false }),
    Object.freeze({ rank: 6, id: 'PLT', code: 'POULTRY', name: 'Poultry Farming & Hatchery', isFlagship: false })
  ]),

  // Business Verticals Identifiers
  BUSINESS_VERTICALS: Object.freeze({
    FISH_TRANSPORT: 'Fish Transport',
    CATERING: 'Catering',
    STONE_CRUSHING: 'Stone Mining',
    CONSTRUCTION: 'Construction',
    PRAGATI_OUTLET: 'Pragati Outlet',
    POULTRY: 'Poultry Farm',
    GROUP_HQ: 'Consolidated HQ'
  }),

  // Google Sheets Tab Names
  SHEETS: Object.freeze({
    // System & Shared Masters
    SETTINGS: 'CFG_Settings',
    AUDIT_LOG: 'SYS_AUDIT_LOG',
    USERS: 'SYS_Users',
    KHATA: 'MST_Khata',
    EXPENSES: 'MST_Expenses',

    // Legacy Fish Batch (Preserved)
    LEGACY_FISH_BATCHES: 'FISH_Batches',

    // Flagship Fish ERP Schemas
    FISH_SPECIES: 'FISH_Species',
    FISH_GRADES: 'FISH_Grades',
    FISH_RATES: 'FISH_Rates',
    FISH_SUPPLIERS: 'FISH_Suppliers',
    FISH_MANDIS: 'FISH_Mandis',
    FISH_DESTINATIONS: 'FISH_Destinations',
    FISH_SUPPLIER_LEDGER: 'FISH_Supplier_Ledger',
    FISH_PROCUREMENT: 'FISH_Procurement',
    FISH_PROCUREMENT_ITEMS: 'FISH_Procurement_Items',
    FISH_LOTS: 'FISH_Lots',
    FISH_VEHICLES: 'FISH_Vehicles',
    FISH_DRIVERS: 'FISH_Drivers',
    FISH_TRIPS: 'FISH_Trips',
    FISH_SHIPMENTS: 'FISH_Shipments',
    FISH_SELLERS: 'FISH_Sellers',
    FISH_SELLER_LEDGER: 'FISH_Seller_Ledger',
    FISH_DISTRIBUTION: 'FISH_Distribution',
    FISH_SALES: 'FISH_Sales',
    FISH_SALE_ITEMS: 'FISH_Sale_Items',
    FISH_INVOICES: 'FISH_Invoices',
    FISH_INVOICE_ITEMS: 'FISH_Invoice_Items',
    FISH_PAYMENTS: 'FISH_Payments',
    FISH_EXPENSES: 'FISH_Expenses',
    FISH_WASTAGE: 'FISH_Wastage',
    FISH_ADJUSTMENTS: 'FISH_Adjustments',
    FISH_DAILY_CLOSING: 'FISH_Daily_Closing',

    // Other Existing Business Sheets (Preserved)
    CAT_EVENTS: 'CAT_Events',
    CAT_MENU: 'CAT_Menu_Items',
    MINE_TRIPS: 'MINE_Trips',
    MINE_STOCK: 'MINE_Stock',
    CONST_PROJECTS: 'CONST_Projects',
    CONST_MATERIALS: 'CONST_Materials',
    CONST_LABOR: 'CONST_Labor',
    OUTLET_PRODUCTS: 'OUTLET_Products',
    OUTLET_SALES: 'OUTLET_Sales',
    POULTRY_BATCHES: 'PLT_Batches',
    POULTRY_FEED: 'PLT_Feed',
    POULTRY_SALES: 'PLT_Sales'
  }),

  // Standard Transaction & Master ID Prefixes
  ID_PREFIXES: Object.freeze({
    AUDIT: 'AUD',
    FISH_SPECIES: 'FSH-SPC',
    FISH_GRADE: 'FSH-GRD',
    FISH_RATE: 'FSH-RAT',
    FISH_SUPPLIER: 'FSH-SUP',
    FISH_MANDI: 'FSH-MND',
    FISH_SELLER: 'FSH-SLR',
    FISH_VEHICLE: 'FSH-VEH',
    FISH_DRIVER: 'FSH-DRV',
    FISH_DESTINATION: 'FSH-DST',
    FISH_PURCHASE: 'FSH-PUR',
    FISH_LOT: 'FSH-LOT',
    FISH_TRIP: 'FSH-TRP',
    FISH_SHIPMENT: 'FSH-SHP',
    FISH_DISTRIBUTION: 'FSH-DST',
    FISH_INVOICE: 'FSH-INV',
    FISH_PAYMENT: 'FSH-PAY',
    FISH_EXPENSE: 'FSH-EXP',
    FISH_WASTAGE: 'FSH-WST',
    FISH_ADJUSTMENT: 'FSH-ADJ',
    FISH_CLOSING: 'FSH-CLS'
  }),

  // Fish Supply Chain Lifecycle Statuses
  LIFECYCLE_STATUS: Object.freeze({
    // Procurement
    PROCUREMENT: Object.freeze({
      DRAFT: 'DRAFT',
      RECORDED: 'RECORDED',
      WEIGHED: 'WEIGHED',
      LOT_CREATED: 'LOT_CREATED',
      SETTLED: 'SETTLED',
      CANCELLED: 'CANCELLED'
    }),
    // Lot Tracking
    LOT: Object.freeze({
      ACTIVE: 'ACTIVE',
      IN_TRANSIT: 'IN_TRANSIT',
      ARRIVED: 'ARRIVED',
      DISTRIBUTING: 'DISTRIBUTING',
      EXHAUSTED: 'EXHAUSTED',
      CLOSED: 'CLOSED'
    }),
    // Transport & Logistics
    SHIPMENT: Object.freeze({
      CREATED: 'CREATED',
      LOADED: 'LOADED',
      DISPATCHED: 'DISPATCHED',
      IN_TRANSIT: 'IN_TRANSIT',
      ARRIVED: 'ARRIVED',
      UNLOADED: 'UNLOADED',
      DISTRIBUTING: 'DISTRIBUTING',
      COMPLETED: 'COMPLETED',
      CLOSED: 'CLOSED',
      CANCELLED: 'CANCELLED'
    }),
    // Invoicing & Sales
    INVOICE: Object.freeze({
      ISSUED: 'ISSUED',
      PAID: 'PAID',
      PARTIAL: 'PARTIAL',
      OVERDUE: 'OVERDUE',
      ADJUSTED: 'ADJUSTED',
      CANCELLED: 'CANCELLED'
    }),
    // Daily Closing
    DAILY_CLOSING: Object.freeze({
      OPEN: 'OPEN',
      SUBMITTED: 'SUBMITTED',
      CLOSED: 'CLOSED',
      REOPENED: 'REOPENED'
    })
  }),

  // Permitted Status Transitions
  STATUS_TRANSITIONS: Object.freeze({
    SHIPMENT: Object.freeze({
      CREATED: ['LOADED', 'CANCELLED'],
      LOADED: ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['IN_TRANSIT', 'ARRIVED', 'CANCELLED'],
      IN_TRANSIT: ['ARRIVED'],
      ARRIVED: ['UNLOADED', 'DISTRIBUTING'],
      UNLOADED: ['DISTRIBUTING', 'COMPLETED'],
      DISTRIBUTING: ['COMPLETED'],
      COMPLETED: ['CLOSED'],
      CLOSED: [],
      CANCELLED: []
    }),
    PROCUREMENT: Object.freeze({
      DRAFT: ['RECORDED', 'CANCELLED'],
      RECORDED: ['WEIGHED', 'LOT_CREATED', 'CANCELLED'],
      WEIGHED: ['LOT_CREATED', 'SETTLED', 'CANCELLED'],
      LOT_CREATED: ['SETTLED'],
      SETTLED: [],
      CANCELLED: []
    })
  }),

  // Accepted Payment Modes
  PAYMENT_MODES: Object.freeze([
    'Cash',
    'UPI',
    'Bank Transfer',
    'NEFT',
    'RTGS',
    'Cheque',
    'Khata Credit',
    'Other'
  ]),

  // User Roles
  ROLES: Object.freeze({
    SUPER_ADMIN: 'Super Admin',
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    PROCUREMENT_STAFF: 'Procurement Staff',
    BILLING_STAFF: 'Billing Staff',
    COLLECTION_STAFF: 'Collection Staff',
    TRANSPORT_STAFF: 'Transport Staff',
    ACCOUNTANT: 'Accountant',
    VIEWER: 'Viewer'
  }),

  // Permission Action Identifiers
  ACTIONS: Object.freeze({
    // Procurement
    PROCURE_CREATE: 'PROCURE_CREATE',
    PROCURE_EDIT: 'PROCURE_EDIT',
    PROCURE_CANCEL: 'PROCURE_CANCEL',
    PROCURE_APPROVE_RATE: 'PROCURE_APPROVE_RATE',

    // Lots & Logistics
    LOT_CREATE: 'LOT_CREATE',
    LOT_SPLIT: 'LOT_SPLIT',
    SHIPMENT_DISPATCH: 'SHIPMENT_DISPATCH',
    SHIPMENT_ARRIVE: 'SHIPMENT_ARRIVE',
    WASTAGE_RECORD: 'WASTAGE_RECORD',

    // Distribution & Billing
    DISTRIBUTE_LOT: 'DISTRIBUTE_LOT',
    INVOICE_CREATE: 'INVOICE_CREATE',
    INVOICE_CANCEL: 'INVOICE_CANCEL',
    INVOICE_PRINT_THERMAL: 'INVOICE_PRINT_THERMAL',
    INVOICE_PRINT_A4: 'INVOICE_PRINT_A4',
    ADJUSTMENT_CREATE: 'ADJUSTMENT_CREATE',
    ADJUSTMENT_APPROVE: 'ADJUSTMENT_APPROVE',

    // Financials & Collections
    PAYMENT_COLLECT: 'PAYMENT_COLLECT',
    PAYMENT_REFUND: 'PAYMENT_REFUND',
    EXPENSE_RECORD: 'EXPENSE_RECORD',
    LEDGER_VIEW: 'LEDGER_VIEW',

    // Master Data Operations
    MASTER_CREATE: 'MASTER_CREATE',
    MASTER_EDIT: 'MASTER_EDIT',
    MASTER_DEACTIVATE: 'MASTER_DEACTIVATE',
    MASTER_VIEW: 'MASTER_VIEW',

    // Governance & Daily Closing
    DAILY_CLOSE_SUBMIT: 'DAILY_CLOSE_SUBMIT',
    DAILY_CLOSE_APPROVE: 'DAILY_CLOSE_APPROVE',
    DAILY_CLOSE_REOPEN: 'DAILY_CLOSE_REOPEN',
    AUDIT_VIEW: 'AUDIT_VIEW',
    REPORTS_VIEW: 'REPORTS_VIEW',
    REPORTS_EXPORT: 'REPORTS_EXPORT',
    SYSTEM_CONFIG: 'SYSTEM_CONFIG'
  }),

  // Concurrency & Lock Settings
  LOCK_SETTINGS: Object.freeze({
    DEFAULT_TIMEOUT_MS: 10000,
    FINANCIAL_TIMEOUT_MS: 15000,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 500
  })
});

/**
 * Accessor function to get TFC_CONFIG safely
 */
function getTfcConfig() {
  return TFC_CONFIG;
}
