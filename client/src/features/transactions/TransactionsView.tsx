import React, { useState, useMemo } from 'react';
import { Transaction } from '@spendwise/shared';
import { useFinancial } from '../../context/FinancialContext';
import { formatCurrency } from '../../lib/currency';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { exportTransactionsToCsv } from '../../lib/csv/csvHelper';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Copy,
  Trash2,
  Edit,
  RotateCcw,
  Plus,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface TransactionsViewProps {
  onOpenNewTransaction: () => void;
  onSelectTransactionForEdit: (tx: Transaction) => void;
  initialSearch?: string;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  onOpenNewTransaction,
  onSelectTransactionForEdit,
  initialSearch = ''
}) => {
  const {
    transactions,
    categories,
    preferences,
    deleteTransaction,
    duplicateTransaction,
    undoDeleteTransaction,
    lastDeletedTransaction
  } = useFinancial();

  // Filters state
  const [search, setSearch] = useState(initialSearch);
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sorting state
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // Filter & Sort Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      // Search text (note, category name, tags)
      if (search.trim()) {
        const query = search.toLowerCase();
        const cat = categoryMap.get(tx.categoryId);
        const matchesNote = tx.note?.toLowerCase().includes(query);
        const matchesCat = cat?.name.toLowerCase().includes(query);
        const matchesTags = tx.tags?.some(tag => tag.toLowerCase().includes(query));
        const matchesPayment = tx.paymentMethod?.toLowerCase().includes(query);
        if (!matchesNote && !matchesCat && !matchesTags && !matchesPayment) return false;
      }

      // Type
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Category
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;

      // Payment method
      if (paymentFilter !== 'all' && tx.paymentMethod !== paymentFilter) return false;

      // Date range
      const txDate = tx.date.split('T')[0];
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;

      // Amount range (converted to minor cents)
      if (minAmount) {
        const minCents = parseFloat(minAmount) * 100;
        if (!isNaN(minCents) && tx.amount < minCents) return false;
      }
      if (maxAmount) {
        const maxCents = parseFloat(maxAmount) * 100;
        if (!isNaN(maxCents) && tx.amount > maxCents) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      } else {
        return a.amount - b.amount;
      }
    });
  }, [
    transactions,
    search,
    typeFilter,
    categoryFilter,
    paymentFilter,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortBy,
    categoryMap
  ]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const clearAllFilters = () => {
    setSearch('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setPaymentFilter('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setCurrentPage(1);
  };

  const handleExportFilteredCsv = () => {
    const csvData = exportTransactionsToCsv(filteredTransactions, categories);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `spendwise_transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Undo Delete Toast */}
      {lastDeletedTransaction && (
        <div className="p-3 rounded-2xl bg-surface border border-emerald-500/30 flex items-center justify-between text-xs animate-fade-in shadow-lg">
          <span className="text-slate-300">
            Deleted transaction: <strong>{lastDeletedTransaction.note || 'Entry'}</strong> (
            {formatCurrency(lastDeletedTransaction.amount, lastDeletedTransaction.currency, preferences.locale)})
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={undoDeleteTransaction}
            icon={<RotateCcw className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Undo Delete
          </Button>
        </div>
      )}

      {/* Control Bar: Search, Type Tabs, Advanced Filters toggle, Export */}
      <div className="p-4 rounded-2xl bg-surface border border-surface-border glass-panel space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, tag, or payment method..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-surface-elevated/70 border border-surface-border rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Switcher */}
          <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-surface-border self-start md:self-auto">
            <button
              onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'all' ? 'bg-surface text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setTypeFilter('expense'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'expense' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => { setTypeFilter('income'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                typeFilter === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Income
            </button>
          </div>

          {/* Action buttons: Filter Toggle & Export */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={showAdvancedFilters ? 'primary' : 'secondary'}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              icon={<Filter className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Filters
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleExportFilteredCsv}
              icon={<Download className="w-3.5 h-3.5" />}
              className="text-xs"
              title="Export current filtered view to CSV"
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-surface-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs animate-fade-in">
            {/* Category Dropdown */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Category</label>
              <select
                value={categoryFilter}
                onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Date From & To */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="date-desc">Date: Newest First</option>
                <option value="date-asc">Date: Oldest First</option>
                <option value="amount-desc">Amount: Highest First</option>
                <option value="amount-asc">Amount: Lowest First</option>
              </select>
            </div>

            {/* Reset Filters */}
            <div className="sm:col-span-2 md:col-span-4 flex justify-end">
              <Button size="sm" variant="ghost" onClick={clearAllFilters} className="text-xs text-slate-400 hover:text-white">
                Clear All Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Records Table */}
      <div className="rounded-2xl bg-surface border border-surface-border glass-panel overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <p className="font-semibold text-slate-300">No transactions match your search criteria</p>
            <p className="mt-1">Try resetting your filters or record a new entry.</p>
            <Button size="sm" variant="primary" onClick={onOpenNewTransaction} className="mt-4">
              <Plus className="w-4 h-4 mr-1.5" /> New Transaction
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated/70 border-b border-surface-border text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description / Note</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-slate-300">
                {paginatedTransactions.map(tx => {
                  const cat = categoryMap.get(tx.categoryId);
                  const isIncome = tx.type === 'income';

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-white/5 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-medium text-slate-400 whitespace-nowrap">
                        {tx.date.split('T')[0]}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CategoryIcon iconName={cat?.icon || 'CircleDollarSign'} color={cat?.color} size={14} className="p-1" />
                          <span className="font-medium text-slate-200">{cat?.name || 'Uncategorized'}</span>
                        </div>
                      </td>

                      {/* Description / Tags */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-xs truncate font-medium text-slate-200">
                          {tx.note || '—'}
                        </div>
                        {tx.tags && tx.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {tx.tags.map(t => (
                              <span key={t} className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {tx.paymentMethod || 'Cash'}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className={`font-bold ${isIncome ? 'text-emerald-400' : 'text-slate-100'}`}>
                          {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency, preferences.locale)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onSelectTransactionForEdit(tx)}
                            title="Edit"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              await duplicateTransaction(tx.id);
                            }}
                            title="Duplicate"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (window.confirm('Delete this transaction? You can undo this action immediately.')) {
                                await deleteTransaction(tx.id);
                              }
                            }}
                            title="Delete"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-border flex items-center justify-between text-xs text-slate-400">
            <span>
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredTransactions.length)} of {filteredTransactions.length} records
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="p-1.5 rounded-lg border border-surface-border hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium text-slate-200">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="p-1.5 rounded-lg border border-surface-border hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
