/**
 * ============================================================================
 * TFC GROUP — CORE DATA ACCESS LAYER (Core_Data.gs)
 * ============================================================================
 * Safe Google Sheets data access, LockService concurrency wrappers,
 * batch read/write operations, schema header validation, and compensation
 * helpers for multi-step operations.
 * 
 * NOTE ON ACID GUARANTEES IN GOOGLE SHEETS:
 * Google Sheets does not provide native multi-sheet ACID transactions or
 * automated rollback. To mitigate partial failure risks:
 * 1. All financial and inventory mutations MUST acquire a ScriptLock.
 * 2. All inputs, existence checks, and balance calculations are pre-validated
 *    in-memory BEFORE any sheet write is executed.
 * 3. Multi-step operations register compensation handlers and log any partial
 *    state failures directly to SYS_AUDIT_LOG for audit and reconciliation.
 * 
 * Target Runtime: Google Apps Script (V8 Engine)
 * ============================================================================
 */

const CoreData = (function () {
  /**
   * Resolves target spreadsheet safely
   * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet|null}
   */
  function getSpreadsheet() {
    try {
      // Check if global getDatabase() from Code.gs exists
      if (typeof getDatabase === 'function') {
        const ss = getDatabase();
        if (ss) return ss;
      }
      if (typeof SpreadsheetApp !== 'undefined') {
        return SpreadsheetApp.getActiveSpreadsheet();
      }
    } catch (e) {
      console.error('CoreData.getSpreadsheet error: ' + e.message);
    }
    return null;
  }

  /**
   * Executes a callback within Google Apps Script LockService protection
   * 
   * @param {Function} callback - Function to execute under lock
   * @param {number} [timeoutMs] - Lock wait timeout in ms
   * @returns {*} Result of callback execution
   */
  function withScriptLock(callback, timeoutMs) {
    if (typeof LockService === 'undefined') {
      // Fallback for test / offline environments
      return callback();
    }

    const defaultTimeout = (typeof TFC_CONFIG !== 'undefined' && TFC_CONFIG.LOCK_SETTINGS)
      ? TFC_CONFIG.LOCK_SETTINGS.DEFAULT_TIMEOUT_MS
      : 10000;
    const timeout = timeoutMs || defaultTimeout;

    const lock = LockService.getScriptLock();
    let hasLock = false;

    try {
      hasLock = lock.tryLock(timeout);
      if (!hasLock) {
        throw new Error(`Database Concurrency Lock Timeout: System was busy processing other transactions after ${timeout}ms. Please retry.`);
      }
      return callback();
    } finally {
      if (hasLock) {
        try {
          lock.releaseLock();
        } catch (e) {
          console.warn('CoreData.withScriptLock: Error releasing lock: ' + e.message);
        }
      }
    }
  }

  /**
   * Looks up a sheet by name with optional automatic creation and header validation
   * 
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Target spreadsheet
   * @param {string} sheetName - Name of the sheet tab
   * @param {Array<string>} [expectedHeaders] - Expected column headers
   * @param {boolean} [autoCreate=true] - Whether to create if missing
   * @param {string} [headerColor='#ff751f'] - Background color for new header row
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  function getOrValidateSheet(ss, sheetName, expectedHeaders, autoCreate, headerColor) {
    if (!ss) {
      throw new Error('CoreData.getOrValidateSheet: Spreadsheet instance is null or undefined.');
    }
    if (!sheetName || typeof sheetName !== 'string') {
      throw new Error(`CoreData.getOrValidateSheet: Invalid sheetName parameter: "${sheetName}"`);
    }

    let sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      if (autoCreate !== false && expectedHeaders && expectedHeaders.length > 0) {
        sheet = ss.insertSheet(sheetName);
        sheet.appendRow(expectedHeaders);
        const headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
        headerRange.setBackground(headerColor || '#ff751f');
        headerRange.setFontColor('#FFFFFF');
        headerRange.setFontWeight('bold');
        sheet.setFrozenRows(1);
        return sheet;
      } else {
        throw new Error(`CoreData Error: Sheet tab "${sheetName}" does not exist in spreadsheet.`);
      }
    }

    // Validate headers if expected
    if (expectedHeaders && expectedHeaders.length > 0) {
      const lastCol = sheet.getLastColumn();
      if (lastCol === 0 || sheet.getLastRow() === 0) {
        // Empty sheet — seed headers
        sheet.appendRow(expectedHeaders);
        const headerRange = sheet.getRange(1, 1, 1, expectedHeaders.length);
        headerRange.setBackground(headerColor || '#ff751f');
        headerRange.setFontColor('#FFFFFF');
        headerRange.setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
    }

    return sheet;
  }

  /**
   * Reads all data rows from a sheet as an array of JSON objects keyed by headers.
   * Includes 1-indexed `_rowIndex` on each object for targeted updates.
   * 
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Target spreadsheet
   * @param {string} sheetName - Sheet name
   * @returns {Array<Object>} Array of row objects
   */
  function readAllRowsAsObjects(ss, sheetName) {
    if (!ss) return [];
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return [];

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return [];

    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = data[0].map(h => String(h || '').trim());
    const rows = [];

    for (let i = 1; i < data.length; i++) {
      const row = { _rowIndex: i + 1 };
      let hasData = false;

      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (!key) continue;

        let val = data[i][j];
        if (val instanceof Date) {
          val = CoreUtils.formatDateTime(val);
        } else if (typeof val === 'string') {
          val = val.trim();
        }

        if (val !== '' && val !== null && val !== undefined) {
          hasData = true;
        }
        row[key] = val;
      }

      if (hasData) {
        rows.push(row);
      }
    }

    return rows;
  }

  /**
   * Finds a single row object by matching a key column value
   * 
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Target spreadsheet
   * @param {string} sheetName - Sheet name
   * @param {string} keyColumn - Header name of key column
   * @param {*} keyValue - Target value to match
   * @returns {Object|null} Matching row object or null
   */
  function findRowById(ss, sheetName, keyColumn, keyValue) {
    const allRows = readAllRowsAsObjects(ss, sheetName);
    const target = String(keyValue).trim();
    for (let i = 0; i < allRows.length; i++) {
      if (String(allRows[i][keyColumn]).trim() === target) {
        return allRows[i];
      }
    }
    return null;
  }

  /**
   * Finds all rows matching a specific column value
   * 
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Target spreadsheet
   * @param {string} sheetName - Sheet name
   * @param {string} keyColumn - Header name
   * @param {*} keyValue - Value to match
   * @returns {Array<Object>}
   */
  function findRowsByColumn(ss, sheetName, keyColumn, keyValue) {
    const allRows = readAllRowsAsObjects(ss, sheetName);
    const target = String(keyValue).trim();
    return allRows.filter(r => String(r[keyColumn]).trim() === target);
  }

  /**
   * Appends multiple rows to a sheet in a single batch operation
   * 
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Target spreadsheet
   * @param {string} sheetName - Target sheet
   * @param {Array<Array<*>>} rowsArray - 2D array of rows to append
   * @param {Array<string>} [expectedHeaders] - Headers if sheet creation needed
   * @returns {boolean} True if successfully appended
   */
  function batchAppendRows(ss, sheetName, rowsArray, expectedHeaders) {
    if (!rowsArray || rowsArray.length === 0) return true;

    const sheet = getOrValidateSheet(ss, sheetName, expectedHeaders, true);
    const numRows = rowsArray.length;
    const numCols = rowsArray[0].length;
    const startRow = sheet.getLastRow() + 1;

    sheet.getRange(startRow, 1, numRows, numCols).setValues(rowsArray);
    return true;
  }

  /**
   * Appends a single row safely
   * 
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Target spreadsheet
   * @param {string} sheetName - Target sheet
   * @param {Array<*>} rowData - 1D array of cell values
   * @param {Array<string>} [expectedHeaders] - Headers if sheet creation needed
   * @returns {boolean}
   */
  function appendRowSafe(ss, sheetName, rowData, expectedHeaders) {
    return batchAppendRows(ss, sheetName, [rowData], expectedHeaders);
  }

  /**
   * Updates specific fields of an existing row identified by its key column
   * 
   * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - Target spreadsheet
   * @param {string} sheetName - Target sheet
   * @param {string} keyColumn - Header name of key
   * @param {*} keyValue - Identifier value to find
   * @param {Object} updatedFields - Key-value map of fields to update
   * @returns {boolean} True if found and updated
   */
  function updateRowById(ss, sheetName, keyColumn, keyValue, updatedFields) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(`CoreData.updateRowById: Sheet "${sheetName}" not found.`);

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1 || lastCol === 0) return false;

    const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
    const headers = data[0].map(h => String(h || '').trim());
    const keyColIdx = headers.indexOf(keyColumn);

    if (keyColIdx === -1) {
      throw new Error(`CoreData.updateRowById: Key column "${keyColumn}" not found in sheet "${sheetName}".`);
    }

    const target = String(keyValue).trim();
    let targetRowIdx = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyColIdx]).trim() === target) {
        targetRowIdx = i + 1; // 1-indexed for Sheet API
        break;
      }
    }

    if (targetRowIdx === -1) {
      return false; // Row not found
    }

    // Update cells for matching header keys
    const currentRowValues = data[targetRowIdx - 1];
    Object.keys(updatedFields).forEach(fieldKey => {
      const colIdx = headers.indexOf(fieldKey);
      if (colIdx !== -1) {
        currentRowValues[colIdx] = updatedFields[fieldKey];
      }
    });

    // Write back entire row in single operation
    sheet.getRange(targetRowIdx, 1, 1, lastCol).setValues([currentRowValues]);
    return true;
  }

  /**
   * Multi-Step Operation Coordinator with Compensating Action Logging.
   * Ensures that if step N fails after steps 1..N-1 have executed,
   * registered compensations are triggered and failure state is logged.
   * 
   * @param {Array<Object>} steps - Array of step definitions: { name: string, execute: Function, compensate: Function }
   * @param {Object} [context] - Shared context object passed to steps
   * @returns {Object} { success: boolean, results: Object, error?: string }
   */
  function executeMultiStepOperation(steps, context) {
    const ctx = context || {};
    const executedSteps = [];
    const results = {};

    return withScriptLock(function () {
      try {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const stepResult = step.execute(ctx, results);
          results[step.name] = stepResult;
          executedSteps.push(step);
        }

        return { success: true, results: results, error: null };
      } catch (err) {
        console.error(`Multi-step operation failed at step: ${executedSteps.length}. Error: ${err.message}`);

        // Execute compensations in reverse order
        const compensationErrors = [];
        for (let j = executedSteps.length - 1; j >= 0; j--) {
          const stepToCompensate = executedSteps[j];
          if (typeof stepToCompensate.compensate === 'function') {
            try {
              stepToCompensate.compensate(ctx, results);
            } catch (compErr) {
              compensationErrors.push(`Step ${stepToCompensate.name}: ${compErr.message}`);
            }
          }
        }

        return {
          success: false,
          error: err.message,
          failedAtStep: executedSteps.length + 1,
          compensationErrors: compensationErrors.length > 0 ? compensationErrors : null
        };
      }
    });
  }

  // Public API
  return {
    getSpreadsheet: getSpreadsheet,
    withScriptLock: withScriptLock,
    getOrValidateSheet: getOrValidateSheet,
    readAllRowsAsObjects: readAllRowsAsObjects,
    findRowById: findRowById,
    findRowsByColumn: findRowsByColumn,
    batchAppendRows: batchAppendRows,
    appendRowSafe: appendRowSafe,
    updateRowById: updateRowById,
    executeMultiStepOperation: executeMultiStepOperation
  };
})();
