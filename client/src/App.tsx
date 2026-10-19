import React, { useState, useEffect, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { FinancialProvider } from './context/FinancialContext';
import { SyncProvider } from './context/SyncContext';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';

import { Sidebar, NavItem } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';

import { OverviewView } from './features/dashboard/OverviewView';
import { TransactionsView } from './features/transactions/TransactionsView';
import { BudgetsView } from './features/budgets/BudgetsView';
import { AnalyticsView } from './features/analytics/AnalyticsView';
import { RecurringView } from './features/recurring/RecurringView';
import { SavingsGoalsView } from './features/savings/SavingsGoalsView';
import { ImportExportView } from './features/import-export/ImportExportView';
import { SettingsView } from './features/settings/SettingsView';

import { TransactionModal } from './components/modals/TransactionModal';
import { AuthModal } from './components/modals/AuthModal';
import { ConflictModal } from './components/modals/ConflictModal';
import { Transaction } from '@spendwise/shared';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavItem>('overview');
  const [tabHistory, setTabHistory] = useState<NavItem[]>(['overview']);
  const [exitToastVisible, setExitToastVisible] = useState(false);
  const lastBackPressRef = useRef<number>(0);

  // Helper to change tab and record navigation history
  const handleNavigateToTab = (tab: NavItem) => {
    if (tab !== currentTab) {
      setTabHistory(prev => [...prev, tab]);
      setCurrentTab(tab);
    }
  };

  // Current selected month: YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().slice(0, 7);
  });

  // Global search query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<Transaction | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Hardware Android Back Button & Back Swipe Gesture Handling
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: any = null;

    const setupListener = async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: '#0B0F19' });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch (e) {
        // Ignore in browser/non-supported environments
      }

      listenerHandle = await CapApp.addListener('backButton', () => {
        // 1. Close Add/Edit Transaction modal if open
        if (isTxModalOpen) {
          setIsTxModalOpen(false);
          return;
        }

        // 2. Close Auth modal if open
        if (isAuthModalOpen) {
          setIsAuthModalOpen(false);
          return;
        }

        // 3. Close Mobile Drawer Menu if open
        if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
          return;
        }

        // 4. Navigate back to previous screen in history
        if (tabHistory.length > 1) {
          const newHistory = [...tabHistory];
          newHistory.pop(); // remove current tab
          const previousTab = newHistory[newHistory.length - 1] || 'overview';
          setTabHistory(newHistory);
          setCurrentTab(previousTab);
          return;
        }

        // If on another tab without history, return to overview
        if (currentTab !== 'overview') {
          setCurrentTab('overview');
          setTabHistory(['overview']);
          return;
        }

        // 5. On root screen (overview): Double press back to exit
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          setExitToastVisible(true);
          setTimeout(() => setExitToastVisible(false), 2000);
        }
      });
    };

    setupListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [isTxModalOpen, isAuthModalOpen, isMobileMenuOpen, tabHistory, currentTab]);

  const handleOpenNewTransaction = () => {
    setSelectedTxForEdit(null);
    setIsTxModalOpen(true);
  };

  const handleSelectTransactionForEdit = (tx: Transaction) => {
    setSelectedTxForEdit(tx);
    setIsTxModalOpen(true);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (query && currentTab !== 'transactions') {
      handleNavigateToTab('transactions');
    }
  };

  return (
    <div className="flex min-h-screen bg-background transition-colors">
      {/* Desktop Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleNavigateToTab}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenNewTransaction={handleOpenNewTransaction}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          currentTab={currentTab}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          onOpenNewTransaction={handleOpenNewTransaction}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={handleSearchChange}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-12">
          {currentTab === 'overview' && (
            <OverviewView
              selectedMonth={selectedMonth}
              onOpenNewTransaction={handleOpenNewTransaction}
              onNavigateToTab={handleNavigateToTab}
              onSelectTransactionForEdit={handleSelectTransactionForEdit}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsView
              onOpenNewTransaction={handleOpenNewTransaction}
              onSelectTransactionForEdit={handleSelectTransactionForEdit}
              initialSearch={searchQuery}
            />
          )}

          {currentTab === 'budgets' && (
            <BudgetsView selectedMonth={selectedMonth} />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView selectedMonth={selectedMonth} />
          )}

          {currentTab === 'recurring' && (
            <RecurringView />
          )}

          {currentTab === 'savings' && (
            <SavingsGoalsView />
          )}

          {currentTab === 'import-export' && (
            <ImportExportView />
          )}

          {currentTab === 'settings' && (
            <SettingsView onOpenAuth={() => setIsAuthModalOpen(true)} />
          )}
        </main>
      </div>

      {/* Mobile Navigation Drawer & Bottom Bar */}
      <MobileNav
        currentTab={currentTab}
        setCurrentTab={handleNavigateToTab}
        isOpenDrawer={isMobileMenuOpen}
        onCloseDrawer={() => setIsMobileMenuOpen(false)}
        onOpenNewTransaction={handleOpenNewTransaction}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Native Double-Tap Exit Toast */}
      {exitToastVisible && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-slate-900/95 dark:bg-slate-900/95 text-white text-xs font-semibold border border-white/20 shadow-2xl backdrop-blur-md animate-fade-in pointer-events-none">
          Press back again to exit
        </div>
      )}

      {/* Global Modals */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        initialTransaction={selectedTxForEdit}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      <ConflictModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <FinancialProvider>
          <SyncProvider>
            <AppContent />
          </SyncProvider>
        </FinancialProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
