// ============================================
// GOOGLE SHEETS CONNECTOR
// Universal Data Model Adapter
// ============================================

class GoogleSheetsConnector {
  constructor() {
    this.sheetsApiBase = 'https://sheets.googleapis.com/v4/spreadsheets';
  }

  // ── Get spreadsheet ID from URL ───────────────
  getSpreadsheetId() {
    const match = window.location.href.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  }

  // ── Get active sheet name via DOM ─────────────
  getActiveSheetName() {
    const activeTab = document.querySelector('.docs-sheet-tab-name.docs-sheet-active-tab .docs-sheet-tab-name-label');
    return activeTab ? activeTab.textContent.trim() : 'Sheet1';
  }

  // ── Read sheet data via Sheets API ────────────
  async readSheetData(token, sheetName = null, range = null) {
    const spreadsheetId = this.getSpreadsheetId();
    if (!spreadsheetId) throw new Error('No spreadsheet found');

    const sheet = sheetName || this.getActiveSheetName();
    const fullRange = range ? `${sheet}!${range}` : `${sheet}!A1:Z100`;

    const url = `${this.sheetsApiBase}/${spreadsheetId}/values/${encodeURIComponent(fullRange)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to read sheet');
    }

    const data = await response.json();
    return this.toUniversalModel(data, spreadsheetId, sheet);
  }

  // ── Read full workbook metadata ───────────────
  async readWorkbook(token) {
    const spreadsheetId = this.getSpreadsheetId();
    if (!spreadsheetId) throw new Error('No spreadsheet found');

    const url = `${this.sheetsApiBase}/${spreadsheetId}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();

    return {
      id: spreadsheetId,
      title: data.properties?.title,
      sheets: data.sheets?.map(s => ({
        id: s.properties.sheetId,
        name: s.properties.title,
        rowCount: s.properties.gridProperties?.rowCount,
        colCount: s.properties.gridProperties?.columnCount
      }))
    };
  }

  // ── Convert to Universal Data Model ──────────
  toUniversalModel(apiData, spreadsheetId, sheetName) {
    const rows = apiData.values || [];
    if (rows.length === 0) return { workbookId: spreadsheetId, sheetName, headers: [], rows: [], cells: [] };

    const headers = rows[0].map((h, i) => ({
      index: i,
      label: h,
      columnLetter: this.indexToColumn(i)
    }));

    const dataRows = rows.slice(1).map((row, rowIndex) => ({
      index: rowIndex + 2, // 1-based, skip header
      cells: headers.map((h, colIndex) => ({
        column: h.label,
        columnLetter: h.columnLetter,
        row: rowIndex + 2,
        address: `${h.columnLetter}${rowIndex + 2}`,
        value: row[colIndex] || '',
        type: this.detectType(row[colIndex])
      }))
    }));

    return {
      workbookId: spreadsheetId,
      sheetName,
      totalRows: rows.length - 1,
      totalColumns: headers.length,
      headers,
      rows: dataRows,
      summary: this.buildSummary(headers, dataRows)
    };
  }

  buildSummary(headers, rows) {
    const summary = {};
    headers.forEach(h => {
      const values = rows.map(r => r.cells.find(c => c.column === h.label)?.value).filter(Boolean);
      const nums = values.map(Number).filter(v => !isNaN(v));
      summary[h.label] = {
        count: values.length,
        nonEmpty: values.filter(v => v !== '').length,
        isNumeric: nums.length > values.length * 0.7,
        sample: values.slice(0, 3)
      };
      if (nums.length > 0) {
        summary[h.label].sum = nums.reduce((a, b) => a + b, 0);
        summary[h.label].avg = summary[h.label].sum / nums.length;
        summary[h.label].max = Math.max(...nums);
        summary[h.label].min = Math.min(...nums);
      }
    });
    return summary;
  }

  // ── Write values ──────────────────────────────
  async writeValues(token, range, values) {
    const spreadsheetId = this.getSpreadsheetId();
    const sheet = this.getActiveSheetName();
    const fullRange = `${sheet}!${range}`;

    const url = `${this.sheetsApiBase}/${spreadsheetId}/values/${encodeURIComponent(fullRange)}?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ range: fullRange, majorDimension: 'ROWS', values })
    });

    return response.ok;
  }

  // ── Insert formula ────────────────────────────
  async insertFormula(token, cell, formula) {
    return this.writeValues(token, cell, [[formula]]);
  }

  // ── Append rows ───────────────────────────────
  async appendRows(token, values) {
    const spreadsheetId = this.getSpreadsheetId();
    const sheet = this.getActiveSheetName();

    const url = `${this.sheetsApiBase}/${spreadsheetId}/values/${encodeURIComponent(sheet)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    return response.ok;
  }

  // ── Batch update (format, delete, etc) ────────
  async batchUpdate(token, requests) {
    const spreadsheetId = this.getSpreadsheetId();
    const url = `${this.sheetsApiBase}/${spreadsheetId}:batchUpdate`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });

    return response.ok;
  }

  // ── Delete rows ───────────────────────────────
  async deleteRows(token, sheetId, startIndex, endIndex) {
    return this.batchUpdate(token, [{
      deleteDimension: {
        range: {
          sheetId,
          dimension: 'ROWS',
          startIndex,
          endIndex
        }
      }
    }]);
  }

  // ── Sort data ─────────────────────────────────
  async sortData(token, sheetId, rangeObj, sortByColumn, ascending = true) {
    return this.batchUpdate(token, [{
      sortRange: {
        range: { sheetId, ...rangeObj },
        sortSpecs: [{
          dimensionIndex: sortByColumn,
          sortOrder: ascending ? 'ASCENDING' : 'DESCENDING'
        }]
      }
    }]);
  }

  // ── Create chart ──────────────────────────────
  async createChart(token, sheetId, chartSpec) {
    return this.batchUpdate(token, [{
      addChart: {
        chart: {
          spec: chartSpec,
          position: {
            overlayPosition: {
              anchorCell: { sheetId, rowIndex: 0, columnIndex: 0 },
              offsetXPixels: 0,
              offsetYPixels: 0,
              widthPixels: 600,
              heightPixels: 400
            }
          }
        }
      }
    }]);
  }

  // ── Format range ──────────────────────────────
  async formatRange(token, sheetId, rangeObj, format) {
    return this.batchUpdate(token, [{
      repeatCell: {
        range: { sheetId, ...rangeObj },
        cell: { userEnteredFormat: format },
        fields: 'userEnteredFormat'
      }
    }]);
  }

  // ── Helpers ───────────────────────────────────
  indexToColumn(index) {
    let col = '';
    let i = index;
    do {
      col = String.fromCharCode(65 + (i % 26)) + col;
      i = Math.floor(i / 26) - 1;
    } while (i >= 0);
    return col;
  }

  detectType(value) {
    if (!value) return 'empty';
    if (!isNaN(Number(value))) return 'number';
    if (!isNaN(Date.parse(value))) return 'date';
    if (typeof value === 'boolean' || value === 'TRUE' || value === 'FALSE') return 'boolean';
    return 'text';
  }
}

window.GoogleSheetsConnector = GoogleSheetsConnector;
