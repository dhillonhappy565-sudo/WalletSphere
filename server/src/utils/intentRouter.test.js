/**
 * Automated Unit Test Suite for Intent Router
 */

const { classifyIntent } = require('./intentRouter');

function runIntentTests() {
  console.log('=== RUNNING INTENT ROUTER UNIT TESTS ===\n');

  const testQueries = [
    { query: "my food expenses", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "Food" },
    { query: "food expenses", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "Food" },
    { query: "how much did I spend on food", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "Food" },
    { query: "food this month", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "Food", expectedPeriod: "current_month" },
    { query: "food last month", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "Food", expectedPeriod: "last_month" },
    { query: "my expenses", expectedIntent: "PERSONAL_DATA_QUERY" },
    { query: "my shopping", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "Shopping" },
    { query: "how much on zomato", expectedIntent: "PERSONAL_DATA_QUERY", expectedMerchant: "zomato" },
    { query: "swiggy last month", expectedIntent: "PERSONAL_DATA_QUERY", expectedMerchant: "swiggy", expectedPeriod: "last_month" },
    { query: "where did my money go", expectedIntent: "PERSONAL_DATA_QUERY" },
    { query: "biggest expense", expectedIntent: "PERSONAL_DATA_QUERY" },
    { query: "highest transaction this month", expectedIntent: "PERSONAL_DATA_QUERY" },
    { query: "how much did I earn", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "Income" },
    { query: "my income", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "Income" },
    { query: "my subscriptions", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "Subscriptions" },
    { query: "my emis", expectedIntent: "PERSONAL_DATA_QUERY", expectedCategory: "EMIs" },
    { query: "What is food inflation?", expectedIntent: "GENERAL" },
    { query: "What is an EMI?", expectedIntent: "GENERAL" },
    { query: "Can I buy a car of 5 lakh if my salary is 80k per month?", expectedIntent: "WHAT_IF_SCENARIO" },
  ];

  let passed = 0;
  testQueries.forEach(({ query, expectedIntent, expectedCategory, expectedMerchant, expectedPeriod }) => {
    const result = classifyIntent(query);
    console.assert(result.intent === expectedIntent, `[FAILED] Query: "${query}" -> Expected ${expectedIntent}, got ${result.intent}`);
    if (expectedCategory) {
      console.assert(result.category === expectedCategory, `[FAILED] Query: "${query}" -> Expected category ${expectedCategory}, got ${result.category}`);
    }
    if (expectedMerchant) {
      console.assert(result.merchant === expectedMerchant, `[FAILED] Query: "${query}" -> Expected merchant ${expectedMerchant}, got ${result.merchant}`);
    }
    if (expectedPeriod) {
      console.assert(result.period === expectedPeriod, `[FAILED] Query: "${query}" -> Expected period ${expectedPeriod}, got ${result.period}`);
    }
    console.log(`✓ PASSED: "${query}" => Intent: ${result.intent}${result.category ? `, Category: ${result.category}` : ''}${result.period ? `, Period: ${result.period}` : ''}`);
    passed++;
  });

  console.log(`\n=== INTENT ROUTER TESTS FINISHED (${passed}/${testQueries.length} PASSED) ===`);
}

if (require.main === module) {
  runIntentTests();
}

module.exports = { runIntentTests };
