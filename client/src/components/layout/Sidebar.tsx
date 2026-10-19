import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  BarChart3,
  Repeat,
  Target,
  ArrowUpDown,
  Settings,
  ShieldCheck,
  Cloud,
  CloudOff,
  RefreshCw,
  LogOut,
  User as UserIcon,
  HardDrive,
  Smartphone,
  Download
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSync } from '../../context/SyncContext';

export type NavItem =
  | 'overview'
  | 'transactions'
  | 'budgets'
  | 'analytics'
  | 'recurring'
  | 'savings'
  | 'import-export'
  | 'settings';

interface SidebarProps {
  currentTab: NavItem;
  setCurrentTab: (tab: NavItem) => void;
  onOpenAuth: () => void;
  onOpenNewTransaction: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenAuth,
  onOpenNewTransaction
}) => {
  const { user, logout } = useAuth();
  const { status, syncNow } = useSync();
  const [syncing, setSyncing] = React.useState(false);

  const navLinks = [
    { id: 'overview' as NavItem, label: 'Overview', icon: LayoutDashboard },
    { id: 'transactions' as NavItem, label: 'Transactions', icon: Receipt },
    { id: 'budgets' as NavItem, label: 'Budgets', icon: PieChart },
    { id: 'analytics' as NavItem, label: 'Analytics', icon: BarChart3 },
    { id: 'recurring' as NavItem, label: 'Recurring', icon: Repeat },
    { id: 'savings' as NavItem, label: 'Savings Goals', icon: Target },
    { id: 'import-export' as NavItem, label: 'Import / Export', icon: ArrowUpDown },
    { id: 'settings' as NavItem, label: 'Settings & Privacy', icon: Settings }
  ];

  const handleQuickSync = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      await syncNow();
    } catch {
      // handled in context
    } finally {
      setSyncing(false);
    }
  };

  const getSyncStatusBadge = () => {
    switch (status) {
      case 'synced':
        return { label: 'Drive Synced', icon: Cloud, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'backup-pending':
        return { label: 'Backup Pending', icon: RefreshCw, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'syncing':
        return { label: 'Syncing...', icon: RefreshCw, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20 animate-spin' };
      case 'drive-connected':
        return { label: 'Drive Connected', icon: Cloud, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'sync-failed':
        return { label: 'Sync Failed', icon: CloudOff, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
      case 'local-only':
      default:
        return { label: 'Local Storage Only', icon: HardDrive, color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    }
  };

  const badge = getSyncStatusBadge();
  const BadgeIcon = badge.icon;

  return (
    <aside className="w-64 glass-sidebar flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-all duration-200 hidden md:flex">
      <div>
        {/* Brand */}
        <div className="p-6 flex items-center justify-between border-b border-surface-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-electric-mint flex items-center justify-center shadow-glow-emerald text-white font-bold text-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-slate-900 dark:text-white block">
                Spend<span className="text-emerald-600 dark:text-emerald-400">Wise</span>
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
                Private & Local-First
              </span>
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-4 space-y-1">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = currentTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setCurrentTab(link.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Area: Storage Status + User Account */}
      <div className="p-4 border-t border-surface-border space-y-3">
        {/* Sync Status Box */}
        <div className="p-3 rounded-xl glass-control">
          <div className="flex items-center justify-between mb-2">
            <div className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg border ${badge.color}`}>
              <BadgeIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{badge.label}</span>
            </div>
            {status !== 'local-only' && (
              <button
                onClick={handleQuickSync}
                title="Sync now"
                disabled={syncing}
                className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
            {status === 'local-only'
              ? 'Data stays 100% on this device. Connect Google Drive in settings for sync.'
              : 'Direct browser-to-Drive sync. Never uploaded to SpendWise servers.'}
          </p>
        </div>

        {/* Download Android APK */}
        <a
          href="/spendwise.apk"
          download="SpendWise.apk"
          type="application/vnd.android.package-archive"
          className="p-2.5 rounded-xl glass-control hover:border-emerald-500/50 flex items-center justify-between text-xs transition-all glow-hover group"
          title="Download SpendWise Android App APK"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-[11px] truncate">
                Download Android App
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Offline & private .APK</p>
            </div>
          </div>
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:translate-y-0.5 transition-transform" />
        </a>

        {/* User Profile / Auth Status */}
        <div className="pt-1 flex items-center justify-between">
          {user ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate">{user.email}</p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Authenticated Account</p>
              </div>
              <button
                onClick={() => logout()}
                title="Sign out"
                className="ml-auto p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="w-full py-2 px-3 rounded-xl glass-control text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white flex items-center justify-center gap-2 transition-colors shadow-sm"
            >
              <UserIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Sign In / Sign Up</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
