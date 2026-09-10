const Transaction = require('../models/Transaction');
const CategoryRule = require('../models/CategoryRule');
const { parseCSVRows, autoCategorize } = require('../utils/csvParserEngine');
const { parseXLSXBuffer } = require('../utils/xlsxParserEngine');
const { parsePDFBuffer } = require('../utils/pdfParserEngine');

// Helper to apply saved user CategoryRules to parsed transactions
const applyUserRules = async (userId, parsedRows) => {
  const userRules = await CategoryRule.find({ user: userId });
  if (!userRules || userRules.length === 0) return parsedRows;

  return parsedRows.map((row) => {
    const descLower = row.description.toLowerCase().trim();
    const matchedRule = userRules.find((rule) => descLower.includes(rule.keyword));

    if (matchedRule) {
      return {
        ...row,
        category: matchedRule.category,
        type: matchedRule.type,
        isExcludedFromSummary: matchedRule.type === 'transfer' || matchedRule.isExcludedFromSummary,
      };
    }
    return row;
  });
};

// @desc    Parse uploaded bank statement file & apply user rules for review
// @route   POST /api/transactions/import/parse
// @access  Private
const parseStatement = async (req, res) => {
  try {
    let parsedRows = [];
    const password = req.body.password || '';

    if (req.file) {
      const fileName = req.file.originalname.toLowerCase();
      const buffer = req.file.buffer;

      if (fileName.endsWith('.csv')) {
        const csvText = buffer.toString('utf-8');
        parsedRows = parseCSVRows(csvText);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        parsedRows = parseXLSXBuffer(buffer);
      } else if (fileName.endsWith('.pdf')) {
        try {
          parsedRows = await parsePDFBuffer(buffer, password);
        } catch (pdfErr) {
          if (pdfErr.isPasswordProtected) {
            return res.status(401).json({
              status: 'password_required',
              message: 'PDF bank statement is password protected. Please enter password to unlock.',
            });
          }
          throw pdfErr;
        }
      } else {
        return res.status(400).json({
          status: 'fail',
          message: 'Unsupported file format. Please upload a CSV, XLSX, or PDF bank statement.',
        });
      }
    } else if (req.body.csvData) {
      parsedRows = parseCSVRows(req.body.csvData);
    } else {
      return res.status(400).json({
        status: 'fail',
        message: 'Please upload a bank statement file (CSV, XLSX, or PDF).',
      });
    }

    if (parsedRows.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Could not parse any valid transactions from the uploaded statement file.',
      });
    }

    const userId = req.user._id;

    // Apply User Saved Memory Rules
    parsedRows = await applyUserRules(userId, parsedRows);

    // Identify Duplicates
    const existingTransactions = await Transaction.find({ user: userId });
    const existingHashSet = new Set(existingTransactions.map((tx) => tx.hash).filter(Boolean));

    const candidates = [];
    const duplicates = [];

    parsedRows.forEach((row, index) => {
      const isDuplicateHash = existingHashSet.has(row.hash);
      const isDuplicateDetails = existingTransactions.some((tx) => {
        const sameAmt = tx.amount === row.amount;
        const sameType = tx.type === row.type;
        const sameDesc = tx.description.toLowerCase().trim() === row.description.toLowerCase().trim();
        const sameDay = new Date(tx.date).toISOString().split('T')[0] === new Date(row.date).toISOString().split('T')[0];
        return sameAmt && sameType && sameDesc && sameDay;
      });

      if (isDuplicateHash || isDuplicateDetails) {
        duplicates.push({ ...row, tempId: `dup_${index}` });
      } else {
        candidates.push({ ...row, tempId: `cand_${index}` });
      }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        totalParsed: parsedRows.length,
        candidateCount: candidates.length,
        duplicateCount: duplicates.length,
        candidates,
        duplicates,
      },
    });
  } catch (error) {
    console.error('Error parsing bank statement:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to parse bank statement',
    });
  }
};

// @desc    Confirm import after user review & save merchant/contact memory rules
// @route   POST /api/transactions/import/confirm
// @access  Private
const confirmImport = async (req, res) => {
  try {
    const userId = req.user._id;
    const { transactions, saveRules } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No transactions provided for confirmation.',
      });
    }

    // Save Merchant/Contact Memory Rules if requested
    if (Array.isArray(saveRules) && saveRules.length > 0) {
      for (const rule of saveRules) {
        if (rule.keyword && rule.category) {
          const cleanKw = rule.keyword.toLowerCase().trim();
          await CategoryRule.findOneAndUpdate(
            { user: userId, keyword: cleanKw },
            {
              category: rule.category,
              type: rule.type || 'expense',
              isExcludedFromSummary: rule.type === 'transfer',
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    // Prepare Transactions for Insert
    const toInsert = transactions.map((tx) => ({
      user: userId,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      isExcludedFromSummary: tx.type === 'transfer' || tx.isExcludedFromSummary,
      date: new Date(tx.date),
      paymentMethod: tx.paymentMethod || 'UPI',
      source: tx.source || 'import',
      hash: tx.hash,
    }));

    const inserted = await Transaction.insertMany(toInsert);

    return res.status(200).json({
      status: 'success',
      data: {
        importedCount: inserted.length,
        importedTransactions: inserted,
      },
    });
  } catch (error) {
    console.error('Error confirming statement import:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to import confirmed transactions',
    });
  }
};

module.exports = {
  parseStatement,
  confirmImport,
  importStatement: parseStatement,
};
