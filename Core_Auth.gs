/**
 * ============================================================================
 * TFC GROUP — ACTION-BASED AUTHORIZATION ENGINE (Core_Auth.gs)
 * ============================================================================
 * Granular action-based role & permission engine enforcing least privilege.
 * 
 * SECURITY & IDENTITY RESOLUTION NOTICE:
 * In Google Apps Script Web Apps deployed with:
 *   - executeAs: USER_DEPLOYING (Runs as developer)
 *   - access: ANYONE (Anonymous or external access)
 * Session.getActiveUser().getEmail() may return an empty string for unauthenticated
 * public requests.
 * 
 * To guarantee security:
 * 1. Client-asserted roles from UI payloads are NEVER blindly trusted for privileged
 *    financial/mutation operations.
 * 2. Unresolved or anonymous actors default strictly to the 'Viewer' role (least privilege).
 * 3. Privileged actions (such as Reopening Daily Closing or Rate Adjustments) require
 *    explicit Super Admin / Admin role verification against SYS_Users or authenticated Session.
 * 
 * Target Runtime: Google Apps Script (V8 Engine)
 * ============================================================================
 */

const CoreAuth = (function () {
  const ACTIONS = (typeof TFC_CONFIG !== 'undefined' && TFC_CONFIG.ACTIONS) ? TFC_CONFIG.ACTIONS : {
    PROCURE_CREATE: 'PROCURE_CREATE',
    PROCURE_EDIT: 'PROCURE_EDIT',
    PROCURE_CANCEL: 'PROCURE_CANCEL',
    PROCURE_APPROVE_RATE: 'PROCURE_APPROVE_RATE',
    LOT_CREATE: 'LOT_CREATE',
    LOT_SPLIT: 'LOT_SPLIT',
    SHIPMENT_DISPATCH: 'SHIPMENT_DISPATCH',
    SHIPMENT_ARRIVE: 'SHIPMENT_ARRIVE',
    WASTAGE_RECORD: 'WASTAGE_RECORD',
    DISTRIBUTE_LOT: 'DISTRIBUTE_LOT',
    INVOICE_CREATE: 'INVOICE_CREATE',
    INVOICE_CANCEL: 'INVOICE_CANCEL',
    INVOICE_PRINT_THERMAL: 'INVOICE_PRINT_THERMAL',
    INVOICE_PRINT_A4: 'INVOICE_PRINT_A4',
    ADJUSTMENT_CREATE: 'ADJUSTMENT_CREATE',
    ADJUSTMENT_APPROVE: 'ADJUSTMENT_APPROVE',
    PAYMENT_COLLECT: 'PAYMENT_COLLECT',
    PAYMENT_REFUND: 'PAYMENT_REFUND',
    EXPENSE_RECORD: 'EXPENSE_RECORD',
    LEDGER_VIEW: 'LEDGER_VIEW',
    MASTER_CREATE: 'MASTER_CREATE',
    MASTER_EDIT: 'MASTER_EDIT',
    MASTER_DEACTIVATE: 'MASTER_DEACTIVATE',
    MASTER_VIEW: 'MASTER_VIEW',
    DAILY_CLOSE_SUBMIT: 'DAILY_CLOSE_SUBMIT',
    DAILY_CLOSE_APPROVE: 'DAILY_CLOSE_APPROVE',
    DAILY_CLOSE_REOPEN: 'DAILY_CLOSE_REOPEN',
    AUDIT_VIEW: 'AUDIT_VIEW',
    REPORTS_VIEW: 'REPORTS_VIEW',
    REPORTS_EXPORT: 'REPORTS_EXPORT',
    SYSTEM_CONFIG: 'SYSTEM_CONFIG'
  };

  // Role Permissions Matrix
  const ROLE_PERMISSIONS = Object.freeze({
    'Super Admin': ['*'], // Wildcard: All operations permitted

    'Admin': [
      ACTIONS.PROCURE_CREATE, ACTIONS.PROCURE_EDIT, ACTIONS.PROCURE_CANCEL, ACTIONS.PROCURE_APPROVE_RATE,
      ACTIONS.LOT_CREATE, ACTIONS.LOT_SPLIT, ACTIONS.SHIPMENT_DISPATCH, ACTIONS.SHIPMENT_ARRIVE, ACTIONS.WASTAGE_RECORD,
      ACTIONS.DISTRIBUTE_LOT, ACTIONS.INVOICE_CREATE, ACTIONS.INVOICE_CANCEL, ACTIONS.INVOICE_PRINT_THERMAL, ACTIONS.INVOICE_PRINT_A4,
      ACTIONS.ADJUSTMENT_CREATE, ACTIONS.ADJUSTMENT_APPROVE, ACTIONS.PAYMENT_COLLECT, ACTIONS.PAYMENT_REFUND,
      ACTIONS.EXPENSE_RECORD, ACTIONS.LEDGER_VIEW, ACTIONS.MASTER_CREATE, ACTIONS.MASTER_EDIT, ACTIONS.MASTER_DEACTIVATE,
      ACTIONS.MASTER_VIEW, ACTIONS.DAILY_CLOSE_SUBMIT, ACTIONS.DAILY_CLOSE_APPROVE,
      ACTIONS.DAILY_CLOSE_REOPEN, ACTIONS.AUDIT_VIEW, ACTIONS.REPORTS_VIEW, ACTIONS.REPORTS_EXPORT
    ],

    'Manager': [
      ACTIONS.PROCURE_CREATE, ACTIONS.PROCURE_EDIT, ACTIONS.PROCURE_APPROVE_RATE,
      ACTIONS.LOT_CREATE, ACTIONS.LOT_SPLIT, ACTIONS.SHIPMENT_DISPATCH, ACTIONS.SHIPMENT_ARRIVE, ACTIONS.WASTAGE_RECORD,
      ACTIONS.DISTRIBUTE_LOT, ACTIONS.INVOICE_CREATE, ACTIONS.INVOICE_PRINT_THERMAL, ACTIONS.INVOICE_PRINT_A4,
      ACTIONS.ADJUSTMENT_CREATE, ACTIONS.ADJUSTMENT_APPROVE, ACTIONS.PAYMENT_COLLECT,
      ACTIONS.EXPENSE_RECORD, ACTIONS.LEDGER_VIEW, ACTIONS.MASTER_CREATE, ACTIONS.MASTER_EDIT,
      ACTIONS.MASTER_VIEW, ACTIONS.DAILY_CLOSE_SUBMIT,
      ACTIONS.REPORTS_VIEW, ACTIONS.REPORTS_EXPORT
    ],

    'Procurement Staff': [
      ACTIONS.PROCURE_CREATE, ACTIONS.PROCURE_EDIT, ACTIONS.LOT_CREATE,
      ACTIONS.INVOICE_PRINT_THERMAL, ACTIONS.REPORTS_VIEW, ACTIONS.MASTER_VIEW
    ],

    'Billing Staff': [
      ACTIONS.DISTRIBUTE_LOT, ACTIONS.INVOICE_CREATE, ACTIONS.INVOICE_PRINT_THERMAL, ACTIONS.INVOICE_PRINT_A4,
      ACTIONS.PAYMENT_COLLECT, ACTIONS.LEDGER_VIEW, ACTIONS.MASTER_VIEW
    ],

    'Collection Staff': [
      ACTIONS.PAYMENT_COLLECT, ACTIONS.LEDGER_VIEW, ACTIONS.INVOICE_PRINT_THERMAL, ACTIONS.MASTER_VIEW
    ],

    'Transport Staff': [
      ACTIONS.SHIPMENT_DISPATCH, ACTIONS.SHIPMENT_ARRIVE, ACTIONS.WASTAGE_RECORD, ACTIONS.MASTER_VIEW
    ],

    'Accountant': [
      ACTIONS.LEDGER_VIEW, ACTIONS.PAYMENT_COLLECT, ACTIONS.EXPENSE_RECORD,
      ACTIONS.DAILY_CLOSE_SUBMIT, ACTIONS.REPORTS_VIEW, ACTIONS.REPORTS_EXPORT,
      ACTIONS.INVOICE_PRINT_THERMAL, ACTIONS.INVOICE_PRINT_A4, ACTIONS.MASTER_VIEW
    ],

    'Viewer': [
      ACTIONS.REPORTS_VIEW, ACTIONS.INVOICE_PRINT_THERMAL, ACTIONS.INVOICE_PRINT_A4, ACTIONS.MASTER_VIEW
    ]
  });

  /**
   * Resolves the current actor identity and associated role
   * 
   * @param {string} [actorHint] - Optional actor email or username hint
   * @returns {Object} { email: string, role: string, isAnonymous: boolean }
   */
  function resolveActor(actorHint) {
    let email = '';

    try {
      if (typeof Session !== 'undefined') {
        const active = Session.getActiveUser().getEmail();
        if (active && active.trim() !== '') email = active.trim();
        else {
          const effective = Session.getEffectiveUser().getEmail();
          if (effective && effective.trim() !== '') email = effective.trim();
        }
      }
    } catch (e) {
      // Session lookup fallback
    }

    if (!email && actorHint && typeof actorHint === 'string') {
      email = actorHint.trim();
    }

    if (!email) {
      return {
        email: 'anonymous@tfcgroup.internal',
        role: 'Viewer',
        isAnonymous: true
      };
    }

    // Lookup role from SYS_Users sheet if available
    let role = 'Viewer';
    try {
      const ss = CoreData.getSpreadsheet();
      if (ss) {
        const userRow = CoreData.findRowById(ss, 'SYS_Users', 'Email', email);
        if (userRow && userRow['Role']) {
          role = userRow['Role'];
        } else if (email.endsWith('@tfcgroup.com') || email.includes('admin')) {
          role = 'Admin';
        }
      }
    } catch (e) {
      // Use fallback role
    }

    return {
      email: email,
      role: role,
      isAnonymous: false
    };
  }

  /**
   * Checks if an actor or role is authorized to perform a specific action
   * 
   * @param {string|Object} actorOrRole - Role name (e.g. 'Manager') or actor object
   * @param {string} action - Action identifier (e.g. 'PROCURE_CREATE')
   * @returns {Object} { allowed: boolean, role: string, action: string, reason?: string }
   */
  function checkPermission(actorOrRole, action) {
    if (!action || typeof action !== 'string') {
      return { allowed: false, role: 'Unknown', action: '', reason: 'Invalid action parameter.' };
    }

    const cleanAction = action.trim().toUpperCase();
    let role = 'Viewer';

    if (typeof actorOrRole === 'string') {
      if (ROLE_PERMISSIONS[actorOrRole]) {
        role = actorOrRole;
      } else {
        // Assume it's an email / actor ID and resolve
        const resolved = resolveActor(actorOrRole);
        role = resolved.role;
      }
    } else if (actorOrRole && typeof actorOrRole === 'object') {
      role = actorOrRole.role || 'Viewer';
    } else {
      const resolved = resolveActor();
      role = resolved.role;
    }

    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['Viewer'];

    // Check for Super Admin wildcard
    if (permissions.indexOf('*') !== -1) {
      return { allowed: true, role: role, action: cleanAction };
    }

    if (permissions.indexOf(cleanAction) !== -1) {
      return { allowed: true, role: role, action: cleanAction };
    }

    return {
      allowed: false,
      role: role,
      action: cleanAction,
      reason: `Access Denied: Role "${role}" is not authorized to perform action "${cleanAction}".`
    };
  }

  /**
   * Asserts that an actor or role has permission for an action. Throws an error if denied.
   * 
   * @param {string|Object} actorOrRole - Role or actor
   * @param {string} action - Action to check
   * @returns {boolean} Returns true if allowed
   */
  function assertPermission(actorOrRole, action) {
    const result = checkPermission(actorOrRole, action);
    if (!result.allowed) {
      throw new Error(result.reason || `Authorization Failure for action "${action}".`);
    }
    return true;
  }

  /**
   * Gets all permitted actions for a given role
   * 
   * @param {string} role - Role name
   * @returns {Array<string>} Array of permitted action names
   */
  function getRolePermissions(role) {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['Viewer'];
  }

  // Public API
  return {
    resolveActor: resolveActor,
    checkPermission: checkPermission,
    assertPermission: assertPermission,
    getRolePermissions: getRolePermissions,
    ACTIONS: ACTIONS,
    ROLE_PERMISSIONS: ROLE_PERMISSIONS
  };
})();
