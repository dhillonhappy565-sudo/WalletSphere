/**
 * bankEmailParser.js
 * Comprehensive Parser Engine for Indian Bank Email & SMS Transaction Alerts.
 * Supports: HDFC Bank (alerts@hdfcbank.bank.in, alerts@hdfcbank.net), ICICI, SBI, Axis, PNB, Kotak, Paytm, PhonePe, Google Pay, Razorpay, Amazon Pay, UPI.
 */

// Category Auto-Classifier based on Merchant / Payee Keywords (Mapped to Mongoose Schema Enums)
const CATEGORY_RULES = [
  { category: 'Food', keywords: ['zomato', 'swiggy', 'mcdonalds', 'kfc', 'dominos', 'starbucks', 'cafe', 'restaurant', 'dineout', 'burger', 'pizza', 'blinkit', 'zepto', 'eats'] },
  { category: 'Shopping', keywords: ['amazon', 'flipkart', 'myntra', 'nykaa', 'meesho', 'tata cliq', 'ajio', 'trends', 'zara', 'h&m', 'reliancedigital', 'croma', 'uniqlo', 'retail', 'mart', 'traders'] },
  { category: 'Shopping', keywords: ['bigbasket', 'blinkit', 'zepto', 'instamart', 'dmart', 'more megastore', 'nature basket', 'supermarket', 'grocery', 'milk', 'jiomart'] },
  { category: 'Bills', keywords: ['airtel', 'jio', 'vi', 'vodafone', 'bescom', 'tata play', 'dth', 'electricity', 'gas', 'water bill', 'broadband', 'recharge', 'billdesk', 'paytm bill'] },
  { category: 'Entertainment', keywords: ['netflix', 'spotify', 'prime video', 'hotstar', 'bookmyshow', 'pvr', 'inox', 'youtube', 'steam', 'playstation'] },
  { category: 'Travel', keywords: ['uber', 'ola', 'rapido', 'irctc', 'makemytrip', 'goibibo', 'indigo', 'air india', 'redbus', 'fastag', 'petrol', 'shell', 'hpcl', 'iocl', 'fuel'] },
  { category: 'Healthcare', keywords: ['apollo', 'pharmeasy', '1mg', 'netmeds', 'hospital', 'clinic', 'pharmacy', 'lab', 'medical'] },
  { category: 'Investment', keywords: ['zerodha', 'groww', 'upstox', 'coin', 'kuvera', 'indmoney', 'mutual fund', 'sip', 'lic', 'insurance'] },
];

function classifyCategory(merchantName) {
  if (!merchantName) return 'Others';
  const text = merchantName.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.category;
    }
  }
  return 'Others';
}

/**
 * Parses raw text/HTML snippet from a bank email or SMS alert.
 * Returns an object: { isBankAlert, amount, type, merchant, date, bankName, accountLast4, category, rawSnippet }
 */
