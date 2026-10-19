import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  BarChart3,
  Plus,
  X,
  Repeat,
  Target,
  ArrowUpDown,
  Settings,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  Smartphone,
  Download
} from 'lucide-react';
import { NavItem } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  currentTab: NavItem;
  setCurrentTab: (tab: NavItem) => void;
  isOpenDrawer: boolean;
  onCloseDrawer: () => void;
  onOpenNewTransaction: () => void;
  onOpenAuth: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  setCurrentTab,
  isOpenDrawer,
  onCloseDrawer,
  onOpenNewTransaction,
  onOpenAuth
}) => {
  const { user, logout } = useAuth();

  const primaryTabs = [
    { id: 'overview' as NavItem, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as NavItem, label: 'Ledger', icon: Receipt },
    { id: 'budgets' as NavItem, label: 'Budgets', icon: PieChart },
    { id: 'analytics' as NavItem, label: 'Analytics', icon: BarChart3 }
  ];

  const drawerLinks = [
    { id: 'overview' as NavItem, label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions' as NavItem, label: 'Transactions', icon: Receipt },
    { id: 'budgets' as NavItem, label: 'Budgets', icon: PieChart },
    { id: 'analytics' as NavItem, label: 'Analytics', icon: BarChart3 },
    { id: 'recurring' as NavItem, label: 'Recurring Rules', icon: Repeat },
    { id: 'savings' as NavItem, label: 'Savings Goals', icon: Target },
    { id: 'import-export' as NavItem, label: 'Import / Export', icon: ArrowUpDown },
    { id: 'settings' as NavItem, label: 'Settings & Privacy', icon: Settings }
  ];

  return (
    <>
      {/* Mobile Drawer Menu */}
      {isOpenDrawer && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCloseDrawer} />
          <div className="relative w-72 max-w-[80vw] glass-sidebar h-full flex flex-col justify-between p-6 z-10 animate-fade-in shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-surface-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold shadow-sm">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-base text-slate-900 dark:text-white">SpendWise</span>
                </div>
                <button onClick={onCloseDrawer} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-1">
                {drawerLinks.map(link => {
                  const Icon = link.icon;
                  const isActive = currentTab === link.id;
                  return (
                    <button
                      key={link.id}
                      onClick={() => {
                        setCurrentTab(link.id);
                        onCloseDrawer();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                      <span>{link.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* Android APK Download */}
              <div className="pt-2 pb-1">
                <a
                  href="/spendwise.apk"
                  download="SpendWise.apk"
                  type="application/vnd.android.package-archive"
                  className="w-full p-2.5 rounded-xl glass-control flex items-center justify-between text-xs transition-colors hover:border-emerald-500/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-[11px]">Android App</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Download .APK</p>
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-border">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="truncate text-xs text-slate-700 dark:text-slate-300 font-semibold">
                    {user.email}
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      onCloseDrawer();
                    }}
                    className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onCloseDrawer();
                    onOpenAuth();
                  }}
                  className="w-full py-2 px-3 rounded-xl glass-control text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white flex items-center justify-center gap-2 shadow-sm"
                >
                  <UserIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Sign In / Sign Up</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 glass-dock z-30 flex items-center justify-around px-2">
        {primaryTabs.slice(0, 2).map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}

        {/* Center Floating Plus Action */}
        <div className="relative -top-3">
          <button
            onClick={onOpenNewTransaction}
            className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-glow-emerald hover:bg-emerald-600 transition-transform active:scale-95"
            title="Add transaction"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {primaryTabs.slice(2, 4).map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors ${
                isActive ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
