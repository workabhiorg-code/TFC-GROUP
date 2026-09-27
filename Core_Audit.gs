/**
 * ============================================================================
 * TFC GROUP — AUDIT LOGGING ENGINE (Core_Audit.gs)
 * ============================================================================
 * Immutable append-only audit trail logging for financial, inventory,
 * and operational mutations across all business verticals.
 * 
 * Target Runtime: Google Apps Script (V8 Engine)
 * Sheet: SYS_AUDIT_LOG
 * ============================================================================
 */

const CoreAudit = (function () {
  const AUDIT_SHEET_NAME = (typeof TFC_CONFIG !== 'undefined' && TFC_CONFIG.SHEETS && TFC_CONFIG.SHEETS.AUDIT_LOG)
    ? TFC_CONFIG.SHEETS.AUDIT_LOG
    : 'SYS_AUDIT_LOG';

  const AUDIT_HEADERS = Object.freeze([
    'Audit ID',
    'Timestamp',
    'Actor Email / ID',
    'Business Vertical',
    'Action',
    'Entity Type',
    'Entity ID',
    'Status',
    'Details / Diff',
    'Execution Time (ms)'
  ]);

  const AUDIT_HEADER_COLOR = '#334155';

  /**
   * Sanitizes audit payload details to ensure no sensitive passwords, tokens, or PII are logged
   * 
   * @param {*} details - Raw details object or string
   * @returns {string} Sanitized JSON string or summary
   */
  function sanitizeAuditDetails(details) {
    if (details === undefined || details === null) return '';
    if (typeof details === 'string') {
      return CoreUtils.sanitizeString(details, 2000);
    }

    try {
      // Deep clone and mask sensitive keys
      const sensitiveKeyPatterns = [/pass/i, /token/i, /secret/i, /auth/i, /pin/i, /key/i];
      const sanitizedObj = JSON.parse(JSON.stringify(details));

      function maskObj(obj) {
        if (!obj || typeof obj !== 'object') return;
        Object.keys(obj).forEach(k => {
          if (sensitiveKeyPatterns.some(p => p.test(k))) {
            obj[k] = '********';
          } else if (typeof obj[k] === 'object') {
            maskObj(obj[k]);
          }
        });
      }

      maskObj(sanitizedObj);
      const jsonStr = JSON.stringify(sanitizedObj);
      return jsonStr.length > 2000 ? jsonStr.substring(0, 2000) + '...[truncated]' : jsonStr;
    } catch (e) {
      return String(details).substring(0, 1000);
    }
  }

  /**
   * Resolves current actor email safely from Session
   * 
   * @param {string} [explicitActor] - Explicit actor ID or email if supplied
   * @returns {string} Actor identifier
   */
  function resolveActor(explicitActor) {
    if (explicitActor && typeof explicitActor === 'string' && explicitActor.trim() !== '') {
      return explicitActor.trim();
    }

    try {
      if (typeof Session !== 'undefined') {
        const activeUser = Session.getActiveUser().getEmail();
        if (activeUser && activeUser.trim() !== '') return activeUser.trim();

        const effectiveUser = Session.getEffectiveUser().getEmail();
        if (effectiveUser && effectiveUser.trim() !== '') return effectiveUser.trim();
      }
    } catch (e) {
      // Ignore session lookup failures
    }

    return 'System/Anonymous';
  }

  /**
   * Logs an action into the immutable SYS_AUDIT_LOG sheet
   * 
   * @param {Object} entry - Audit entry options
   * @param {string} entry.action - Action identifier (e.g. 'PROCURE_CREATE', 'DISTRIBUTE_LOT')
   * @param {string} [entry.vertical='Fish Transport'] - Business vertical
   * @param {string} [entry.entityType='TXN'] - Type of entity affected
   * @param {string} [entry.entityId=''] - Specific entity ID affected
   * @param {string} [entry.actor] - Optional explicit actor identifier
   * @param {string} [entry.status='SUCCESS'] - Status ('SUCCESS' or 'FAILURE')
   * @param {*} [entry.details] - Payload or diff summary
   * @param {number} [entry.executionTimeMs=0] - Milliseconds taken
   * @returns {string} Generated Audit ID
   */
  function log(entry) {
    if (!entry || typeof entry !== 'object') {
      console.warn('CoreAudit.log: Invalid entry object passed.');
      return '';
    }

    const auditId = CoreUtils.generateId('AUD', { includeDate: true, entropyLength: 4 });
    const timestamp = CoreUtils.getNowFormatted('yyyy-MM-dd HH:mm:ss');
    const actor = resolveActor(entry.actor);
    const vertical = entry.vertical || (TFC_CONFIG && TFC_CONFIG.BUSINESS_VERTICALS ? TFC_CONFIG.BUSINESS_VERTICALS.FISH_TRANSPORT : 'Fish Transport');
    const action = (entry.action || 'UNKNOWN_ACTION').toString().trim().toUpperCase();
    const entityType = (entry.entityType || 'GENERAL').toString().trim().toUpperCase();
    const entityId = (entry.entityId || '').toString().trim();
    const status = (entry.status || 'SUCCESS').toString().trim().toUpperCase();
    const details = sanitizeAuditDetails(entry.details);
    const execTime = Number(entry.executionTimeMs || 0);

    const rowData = [
      auditId,
      timestamp,
      actor,
      vertical,
      action,
      entityType,
      entityId,
      status,
      details,
      execTime
    ];

    try {
      const ss = CoreData.getSpreadsheet();
      if (ss) {
        CoreData.appendRowSafe(ss, AUDIT_SHEET_NAME, rowData, AUDIT_HEADERS);
      } else {
        // Fallback console log for test/mock environments
        console.log(`[AUDIT] ${auditId} | ${timestamp} | ${actor} | ${action} | ${entityId} | ${status}`);
      }
    } catch (err) {
      console.error('CoreAudit.log failure: ' + err.message);
    }

    return auditId;
  }

  /**
   * Retrieves the most recent audit logs with optional vertical filtering
   * 
   * @param {number} [limit=50] - Number of records to return
   * @param {string} [filterVertical] - Optional vertical filter
   * @returns {Array<Object>} Array of audit log objects
   */
  function getRecentLogs(limit, filterVertical) {
    const ss = CoreData.getSpreadsheet();
    if (!ss) return [];

    const allRows = CoreData.readAllRowsAsObjects(ss, AUDIT_SHEET_NAME);
    let filtered = allRows;

    if (filterVertical) {
      const target = filterVertical.trim().toLowerCase();
      filtered = filtered.filter(r => String(r['Business Vertical'] || '').toLowerCase() === target);
    }

    // Sort descending by row index or timestamp
    filtered.reverse();

    const max = limit && limit > 0 ? limit : 50;
    return filtered.slice(0, max);
  }

  // Public API
  return {
    log: log,
    getRecentLogs: getRecentLogs,
    AUDIT_HEADERS: AUDIT_HEADERS
  };
})();
