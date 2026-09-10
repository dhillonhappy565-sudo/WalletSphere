const XLSX = require('xlsx');
const { autoCategorize } = require('./csvParserEngine');
const crypto = require('crypto');

function parseDate(dateVal) {
  if (!dateVal) return new Date();

  if (typeof dateVal === 'number') {
    // XLSX Date code
    const dateObj = XLSX.SSF.parse_date_code(dateVal);
    if (dateObj) {
      return new Date(dateObj.y, dateObj.m - 1, dateObj.d);
    }
  }

  const str = String(dateVal).trim();
  let parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (day > 12 && month <= 12) {
      parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return new Date();
}

function parseXLSXBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  if (!jsonRows || jsonRows.length < 2) return [];

  // Find header row index
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(10, jsonRows.length); i++) {
    const row = jsonRows[i];
    if (Array.isArray(row)) {
      const rowStr = row.map((cell) => String(cell).toLowerCase()).join(' ');
      if (rowStr.includes('date') || rowStr.includes('particular') || rowStr.includes('debit') || rowStr.includes('amount')) {
        headerRowIdx = i;
        break;
      }
    }
  }

  const headers = jsonRows[headerRowIdx].map((cell) => String(cell || '').toLowerCase().trim());

  let dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('time'));
  let descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('particular') || h.includes('narration') || h.includes('detail') || h.includes('remark'));
  let debitIdx = headers.findIndex((h) => h.includes('debit') || h.includes('dr') || h.includes('withdraw'));
  let creditIdx = headers.findIndex((h) => h.includes('credit') || h.includes('cr') || h.includes('deposit'));
  let amountIdx = headers.findIndex((h) => h === 'amount' || h.includes('amt'));
  let typeIdx = headers.findIndex((h) => h.includes('type'));

  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;

  const parsedTransactions = [];

  for (let i = headerRowIdx + 1; i < jsonRows.length; i++) {
    const row = jsonRows[i];
    if (!Array.isArray(row) || row.length < 2) continue;

    const rawDate = row[dateIdx];
    const description = String(row[descIdx] || 'Bank Transaction').trim();

    let amount = 0;
    let type = 'expense';

    if (debitIdx !== -1 && creditIdx !== -1) {
      const debitVal = parseFloat(String(row[debitIdx] || '0').replace(/[^0-9\.]/g, ''));
      const creditVal = parseFloat(String(row[creditIdx] || '0').replace(/[^0-9\.]/g, ''));

      if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
      } else if (debitVal > 0) {
        amount = debitVal;
        type = 'expense';
      }
    } else if (amountIdx !== -1) {
      const rawAmt = parseFloat(String(row[amountIdx] || '0').replace(/[^0-9\.\-]/g, ''));
      if (rawAmt < 0) {
        amount = Math.abs(rawAmt);
        type = 'expense';
      } else {
        amount = rawAmt;
        if (typeIdx !== -1) {
          const typeVal = String(row[typeIdx] || '').toLowerCase();
          if (typeVal.includes('cr') || typeVal.includes('credit') || typeVal.includes('deposit')) {
            type = 'income';
          }
        }
      }
    }

    if (amount <= 0) continue;

    const parsedTxDate = parseDate(rawDate);
    const category = autoCategorize(description, type);

    const hash = crypto
      .createHash('md5')
      .update(`${parsedTxDate.toISOString().split('T')[0]}_${amount}_${description.toLowerCase().trim()}`)
      .digest('hex');

    parsedTransactions.push({
      date: parsedTxDate,
      description,
      amount,
      type,
      category,
      paymentMethod: 'UPI',
      source: 'xlsx',
      hash,
    });
  }

  return parsedTransactions;
}

module.exports = { parseXLSXBuffer };
