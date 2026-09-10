const crypto = require('crypto');

// Auto Categorization Keyword Dictionary
const CATEGORY_KEYWORDS = {
  Food: ['zomato', 'swiggy', 'mcdonald', 'domino', 'starbucks', 'dunkin', 'kfc', 'burger', 'restaurant', 'cafe', 'food', 'dining', 'bakery', 'tea'],
  Shopping: ['amazon', 'flipkart', 'myntra', 'zara', 'h&m', 'uniqlo', 'retail', 'mart', 'supermarket', 'blinkit', 'zepto', 'instamart', 'store', 'mall'],
  Travel: ['uber', 'ola', 'rapido', 'irctc', 'makemytrip', 'goibibo', 'indigo', 'air india', 'flight', 'fuel', 'petrol', 'hpcl', 'bpcl', 'iocl', 'toll', 'metro', 'cab', 'railway'],
  Bills: ['electricity', 'water', 'gas', 'airtel', 'jio', 'vi', 'vodafone', 'broadband', 'recharge', 'bill', 'bescom', 'tata play', 'dth'],
  Entertainment: ['netflix', 'spotify', 'prime', 'hotstar', 'bookmyshow', 'cinema', 'pvr', 'inox', 'youtube', 'steam', 'playstation'],
  Healthcare: ['pharmacy', 'apollo', 'medplus', '1mg', 'pharmeasy', 'hospital', 'clinic', 'doctor', 'lab', 'diagnostics', 'medical'],
  Salary: ['salary', 'payroll', 'stipend', 'remuneration', 'wages', 'credit interest'],
  Investment: ['zerodha', 'groww', 'upstox', 'coin', 'mutual fund', 'sip', 'lic', 'insurance', 'dividend', 'fd', 'stocks'],
};

// Categorize description based on keywords
function autoCategorize(description, type) {
  if (!description) return type === 'income' ? 'Salary' : 'Others';

  const descLower = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (descLower.includes(kw)) {
        return category;
      }
    }
  }

  if (type === 'income') return 'Salary';
  return 'Others';
}

// Parse Date from various bank formats
function parseDate(dateStr) {
  if (!dateStr) return new Date();

  const cleanStr = dateStr.trim();

  // Try Standard Date parse
  let parsed = new Date(cleanStr);
  if (!isNaN(parsed.getTime())) return parsed;

  // Try DD/MM/YYYY or DD-MM-YYYY
  const parts = cleanStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);

    if (year < 100) year += 2000;
    if (day > 12 && month <= 12) {
      // DD/MM/YYYY
      parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return new Date();
}

// Main CSV Parsing Engine
function parseCSVRows(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Parse CSV line supporting quoted strings
  const parseLine = (line) => {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    result.push(cur.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().trim());

  // Detect Column Indexes
  let dateIdx = headers.findIndex((h) => h.includes('date') || h.includes('time'));
  let descIdx = headers.findIndex((h) => h.includes('desc') || h.includes('particular') || h.includes('narration') || h.includes('detail') || h.includes('remark'));
  let debitIdx = headers.findIndex((h) => h.includes('debit') || h.includes('dr') || h.includes('withdraw'));
  let creditIdx = headers.findIndex((h) => h.includes('credit') || h.includes('cr') || h.includes('deposit'));
  let amountIdx = headers.findIndex((h) => h === 'amount' || h.includes('amt'));
  let typeIdx = headers.findIndex((h) => h.includes('type') || h.includes('txn type'));

  // Fallbacks if headers missing
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1;

  const parsedTransactions = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseLine(lines[i]);
    if (row.length < 2) continue;

    const rawDate = row[dateIdx] || '';
    const description = row[descIdx] || 'Bank Transaction';

    let amount = 0;
    let type = 'expense';

    if (debitIdx !== -1 && creditIdx !== -1) {
      const debitVal = parseFloat((row[debitIdx] || '0').replace(/[^0-9\.]/g, ''));
      const creditVal = parseFloat((row[creditIdx] || '0').replace(/[^0-9\.]/g, ''));

      if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
      } else if (debitVal > 0) {
        amount = debitVal;
        type = 'expense';
      }
    } else if (amountIdx !== -1) {
      const rawAmt = parseFloat((row[amountIdx] || '0').replace(/[^0-9\.\-]/g, ''));
      if (rawAmt < 0) {
        amount = Math.abs(rawAmt);
        type = 'expense';
      } else {
        amount = rawAmt;
        if (typeIdx !== -1) {
          const typeVal = (row[typeIdx] || '').toLowerCase();
          if (typeVal.includes('cr') || typeVal.includes('credit') || typeVal.includes('deposit')) {
            type = 'income';
          }
        }
      }
    }

    if (amount <= 0) continue;

    const parsedTxDate = parseDate(rawDate);
    const category = autoCategorize(description, type);

    // Compute Deduplication Hash
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
      source: 'csv',
      hash,
    });
  }

  return parsedTransactions;
}

module.exports = { parseCSVRows, autoCategorize };
