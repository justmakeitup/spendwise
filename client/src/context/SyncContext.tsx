import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { localDB } from '../lib/storage/db';
import { encryptFinancialPayload, decryptFinancialPayload } from '../lib/crypto/encryption';
import { FinancialDataPayload, EncryptedBackupPayload, FinancialDataPayloadSchema } from '@spendwise/shared';
import { useFinancial } from './FinancialContext';
import { useAuth } from './AuthContext';

export type SyncStatus = 'local-only' | 'drive-connected' | 'backup-pending' | 'syncing' | 'synced' | 'sync-failed';

export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

interface ConflictData {
  localRevision: number;
  localExportedAt: string;
  remoteRevision: number;
  remoteExportedAt: string;
  remotePayload: FinancialDataPayload;
}

interface SyncContextType {
  status: SyncStatus;
  driveEmail: string | null;
  lastBackupAt: string | null;
  lastSyncAt: string | null;
  errorMessage: string | null;
  driveBackups: DriveBackupFile[];
  conflict: ConflictData | null;

  connectDrive: () => Promise<void>;
  disconnectDrive: () => Promise<void>;
  backupNow: (passphrase?: string) => Promise<void>;
  syncNow: (passphrase?: string) => Promise<void>;
  restoreFromDriveFile: (fileId: string, passphrase?: string) => Promise<void>;
  resolveConflict: (resolution: 'keep-local' | 'take-remote' | 'merge') => Promise<void>;
  downloadLocalJsonBackup: (passphrase?: string) => Promise<void>;
  restoreFromJsonFile: (file: File, passphrase?: string) => Promise<void>;
  fetchBackupsList: () => Promise<void>;
  clearError: () => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { preferences, updatePreferences, revision, importFinancialData, refreshData } = useFinancial();

  const [status, setStatus] = useState<SyncStatus>('local-only');
  const [driveEmail, setDriveEmail] = useState<string | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [driveBackups, setDriveBackups] = useState<DriveBackupFile[]>([]);
  const [conflict, setConflict] = useState<ConflictData | null>(null);
  const [lastBackedUpRevision, setLastBackedUpRevision] = useState<number>(0);

  // Check Drive connection status
  const checkDriveStatus = useCallback(async () => {
    if (!user) {
      setStatus('local-only');
      setDriveEmail(null);
      return;
    }

    try {
      const res = await api.getDriveStatus();
      if (res.connected) {
        setDriveEmail(res.email || user.email);
        setLastBackupAt(preferences.lastBackupAt || null);
        setLastSyncAt(preferences.lastSyncAt || null);
        setStatus(revision > lastBackedUpRevision && lastBackedUpRevision > 0 ? 'backup-pending' : 'drive-connected');
      } else {
        setStatus('local-only');
        setDriveEmail(null);
      }
    } catch {
      setStatus('local-only');
    }
  }, [user, preferences, revision, lastBackedUpRevision]);

  useEffect(() => {
    checkDriveStatus();
  }, [checkDriveStatus]);

  // Track pending edits
  useEffect(() => {
    if (status === 'drive-connected' || status === 'synced') {
      if (revision > lastBackedUpRevision && lastBackedUpRevision > 0) {
        setStatus('backup-pending');
      }
    }
  }, [revision, lastBackedUpRevision, status]);

  const clearError = () => setErrorMessage(null);

