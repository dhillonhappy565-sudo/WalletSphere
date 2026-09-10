const OpenAI = require('openai');
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
} = require('../utils/aiToolRegistry');

const getOpenAIClient = () => {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY is missing in server/.env');
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
    timeout: 4500, // 4.5s strict timeout for fast execution
  });
};

// @desc    High-Performance AI Orchestrator with Latency Profiler & Zero-LLM Fast Path
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

    // STEP 1: FAST ROUTER (< 2ms)
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

    // Save active context to session state
    updateUserScenarioState(userId, {
      lastIntent: intent,
      lastCategory: intentResult.category || currentScenarioState.lastCategory,
      lastMerchant: intentResult.merchant || currentScenarioState.lastMerchant,
      lastPeriod: intentResult.period || currentScenarioState.lastPeriod,
    });

    // =========================================================================
    // FAST PATH A: PERSONAL DATA QUERIES (0 LLM CALLS -> < 30ms RESPONSE TIME)
    // =========================================================================
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

    // =========================================================================
    // FAST PATH B: DETERMINISTIC SCENARIO FOLLOW-UP (0 LLM CALLS -> < 15ms)
    // =========================================================================
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

    // =========================================================================
    // ROUTE C: GENERAL KNOWLEDGE (DIRECT LLM -> ~1.2s RESPONSE TIME)
    // =========================================================================
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

    // =========================================================================
    // ROUTE D: COMPLEX SCENARIO ANALYSIS (PARALLEL DB + COMPACT LLM EXPLANATION)
    // =========================================================================
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

    // Fallback
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

module.exports = {
  chatWithAI,
};
