const pdfModule = require('pdf-parse');
const { autoCategorize } = require('./csvParserEngine');
const crypto = require('crypto');

// Regex patterns for bank statement lines
const DATE_REGEX = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3}\s+\d{2,4})/;

async function extractPDFText(buffer, password = '') {
  if (typeof pdfModule === 'function') {
    const data = await pdfModule(buffer, password ? { password } : {});
    return data.text || '';
  }

  const PDFClass = pdfModule.PDFParse || pdfModule.default || pdfModule;
  const instance = new PDFClass({ data: buffer, password });
  const result = await instance.getText();
  return typeof result === 'string' ? result : (result.text || '');
}

async function parsePDFBuffer(buffer, password = '') {
  try {
    const text = await extractPDFText(buffer, password);
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

    const parsedTransactions = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const dateMatch = line.match(DATE_REGEX);

      if (dateMatch) {
        const rawDate = dateMatch[0];
        const amounts = line.match(/[\d,]+\.\d{2}/g) || line.match(/\b\d+(?:,\d{3})*(?:\.\d{1,2})?\b/g) || [];

        if (amounts.length > 0) {
          // Extract description
          let description = line.replace(rawDate, '');
          amounts.forEach((amt) => {
            description = description.replace(amt, '');
          });

          description = description.replace(/(cr|dr|credit|debit|chq|ref|upi|ach|neft|rtgs|imps)/gi, '');
          description = description.replace(/[^\w\s\-\.&]/g, ' ').replace(/\s+/g, ' ').trim();

          if (!description || description.length < 2) {
            description = 'Bank PDF Transaction';
          }

          const validNums = amounts
            .map((a) => parseFloat(a.replace(/,/g, '')))
            .filter((n) => !isNaN(n) && n > 0);

          if (validNums.length > 0) {
            const rawAmtVal = validNums[0];
            let type = 'expense';
            const lineLower = line.toLowerCase();

            if (lineLower.includes('cr') || lineLower.includes('credit') || lineLower.includes('deposit') || lineLower.includes('by transfer')) {
              type = 'income';
            } else if (lineLower.includes('dr') || lineLower.includes('debit') || lineLower.includes('withdrawal') || lineLower.includes('to transfer')) {
              type = 'expense';
            }

            let parsedTxDate = new Date(rawDate);
            if (isNaN(parsedTxDate.getTime())) {
              const parts = rawDate.split(/[\/\-\.]/);
              if (parts.length === 3) {
                let d = parseInt(parts[0], 10);
                let m = parseInt(parts[1], 10) - 1;
                let y = parseInt(parts[2], 10);
                if (y < 100) y += 2000;
                parsedTxDate = new Date(y, m, d);
              }
              if (isNaN(parsedTxDate.getTime())) parsedTxDate = new Date();
            }

            const category = autoCategorize(description, type);

            const hash = crypto
              .createHash('md5')
              .update(`${parsedTxDate.toISOString().split('T')[0]}_${rawAmtVal}_${description.toLowerCase().trim()}`)
              .digest('hex');

            parsedTransactions.push({
              date: parsedTxDate,
              description,
              amount: rawAmtVal,
              type,
              category,
              paymentMethod: 'UPI',
              source: 'pdf',
              hash,
            });
          }
        }
      }
    }

    return parsedTransactions;
  } catch (error) {
    const msg = error.message?.toLowerCase() || '';
    const name = error.name || '';
    if (name === 'PasswordException' || msg.includes('password') || msg.includes('decrypt') || msg.includes('encrypted')) {
      const err = new Error('PDF bank statement is password protected. Please enter password to unlock.');
      err.isPasswordProtected = true;
      throw err;
    }
    throw error;
  }
}

module.exports = { parsePDFBuffer };
