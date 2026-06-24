// ============================================
// MICROSOFT EXCEL CONNECTOR
// Universal Data Model Adapter (OfficeJS)
// ============================================

class ExcelConnector {
  constructor() {
    this.isExcel = true;
  }

  // ── Convert column letter to 0-based index ────
  columnToIndex(letter) {
    let column = 0;
    const length = letter.length;
    for (let i = 0; i < length; i++) {
      column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return column - 1;
  }

  // ── Convert 0-based index to column letter ────
  indexToColumn(index) {
    let col = '';
    let i = index;
    do {
      col = String.fromCharCode(65 + (i % 26)) + col;
      i = Math.floor(i / 26) - 1;
    } while (i >= 0);
    return col;
  }

  // ── Detect value types ────────────────────────
  detectType(value) {
    if (value === null || value === undefined || value === '') return 'empty';
    if (!isNaN(Number(value))) return 'number';
    if (!isNaN(Date.parse(value))) return 'date';
    if (typeof value === 'boolean' || value === true || value === false) return 'boolean';
    return 'text';
  }

  // ── Read worksheet name ───────────────────────
  async getActiveSheetName() {
    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      sheet.load('name');
      await context.sync();
      return sheet.name;
    });
  }

  // ── Read sheet data in Universal Model ────────
  async readSheetData(token = null, sheetName = null, rangeAddress = null) {
    return Excel.run(async (context) => {
      const sheet = sheetName 
        ? context.workbook.worksheets.getItem(sheetName)
        : context.workbook.worksheets.getActiveWorksheet();
      
      const range = rangeAddress 
        ? sheet.getRange(rangeAddress)
        : sheet.getUsedRange();
      
      range.load(["values", "address", "columnCount", "rowCount"]);
      sheet.load("name");
      await context.sync();

      const rows = range.values || [];
      if (rows.length === 0) {
        return { workbookId: 'excel', sheetName: sheet.name, headers: [], rows: [], cells: [] };
      }

      // Headers (first row)
      const headers = rows[0].map((h, i) => ({
        index: i,
        label: h ? h.toString() : `Column ${i + 1}`,
        columnLetter: this.indexToColumn(i)
      }));

      // Data rows
      const dataRows = rows.slice(1).map((row, rowIndex) => ({
        index: rowIndex + 2, // 1-based, skip header
        cells: headers.map((h, colIndex) => ({
          column: h.label,
          columnLetter: h.columnLetter,
          row: rowIndex + 2,
          address: `${h.columnLetter}${rowIndex + 2}`,
          value: row[colIndex] !== undefined && row[colIndex] !== null ? row[colIndex] : '',
          type: this.detectType(row[colIndex])
        }))
      }));

      return {
        workbookId: 'excel',
        sheetName: sheet.name,
        totalRows: rows.length - 1,
        totalColumns: headers.length,
        headers,
        rows: dataRows,
        summary: this.buildSummary(headers, dataRows)
      };
    });
  }

  // ── Build statistics summary ──────────────────
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
  async writeValues(token = null, rangeAddress, values) {
    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = sheet.getRange(rangeAddress);
      range.values = values;
      await context.sync();
      return true;
    });
  }

  // ── Insert formula ────────────────────────────
  async insertFormula(token = null, cellAddress, formula) {
    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const range = sheet.getRange(cellAddress);
      // Ensure formula starts with =
      const formattedFormula = formula.startsWith('=') ? formula : `=${formula}`;
      range.formulas = [[formattedFormula]];
      await context.sync();
      return true;
    });
  }

  // ── Append rows ───────────────────────────────
  async appendRows(token = null, values) {
    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const usedRange = sheet.getUsedRange();
      usedRange.load("rowCount");
      await context.sync();

      const lastRow = usedRange.rowCount;
      const colCount = values[0].length;
      const targetRangeAddress = `A${lastRow + 1}:${this.indexToColumn(colCount - 1)}${lastRow + values.length}`;
      
      const targetRange = sheet.getRange(targetRangeAddress);
      targetRange.values = values;
      await context.sync();
      return true;
    });
  }

  // ── Delete rows ───────────────────────────────
  async deleteRows(token = null, sheetId = null, startIndex, endIndex) {
    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const count = endIndex - startIndex;
      // OfficeJS uses 0-based index for rows
      const range = sheet.getRangeByIndexes(startIndex, 0, count, 1).getEntireRow();
      range.delete(Excel.DeleteBehavior.up);
      await context.sync();
      return true;
    });
  }

  // ── Sort data ─────────────────────────────────
  async sortData(token = null, sheetId = null, rangeObj, sortByColumn, ascending = true) {
    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      // rangeObj expected: { startRowIndex, endRowIndex, startColumnIndex, endColumnIndex }
      const rowCount = rangeObj.endRowIndex - rangeObj.startRowIndex;
      const colCount = rangeObj.endColumnIndex - rangeObj.startColumnIndex;
      
      const range = sheet.getRangeByIndexes(
        rangeObj.startRowIndex,
        rangeObj.startColumnIndex,
        rowCount,
        colCount
      );

      const sortFields = [{
        key: sortByColumn,
        ascending: ascending
      }];

      range.sort.apply(sortFields);
      await context.sync();
      return true;
    });
  }

  // ── Format range ──────────────────────────────
  async formatRange(token = null, sheetId = null, rangeObj, format) {
    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const rowCount = rangeObj.endRowIndex - rangeObj.startRowIndex;
      const colCount = rangeObj.endColumnIndex - rangeObj.startColumnIndex;
      
      const range = sheet.getRangeByIndexes(
        rangeObj.startRowIndex,
        rangeObj.startColumnIndex,
        rowCount,
        colCount
      );

      if (format.numberFormat) {
        range.numberFormat = [[format.numberFormat]];
      }
      
      if (format.backgroundColor) {
        range.format.fill.color = format.backgroundColor;
      }

      if (format.textFormat) {
        if (format.textFormat.bold !== undefined) range.format.font.bold = format.textFormat.bold;
        if (format.textFormat.italic !== undefined) range.format.font.italic = format.textFormat.italic;
        if (format.textFormat.color !== undefined) range.format.font.color = format.textFormat.color;
        if (format.textFormat.fontSize !== undefined) range.format.font.size = format.textFormat.fontSize;
      }

      await context.sync();
      return true;
    });
  }
}

window.ExcelConnector = ExcelConnector;