function parseBankEmail(emailSubject = '', emailBody = '', dateReceived = new Date()) {
  const combinedText = `${emailSubject} ${emailBody}`.replace(/\s+/g, ' ');

  // 1. Detect if this is a transaction alert
  const transactionKeywords = [
    'debited', 'credited', 'paid', 'sent', 'received', 'spent', 'transferred',
    'transaction alert', 'vpa', 'upi', 'neft', 'imps', 'rtgs', 'a/c', 'account',
  ];
  const lowerText = combinedText.toLowerCase();
  const isBankAlert = transactionKeywords.some((kw) => lowerText.includes(kw));

  if (!isBankAlert) {
    return { isBankAlert: false };
  }

  // 2. Extract Amount
  // Formats: Rs.44.00, Rs.900.00, Rs 500, Rs. 1,250.50, INR 499.00, ₹44
  let amount = 0;
  const amountRegex = /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i;
  const amountMatch = combinedText.match(amountRegex);

  if (amountMatch && amountMatch[1]) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  if (!amount || isNaN(amount) || amount <= 0) {
    return { isBankAlert: false };
  }

  // 3. Extract Type (expense vs income)
  let type = 'expense';
  if (
    lowerText.includes('credited') ||
    lowerText.includes('received') ||
    lowerText.includes('refund') ||
    lowerText.includes('cashback') ||
    lowerText.includes('deposited')
  ) {
    type = 'income';
  }

  // 4. Extract Bank Name
  let bankName = 'HDFC Bank';
  if (/hdfc/i.test(combinedText) || /instaalert/i.test(combinedText)) bankName = 'HDFC Bank';
  else if (/icici/i.test(combinedText)) bankName = 'ICICI Bank';
  else if (/sbi|state bank/i.test(combinedText)) bankName = 'SBI';
  else if (/axis bank|axis\.com/i.test(combinedText)) bankName = 'Axis Bank';
  else if (/pnb|punjab national/i.test(combinedText)) bankName = 'PNB';
  else if (/kotak/i.test(combinedText)) bankName = 'Kotak Bank';
  else if (/paytm/i.test(combinedText)) bankName = 'Paytm';
  else if (/phonepe/i.test(combinedText)) bankName = 'PhonePe';
  else if (/gpay|google pay/i.test(combinedText)) bankName = 'Google Pay';

  // 5. Extract Account Last 4 Digits
  let accountLast4 = '';
  const acRegex = /(?:a\/c|account|card)\s*(?:ending\s+in|ending)?\s*[*xX]*(\d{4})/i;
  const acMatch = combinedText.match(acRegex);
  if (acMatch) {
    accountLast4 = acMatch[1];
  }

  // 6. Extract Payee / Merchant / Sender Name
  let merchant = 'Bank Transaction';

  // Specific HDFC Pattern 1: "(Thrv Traders)" inside parentheses after VPA
  const parenMatch = combinedText.match(/\(([^()]{3,30})\)\s+on\s+\d{2}-\d{2}-\d{2}/i);
  if (parenMatch && parenMatch[1] && !/vpa|ref|upi/i.test(parenMatch[1])) {
    merchant = parenMatch[1].trim();
  }

  // Specific HDFC Pattern 2: "Sender: SUKHWINDER SINGH (VPA: ...)"
  if (merchant === 'Bank Transaction') {
    const senderMatch = combinedText.match(/Sender:\s*([A-Za-z0-9\s]+?)(?=\s*\(|\s*VPA|\s*on|\.|$)/i);
    if (senderMatch && senderMatch[1] && senderMatch[1].trim().length > 2) {
      merchant = senderMatch[1].trim();
    }
  }

  // Generic Patterns Fallback
  if (merchant === 'Bank Transaction') {
    const merchantPatterns = [
      /(?:towards\s+VPA|towards|paid to|to VPA|to|at|info:?)\s+(?:[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\s+)?(?:\(([^()]+)\)|([A-Za-z0-9\s&.\-*]{3,30}))(?=\s+(?:on|ref|via|from|val|avail|bal|a\/c|\.|,|$))/i,
      /(?:paid to|transferred to|towards)\s+([A-Za-z0-9\s]+?)(?=\s+on|\.|$)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = combinedText.match(pattern);
      if (match) {
        const candidate = match[1] || match[2];
        if (candidate && candidate.trim().length > 2) {
          let cleaned = candidate.trim()
            .replace(/^(vpa|info|ref|val|no)\s+/i, '')
            .replace(/@\w+/g, '') // remove @upi handle suffix
            .trim();
          
          if (!/^(the|a\/c|account|bank|your|rs|inr|bal|balance)$/i.test(cleaned)) {
            merchant = cleaned;
            break;
          }
        }
      }
    }
  }

  // If merchant is still default, clean up email subject
  if (merchant === 'Bank Transaction' && emailSubject) {
    merchant = emailSubject
      .replace(/alert|notification|debit|credit|update|transaction|hdfc|bank/gi, '')
      .trim() || `${bankName} Alert`;
  }

  // 7. Auto Category
  const category = classifyCategory(merchant);

  // 8. Extract Date (Date format: 19-09-26 or 23-09-26)
  let parsedDate = new Date(dateReceived);
  const dateRegex = /(\d{1,2})[-/](\d{1,2}|[A-Za-z]{3})[-/](\d{2,4})/;
  const dateMatch = combinedText.match(dateRegex);
  if (dateMatch) {
    const rawDateStr = dateMatch[0];
    const parts = rawDateStr.split(/[-/]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0]);
      let month = parseInt(parts[1]) - 1;
      let year = parseInt(parts[2]);
      if (year < 100) year += 2000;
      const candidateDate = new Date(year, month, day);
      if (!isNaN(candidateDate.getTime())) {
        parsedDate = candidateDate;
      }
    }
  }

  return {
    isBankAlert: true,
    amount,
    type,
    category,
    merchant,
    date: parsedDate,
    bankName,
    accountLast4,
    description: `Auto-parsed from ${bankName} email alert (${merchant})`,
    rawSnippet: combinedText.substring(0, 200),
  };
}

