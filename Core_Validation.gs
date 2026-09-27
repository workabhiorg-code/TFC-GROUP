/**
 * ============================================================================
 * TFC GROUP — SERVER-SIDE VALIDATION LAYER (Core_Validation.gs)
 * ============================================================================
 * Authoritative server-side validation for required fields, strict numeric
 * and monetary inputs, weighbridge weight integrity (gross, tare, net),
 * dates, payment modes, and status lifecycle transitions.
 * 
 * Target Runtime: Google Apps Script (V8 Engine)
 * ============================================================================
 */

const CoreValidation = (function () {
  /**
   * Validates that an object contains all specified required fields with non-empty values
   * 
   * @param {Object} dataObj - Input data object
   * @param {Array<string>} requiredKeys - List of required property keys
   * @returns {Object} { isValid: boolean, missing: Array<string>, message?: string }
   */
  function validateRequiredFields(dataObj, requiredKeys) {
    if (!dataObj || typeof dataObj !== 'object') {
      return {
        isValid: false,
        missing: requiredKeys || [],
        message: 'Invalid payload: data object is missing or null.'
      };
    }

    const missing = [];
    for (let i = 0; i < requiredKeys.length; i++) {
      const key = requiredKeys[i];
      const val = dataObj[key];
      if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
        missing.push(key);
      }
    }

    if (missing.length > 0) {
      return {
        isValid: false,
        missing: missing,
        message: `Missing required field(s): ${missing.join(', ')}`
      };
    }

    return { isValid: true, missing: [], message: 'All required fields present.' };
  }

  /**
   * Validates that a numeric input is strictly positive (> 0)
   * 
   * @param {*} val - Value to check
   * @param {string} [fieldName='Value'] - Field label
   * @returns {Object} { isValid: boolean, value?: number, message?: string }
   */
  function validateStrictPositive(val, fieldName) {
    const name = fieldName || 'Value';
    try {
      const num = CoreUtils.parseStrictNumber(val, name);
      if (num <= 0) {
        return {
          isValid: false,
          message: `'${name}' must be strictly greater than 0. Received: ${val}`
        };
      }
      return { isValid: true, value: num };
    } catch (err) {
      return { isValid: false, message: err.message };
    }
  }

  /**
   * Validates that a numeric input is non-negative (>= 0)
   * 
   * @param {*} val - Value to check
   * @param {string} [fieldName='Value'] - Field label
   * @returns {Object} { isValid: boolean, value?: number, message?: string }
   */
  function validateNonNegative(val, fieldName) {
    const name = fieldName || 'Value';
    try {
      const num = CoreUtils.parseStrictNumber(val, name);
      if (num < 0) {
        return {
          isValid: false,
          message: `'${name}' cannot be negative. Received: ${val}`
        };
      }
      return { isValid: true, value: num };
    } catch (err) {
      return { isValid: false, message: err.message };
    }
  }

  /**
   * Authoritative Weight Integrity Validator for Fish Procurement, Weighment & Distribution.
   * 
   * Strict Rules Enforced:
   * 1. Gross Weight must be > 0.
   * 2. Tare Weight must be >= 0.
   * 3. Tare Weight MUST be strictly less than Gross Weight.
   * 4. Mortality / Shrinkage / Ice (if provided) must be >= 0.
   * 5. Calculated Net Weight (Gross - Tare - Shrinkage) MUST be strictly > 0.
   * 6. If a client-supplied Net Weight is passed, it must match the calculated Net within tolerance.
   * 
   * @param {*} rawGross - Gross weighment
   * @param {*} rawTare - Tare weighment (crates, boxes, ice)
   * @param {*} [rawNet] - Optional client-asserted net weight
   * @param {Object} [options] - Additional options
   * @param {*} [options.shrinkage=0] - Optional shrinkage / mortality deduction
   * @param {string} [options.context='Weighment'] - Context name
   * @returns {Object} { isValid: boolean, gross: number, tare: number, shrinkage: number, net: number, message?: string }
   */
  function validateWeightTriple(rawGross, rawTare, rawNet, options) {
    const opts = options || {};
    const context = opts.context || 'Weighment';

    // 1. Gross Weight Check
    let gross;
    try {
      gross = CoreUtils.roundWeight(CoreUtils.parseStrictNumber(rawGross, `${context} Gross Weight`));
      if (gross <= 0) {
        return {
          isValid: false,
          message: `${context} Gross Weight must be strictly greater than 0 kg. Received: ${rawGross}`
        };
      }
    } catch (e) {
      return { isValid: false, message: e.message };
    }

    // 2. Tare Weight Check
    let tare;
    try {
      tare = CoreUtils.roundWeight(CoreUtils.parseStrictNumber(rawTare, `${context} Tare Weight`, 0));
      if (tare < 0) {
        return {
          isValid: false,
          message: `${context} Tare Weight cannot be negative. Received: ${rawTare}`
        };
      }
      if (tare >= gross) {
        return {
          isValid: false,
          message: `${context} Tare Weight (${tare} kg) cannot be equal to or greater than Gross Weight (${gross} kg).`
        };
      }
    } catch (e) {
      return { isValid: false, message: e.message };
    }

    // 3. Shrinkage / Mortality Check
    let shrinkage = 0;
    if (opts.shrinkage !== undefined && opts.shrinkage !== null && opts.shrinkage !== '') {
      try {
        shrinkage = CoreUtils.roundWeight(CoreUtils.parseStrictNumber(opts.shrinkage, `${context} Shrinkage/Mortality`, 0));
        if (shrinkage < 0) {
          return {
            isValid: false,
            message: `${context} Shrinkage/Mortality cannot be negative. Received: ${opts.shrinkage}`
          };
        }
      } catch (e) {
        return { isValid: false, message: e.message };
      }
    }

    // 4. Calculate Net Weight
    const calculatedNet = CoreUtils.roundWeight(gross - tare - shrinkage);
    if (calculatedNet <= 0) {
      return {
        isValid: false,
        message: `${context} Net Weight (${calculatedNet} kg) must be strictly greater than 0 kg (Gross: ${gross} kg, Tare: ${tare} kg, Shrinkage: ${shrinkage} kg).`
      };
    }

    // 5. Client Asserted Net Consistency Check
    if (rawNet !== undefined && rawNet !== null && rawNet !== '') {
      try {
        const assertedNet = CoreUtils.roundWeight(CoreUtils.parseStrictNumber(rawNet, `${context} Asserted Net Weight`));
        if (Math.abs(assertedNet - calculatedNet) > 0.005) {
          return {
            isValid: false,
            message: `${context} Asserted Net Weight (${assertedNet} kg) does not match calculated Net Weight (${calculatedNet} kg: ${gross} - ${tare}${shrinkage > 0 ? ' - ' + shrinkage : ''}).`
          };
        }
      } catch (e) {
        return { isValid: false, message: e.message };
      }
    }

    return {
      isValid: true,
      gross: gross,
      tare: tare,
      shrinkage: shrinkage,
      net: calculatedNet,
      message: 'Weight validation passed.'
    };
  }

  /**
   * Validates monetary rate and calculates total value with integrity check
   * 
   * @param {*} rawNetWeight - Net weight in kg
   * @param {*} rawRatePerKg - Rate per kg in ₹
   * @param {*} [rawTotalValue] - Asserted total
   * @returns {Object} { isValid: boolean, rate: number, total: number, message?: string }
   */
  function validateRateAndTotal(rawNetWeight, rawRatePerKg, rawTotalValue) {
    let weight, rate;
    try {
      weight = CoreUtils.roundWeight(CoreUtils.parseStrictNumber(rawNetWeight, 'Net Weight'));
      rate = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(rawRatePerKg, 'Rate/Kg'));
    } catch (e) {
      return { isValid: false, message: e.message };
    }

    if (weight <= 0) return { isValid: false, message: 'Weight must be greater than 0 for billing.' };
    if (rate <= 0) return { isValid: false, message: 'Rate/Kg must be greater than 0.' };

    const calculatedTotal = CoreUtils.roundCurrency(weight * rate);

    if (rawTotalValue !== undefined && rawTotalValue !== null && rawTotalValue !== '') {
      try {
        const assertedTotal = CoreUtils.roundCurrency(CoreUtils.parseStrictNumber(rawTotalValue, 'Total Value'));
        if (Math.abs(assertedTotal - calculatedTotal) > 0.05) {
          return {
            isValid: false,
            message: `Asserted total (₹${assertedTotal}) does not match calculated total (₹${calculatedTotal} = ${weight} kg * ₹${rate}/kg).`
          };
        }
      } catch (e) {
        return { isValid: false, message: e.message };
      }
    }

    return {
      isValid: true,
      rate: rate,
      total: calculatedTotal,
      message: 'Rate and total validation passed.'
    };
  }

  /**
   * Validates date string format (YYYY-MM-DD or parseable ISO date)
   * 
   * @param {string} dateStr - Date string
   * @param {string} [fieldName='Date'] - Label
   * @returns {Object} { isValid: boolean, normalizedDate?: string, message?: string }
   */
  function validateDateString(dateStr, fieldName) {
    const name = fieldName || 'Date';
    if (!dateStr || typeof dateStr !== 'string') {
      return { isValid: false, message: `'${name}' must be a valid date string.` };
    }

    const trimmed = dateStr.trim();
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
      return { isValid: false, message: `'${name}' contains an invalid date value: "${dateStr}".` };
    }

    return {
      isValid: true,
      normalizedDate: CoreUtils.formatDate(d, 'yyyy-MM-dd'),
      message: 'Date validation passed.'
    };
  }

  /**
   * Validates payment mode against accepted group modes
   * 
   * @param {string} mode - Payment mode string
   * @returns {Object} { isValid: boolean, message?: string }
   */
  function validatePaymentMode(mode) {
    if (!mode || typeof mode !== 'string') {
      return { isValid: false, message: 'Payment mode must be specified.' };
    }

    const validModes = (typeof TFC_CONFIG !== 'undefined' && TFC_CONFIG.PAYMENT_MODES)
      ? TFC_CONFIG.PAYMENT_MODES
      : ['Cash', 'UPI', 'Bank Transfer', 'NEFT', 'RTGS', 'Cheque', 'Khata Credit', 'Other'];

    const cleanMode = mode.trim();
    const isMatched = validModes.some(m => m.toLowerCase() === cleanMode.toLowerCase());

    if (!isMatched) {
      return {
        isValid: false,
        message: `Invalid payment mode "${mode}". Allowed modes: ${validModes.join(', ')}`
      };
    }

    return { isValid: true, message: 'Payment mode is valid.' };
  }

  /**
   * Validates status transition against defined state machine
   * 
   * @param {string} entityType - E.g. 'SHIPMENT' or 'PROCUREMENT'
   * @param {string} currentStatus - Current state
   * @param {string} targetStatus - Proposed new state
   * @returns {Object} { isValid: boolean, message?: string }
   */
  function validateStatusTransition(entityType, currentStatus, targetStatus) {
    if (!entityType || !currentStatus || !targetStatus) {
      return { isValid: false, message: 'Entity type, current status and target status are required.' };
    }

    const transitions = (typeof TFC_CONFIG !== 'undefined' && TFC_CONFIG.STATUS_TRANSITIONS)
      ? TFC_CONFIG.STATUS_TRANSITIONS[entityType]
      : null;

    if (!transitions) {
      // If no transition graph defined, permit transition
      return { isValid: true, message: 'No transition graph defined for entity type.' };
    }

    const cur = currentStatus.trim().toUpperCase();
    const tgt = targetStatus.trim().toUpperCase();

    if (cur === tgt) {
      return { isValid: true, message: 'Status unchanged.' };
    }

    const allowedNext = transitions[cur];
    if (!allowedNext || !Array.isArray(allowedNext)) {
      return { isValid: false, message: `Unknown current status "${cur}" for entity ${entityType}.` };
    }

    if (allowedNext.indexOf(tgt) === -1) {
      return {
        isValid: false,
        message: `Illegal status transition for ${entityType}: cannot transition from "${cur}" to "${tgt}". Allowed transitions: [${allowedNext.join(', ')}]`
      };
    }

    return { isValid: true, message: 'Status transition is valid.' };
  }

  /**
   * Reusable validation interface for lot allocation requests.
   * (Lot balance data source integration is completed in Phase 4 / Phase 7).
   * 
   * @param {Object} allocationReq - Allocation payload
   * @returns {Object} { isValid: boolean, message?: string }
   */
  function validateLotAllocationInterface(allocationReq) {
    const reqCheck = validateRequiredFields(allocationReq, [
      'lotId', 'sellerId', 'trayCount', 'grossWeight', 'tareWeight', 'ratePerKg'
    ]);
    if (!reqCheck.isValid) return reqCheck;

    const wtCheck = validateWeightTriple(
      allocationReq.grossWeight,
      allocationReq.tareWeight,
      allocationReq.netWeight,
      { context: 'Lot Allocation' }
    );
    if (!wtCheck.isValid) return wtCheck;

    const rateCheck = validateRateAndTotal(
      wtCheck.net,
      allocationReq.ratePerKg,
      allocationReq.totalAmount
    );
    if (!rateCheck.isValid) return rateCheck;

    return { isValid: true, message: 'Lot allocation payload format is valid.' };
  }

  // Public API
  return {
    validateRequiredFields: validateRequiredFields,
    validateStrictPositive: validateStrictPositive,
    validateNonNegative: validateNonNegative,
    validateWeightTriple: validateWeightTriple,
    validateRateAndTotal: validateRateAndTotal,
    validateDateString: validateDateString,
    validatePaymentMode: validatePaymentMode,
    validateStatusTransition: validateStatusTransition,
    validateLotAllocationInterface: validateLotAllocationInterface
  };
})();
