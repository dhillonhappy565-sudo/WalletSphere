const OpenAI = require('openai');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const RecurringBill = require('../models/RecurringBill');
const { getFinancialMetrics, simulatePurchaseScenario } = require('../utils/financialEngine');
const {
  getUserScenarioState,
  updateUserScenarioState,
  extractScenarioParamsFromPrompt,
} = require('../utils/scenarioStateEngine');
const { classifyIntent } = require('../utils/intentRouter');
const {
  getCategorySpendingDetails,
  getMerchantSpending,
  getSubscriptionsList,
  getEMIsList,
  getSpendingComparison,
  invalidateUserCache,
} = require('../utils/aiToolRegistry');

const getOpenAIClient = () => {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is missing in server/.env');
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
    timeout: 4500,
  });
};

// @desc    Process AI Chat request
// @route   POST /api/ai/chat
// @access  Private
const chatWithAI = async (req, res) => {
  const startTime = Date.now();
  let routerTime = 0;
  let dbTime = 0;
  let engineTime = 0;
  let llmTime = 0;

  try {
    const { message, conversationHistory = [] } = req.body;
    const userId = req.user._id;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid message string.',
      });
    }

    const routerStart = Date.now();
    const currentScenarioState = getUserScenarioState(userId) || {};
    const intentResult = classifyIntent(message, currentScenarioState);
    const intent = intentResult.intent;
    routerTime = Date.now() - routerStart;

    let aiResponseText = '';
    let scenarioData = null;
    let uiBlocks = [];
    let dataSources = [];
    let assumptions = [];

    updateUserScenarioState(userId, {
      lastIntent: intent,
      lastCategory: intentResult.category || currentScenarioState.lastCategory,
      lastMerchant: intentResult.merchant || currentScenarioState.lastMerchant,
      lastPeriod: intentResult.period || currentScenarioState.lastPeriod,
    });

    // ==========================================
    // ROUTE 1: WALLETWISE 2-WAY ACTION PREPARATION
    // ==========================================
    if (intent === 'WALLETWISE_ACTION') {
      const text = message.toLowerCase();
      let actionType = 'CREATE_BUDGET';
      let title = 'Action Confirmation';
      let payload = {};

      const numMatch = message.match(/₹?\s*(\d+(?:\.\d+)?)\s*(lakh|lac|k)?/i);
      let amount = 5000;
      if (numMatch) {
        const val = parseFloat(numMatch[1]);
        const unit = (numMatch[2] || '').toLowerCase();
        if (unit.includes('k')) amount = val * 1000;
        else if (unit.includes('lakh') || unit.includes('lac')) amount = val * 100000;
        else if (val > 0) amount = val;
      }

      if (text.includes('log') || text.includes('add transaction') || text.includes('spent') || text.includes('expense')) {
        actionType = 'ADD_TRANSACTION';
        title = 'Record New Transaction';
        const descMatch = message.match(/(?:for|on)\s+([a-zA-Z0-9\s]+)/i);
        const description = descMatch ? descMatch[1].trim() : 'AI Logged Expense';
        
        let category = 'Others';
        if (text.includes('zomato') || text.includes('swiggy') || text.includes('food')) category = 'Food';
        else if (text.includes('uber') || text.includes('cab') || text.includes('travel')) category = 'Travel';
        else if (text.includes('amazon') || text.includes('shopping')) category = 'Shopping';
        else if (text.includes('recharge') || text.includes('bill')) category = 'Bills';

        payload = {
          description,
          amount,
          type: 'expense',
          category,
          date: new Date().toISOString(),
        };

        aiResponseText = `I am ready to record an expense of **₹${amount.toLocaleString()}** for **"${description}"** under **${category}**. Please confirm below.`;
      } else if (text.includes('recurring') || text.includes('bill') || text.includes('netflix') || text.includes('subscription')) {
        actionType = 'ADD_RECURRING_BILL';
        title = 'Add Recurring Bill Reminder';
        const titleMatch = message.match(/(?:bill|recurring|subscription)\s+([a-zA-Z0-9\s]+)/i);
        const billTitle = titleMatch ? titleMatch[1].trim() : 'Recurring Bill';

        payload = {
          title: billTitle,
          amount,
          dueDateDay: 5,
          category: 'Bills',
        };

        aiResponseText = `I am ready to set a recurring bill reminder for **"${billTitle}"** (₹${amount.toLocaleString()}/month). Please confirm below.`;
      } else {
        // Default: CREATE_BUDGET
        actionType = 'CREATE_BUDGET';
        title = 'Set Category Budget';
        let category = 'Food';
        if (text.includes('shopping')) category = 'Shopping';
        else if (text.includes('travel')) category = 'Travel';
        else if (text.includes('entertainment')) category = 'Entertainment';
        else if (text.includes('bills')) category = 'Bills';

        const currentMonth = new Date().toISOString().slice(0, 7);
        payload = {
          category,
          amount,
          month: currentMonth,
        };

        aiResponseText = `I am ready to set a **₹${amount.toLocaleString()}** budget for **${category}** for ${currentMonth}. Please confirm below.`;
      }

      uiBlocks.push({
        type: 'action_confirm',
        data: {
          actionType,
          title,
          payload,
        },
      });

      return res.status(200).json({
        status: 'success',
        data: {
          message: aiResponseText,
          intent,
          scenario: null,
          ui: uiBlocks,
          dataSources: ['User interactive request'],
          assumptions: [],
          confidence: 'HIGH',
        },
      });
    }

    // ROUTE 2: PERSONAL DATA QUERIES
    if (intent === 'PERSONAL_DATA_QUERY') {
      const dbStart = Date.now();
      const category = intentResult.category || 'Food';
      const period = intentResult.period || 'current_month';
      const merchant = intentResult.merchant;

      if (category === 'Subscriptions') {
        const subData = await getSubscriptionsList(userId);
        if (subData.count === 0) {
          aiResponseText = `You don't have any active recurring subscriptions recorded in WalletSphere.`;
        } else {
          aiResponseText = `You have **${subData.count}** active subscription(s) totaling **₹${subData.monthlyTotal.toLocaleString()}/month** (approx **₹${subData.annualTotal.toLocaleString()}/year**):\n` +
            subData.subscriptions.map((s) => `• **${s.title}:** ₹${s.amount.toLocaleString()}/mo`).join('\n');
        }
        dataSources.push(`WalletSphere recurring subscriptions database`);
      } else if (category === 'EMIs') {
        const emiData = await getEMIsList(userId);
        if (emiData.count === 0) {
          aiResponseText = `You don't have any active loan EMIs recorded in WalletSphere.`;
        } else {
          aiResponseText = `You have **${emiData.count}** active EMI/loan obligation(s) totaling **₹${emiData.monthlyTotal.toLocaleString()}/month**:\n` +
            emiData.emis.map((e) => `• **${e.title}:** ₹${e.amount.toLocaleString()}/mo (Due Day: ${e.dueDay || 1})`).join('\n');
        }
        dataSources.push(`WalletSphere recurring loans & EMI database`);
      } else if (merchant) {
        const merchantData = await getMerchantSpending(userId, merchant, period);
        if (merchantData.count === 0) {
          aiResponseText = `You haven't recorded any expenses for **${merchantData.merchant}** ${merchantData.period}.`;
        } else {
          aiResponseText = `You've spent **₹${merchantData.totalAmount.toLocaleString()}** on **${merchantData.merchant}** ${merchantData.period} across **${merchantData.count}** transaction(s).`;
        }
        dataSources.push(`WalletSphere transactions database for ${merchantData.merchant}`);
      } else {
        const details = await getCategorySpendingDetails(userId, category, period);

        if (details.transactionCount === 0) {
          aiResponseText = `You don't have any recorded **${details.category}** expenses ${details.period}.`;
        } else {
          aiResponseText = `You've spent **₹${details.total.toLocaleString()}** on **${details.category}** ${details.period} across **${details.transactionCount}** transaction(s).`;

          if (details.largestTransaction) {
            aiResponseText += ` Your largest expense was **₹${details.largestTransaction.amount.toLocaleString()}** at **${details.largestTransaction.merchant}** on ${details.largestTransaction.date}.`;
          }

          if (details.comparison && details.comparison.prevTotal > 0) {
            const diffSign = details.comparison.diff >= 0 ? '+' : '-';
            aiResponseText += ` That's **${diffSign}₹${Math.abs(details.comparison.diff).toLocaleString()}** (${details.comparison.percentChange}%) compared to last month (₹${details.comparison.prevTotal.toLocaleString()}).`;
          }
        }

        dataSources.push(`WalletSphere transactions database (${details.category}, ${details.period})`);

        uiBlocks.push({
          type: 'spending_summary',
          data: {
            category: details.category,
            total: details.total,
            transactionCount: details.transactionCount,
            period: details.period,
            largestTransaction: details.largestTransaction,
          },
        });
      }

      dbTime = Date.now() - dbStart;
      const totalTime = Date.now() - startTime;
      console.log(`[AI PERF FAST PATH] Route: PERSONAL_DATA_QUERY | Router: ${routerTime}ms | DB: ${dbTime}ms | Total: ${totalTime}ms`);

      return res.status(200).json({
        status: 'success',
        data: {
          message: aiResponseText,
          intent,
          scenario: null,
          ui: uiBlocks,
          dataSources,
          assumptions: [],
          confidence: 'HIGH',
        },
      });
    }

    // ROUTE 3: DETERMINISTIC SCENARIO FOLLOW-UP
    const isScenarioFollowUp = intent === 'WHAT_IF_SCENARIO' &&
      (currentScenarioState.purchasePrice || currentScenarioState.userSpecifiedIncome) &&
      /^(emi for|what about|make it|2 years|3 years|1 year|5 years|down payment|interest)/i.test(message);

    if (isScenarioFollowUp) {
      const engStart = Date.now();
      const promptUpdates = extractScenarioParamsFromPrompt(message, currentScenarioState);

      const mergedParams = {
        purchaseType: promptUpdates.purchaseType || currentScenarioState.purchaseType || 'car_purchase',
        purchasePrice: promptUpdates.purchasePrice !== undefined ? promptUpdates.purchasePrice : (currentScenarioState.purchasePrice || 500000),
        downPayment: promptUpdates.downPayment !== undefined ? promptUpdates.downPayment : currentScenarioState.downPayment,
        annualInterestRate: promptUpdates.annualInterestRate !== undefined ? promptUpdates.annualInterestRate : currentScenarioState.annualInterestRate,
        tenureMonths: promptUpdates.tenureMonths !== undefined ? promptUpdates.tenureMonths : (currentScenarioState.tenureMonths || 60),
        userSpecifiedIncome: promptUpdates.userSpecifiedIncome !== undefined ? promptUpdates.userSpecifiedIncome : currentScenarioState.userSpecifiedIncome,
        userSpecifiedExpenses: promptUpdates.userSpecifiedExpenses !== undefined ? promptUpdates.userSpecifiedExpenses : currentScenarioState.userSpecifiedExpenses,
      };

      updateUserScenarioState(userId, mergedParams);

      const dbMetrics = await getFinancialMetrics(userId);
      scenarioData = simulatePurchaseScenario({
        ...mergedParams,
        dbMetrics,
      });

      aiResponseText = `### Assessment\n**${scenarioData.overallVerdict}**\n\n### Your Numbers\n- **Purchase Price:** ₹${scenarioData.purchasePrice.toLocaleString()}\n- **Loan Tenure:** ${scenarioData.tenureLabel} @ ${scenarioData.annualInterestRate}%\n- **Monthly EMI:** **₹${scenarioData.monthlyEMI.toLocaleString()}/month**\n- **Monthly Income:** ₹${scenarioData.monthlyIncome.toLocaleString()}\n- **Scenario Expenses:** ₹${scenarioData.monthlyExpenses.toLocaleString()}\n- **Free Cash Flow After EMI:** **₹${scenarioData.freeCashFlowAfter.toLocaleString()}/month**\n\n### Why\n${scenarioData.assessmentReason}`;

      uiBlocks.push({ type: 'scenario', data: scenarioData });
      engineTime = Date.now() - engStart;
      const totalTime = Date.now() - startTime;
      console.log(`[AI PERF DETERMINISTIC] Route: SCENARIO_FOLLOW_UP | Router: ${routerTime}ms | Engine: ${engineTime}ms | Total: ${totalTime}ms`);

      return res.status(200).json({
        status: 'success',
        data: {
          message: aiResponseText,
          intent,
          scenario: scenarioData,
          ui: uiBlocks,
          dataSources: scenarioData.dataSources,
          assumptions: scenarioData.assumptions,
          confidence: 'HIGH',
        },
      });
    }

    // ROUTE 4: GENERAL KNOWLEDGE
    if (intent === 'GENERAL' || intent === 'FINANCIAL_EDUCATION') {
      const llmStart = Date.now();
      const systemPrompt = `You are WalletSphere AI, an intelligent, helpful conversational AI assistant.
Answer general questions naturally, directly, and accurately.
- For general knowledge, explain clearly and helpfully.
- For general financial education (e.g. compound interest, mutual funds, SIP), explain simply with a short example.
- Be concise (under 150 words).`;

      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: 'meta/llama-3.1-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-4).map((h) => ({
              role: h.sender === 'user' ? 'user' : 'assistant',
              content: h.text,
            })),
            { role: 'user', content: message },
          ],
          temperature: 0.3,
          max_tokens: 350,
        });

        aiResponseText = completion.choices[0]?.message?.content || 'Here is the requested explanation.';
      } catch (err) {
        console.warn('NVIDIA NIM API fallback for General/Education intent:', err.message);
        aiResponseText = `I am ready to help explain concepts! ${message}`;
      }

      llmTime = Date.now() - llmStart;
      const totalTime = Date.now() - startTime;
      console.log(`[AI PERF LLM GENERAL] Route: ${intent} | Router: ${routerTime}ms | LLM: ${llmTime}ms | Total: ${totalTime}ms`);

      return res.status(200).json({
        status: 'success',
        data: {
          message: aiResponseText,
          intent,
          scenario: null,
          ui: [],
          dataSources: [],
          assumptions: [],
          confidence: 'HIGH',
        },
      });
    }

    // ROUTE 5: COMPLEX SCENARIO ANALYSIS
    if (intent === 'WHAT_IF_SCENARIO') {
      const parStart = Date.now();
      const promptUpdates = extractScenarioParamsFromPrompt(message, currentScenarioState);

      const mergedParams = {
        purchaseType: promptUpdates.purchaseType || currentScenarioState.purchaseType || 'car_purchase',
        purchasePrice: promptUpdates.purchasePrice !== undefined ? promptUpdates.purchasePrice : (currentScenarioState.purchasePrice || 500000),
        downPayment: promptUpdates.downPayment !== undefined ? promptUpdates.downPayment : currentScenarioState.downPayment,
        annualInterestRate: promptUpdates.annualInterestRate !== undefined ? promptUpdates.annualInterestRate : currentScenarioState.annualInterestRate,
        tenureMonths: promptUpdates.tenureMonths !== undefined ? promptUpdates.tenureMonths : (currentScenarioState.tenureMonths || 60),
        userSpecifiedIncome: promptUpdates.userSpecifiedIncome !== undefined ? promptUpdates.userSpecifiedIncome : currentScenarioState.userSpecifiedIncome,
        userSpecifiedExpenses: promptUpdates.userSpecifiedExpenses !== undefined ? promptUpdates.userSpecifiedExpenses : currentScenarioState.userSpecifiedExpenses,
      };

      updateUserScenarioState(userId, mergedParams);

      const dbMetrics = await getFinancialMetrics(userId);
      scenarioData = simulatePurchaseScenario({
        ...mergedParams,
        dbMetrics,
      });

      dbTime = Date.now() - parStart;
      dataSources = scenarioData.dataSources;
      assumptions = scenarioData.assumptions;

      const llmStart = Date.now();
      const systemPrompt = `You are WalletSphere AI, an objective personal finance assistant.
Say YES when evidence supports yes, NO when evidence supports no.
- Verdict: ${scenarioData.overallVerdict} (${scenarioData.score}/100)
- Price: ₹${scenarioData.purchasePrice.toLocaleString()}, Down Payment: ₹${scenarioData.downPayment.toLocaleString()}, Loan: ₹${scenarioData.loanAmount.toLocaleString()}
- EMI: ₹${scenarioData.monthlyEMI.toLocaleString()}/mo, Income: ₹${scenarioData.monthlyIncome.toLocaleString()}, Expenses: ₹${scenarioData.monthlyExpenses.toLocaleString()}
- Free Cash Flow After: ₹${scenarioData.freeCashFlowAfter.toLocaleString()}/mo, Debt Ratio: ${scenarioData.totalDebtRatio}%

State Assessment, Your Numbers, Why (2 sentences), and Watch Out For concisely under 180 words.`;

      try {
        const openai = getOpenAIClient();
        const completion = await openai.chat.completions.create({
          model: 'meta/llama-3.1-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.slice(-4).map((h) => ({
              role: h.sender === 'user' ? 'user' : 'assistant',
              content: h.text,
            })),
            { role: 'user', content: message },
          ],
          temperature: 0.2,
          max_tokens: 380,
        });

        aiResponseText = completion.choices[0]?.message?.content || '';
      } catch (err) {
        console.warn('NVIDIA NIM API delayed for scenario, generating structured response:', err.message);
        aiResponseText = `### Assessment\n**${scenarioData.overallVerdict}**\n\n### Your Numbers\n- **Purchase Price:** ₹${scenarioData.purchasePrice.toLocaleString()}\n- **Monthly EMI:** ₹${scenarioData.monthlyEMI.toLocaleString()}/month\n- **Free Cash Flow After EMI:** ₹${scenarioData.freeCashFlowAfter.toLocaleString()}/month\n\n### Why\n${scenarioData.assessmentReason}`;
      }

      llmTime = Date.now() - llmStart;
      uiBlocks.push({ type: 'scenario', data: scenarioData });

      const totalTime = Date.now() - startTime;
      console.log(`[AI PERF SCENARIO] Route: WHAT_IF_SCENARIO | Router: ${routerTime}ms | DB/Engine: ${dbTime}ms | LLM: ${llmTime}ms | Total: ${totalTime}ms`);

      return res.status(200).json({
        status: 'success',
        data: {
          message: aiResponseText,
          intent,
          scenario: scenarioData,
          ui: uiBlocks,
          dataSources,
          assumptions,
          confidence: 'HIGH',
        },
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        message: `I'm here to assist! How can I help you today?`,
        intent: 'GENERAL',
        scenario: null,
        ui: [],
        dataSources: [],
        assumptions: [],
        confidence: 'HIGH',
      },
    });
  } catch (error) {
    console.error('Error in AI Chat Controller:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An internal error occurred processing your query.',
    });
  }
};

