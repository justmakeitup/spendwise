import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinancial } from '../../context/FinancialContext';
import { useSync } from '../../context/SyncContext';
import { useTheme } from '../../context/ThemeContext';
import { SUPPORTED_CURRENCIES } from '@spendwise/shared';
import { Button } from '../../components/common/Button';
import { PassphraseModal } from '../../components/modals/PassphraseModal';
import {
  Settings,
  Shield,
  Cloud,
  CloudOff,
  RefreshCw,
  HardDrive,
  Lock,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  KeyRound,
  Download,
  Smartphone,
  Check
} from 'lucide-react';

interface SettingsViewProps {
  onOpenAuth: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onOpenAuth }) => {
  const { user, deleteAccount } = useAuth();
  const { preferences, updatePreferences, clearAllFinancialData } = useFinancial();
  const {
    status,
    driveEmail,
    lastBackupAt,
    lastSyncAt,
    connectDrive,
    disconnectDrive,
    backupNow,
    syncNow,
    driveBackups,
    fetchBackupsList,
    restoreFromDriveFile,
    errorMessage
  } = useSync();

  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'general' | 'drive' | 'privacy' | 'android' | 'danger'>('general');
  const [passphraseModalOpen, setPassphraseModalOpen] = useState(false);
  const [passphraseAction, setPassphraseAction] = useState<'backup' | 'sync'>('backup');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusNotice, setStatusNotice] = useState('');

  useEffect(() => {
    if (status !== 'local-only') {
      fetchBackupsList();
    }
  }, [status]);

  const handleBackupClick = () => {
    if (preferences.encryptionEnabled) {
      setPassphraseAction('backup');
      setPassphraseModalOpen(true);
    } else {
      runBackup();
    }
  };

  const runBackup = async (passphrase?: string) => {
    try {
      setIsProcessing(true);
      await backupNow(passphrase);
      setStatusNotice('Backup completed successfully to Google Drive!');
      setTimeout(() => setStatusNotice(''), 4000);
    } catch (err: any) {
      alert(`Backup failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncClick = () => {
    if (preferences.encryptionEnabled) {
      setPassphraseAction('sync');
      setPassphraseModalOpen(true);
    } else {
      runSync();
    }
  };

  const runSync = async (passphrase?: string) => {
    try {
      setIsProcessing(true);
      await syncNow(passphrase);
      setStatusNotice('Synchronized successfully with Google Drive!');
      setTimeout(() => setStatusNotice(''), 4000);
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-400" />
          <span>System Settings & Privacy Center</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure preferences, Google Drive storage authorization, and review privacy architecture.
        </p>
      </div>

      {statusNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="flex border-b border-surface-border gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'general' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          General & Preferences
        </button>
        <button
          onClick={() => setActiveTab('drive')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'drive' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Google Drive Storage
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'privacy' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Privacy Architecture
        </button>
        <button
          onClick={() => setActiveTab('android')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'android' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Android App</span>
        </button>
        <button
          onClick={() => setActiveTab('danger')}
          className={`pb-3 border-b-2 transition-colors ${
            activeTab === 'danger' ? 'border-rose-500 text-rose-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Danger Zone
        </button>
      </div>

      {/* Tab: General & Preferences */}
      {activeTab === 'general' && (
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel space-y-6">
          <h3 className="text-sm font-bold text-slate-100">Preferences</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Currency */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Primary Currency</label>
              <select
                value={preferences.currency}
                onChange={e => updatePreferences({ currency: e.target.value })}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {SUPPORTED_CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol}) — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* First day of week */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">First Day of Week</label>
              <select
                value={preferences.firstDayOfWeek}
                onChange={e => updatePreferences({ firstDayOfWeek: Number(e.target.value) })}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Interface Theme</label>
              <select
                value={theme}
                onChange={e => setTheme(e.target.value as any)}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="dark">Deep Midnight (Dark)</option>
                <option value="light">Crisp Modern (Light)</option>
                <option value="system">System Preference</option>
              </select>
            </div>

            {/* Budget Rollover Default */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Default Budget Rollover</label>
              <select
                value={preferences.budgetRolloverDefault ? 'yes' : 'no'}
                onChange={e => updatePreferences({ budgetRolloverDefault: e.target.value === 'yes' })}
                className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="no">Disabled (Fresh budget each month)</option>
                <option value="yes">Enabled (Roll over unspent funds)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Google Drive Storage */}
      {activeTab === 'drive' && (
        <div className="space-y-6">
          {/* WhatsApp-style Explanatory Banner */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-slate-100 text-sm">Personal Google Drive Storage (WhatsApp-style)</p>
              <p className="mt-1 text-slate-300 leading-relaxed">
                Just like WhatsApp backs up chats to your personal Google Drive, SpendWise connects to <strong>your own Gmail account</strong>. Backups are saved directly into a private <code className="text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded">SpendWise Backups</code> folder in <strong>your personal Drive</strong>. SpendWise servers never host or store your financial history.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span>Google Drive Backup Settings</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Manage your personal Google Account and automated backup schedule.
                </p>
              </div>

              {driveEmail ? (
                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/20">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Local Only</span>
                </div>
              )}
            </div>

            {/* Account and Backup Details */}
            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-3.5 text-xs">
              {/* Google Account Row */}
              <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                <div>
                  <span className="text-slate-400 font-medium block">Google Account (Gmail)</span>
                  <span className="text-slate-200 font-bold text-sm">
                    {driveEmail ? driveEmail : 'No Google account selected'}
                  </span>
                </div>
                {driveEmail ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (window.confirm('Disconnect Google Drive? Your files in Drive will remain intact.')) {
                        disconnectDrive();
                      }
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300"
                    icon={<CloudOff className="w-3.5 h-3.5" />}
                  >
                    Change / Disconnect
                  </Button>
                ) : user ? (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={connectDrive}
                    icon={<Cloud className="w-3.5 h-3.5" />}
                  >
                    Select Google Account
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={onOpenAuth}
                    icon={<Shield className="w-3.5 h-3.5" />}
                  >
                    Sign In to Connect
                  </Button>
                )}
              </div>

              {/* Destination Folder */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Storage Destination:</span>
                <span className="font-semibold text-emerald-400">
                  {driveEmail ? 'Your Google Drive ➔ SpendWise Backups/' : 'Local Device Only'}
                </span>
              </div>

              {/* Backup Frequency */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Back up to Google Drive:</span>
                <select
                  value={preferences.backupFrequency}
                  onChange={e => updatePreferences({ backupFrequency: e.target.value as any })}
                  className="bg-surface border border-surface-border rounded-lg px-2.5 py-1 text-slate-200 font-medium text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="manual">Only when I tap "Back up"</option>
                  <option value="realtime">Real-time (After every change)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {/* Last Backup Time */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Last Backup Time:</span>
                <span className="font-semibold text-slate-200">
                  {lastBackupAt ? new Date(lastBackupAt).toLocaleString() : 'Never'}
                </span>
              </div>

              {/* Last Sync Check */}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Last Sync Check:</span>
                <span className="font-semibold text-slate-200">
                  {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : 'Never'}
                </span>
              </div>

              {/* Action Buttons */}
              {driveEmail && (
                <div className="pt-3 border-t border-surface-border flex flex-wrap gap-2.5">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleBackupClick}
                    loading={isProcessing}
                    icon={<Cloud className="w-3.5 h-3.5" />}
                    className="shadow-glow-emerald"
                  >
                    Back Up Now
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleSyncClick}
                    loading={isProcessing}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                  >
                    Sync Now
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Encryption Setting */}
          <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Client-Side End-to-End Encryption</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Encrypt financial backups with AES-GCM 256-bit using Web Crypto API before uploading to Drive.
                </p>
              </div>

              <input
                type="checkbox"
                checked={preferences.encryptionEnabled}
                onChange={e => updatePreferences({ encryptionEnabled: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 bg-surface-elevated border-surface-border cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-amber-400/80">
              When enabled, SpendWise prompts for your passphrase before backing up or restoring. Neither Google nor SpendWise servers can read your data without the passphrase.
            </p>
          </div>

          {/* Remote Backups List */}
          {driveEmail && (
            <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100">Files in Google Drive "SpendWise Backups"</h3>
                <button
                  onClick={fetchBackupsList}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh List
                </button>
              </div>

              {driveBackups.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">No backup files found in your Google Drive yet.</p>
              ) : (
                <div className="divide-y divide-surface-border text-xs">
                  {driveBackups.map(file => (
                    <div key={file.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-200">{file.name}</p>
                        <p className="text-[10px] text-slate-400">{new Date(file.modifiedTime).toLocaleString()}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          if (window.confirm('Restore from this Drive backup file? Local state will be replaced.')) {
                            try {
                              await restoreFromDriveFile(file.id);
                              alert('Backup restored successfully!');
                            } catch (err: any) {
                              alert(`Restore error: ${err.message}`);
                            }
                          }
                        }}
                        icon={<Download className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Privacy Architecture */}
      {activeTab === 'privacy' && (
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-border">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Zero-Knowledge Financial Privacy Architecture</h3>
              <p className="text-xs text-slate-400">Complete transparency regarding what data is stored and where.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-2">
              <span className="font-bold text-slate-200 block text-sm">1. Neon PostgreSQL</span>
              <p className="text-slate-400 leading-relaxed">
                Stores <strong>strictly credentials</strong> for account management:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                <li>Account ID & Email</li>
                <li>Argon2 / Bcrypt Password Hash</li>
                <li>Session tokens & Reset tokens</li>
                <li>Google OAuth refresh token</li>
              </ul>
              <p className="text-emerald-400 font-semibold text-[11px] pt-1">
                Zero transactions or financial figures are stored here!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-2">
              <span className="font-bold text-slate-200 block text-sm">2. Browser IndexedDB</span>
              <p className="text-slate-400 leading-relaxed">
                Stores your <strong>financial register</strong>:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                <li>Transactions, tags & payment modes</li>
                <li>Custom expense categories</li>
                <li>Monthly budget allocations</li>
                <li>Recurring commitments & rules</li>
                <li>Savings goals & deposit logs</li>
              </ul>
              <p className="text-slate-400 text-[11px] pt-1">
                Data never leaves your browser unless backed up by you.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-2">
              <span className="font-bold text-slate-200 block text-sm">3. Personal Google Drive</span>
              <p className="text-slate-400 leading-relaxed">
                Stores your <strong>backup archives</strong>:
              </p>
              <ul className="list-disc list-inside text-slate-300 space-y-1 text-[11px]">
                <li>Stored in your own Drive account</li>
                <li>Restricted <code className="text-emerald-400">drive.file</code> scope</li>
                <li>Never publicly shared or indexed</li>
                <li>Optional client-side AES-GCM encryption</li>
              </ul>
              <p className="text-emerald-400 font-semibold text-[11px] pt-1">
                Owned 100% by you, not by SpendWise.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Android Mobile App */}
      {activeTab === 'android' && (
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel space-y-6">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-surface-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-glow-emerald">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>SpendWise Android Application</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    v1.0.0
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Standalone native Android app built with Capacitor and native Android SDK.
                </p>
              </div>
            </div>

            <a
              href="/spendwise.apk"
              download="SpendWise.apk"
              type="application/vnd.android.package-archive"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs transition-all shadow-glow-emerald shrink-0 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download .APK (8.7 MB)</span>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-2">
              <span className="font-bold text-slate-200 block text-sm">App Specifications</span>
              <ul className="space-y-1.5 text-slate-400">
                <li className="flex justify-between">
                  <span>Package ID:</span>
                  <strong className="text-slate-200 font-mono">com.spendwise.app</strong>
                </li>
                <li className="flex justify-between">
                  <span>Target Android OS:</span>
                  <strong className="text-slate-200">Android 7.0+ (API 24 to 36)</strong>
                </li>
                <li className="flex justify-between">
                  <span>Storage Architecture:</span>
                  <strong className="text-slate-200">Local-First IndexedDB</strong>
                </li>
                <li className="flex justify-between">
                  <span>Cloud Storage:</span>
                  <strong className="text-slate-200">Direct User Google Drive</strong>
                </li>
                <li className="flex justify-between">
                  <span>Adware & Trackers:</span>
                  <strong className="text-emerald-400">0 Trackers, 100% Private</strong>
                </li>
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-2">
              <span className="font-bold text-slate-200 block text-sm">How to Install on Your Android Device</span>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-400 text-[11px] leading-relaxed">
                <li>Tap <strong>Download .APK</strong> to download the installer directly to your phone.</li>
                <li>Open the downloaded <code className="text-emerald-400 font-mono">SpendWise.apk</code> from your notifications or Downloads folder.</li>
                <li>If prompted with "Install unknown apps", tap <strong>Settings</strong> and enable "Allow from this source".</li>
                <li>Tap <strong>Install</strong> and launch SpendWise. All features work completely offline!</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Danger Zone */}
      {activeTab === 'danger' && (
        <div className="p-6 rounded-2xl bg-surface border border-rose-500/30 glass-panel space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-surface-border">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-rose-400">Destructive Actions</h3>
              <p className="text-xs text-slate-400">Wipe local data or permanently delete your account.</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            {/* Clear Local Data */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-surface-elevated border border-surface-border">
              <div>
                <p className="font-bold text-slate-200">Erase Local Financial Data</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Clears all transactions, budgets, and savings goals stored in this browser's IndexedDB.
                </p>
              </div>
              <Button
                size="sm"
                variant="danger"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to erase all local financial records? Make sure you have exported a backup first.')) {
                    await clearAllFinancialData();
                    alert('Local data cleared.');
                  }
                }}
              >
                Erase Local Data
              </Button>
            </div>

            {/* Delete Account */}
            {user && (
              <div className="flex items-center justify-between p-4 rounded-xl bg-surface-elevated border border-surface-border">
                <div>
                  <p className="font-bold text-slate-200">Delete SpendWise Account</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Permanently removes your account credentials and OAuth tokens from Neon PostgreSQL.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={async () => {
                    if (window.confirm('Delete your account? This action cannot be reversed.')) {
                      await deleteAccount();
                      alert('Account successfully deleted.');
                    }
                  }}
                >
                  Delete Account
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Passphrase Modal for Settings */}
      <PassphraseModal
        isOpen={passphraseModalOpen}
        onClose={() => setPassphraseModalOpen(false)}
        mode="encrypt"
        onSubmit={async passphrase => {
          if (passphraseAction === 'backup') {
            await runBackup(passphrase);
          } else {
            await runSync(passphrase);
          }
        }}
      />
    </div>
  );
};
