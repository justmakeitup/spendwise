import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sun,
  Moon,
  Search,
  Lock,
  Menu
} from 'lucide-react';
import { Button } from '../common/Button';
import { useTheme } from '../../context/ThemeContext';
import { NavItem } from './Sidebar';

interface NavbarProps {
  currentTab: NavItem;
  selectedMonth: string; // YYYY-MM
  setSelectedMonth: (month: string) => void;
  onOpenNewTransaction: () => void;
  onOpenMobileMenu: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  selectedMonth,
  setSelectedMonth,
  onOpenNewTransaction,
  onOpenMobileMenu,
  searchQuery,
  setSearchQuery
}) => {
  const { theme, setTheme, isDark } = useTheme();

  // Month navigation helpers (immune to timezone shifts)
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let y = year;
    let m = month - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let y = year;
    let m = month + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    // Use 15th day of month to avoid boundary shifts in any timezone
    const date = new Date(year, month - 1, 15);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const titles: Record<NavItem, string> = {
    overview: 'Financial Dashboard',
    transactions: 'Transaction Ledger',
    budgets: 'Monthly Budgets',
    analytics: 'Financial Analytics',
    recurring: 'Recurring Subscriptions & Bills',
    savings: 'Savings Goals',
    'import-export': 'CSV Import & Backup',
    settings: 'Settings & Privacy Center'
  };

  return (
    <header className="h-[68px] md:h-16 pt-2 md:pt-0 glass-navbar sticky top-0 z-30 px-3 md:px-8 w-full max-w-full overflow-hidden flex items-center justify-between gap-2 md:gap-4 transition-all duration-200">
      {/* Left side: Mobile menu toggle + View title */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl glass-control text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-sm md:text-lg font-black text-slate-900 dark:text-white tracking-tight drop-shadow-sm truncate max-w-[115px] xs:max-w-[140px] sm:max-w-none">
            {titles[currentTab]}
          </h1>
        </div>
      </div>

      {/* Middle: Month Selector */}
      {['overview', 'transactions', 'budgets', 'analytics'].includes(currentTab) && (
        <div className="flex items-center gap-0.5 sm:gap-1 glass-control rounded-2xl px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs shadow-sm shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
            title="Previous month"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <span className="font-extrabold text-slate-900 dark:text-slate-100 px-1 sm:px-2 min-w-[90px] sm:min-w-[115px] text-center select-none tracking-tight">
            {formatMonthDisplay(selectedMonth)}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white transition-colors"
            title="Next month"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      )}

      {/* Right side: Search, Theme toggle, Privacy indicator, Add Transaction Button */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Global Search Bar */}
        <div className="relative hidden lg:block w-48 xl:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-400" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full glass-control rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors shadow-inner"
          />
        </div>

        {/* Privacy Lock Badge */}
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 backdrop-blur-md shadow-sm">
          <Lock className="w-3 h-3" />
          <span>Local Data Only</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="p-2 rounded-xl glass-control text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-colors shadow-sm"
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-amber-600" />}
        </button>

        {/* Primary Action Button (Desktop & Tablet only - Mobile uses bottom bar floating action) */}
        <Button
          onClick={onOpenNewTransaction}
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          className="shadow-glow-emerald hidden md:inline-flex"
        >
          <span>Add Transaction</span>
        </Button>
      </div>
    </header>
  );
};
