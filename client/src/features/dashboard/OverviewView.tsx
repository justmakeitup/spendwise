import React from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency } from '../../lib/currency';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { Button } from '../../components/common/Button';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  AlertCircle,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  Smartphone,
  Download
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface OverviewViewProps {
  selectedMonth: string; // YYYY-MM
  onOpenNewTransaction: () => void;
  onNavigateToTab: (tab: any) => void;
  onSelectTransactionForEdit: (tx: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  selectedMonth,
  onOpenNewTransaction,
  onNavigateToTab,
  onSelectTransactionForEdit
}) => {
  const {
    transactions,
    categories,
    recurringRules,
    savingsGoals,
    preferences,
    getMonthlySummary,
    processDueRecurringRule
  } = useFinancial();

  const summary = getMonthlySummary(selectedMonth);

  // Compute previous month's summary for comparison (timezone-safe)
  const [year, month] = selectedMonth.split('-').map(Number);
  const prevY = month === 1 ? year - 1 : year;
  const prevM = month === 1 ? 12 : month - 1;
  const prevMonthStr = `${prevY}-${String(prevM).padStart(2, '0')}`;
  const prevSummary = getMonthlySummary(prevMonthStr);

  const expenseDiff = prevSummary.totalExpense > 0
    ? Math.round(((summary.totalExpense - prevSummary.totalExpense) / prevSummary.totalExpense) * 100)
    : 0;

  // Recent transactions for this month (or latest transactions overall)
  const currentMonthTxs = transactions.filter(t => t.date.startsWith(selectedMonth));
  const recentTransactions = currentMonthTxs.slice(0, 6);

  // Upcoming recurring items (due within next 14 days)
  const upcomingRecurring = recurringRules
    .filter(r => r.status === 'active')
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())
    .slice(0, 4);

  // Chart data: Income vs Expenses
  const comparisonData = [
    { name: 'Income', amount: summary.totalIncome / 100, color: '#10B981' },
    { name: 'Expenses', amount: summary.totalExpense / 100, color: '#F43F5E' }
  ];

  // Category donut data
  const donutData = summary.expensesByCategory.slice(0, 6).map(c => ({
    name: c.categoryName,
    value: c.amount / 100,
    color: c.color
  }));

  // Budget threshold warnings (75%, 90%, 100%)
  const showBudgetWarning = summary.totalBudgetLimit > 0 && summary.budgetUtilization >= 75;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome / Status alert if budget exceeded */}
      {showBudgetWarning && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
          summary.budgetUtilization >= 100
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : summary.budgetUtilization >= 90
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300'
        }`}>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                Budget Alert: {summary.budgetUtilization}% utilized for this month!
              </p>
              <p className="text-xs opacity-80">
                You have spent {formatCurrency(summary.totalBudgetSpent, preferences.currency, preferences.locale)} of your {formatCurrency(summary.totalBudgetLimit, preferences.currency, preferences.locale)} monthly target.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateToTab('budgets')}
            className="shrink-0 text-xs"
          >
            Review Budgets
          </Button>
        </div>
      )}

      {/* Primary KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel glow-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Income</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100 tracking-tight">
            {formatCurrency(summary.totalIncome, preferences.currency, preferences.locale)}
          </p>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span>Selected month earnings</span>
          </p>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel glow-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Expenses</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100 tracking-tight">
            {formatCurrency(summary.totalExpense, preferences.currency, preferences.locale)}
          </p>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            {expenseDiff !== 0 && (
              <span className={expenseDiff > 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {expenseDiff > 0 ? `+${expenseDiff}%` : `${expenseDiff}%`}
              </span>
            )}
            <span>vs previous month</span>
          </div>
        </div>

        {/* Net Savings / Balance */}
        <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel glow-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Net Cash Flow</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className={`text-2xl font-black tracking-tight ${summary.remainingBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(summary.remainingBalance, preferences.currency, preferences.locale)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Savings Rate: <strong className="text-slate-200">{summary.savingsRate}%</strong>
          </p>
        </div>

        {/* Monthly Budget Utilization */}
        <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel glow-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Budget Status</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100 tracking-tight">
            {summary.totalBudgetLimit > 0 ? `${summary.budgetUtilization}%` : 'Not Set'}
          </p>
          {summary.totalBudgetLimit > 0 ? (
            <div className="mt-2 space-y-1">
              <div className="w-full bg-surface-elevated h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    summary.budgetUtilization >= 100
                      ? 'bg-rose-500'
                      : summary.budgetUtilization >= 80
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(summary.budgetUtilization, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-right">
                {formatCurrency(summary.totalBudgetLimit - summary.totalBudgetSpent, preferences.currency, preferences.locale)} remaining
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-1">
              <button onClick={() => onNavigateToTab('budgets')} className="text-emerald-400 hover:underline">
                Create monthly budget &rarr;
              </button>
            </p>
          )}
        </div>
      </div>

      {/* Main Charts & Breakdowns Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Expenses Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-surface-border glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Monthly Cash Flow Comparison</h3>
              <p className="text-xs text-slate-400">Income received vs spending for this period</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigateToTab('analytics')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Full Analytics <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="h-64 w-full">
            {summary.totalIncome === 0 && summary.totalExpense === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                <Calendar className="w-8 h-8 mb-2 opacity-40" />
                <p>No financial entries recorded for {selectedMonth}</p>
                <Button size="sm" variant="outline" onClick={onOpenNewTransaction} className="mt-3 text-xs">
                  + Add First Entry
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                  <YAxis stroke="#64748B" fontSize={12} tickFormatter={val => `$${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    formatter={(value: any) => [
                      formatCurrency(Number(value) * 100, preferences.currency, preferences.locale),
                      'Total'
                    ]}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {comparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expenses by Category Donut Chart */}
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 mb-1">Spending by Category</h3>
            <p className="text-xs text-slate-400 mb-4">Top spending areas this month</p>

            <div className="h-44 w-full flex items-center justify-center">
              {donutData.length === 0 ? (
                <p className="text-xs text-slate-500">No expense data available</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`donut-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      formatter={(val: any) => [formatCurrency(Number(val) * 100, preferences.currency, preferences.locale), 'Spent']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category mini-list */}
          <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-1">
            {summary.expensesByCategory.slice(0, 4).map(c => (
              <div key={c.categoryId} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="truncate text-slate-300">{c.categoryName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-medium text-slate-200">
                    {formatCurrency(c.amount, preferences.currency, preferences.locale)}
                  </span>
                  <span className="text-[10px] text-slate-500">({c.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Transactions + Upcoming Recurring & Savings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-surface-border glass-panel">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100">Recent Transactions</h3>
              <p className="text-xs text-slate-400">Latest activity in your private local register</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigateToTab('transactions')}
              className="text-xs"
            >
              View Ledger <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30 text-emerald-400" />
              <p className="font-medium text-slate-300">Your financial register is clean</p>
              <p className="text-slate-500 mt-1">Start by recording your first transaction or importing a CSV.</p>
              <Button size="sm" variant="primary" onClick={onOpenNewTransaction} className="mt-4">
                <Plus className="w-4 h-4 mr-1.5" /> Add Transaction
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-surface-border">
              {recentTransactions.map(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                const isIncome = tx.type === 'income';

                return (
                  <div
                    key={tx.id}
                    onClick={() => onSelectTransactionForEdit(tx)}
                    className="py-3 flex items-center justify-between hover:bg-white/5 px-2 rounded-xl cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <CategoryIcon iconName={cat?.icon || 'CircleDollarSign'} color={cat?.color} size={16} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">
                          {tx.note || cat?.name || 'Transaction'}
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center gap-2">
                          <span>{tx.date.split('T')[0]}</span>
                          <span>•</span>
                          <span>{tx.paymentMethod}</span>
                          {tx.tags && tx.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-400/80">#{tx.tags[0]}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-xs font-bold ${isIncome ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency, preferences.locale)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Recurring Bills & Subscriptions */}
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-100">Upcoming Bills & Recurring</h3>
                <p className="text-xs text-slate-400">Scheduled commitments</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onNavigateToTab('recurring')}
                className="text-xs p-1"
              >
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Button>
            </div>

            {upcomingRecurring.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Clock className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <p>No active recurring rules set up</p>
                <button
                  onClick={() => onNavigateToTab('recurring')}
                  className="mt-2 text-emerald-400 hover:underline"
                >
                  Create recurring rule &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingRecurring.map(rule => {
                  const cat = categories.find(c => c.id === rule.categoryId);
                  return (
                    <div
                      key={rule.id}
                      className="p-3 rounded-xl bg-surface-elevated/70 border border-surface-border flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{rule.name}</p>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          <span>Due {rule.nextDueDate}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">
                          {formatCurrency(rule.amount, rule.currency, preferences.locale)}
                        </span>
                        <button
                          onClick={async () => {
                            await processDueRecurringRule(rule.id);
                          }}
                          title="Record transaction now"
                          className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Savings Goals Widget */}
          {savingsGoals.length > 0 && (
            <div className="mt-6 pt-4 border-t border-surface-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-300">Active Savings Goals</span>
                <button
                  onClick={() => onNavigateToTab('savings')}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  View All
                </button>
              </div>
              {savingsGoals.slice(0, 2).map(goal => {
                const pct = Math.min(Math.round((goal.currentAmount / goal.targetAmount) * 100), 100);
                return (
                  <div key={goal.id} className="text-xs space-y-1 mb-2">
                    <div className="flex justify-between text-slate-400">
                      <span className="truncate">{goal.name}</span>
                      <span className="font-medium text-slate-200">{pct}%</span>
                    </div>
                    <div className="w-full bg-surface-elevated h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Download Android Mobile App Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-surface to-electric-mint/10 border border-emerald-500/30 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-glow-emerald">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>SpendWise for Android</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Official .APK
              </span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Enjoy private, offline-first personal financial management directly on your mobile device. Zero cloud snooping, local IndexedDB storage, and instant Google Drive sync.
            </p>
          </div>
        </div>
        <a
          href="/spendwise.apk"
          download="SpendWise.apk"
          type="application/vnd.android.package-archive"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-all shadow-glow-emerald active:scale-95"
        >
          <Download className="w-4 h-4" />
          <span>Download Android App (.apk)</span>
        </a>
      </div>
    </div>
  );
};
