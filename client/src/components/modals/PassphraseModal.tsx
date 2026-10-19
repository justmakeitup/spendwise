import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { KeyRound, ShieldAlert } from 'lucide-react';

interface PassphraseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (passphrase: string) => Promise<void>;
  mode: 'encrypt' | 'decrypt';
}

export const PassphraseModal: React.FC<PassphraseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode
}) => {
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (passphrase.length < 6) {
      setError('Passphrase must be at least 6 characters.');
      return;
    }

    if (mode === 'encrypt' && passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(passphrase);
      setPassphrase('');
      setConfirmPassphrase('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'encrypt' ? 'Set Backup Encryption Passphrase' : 'Enter Decryption Passphrase'}
      description="Client-side AES-GCM 256-bit encryption using Web Crypto API."
      maxWidth="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'encrypt' && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Zero-Knowledge Encryption:</strong> SpendWise never stores your passphrase or encryption key. If you forget this passphrase, encrypted backups cannot be recovered by anyone.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
            {error}
          </div>
        )}

        <Input
          label="Passphrase"
          type="password"
          required
          autoFocus
          placeholder="Enter a secure passphrase..."
          value={passphrase}
          onChange={e => setPassphrase(e.target.value)}
          leftIcon={<KeyRound className="w-4 h-4" />}
        />

        {mode === 'encrypt' && (
          <Input
            label="Confirm Passphrase"
            type="password"
            required
            placeholder="Repeat passphrase..."
            value={confirmPassphrase}
            onChange={e => setConfirmPassphrase(e.target.value)}
            leftIcon={<KeyRound className="w-4 h-4" />}
          />
        )}

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-surface-border">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {mode === 'encrypt' ? 'Encrypt & Proceed' : 'Unlock & Restore'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
