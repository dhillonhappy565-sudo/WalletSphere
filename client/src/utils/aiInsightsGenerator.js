// AI Financial Insights Generator Utility
export function generateAIInsights(summary, transactions = []) {
  const insights = [];
  const { totalIncome = 0, totalExpense = 0, categoryBreakdown = [] } = summary;

  // 1. Savings Rate Insight
  if (totalIncome > 0) {
    const savingsRate = Math.max(0, parseFloat((((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1)));
    if (savingsRate >= 30) {
      insights.push({
        id: 'savings_high',
        type: 'success',
        icon: '🎯',
        title: 'Strong Savings Rate',
        message: `Great financial health! You saved ${savingsRate}% of your total income this month.`,
      });
    } else if (savingsRate > 0) {
      insights.push({
        id: 'savings_moderate',
        type: 'info',
        icon: '💡',
        title: 'Savings Opportunity',
        message: `You saved ${savingsRate}% of your income. Increasing savings by 10% will accelerate your financial goals.`,
      });
    } else {
      insights.push({
        id: 'savings_deficit',
        type: 'warning',
        icon: '⚠️',
        title: 'Expense Alert',
        message: 'Your total expenses equal or exceed your income this month. Review high spending categories below.',
      });
    }
  }

  // 2. Top Category Spending Insight
  if (categoryBreakdown.length > 0) {
    const topCat = [...categoryBreakdown].sort((a, b) => b.value - a.value)[0];
    if (topCat && topCat.percentage >= 25) {
      insights.push({
        id: 'top_category',
        type: 'info',
        icon: '📊',
        title: `High ${topCat.name} Spending`,
        message: `${topCat.name} accounts for ${topCat.percentage}% of your total monthly expenses (${topCat.value.toLocaleString()}).`,
      });
    }
  }

  // 3. Neutral Transfer Insight
  const transferCount = transactions.filter((t) => t.type === 'transfer').length;
  if (transferCount > 0) {
    insights.push({
      id: 'transfers_neutral',
      type: 'neutral',
      icon: '⇄',
      title: 'Neutral Transfers Excluded',
      message: `${transferCount} self-transfers / friend reimbursements were logged cleanly and excluded from expense metrics.`,
    });
  }

  // Default Fallback Tip
  if (insights.length < 2) {
    insights.push({
      id: 'budget_tip',
      type: 'info',
      icon: '✨',
      title: 'Smart Advice',
      message: 'Setting category budget targets in the Budgets tab helps maintain consistent monthly cash flow.',
    });
  }

  return insights;
}
