const Transaction = require('../models/Transaction');
const { parseBankEmail, parseBankEmailWithAI } = require('../utils/bankEmailParser');

/**
 * POST /api/bank-sync/sync-gmail
 * Fetches recent bank alert emails using Google Access Token, parses them,
 * and saves new non-duplicate transactions for the logged-in user.
 */
exports.syncGmailBankAlerts = async (req, res) => {
  try {
    const { googleAccessToken } = req.body;
    const userId = req.user._id;

    if (!googleAccessToken) {
      return res.status(400).json({
        status: 'fail',
        message: 'Google Access Token is required to scan Gmail for bank alerts.',
      });
    }

    // 1. Search Gmail for bank alert emails across domain variations
    const query = encodeURIComponent(
      'from:(hdfcbank.bank.in OR hdfcbank.net OR hdfcbank.com OR icicibank.com OR sbi.co.in OR axisbank.com OR paytm.com OR phonepe.com OR razorpay.com OR amazonpay.in) OR subject:(debited OR credited OR "transaction alert" OR "InstaAlerts" OR "UPI transaction")'
    );

    const listRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=15`,
      {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      }
    );

    if (!listRes.ok) {
      const errData = await listRes.json().catch(() => ({}));
      return res.status(400).json({
        status: 'fail',
        message: errData.error?.message || 'Failed to connect to Gmail API. Ensure Gmail permission was granted.',
      });
    }

    const listData = await listRes.json();
    const messages = listData.messages || [];

    if (messages.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No bank alert emails found in your Gmail inbox.',
        data: { syncedCount: 0, skippedCount: 0, transactionsAdded: [] },
      });
    }

    let syncedCount = 0;
    let skippedCount = 0;
    const transactionsAdded = [];

    // 2. Process each email message
    for (const msgRef of messages) {
      const msgRes = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${msgRef.id}?format=full`,
        { headers: { Authorization: `Bearer ${googleAccessToken}` } }
      );

      if (!msgRes.ok) continue;

      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];
      const subjectHeader = headers.find((h) => h.name.toLowerCase() === 'subject');
      const subject = subjectHeader ? subjectHeader.value : '';

      // Extract body
      let bodyText = msgData.snippet || '';
      if (msgData.payload?.parts) {
        for (const part of msgData.payload.parts) {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            bodyText += ' ' + Buffer.from(part.body.data, 'base64').toString('utf-8');
          }
        }
      }

      const internalDate = msgData.internalDate ? new Date(parseInt(msgData.internalDate)) : new Date();

      // 3. Parse email using hybrid Regex + AI parser
      const parsed = await parseBankEmailWithAI(subject, bodyText, internalDate);

      if (!parsed.isBankAlert || !parsed.amount) {
        continue;
      }

      // 4. Check for existing duplicate transaction to avoid double counting
      const dateStart = new Date(parsed.date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(parsed.date);
      dateEnd.setHours(23, 59, 59, 999);

      const existing = await Transaction.findOne({
        user: userId,
        amount: parsed.amount,
        type: parsed.type,
        date: { $gte: dateStart, $lte: dateEnd },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // 5. Create new transaction in database
      const newTx = await Transaction.create({
        user: userId,
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        merchant: parsed.merchant,
        date: parsed.date,
        description: parsed.description,
        notes: `Imported via Gmail Sync (${parsed.bankName}${parsed.isAIParsed ? ' • AI Parsed' : ''})`,
      });

      transactionsAdded.push(newTx);
      syncedCount++;
    }

    res.status(200).json({
      status: 'success',
      message: `Scanned Gmail inbox. ${syncedCount} new bank transactions imported (${skippedCount} duplicates skipped).`,
      data: {
        syncedCount,
        skippedCount,
        transactionsAdded,
      },
    });
  } catch (error) {
    console.error('Gmail Sync Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error scanning Gmail for bank transactions: ' + error.message,
    });
  }
};

/**
 * POST /api/bank-sync/parse-raw
 * Parse any raw bank email or SMS text using hybrid Regex + AI parser.
 */
exports.parseRawBankText = async (req, res) => {
  try {
    const { rawText, autoSave = false } = req.body;
    const userId = req.user._id;

    if (!rawText || !rawText.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide raw bank email/SMS text to parse.',
      });
    }

    const parsed = await parseBankEmailWithAI('', rawText, new Date());

    if (!parsed.isBankAlert) {
      return res.status(400).json({
        status: 'fail',
        message: 'Could not detect a valid bank transaction in the provided text. Ensure text includes amount and debit/credit status.',
      });
    }

    let createdTransaction = null;
    if (autoSave) {
      createdTransaction = await Transaction.create({
        user: userId,
        amount: parsed.amount,
        type: parsed.type,
        category: parsed.category,
        merchant: parsed.merchant,
        date: parsed.date,
        description: parsed.description,
        notes: `Manually parsed bank alert text`,
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        parsed,
        createdTransaction,
      },
    });
  } catch (error) {
    console.error('Raw Text Parse Error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to parse bank alert text.',
    });
  }
};