/**
 * AI / LLM Fallback Parser for Unrecognized Bank Email Formats.
 * Uses Meta LLaMA 3.1 70B / NVIDIA NIM API to extract structured JSON
 * whenever regular expressions fail or encounter obscure bank formats.
 */
async function parseBankEmailWithAI(emailSubject = '', emailBody = '', dateReceived = new Date()) {
  // 1. Try fast local Regex first
  const regexResult = parseBankEmail(emailSubject, emailBody, dateReceived);
  
  // If regex successfully extracted valid amount and merchant, return fast result!
  if (regexResult.isBankAlert && regexResult.amount && regexResult.merchant !== 'Bank Transaction') {
    return regexResult;
  }

  // 2. If regex missed details or low confidence, fallback to AI LLM JSON Parser
  const combinedText = `${emailSubject} ${emailBody}`.replace(/\s+/g, ' ').substring(0, 1000);
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    // If no AI key set, return regex result as best effort
    return regexResult;
  }

  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://integrate.api.nvidia.com/v1',
      timeout: 4000,
    });

    const prompt = `You are an expert Indian bank transaction email parser. Extract financial details from the following email snippet into pure raw JSON ONLY (no markdown formatting, no code blocks):

Email: "${combinedText}"

Required JSON fields:
{
  "isBankAlert": true or false,
  "amount": number (e.g. 450.00),
  "type": "expense" or "income",
  "merchant": "Name of Payee/Merchant or Sender/Receiver",
  "category": "Food" | "Shopping" | "Travel" | "Entertainment" | "Bills" | "Healthcare" | "Salary" | "Investment" | "Transfer & Reimbursement" | "Others",
  "bankName": "Bank Name e.g. HDFC Bank, SBI, ICICI, etc.",
  "accountLast4": "4 digit account/card number or empty string",
  "date": "YYYY-MM-DD"
}`;

    const completion = await openai.chat.completions.create({
      model: 'meta/llama-3.1-70b-instruct',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 250,
    });

    let rawJson = completion.choices[0]?.message?.content || '';
    rawJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedAI = JSON.parse(rawJson);
    if (parsedAI && parsedAI.isBankAlert && parsedAI.amount > 0) {
      return {
        isBankAlert: true,
        amount: parseFloat(parsedAI.amount),
        type: parsedAI.type === 'income' ? 'income' : 'expense',
        category: parsedAI.category || classifyCategory(parsedAI.merchant),
        merchant: parsedAI.merchant || 'Bank Transaction',
        date: parsedAI.date ? new Date(parsedAI.date) : new Date(dateReceived),
        bankName: parsedAI.bankName || 'Bank',
        accountLast4: parsedAI.accountLast4 || '',
        description: `AI Parsed from ${parsedAI.bankName || 'Bank'} email (${parsedAI.merchant})`,
        rawSnippet: combinedText.substring(0, 200),
        isAIParsed: true,
      };
    }
  } catch (err) {
    console.warn('AI Bank Parser Fallback error:', err.message);
  }

  return regexResult;
}

module.exports = {
  parseBankEmail,
  parseBankEmailWithAI,
  classifyCategory,
};