  const connectDrive = async () => {
    try {
      clearError();
      const res = await api.getDriveAuthUrl();
      if (res.url) {
        window.location.href = res.url;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to start Google Drive connection.');
      setStatus('sync-failed');
    }
  };

  const disconnectDrive = async () => {
    try {
      clearError();
      await api.disconnectDrive();
      setDriveEmail(null);
      setStatus('local-only');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to disconnect Google Drive.');
    }
  };

  const fetchBackupsList = async () => {
    if (status === 'local-only') return;
    try {
      const res = await api.listDriveBackups();
      setDriveBackups(res.backups || []);
    } catch (err: any) {
      console.warn('Failed to fetch drive backups:', err);
    }
  };

  // Manual Backup to Google Drive
  const backupNow = async (passphrase?: string): Promise<void> => {
    try {
      clearError();
      setStatus('syncing');

      const payload = await localDB.exportFullPayload();
      let uploadContent: any;
      let filename = `spendwise_backup_${new Date().toISOString().split('T')[0]}.json`;

      if (preferences.encryptionEnabled && passphrase) {
        uploadContent = await encryptFinancialPayload(payload, passphrase);
        filename = `spendwise_encrypted_${new Date().toISOString().split('T')[0]}.json`;
      } else {
        uploadContent = payload;
      }

      await api.uploadBackupToDrive(filename, uploadContent);

      const now = new Date().toISOString();
      await updatePreferences({ lastBackupAt: now });
      setLastBackupAt(now);
      setLastBackedUpRevision(payload.revision);
      setStatus('synced');
      await fetchBackupsList();
    } catch (err: any) {
      console.error('Backup error:', err);
      setErrorMessage(err.message || 'Failed to back up to Google Drive.');
      setStatus('sync-failed');
      throw err;
    }
  };

  // Sync Now: checks for latest drive backup and merges or uploads
  const syncNow = async (passphrase?: string): Promise<void> => {
    try {
      clearError();
      setStatus('syncing');

      const backupsRes = await api.listDriveBackups();
      const files = backupsRes.backups || [];

      if (files.length === 0) {
        // No backups exist on Drive yet, perform first backup
        await backupNow(passphrase);
        return;
      }

      // Download the newest backup
      const newestFile = files[0];
      const rawRes = await api.downloadDriveBackup(newestFile.id);
      const remoteData = typeof rawRes.content === 'string' ? JSON.parse(rawRes.content) : rawRes.content;

      let decryptedRemote: FinancialDataPayload;
      if (remoteData.encrypted) {
        if (!passphrase) {
          throw new Error('This remote backup is encrypted. Please provide your passphrase to synchronize.');
        }
        decryptedRemote = await decryptFinancialPayload(remoteData as EncryptedBackupPayload, passphrase);
      } else {
        decryptedRemote = FinancialDataPayloadSchema.parse(remoteData);
      }

      const localPayload = await localDB.exportFullPayload();

      // Check revision and conflict
      if (decryptedRemote.revision > localPayload.revision) {
        // Remote is newer: trigger conflict review modal if local has unsaved changes, or ask user
        if (localPayload.revision > lastBackedUpRevision && lastBackedUpRevision > 0) {
          // Both have changes!
          setConflict({
            localRevision: localPayload.revision,
            localExportedAt: localPayload.exportedAt,
            remoteRevision: decryptedRemote.revision,
            remoteExportedAt: decryptedRemote.exportedAt,
            remotePayload: decryptedRemote
          });
          setStatus('backup-pending');
          return;
        } else {
          // Local had no pending changes, safely restore remote
          await importFinancialData(decryptedRemote, false);
          const now = new Date().toISOString();
          await updatePreferences({ lastSyncAt: now });
          setLastSyncAt(now);
          setLastBackedUpRevision(decryptedRemote.revision);
          setStatus('synced');
          return;
        }
      } else {
        // Local is newer or equal, backup local to drive
        await backupNow(passphrase);
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      setErrorMessage(err.message || 'Synchronization failed.');
      setStatus('sync-failed');
      throw err;
    }
  };

  // Resolve conflict
  const resolveConflict = async (resolution: 'keep-local' | 'take-remote' | 'merge') => {
    if (!conflict) return;

    if (resolution === 'take-remote') {
      await importFinancialData(conflict.remotePayload, false);
    } else if (resolution === 'merge') {
      await importFinancialData(conflict.remotePayload, true);
    }
    // If 'keep-local', local data stays intact

    setConflict(null);
    await backupNow();
  };

  // Restore from specific Drive file
  const restoreFromDriveFile = async (fileId: string, passphrase?: string) => {
    try {
      clearError();
      setStatus('syncing');

      const rawRes = await api.downloadDriveBackup(fileId);
      const data = typeof rawRes.content === 'string' ? JSON.parse(rawRes.content) : rawRes.content;

      let payload: FinancialDataPayload;
      if (data.encrypted) {
        if (!passphrase) throw new Error('Passphrase required to restore this encrypted backup.');
        payload = await decryptFinancialPayload(data, passphrase);
      } else {
        payload = FinancialDataPayloadSchema.parse(data);
      }

      await importFinancialData(payload, false);
      setStatus('synced');
      await refreshData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore backup.');
      setStatus('sync-failed');
      throw err;
    }
  };

  // Download local JSON backup file to user disk
  const downloadLocalJsonBackup = async (passphrase?: string) => {
    const payload = await localDB.exportFullPayload();
    let contentStr: string;
    let filename = `spendwise_backup_${new Date().toISOString().split('T')[0]}.json`;

    if (passphrase) {
      const encrypted = await encryptFinancialPayload(payload, passphrase);
      contentStr = JSON.stringify(encrypted, null, 2);
      filename = `spendwise_encrypted_${new Date().toISOString().split('T')[0]}.json`;
    } else {
      contentStr = JSON.stringify(payload, null, 2);
    }

    const blob = new Blob([contentStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Restore from uploaded JSON file
  const restoreFromJsonFile = async (file: File, passphrase?: string) => {
    const text = await file.text();
    const data = JSON.parse(text);

    let payload: FinancialDataPayload;
    if (data.encrypted) {
      if (!passphrase) throw new Error('This file is encrypted. Passphrase is required.');
      payload = await decryptFinancialPayload(data, passphrase);
    } else {
      payload = FinancialDataPayloadSchema.parse(data);
    }

    await importFinancialData(payload, false);
    await refreshData();
  };

  return (
    <SyncContext.Provider
      value={{
        status,
        driveEmail,
        lastBackupAt,
        lastSyncAt,
        errorMessage,
        driveBackups,
        conflict,
        connectDrive,
        disconnectDrive,
        backupNow,
        syncNow,
        restoreFromDriveFile,
        resolveConflict,
        downloadLocalJsonBackup,
        restoreFromJsonFile,
        fetchBackupsList,
        clearError
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
};
