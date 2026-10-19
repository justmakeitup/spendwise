import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useSync } from '../../context/SyncContext';
import { AlertTriangle, Clock, GitMerge, Download, Upload } from 'lucide-react';

export const ConflictModal: React.FC = () => {
  const { conflict, resolveConflict } = useSync();

  if (!conflict) return null;

  return (
    <Modal
      isOpen={!!conflict}
      onClose={() => {}} // User must make an explicit choice
      title="Synchronization Conflict Detected"
      description="Changes were made both locally and in your Google Drive backup."
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <p className="font-semibold">Conflicting edits detected</p>
            <p className="text-amber-200/80 mt-0.5">
              SpendWise will never silently overwrite or destroy your financial data. Please choose how you want to resolve this synchronization conflict:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border space-y-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              Local Device
            </span>
            <p className="text-slate-400">Revision: {conflict.localRevision}</p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(conflict.localExportedAt).toLocaleString()}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface-elevated border border-surface-border space-y-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-blue-400" />
              Google Drive
            </span>
            <p className="text-slate-400">Revision: {conflict.remoteRevision}</p>
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(conflict.remoteExportedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => resolveConflict('merge')}
            icon={<GitMerge className="w-4 h-4" />}
            className="w-full justify-start text-xs py-3"
          >
            <div className="text-left">
              <span className="block font-semibold">Safe Merge (Recommended)</span>
              <span className="text-[11px] opacity-80 block">Combine records from both sources without losing transactions.</span>
            </div>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => resolveConflict('take-remote')}
            icon={<Download className="w-4 h-4" />}
            className="w-full justify-start text-xs py-3"
          >
            <div className="text-left">
              <span className="block font-semibold">Keep Google Drive Backup</span>
              <span className="text-[11px] text-slate-400 block">Replace local state with the Google Drive version.</span>
            </div>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => resolveConflict('keep-local')}
            icon={<Upload className="w-4 h-4" />}
            className="w-full justify-start text-xs py-3"
          >
            <div className="text-left">
              <span className="block font-semibold">Keep Local Changes</span>
              <span className="text-[11px] text-slate-400 block">Overwrite Google Drive with your current device records.</span>
            </div>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
