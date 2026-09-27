/**
 * ============================================================================
 * TFC GROUP — CORE UTILITIES (Core_Utils.gs)
 * ============================================================================
 * Reusable utility helpers for ID generation, date/time formatting,
 * Indian currency & weight math, text sanitization, and structured API responses.
 * 
 * Target Runtime: Google Apps Script (V8 Engine)
 * Timezone: Asia/Kolkata
 * ============================================================================
 */

const CoreUtils = (function () {
  const TIMEZONE = (typeof TFC_CONFIG !== 'undefined' && TFC_CONFIG.APP && TFC_CONFIG.APP.TIMEZONE) 
    ? TFC_CONFIG.APP.TIMEZONE 
    : 'Asia/Kolkata';

  // High-entropy character set excluding easily confused characters (0, O, 1, I)
  const ENTROPY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

  /**
   * Get effective script timezone safely
   */
  function getEffectiveTimezone() {
    try {
      if (typeof Session !== 'undefined' && Session.getScriptTimeZone) {
        const tz = Session.getScriptTimeZone();
        if (tz) return tz;
      }
    } catch (e) {
      // Ignore and fallback
    }
    return TIMEZONE;
  }

  /**
   * Generates a collision-resistant, standardized business transaction ID.
   * Format: <PREFIX>-<YYYYMMDD>-<ENTROPY> (e.g. FSH-PUR-20260928-8K2PM9)
   * 
   * @param {string} prefix - Entity prefix (e.g. 'FSH-PUR', 'FSH-LOT', 'FSH-INV')
   * @param {Object} [options] - Configuration options
   * @param {number} [options.entropyLength=6] - Length of random character entropy (default 6: >1 billion combinations)
   * @param {Date} [options.date] - Optional date anchor
   * @param {boolean} [options.includeDate=true] - Whether to embed YYYYMMDD
   * @returns {string} Normalized transaction ID
   */
  function generateId(prefix, options) {
    const opts = options || {};
    const entropyLength = opts.entropyLength || 6;
    const anchorDate = opts.date || new Date();
    const includeDate = opts.includeDate !== false;

    let entropy = '';
    for (let i = 0; i < entropyLength; i++) {
      const randIndex = Math.floor(Math.random() * ENTROPY_ALPHABET.length);
      entropy += ENTROPY_ALPHABET.charAt(randIndex);
    }

    const cleanPrefix = (prefix || 'TXN').toString().trim().toUpperCase();

    if (includeDate) {
      const dateSegment = formatDate(anchorDate, 'yyyyMMdd');
      return `${cleanPrefix}-${dateSegment}-${entropy}`;
    }

    return `${cleanPrefix}-${entropy}`;
  }

  /**
   * Format a date into standard representation in the target timezone
   * 
   * @param {Date|string|number} dateVal - Date object or timestamp
   * @param {string} [pattern='yyyy-MM-dd'] - Format pattern
   * @returns {string} Formatted date string
   */
  function formatDate(dateVal, pattern) {
    if (!dateVal) return '';
    const dateObj = (dateVal instanceof Date) ? dateVal : new Date(dateVal);
    if (isNaN(dateObj.getTime())) {
      throw new Error(`CoreUtils.formatDate: Invalid date value provided: "${dateVal}"`);
    }

    const formatPattern = pattern || 'yyyy-MM-dd';
    const tz = getEffectiveTimezone();

    if (typeof Utilities !== 'undefined' && Utilities.formatDate) {
      return Utilities.formatDate(dateObj, tz, formatPattern);
    }

    // Fallback if running in offline Node test environment
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    if (formatPattern === 'yyyyMMdd') return `${y}${m}${d}`;
    return `${y}-${m}-${d}`;
  }

  /**
   * Format a date and time into standard 'yyyy-MM-dd HH:mm:ss' representation
   * 
   * @param {Date|string|number} dateVal - Date object or timestamp
   * @returns {string} Formatted timestamp string
   */
  function formatDateTime(dateVal) {
    return formatDate(dateVal, 'yyyy-MM-dd HH:mm:ss');
  }

  /**
   * Get current timestamp in ISO 8601 string format
   * @returns {string} ISO timestamp
   */
  function getNowIso() {
    return new Date().toISOString();
  }

  /**
   * Get current date/time formatted string in configured timezone
   * @param {string} [pattern='yyyy-MM-dd HH:mm:ss'] - Format pattern
   * @returns {string}
   */
  function getNowFormatted(pattern) {
    return formatDate(new Date(), pattern || 'yyyy-MM-dd HH:mm:ss');
  }

  /**
   * Strict number parser. Rejects invalid inputs instead of converting them silently to 0.
   * 
   * @param {*} val - Raw input (number, string, etc.)
   * @param {string} [fieldName='Number'] - Field name for clear error messaging
   * @param {number} [defaultValue] - Default value if input is undefined/null/empty
   * @returns {number} Validated floating-point / integer number
   */
  function parseStrictNumber(val, fieldName, defaultValue) {
    const name = fieldName || 'Value';

    if (val === undefined || val === null || val === '') {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Validation Error: '${name}' is required and cannot be empty.`);
    }

    if (typeof val === 'number') {
      if (!isFinite(val) || isNaN(val)) {
        throw new Error(`Validation Error: '${name}' must be a finite valid number. Received: ${val}`);
      }
      return val;
    }

    if (typeof val === 'string') {
      // Clean commas, currency symbols, and whitespace
      const cleaned = val.replace(/[₹\s,INR]/gi, '').trim();
      if (cleaned === '') {
        if (defaultValue !== undefined) return defaultValue;
        throw new Error(`Validation Error: '${name}' is empty after cleaning currency symbols.`);
      }

      const parsed = Number(cleaned);
      if (isNaN(parsed) || !isFinite(parsed)) {
        throw new Error(`Validation Error: '${name}' has invalid numeric format: "${val}"`);
      }
      return parsed;
    }

    throw new Error(`Validation Error: '${name}' has unsupported data type: ${typeof val}`);
  }

  /**
   * Round financial amounts to exactly 2 decimal places with decimal precision safety
   * 
   * @param {number|string} amount - Monetary amount
   * @returns {number} Rounded amount
   */
  function roundCurrency(amount) {
    const num = parseStrictNumber(amount, 'Currency Amount');
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  /**
   * Round physical weights to 3 decimal places (kg/metric ton standard precision)
   * 
   * @param {number|string} weight - Weight amount
   * @param {number} [decimals=3] - Precision
   * @returns {number} Rounded weight
   */
  function roundWeight(weight, decimals) {
    const precision = decimals !== undefined ? decimals : 3;
    const num = parseStrictNumber(weight, 'Weight');
    const factor = Math.pow(10, precision);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  }

  /**
   * Formats a monetary number in Indian numbering system (e.g. ₹ 12,34,567.89)
   * 
   * @param {number|string} amount - Monetary amount
   * @param {boolean} [includeSymbol=true] - Whether to prepend ₹
   * @returns {string} Formatted Indian currency string
   */
  function formatINR(amount, includeSymbol) {
    const num = roundCurrency(amount);
    const withSym = includeSymbol !== false;
    const isNegative = num < 0;
    const absVal = Math.abs(num);

    const parts = absVal.toFixed(2).split('.');
    let intPart = parts[0];
    const decPart = parts[1];

    // Indian comma grouping: last 3 digits, then every 2 digits
    let lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    const formattedNum = `${isNegative ? '-' : ''}${formattedInt}.${decPart}`;

    return withSym ? `₹ ${formattedNum}` : formattedNum;
  }

  /**
   * Sanitizes string inputs by trimming, normalizing whitespace, and limiting length
   * 
   * @param {*} input - String or value to sanitize
   * @param {number} [maxLength=500] - Max character length
   * @returns {string} Sanitized string
   */
  function sanitizeString(input, maxLength) {
    if (input === undefined || input === null) return '';
    let str = String(input).trim();
    // Normalize newlines and excess whitespace
    str = str.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
    const limit = maxLength || 500;
    if (str.length > limit) {
      str = str.substring(0, limit);
    }
    return str;
  }

  /**
   * Normalizes short codes / SKUs (uppercase, alphanumeric + hyphen/underscore only)
   * 
   * @param {string} code - Input code
   * @returns {string} Normalized code
   */
  function normalizeCode(code) {
    if (!code) return '';
    return String(code).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  }

  /**
   * Standardized successful API response object
   * 
   * @param {*} [data=null] - Result payload
   * @param {string} [message='Operation successful'] - Success message
   * @param {Object} [metadata] - Additional metadata
   * @returns {Object} Structured API response
   */
  function createSuccessResponse(data, message, metadata) {
    return Object.assign({
      success: true,
      message: message || 'Operation completed successfully.',
      data: data !== undefined ? data : null,
      timestamp: getNowIso()
    }, metadata || {});
  }

  /**
   * Standardized error API response object
   * 
   * @param {string} message - Error description
   * @param {string} [errorCode='INTERNAL_ERROR'] - Machine-readable error code
   * @param {*} [details=null] - Detailed error payload / validation errors
   * @returns {Object} Structured API response
   */
  function createErrorResponse(message, errorCode, details) {
    return {
      success: false,
      error: message || 'An unexpected error occurred.',
      errorCode: errorCode || 'OPERATION_FAILED',
      details: details || null,
      timestamp: getNowIso()
    };
  }

  // Public API
  return {
    generateId: generateId,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    getNowIso: getNowIso,
    getNowFormatted: getNowFormatted,
    parseStrictNumber: parseStrictNumber,
    roundCurrency: roundCurrency,
    roundWeight: roundWeight,
    formatINR: formatINR,
    sanitizeString: sanitizeString,
    normalizeCode: normalizeCode,
    createSuccessResponse: createSuccessResponse,
    createErrorResponse: createErrorResponse,
    getEffectiveTimezone: getEffectiveTimezone
  };
})();