// @desc    Execute AI confirmed action (2-Way Execution)
// @route   POST /api/ai/execute-action
// @access  Private
const executeAIAction = async (req, res) => {
  try {
    const { actionType, payload } = req.body;
    const userId = req.user._id;

    if (!actionType || !payload) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid action payload.',
      });
    }

    let resultMessage = '';

    if (actionType === 'CREATE_BUDGET') {
      const { category, amount, month } = payload;
      const budgetMonth = month || new Date().toISOString().slice(0, 7);

      const budget = await Budget.findOneAndUpdate(
        { user: userId, category, month: budgetMonth },
        { amount: parseFloat(amount) },
        { new: true, upsert: true }
      );

      invalidateUserCache(userId);
      resultMessage = `Successfully created ${category} budget of ₹${budget.amount.toLocaleString()} for ${budgetMonth}!`;
    } else if (actionType === 'ADD_TRANSACTION') {
      const { description, amount, type, category, date } = payload;

      const transaction = await Transaction.create({
        user: userId,
        description: description || 'AI Logged Transaction',
        amount: parseFloat(amount),
        type: type || 'expense',
        category: category || 'Others',
        date: date ? new Date(date) : new Date(),
      });

      invalidateUserCache(userId);
      resultMessage = `Successfully recorded ${transaction.type} of ₹${transaction.amount.toLocaleString()} for "${transaction.description}" under ${transaction.category}!`;
    } else if (actionType === 'ADD_RECURRING_BILL') {
      const { title, amount, dueDateDay, category } = payload;

      const bill = await RecurringBill.create({
        user: userId,
        title: title || 'Recurring Bill',
        amount: parseFloat(amount),
        dueDateDay: parseInt(dueDateDay, 10) || 1,
        category: category || 'Bills',
      });

      invalidateUserCache(userId);
      resultMessage = `Successfully set recurring bill reminder for "${bill.title}" (₹${bill.amount.toLocaleString()}/mo due on day ${bill.dueDateDay})!`;
    } else {
      return res.status(400).json({
        status: 'fail',
        message: `Unsupported action type: ${actionType}`,
      });
    }

    return res.status(200).json({
      status: 'success',
      message: resultMessage,
    });
  } catch (error) {
    console.error('Error executing AI action:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to execute action',
    });
  }
};

module.exports = {
  chatWithAI,
  executeAIAction,
};
