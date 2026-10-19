import React, { useState, useMemo } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency } from '../../lib/currency';
import { Button } from '../../components/common/Button';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  PieChart as PieIcon,
  BarChart2,
  LineChart as LineIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend
} from 'recharts';

interface AnalyticsViewProps {
  selectedMonth: string;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ selectedMonth }) => {
  const { transactions, categories, preferences } = useFinancial();

  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');

  // Filter transactions according to selected timeframe
  const filteredTxs = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const currentDate = new Date(year, month - 1, 1);

    return transactions.filter(t => {
      const tDate = new Date(t.date);
      if (timeRange === 'month') {
        return t.date.startsWith(selectedMonth);
      } else if (timeRange === 'quarter') {
        const threeMonthsAgo = new Date(year, month - 3, 1);
        return tDate >= threeMonthsAgo && tDate <= new Date(year, month, 0, 23, 59, 59);
      } else {
        // year
        return tDate.getFullYear() === year;
      }
    });
  }, [transactions, selectedMonth, timeRange]);

  // Aggregate metrics
  const totalIncome = filteredTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filteredTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const netSavings = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netSavings / totalIncome) * 100)) : 0;

  // Daily Spending Chart Data
  const dailyData = useMemo(() => {
    const daysMap: Record<string, number> = {};
    filteredTxs.forEach(t => {
      if (t.type === 'expense') {
        const d = t.date.split('T')[0];
        daysMap[d] = (daysMap[d] || 0) + t.amount;
      }
    });

    return Object.entries(daysMap)
      .map(([date, amount]) => ({
        date: date.substring(5), // MM-DD
        amount: amount / 100
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTxs]);

  // Category Distribution
  const categoryData = useMemo(() => {
    const catMap = new Map(categories.map(c => [c.id, c]));
    const totals: Record<string, number> = {};

    filteredTxs.forEach(t => {
      if (t.type === 'expense') {
        totals[t.categoryId] = (totals[t.categoryId] || 0) + t.amount;
      }
    });

    return Object.entries(totals)
      .map(([catId, amount]) => {
        const cat = catMap.get(catId);
        return {
          name: cat?.name || 'Uncategorized',
          value: amount / 100,
          color: cat?.color || '#64748B'
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [filteredTxs, categories]);

  // Monthly Trend Data for multi-month views
  const trendData = useMemo(() => {
    const monthsMap: Record<string, { income: number; expense: number }> = {};
    transactions.forEach(t => {
      const m = t.date.slice(0, 7);
      if (!monthsMap[m]) monthsMap[m] = { income: 0, expense: 0 };
      if (t.type === 'income') monthsMap[m].income += t.amount / 100;
      else monthsMap[m].expense += t.amount / 100;
    });

    return Object.entries(monthsMap)
      .map(([monthStr, data]) => ({
        month: monthStr,
        Income: Math.round(data.income),
        Expense: Math.round(data.expense),
        Savings: Math.round(data.income - data.expense)
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // last 6 months
  }, [transactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Range Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-emerald-400" />
            <span>Financial Analytics & Trends</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deep insights into income streams, spending momentum, and savings efficiency.
          </p>
        </div>

        {/* Timeframe Buttons */}
        <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-surface-border text-xs">
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              timeRange === 'month' ? 'bg-surface text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            This Month
          </button>
          <button
            onClick={() => setTimeRange('quarter')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              timeRange === 'quarter' ? 'bg-surface text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Last 3 Months
          </button>
          <button
            onClick={() => setTimeRange('year')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
              timeRange === 'year' ? 'bg-surface text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Year-to-Date
          </button>
        </div>
      </div>

      {/* KPI Cards for the selected timeframe */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Revenue</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {formatCurrency(totalIncome, preferences.currency, preferences.locale)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{filteredTxs.filter(t => t.type === 'income').length} deposits</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
          <span className="text-xs text-slate-400 uppercase font-semibold">Total Outflow</span>
          <p className="text-2xl font-black text-slate-100 mt-1">
            {formatCurrency(totalExpense, preferences.currency, preferences.locale)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{filteredTxs.filter(t => t.type === 'expense').length} payments</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
          <span className="text-xs text-slate-400 uppercase font-semibold">Net Savings</span>
          <p className={`text-2xl font-black mt-1 ${netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(netSavings, preferences.currency, preferences.locale)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{netSavings >= 0 ? 'Surplus retained' : 'Deficit spent'}</p>
        </div>

        <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
          <span className="text-xs text-slate-400 uppercase font-semibold">Savings Efficiency</span>
          <p className="text-2xl font-black text-blue-400 mt-1">{savingsRate}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Percentage of income retained</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-month Cashflow Trend Line Chart */}
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel">
          <h3 className="text-sm font-bold text-slate-100 mb-1">Cash Flow Momentum (6 Months)</h3>
          <p className="text-xs text-slate-400 mb-4">Historical comparison of incoming vs outgoing cash</p>

          <div className="h-64 w-full">
            {trendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Insufficient transaction history
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Income" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Expense" stroke="#F43F5E" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Savings" stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Daily Spending Activity */}
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel">
          <h3 className="text-sm font-bold text-slate-100 mb-1">Daily Spending Activity</h3>
          <p className="text-xs text-slate-400 mb-4">Daily expense outflow pattern</p>

          <div className="h-64 w-full">
            {dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No expense activity recorded
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" stroke="#64748B" fontSize={10} />
                  <YAxis stroke="#64748B" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    formatter={(val: any) => [
                      formatCurrency(Number(val) * 100, preferences.currency, preferences.locale),
                      'Spent'
                    ]}
                  />
                  <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Share Donut Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-surface-border glass-panel">
          <h3 className="text-sm font-bold text-slate-100 mb-1">Category Expenditure Distribution</h3>
          <p className="text-xs text-slate-400 mb-4">Percentage breakdown by category</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-64 w-full flex items-center justify-center">
              {categoryData.length === 0 ? (
                <p className="text-xs text-slate-500">No category expense records</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {categoryData.map((entry, idx) => (
                        <Cell key={`pie-cell-${idx}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      formatter={(val: any) => [
                        formatCurrency(Number(val) * 100, preferences.currency, preferences.locale),
                        'Spent'
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category breakdown table */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
              {categoryData.map((item, idx) => {
                const totalExpMajor = totalExpense / 100;
                const pct = totalExpMajor > 0 ? Math.round((item.value / totalExpMajor) * 100) : 0;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-surface-border/50">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-medium text-slate-200">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-100">
                        {formatCurrency(item.value * 100, preferences.currency, preferences.locale)}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-2">({pct}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
