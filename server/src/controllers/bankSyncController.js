const Transaction = require('../models/Transaction');
const { parseBankEmail, parseBankEmailWithAI } = require('../utils/bankEmailParser');

/**
 * Recursive helper to extract and decode plain text/HTML body from nested Gmail MIME parts.
 */
function extractBodyFromGmailPayload(payload) {
  let bodyText = '';

  if (!payload) return bodyText;

  // Direct body data
  if (payload.body && payload.body.data) {
    const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    if (payload.mimeType === 'text/html') {
      // Strip HTML tags & decode HTML entities to plain text
      bodyText += ' ' + decoded.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');
    } else {
      bodyText += ' ' + decoded;
    }
  }

  // Recursive parts traversal
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      bodyText += ' ' + extractBodyFromGmailPayload(part);
    }
  }

  return bodyText;
}

/**
 * POST /api/bank-sync/sync-gmail
 * Fetches bank alert emails from Gmail for a given timeline range (default: last 90 days),
 * parses them, and saves non-duplicate transactions for the logged-in user.
 */
exports.syncGmailBankAlerts = async (req, res) => {
  try {
    const { googleAccessToken, days = 90 } = req.body;
    const userId = req.user._id;

    if (!googleAccessToken) {
      return res.status(400).json({
        status: 'fail',
        message: 'Google Access Token is required to scan Gmail for bank alerts.',
      });
    }

    // Calculate timeline date cutoff for Gmail query (e.g. newer_than:90d)
    const scanDays = Math.min(Math.max(parseInt(days, 10) || 90, 7), 365);
    const newerThanParam = `newer_than:${scanDays}d`;

    // Extremely inclusive search query covering all Indian banks, card issuers & payment apps
    const bankDomains = 'hdfcbank OR icicibank OR sbi OR axisbank OR paytm OR phonepe OR razorpay OR amazonpay OR kotak OR pnb OR bank OR alert';
    const transactionKeywords = 'debited OR credited OR "transaction alert" OR "InstaAlerts" OR "UPI" OR "paid to" OR "account ending" OR "credited to" OR "spent"';
    
    const queryStr = `(${newerThanParam}) AND (from:(${bankDomains}) OR subject:(${transactionKeywords}) OR "debited from" OR "credited to")`;
    const encodedQuery = encodeURIComponent(queryStr);

    // Fetch up to 100 matching message IDs from Gmail
    const listRes = await fetch(
      `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodedQuery}&maxResults=100`,
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
        message: `No bank alert emails found in your Gmail inbox for the last ${scanDays} days.`,
        data: { syncedCount: 0, skippedCount: 0, transactionsAdded: [], scanDays },
      });
    }

    let syncedCount = 0;
    let skippedCount = 0;
    const transactionsAdded = [];

    // Process matching email messages
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

      // Extract complete body text from all MIME parts
      const snippet = msgData.snippet || '';
      const fullExtractedBody = extractBodyFromGmailPayload(msgData.payload);
      const combinedBody = `${snippet} ${fullExtractedBody}`.replace(/\s+/g, ' ');

      const internalDate = msgData.internalDate ? new Date(parseInt(msgData.internalDate, 10)) : new Date();

      // Parse email using hybrid Regex + AI fallback parser
      const parsed = await parseBankEmailWithAI(subject, combinedBody, internalDate);

      if (!parsed.isBankAlert || !parsed.amount || parsed.amount <= 0) {
        continue;
      }

      // Check for existing duplicate transaction (matching amount, type, date within 1-day window)
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

      // Create new transaction in database
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
      message: `Scanned Gmail inbox for the last ${scanDays} days. ${syncedCount} new transactions imported (${skippedCount} duplicates skipped).`,
      data: {
        syncedCount,
        skippedCount,
        transactionsAdded,
        scanDays,
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

    if (!parsed.isBankAlert || !parsed.amount) {
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
