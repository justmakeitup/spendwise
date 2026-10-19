import React, { useState, useRef } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { useSync } from '../../context/SyncContext';
import {
  parseCsvText,
  parseAmountToCents,
  parseDateToIso,
  exportTransactionsToCsv,
  ParsedCsvRow
} from '../../lib/csv/csvHelper';
import { formatCurrency } from '../../lib/currency';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { PassphraseModal } from '../../components/modals/PassphraseModal';
import { Transaction, TransactionType } from '@spendwise/shared';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  RotateCcw
} from 'lucide-react';

export const ImportExportView: React.FC = () => {
  const { transactions, categories, preferences, bulkAddTransactions } = useFinancial();
  const { downloadLocalJsonBackup, restoreFromJsonFile } = useSync();

  // Wizard state: 1: upload, 2: mapping, 3: preview, 4: complete
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [rawCsvText, setRawCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // Column mapping indices (-1 means unmapped)
  const [dateCol, setDateCol] = useState<number>(0);
  const [amountCol, setAmountCol] = useState<number>(1);
  const [typeCol, setTypeCol] = useState<number>(-1);
  const [categoryCol, setCategoryCol] = useState<number>(-1);
  const [noteCol, setNoteCol] = useState<number>(-1);
  const [paymentCol, setPaymentCol] = useState<number>(-1);
  const [tagsCol, setTagsCol] = useState<number>(-1);

  // Preview rows
  const [previewRows, setPreviewRows] = useState<Array<ParsedCsvRow & { selected: boolean }>>([]);
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number }>({ imported: 0, skipped: 0 });

  // Passphrase modal state for JSON backup / restore
  const [passphraseModalOpen, setPassphraseModalOpen] = useState(false);
  const [passphraseMode, setPassphraseMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonRestoreRef = useRef<HTMLInputElement>(null);

  // Handle CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      setRawCsvText(text);
      processCsvText(text);
    };
    reader.readAsText(file);
  };

  const processCsvText = (text: string) => {
    const rows = parseCsvText(text);
    if (rows.length < 2) {
      alert('CSV file must have at least a header row and one data row.');
      return;
    }

    const fileHeaders = rows[0];
    setHeaders(fileHeaders);
    setParsedRows(rows.slice(1));

    // Guess column mapping automatically
    let dIdx = 0, aIdx = 1, tIdx = -1, cIdx = -1, nIdx = -1, pIdx = -1, tgIdx = -1;
    fileHeaders.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (lower.includes('date') || lower.includes('time')) dIdx = idx;
      else if (lower.includes('amount') || lower.includes('cost') || lower.includes('price')) aIdx = idx;
      else if (lower.includes('type')) tIdx = idx;
      else if (lower.includes('category') || lower.includes('group')) cIdx = idx;
      else if (lower.includes('note') || lower.includes('desc') || lower.includes('memo') || lower.includes('payee')) nIdx = idx;
      else if (lower.includes('payment') || lower.includes('method') || lower.includes('account')) pIdx = idx;
      else if (lower.includes('tag')) tgIdx = idx;
    });

    setDateCol(dIdx);
    setAmountCol(aIdx);
    setTypeCol(tIdx);
    setCategoryCol(cIdx);
    setNoteCol(nIdx);
    setPaymentCol(pIdx);
    setTagsCol(tgIdx);

    setWizardStep(2);
  };

  // Generate preview from mapping
  const generatePreview = () => {
    const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
    const defaultExpenseCat = categories.find(c => c.type === 'expense' || c.type === 'both')?.id || 'cat-other-expense';

    const previews: Array<ParsedCsvRow & { selected: boolean }> = parsedRows.map((row, idx) => {
      const rawDate = row[dateCol] || '';
      const rawAmount = row[amountCol] || '';
      const rawType = typeCol >= 0 ? row[typeCol] : '';
      const rawCat = categoryCol >= 0 ? row[categoryCol] : '';
      const rawNote = noteCol >= 0 ? row[noteCol] : '';
      const rawPayment = paymentCol >= 0 ? row[paymentCol] : 'Other';
      const rawTags = tagsCol >= 0 ? row[tagsCol] : '';

      const isoDate = parseDateToIso(rawDate);
      const parsedAmt = parseAmountToCents(rawAmount);

      let error: string | undefined;
      if (!isoDate) error = 'Invalid date format';
      else if (!parsedAmt || parsedAmt.cents <= 0) error = 'Invalid or zero amount';

      // Determine type: explicit column or inferred from amount
      let finalType: TransactionType = 'expense';
      if (rawType) {
        finalType = rawType.toLowerCase().includes('inc') ? 'income' : 'expense';
      } else if (parsedAmt?.inferredType) {
        finalType = parsedAmt.inferredType;
      }

      // Match category
      let finalCatId = defaultExpenseCat;
      if (rawCat && catMap.has(rawCat.toLowerCase())) {
        finalCatId = catMap.get(rawCat.toLowerCase())!;
      }

      // Duplicate check against existing transactions
      let isDuplicate = false;
      if (isoDate && parsedAmt) {
        isDuplicate = transactions.some(
          t => t.date.split('T')[0] === isoDate && t.amount === parsedAmt.cents && t.type === finalType
        );
      }

      const tags = rawTags ? rawTags.split(';').map(t => t.trim()).filter(Boolean) : undefined;

      const parsedTx: Partial<Transaction> | undefined = error ? undefined : {
        id: crypto.randomUUID(),
        type: finalType,
        amount: parsedAmt!.cents,
        currency: preferences.currency,
        categoryId: finalCatId,
        date: isoDate!,
        paymentMethod: rawPayment || 'Other',
        note: rawNote || undefined,
        tags,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return {
        rowIndex: idx + 1,
        raw: row,
        parsed: parsedTx,
        error,
        isDuplicate,
        selected: !error && !isDuplicate
      };
    });

    setPreviewRows(previews);
    setWizardStep(3);
  };

  // Perform Final Import
  const handleConfirmImport = async () => {
    const toImport: Transaction[] = [];
    let skipped = 0;

    previewRows.forEach(row => {
      if (row.selected && row.parsed && !row.error) {
        toImport.push(row.parsed as Transaction);
      } else {
        skipped++;
      }
    });

    if (toImport.length > 0) {
      await bulkAddTransactions(toImport);
    }

    setImportSummary({ imported: toImport.length, skipped });
    setWizardStep(4);
  };

  // JSON Restore handler
  const handleJsonRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (json.encrypted) {
        setPendingRestoreFile(file);
        setPassphraseMode('decrypt');
        setPassphraseModalOpen(true);
      } else {
        if (window.confirm('Restore this backup? This will replace your local financial data with the backup contents.')) {
          await restoreFromJsonFile(file);
          alert('Backup restored successfully!');
        }
      }
    } catch (err: any) {
      alert(`Invalid backup file: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-surface border border-surface-border glass-panel">
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
          <span>Data Portability, CSV Import & Backups</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Your data is never trapped. Import from any banking spreadsheet, or export complete encrypted backups.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSV Import Wizard */}
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Import Bank / Card CSV</span>
              </h3>
              <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 bg-surface-elevated rounded-full">
                Step {wizardStep} of 4
              </span>
            </div>

            {/* Step 1: Upload or Paste */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-surface-border hover:border-emerald-500/50 rounded-2xl p-8 text-center cursor-pointer transition-colors"
                >
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-400 opacity-60 mb-2" />
                  <p className="text-xs font-semibold text-slate-200">Click to choose a CSV file</p>
                  <p className="text-[11px] text-slate-500 mt-1">Exported from Chase, Wells Fargo, Revolut, etc.</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Or paste raw CSV text below:
                  </label>
                  <textarea
                    rows={4}
                    value={rawCsvText}
                    onChange={e => setRawCsvText(e.target.value)}
                    placeholder="Date,Amount,Description,Category&#10;2026-10-01,24.50,Whole Foods,Groceries"
                    className="w-full bg-surface-elevated/70 border border-surface-border rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      variant="primary"
                      disabled={!rawCsvText.trim()}
                      onClick={() => processCsvText(rawCsvText)}
                    >
                      Parse CSV <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Column Mapping */}
            {wizardStep === 2 && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-400">Map your CSV columns to SpendWise transaction fields:</p>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Date (Required)</label>
                    <select
                      value={dateCol}
                      onChange={e => setDateCol(Number(e.target.value))}
                      className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2 text-slate-200"
                    >
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h} (Col {i + 1})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Amount (Required)</label>
                    <select
                      value={amountCol}
                      onChange={e => setAmountCol(Number(e.target.value))}
                      className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2 text-slate-200"
                    >
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h} (Col {i + 1})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Type (Income/Expense)</label>
                    <select
                      value={typeCol}
                      onChange={e => setTypeCol(Number(e.target.value))}
                      className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2 text-slate-200"
                    >
                      <option value={-1}>-- Infer from positive/negative amount --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">Category</label>
                    <select
                      value={categoryCol}
                      onChange={e => setCategoryCol(Number(e.target.value))}
                      className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2 text-slate-200"
                    >
                      <option value={-1}>-- Default Other --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-slate-300 mb-1 font-medium">Description / Payee</label>
                    <select
                      value={noteCol}
                      onChange={e => setNoteCol(Number(e.target.value))}
                      className="w-full bg-surface-elevated border border-surface-border rounded-xl p-2 text-slate-200"
                    >
                      <option value={-1}>-- None --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-surface-border">
                  <Button size="sm" variant="ghost" onClick={() => setWizardStep(1)}>
                    Back
                  </Button>
                  <Button size="sm" variant="primary" onClick={generatePreview}>
                    Next: Validate Rows <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Row Preview & Selection */}
            {wizardStep === 3 && (
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Found {previewRows.length} rows to evaluate:</span>
                  <span>{previewRows.filter(r => r.selected).length} selected for import</span>
                </div>

                <div className="max-h-56 overflow-y-auto border border-surface-border rounded-xl divide-y divide-surface-border">
                  {previewRows.map((row, i) => (
                    <div
                      key={i}
                      className={`p-2 flex items-center justify-between gap-2 ${
                        row.error
                          ? 'bg-rose-500/10 text-rose-300'
                          : row.isDuplicate
                          ? 'bg-amber-500/10 text-amber-300'
                          : 'hover:bg-white/5 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          disabled={!!row.error}
                          onChange={e => {
                            const updated = [...previewRows];
                            updated[i].selected = e.target.checked;
                            setPreviewRows(updated);
                          }}
                          className="rounded bg-surface-elevated border-surface-border text-emerald-500"
                        />
                        <div className="truncate">
                          <span className="font-semibold mr-2">{row.parsed?.date || 'Invalid Date'}</span>
                          <span>{row.parsed?.note || row.raw[noteCol] || 'Row ' + row.rowIndex}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {row.error ? (
                          <span className="text-[10px] text-rose-400">{row.error}</span>
                        ) : (
                          <span className="font-bold">
                            {formatCurrency(row.parsed?.amount || 0, preferences.currency, preferences.locale)}
                          </span>
                        )}
                        {row.isDuplicate && (
                          <span className="block text-[9px] text-amber-400 font-semibold">Possible Duplicate</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-surface-border">
                  <Button size="sm" variant="ghost" onClick={() => setWizardStep(2)}>
                    Back to Mapping
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={previewRows.filter(r => r.selected).length === 0}
                    onClick={handleConfirmImport}
                  >
                    Import {previewRows.filter(r => r.selected).length} Entries
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {wizardStep === 4 && (
              <div className="py-8 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-400" />
                <h4 className="text-sm font-bold text-slate-100">Import Completed Successfully</h4>
                <p className="text-xs text-slate-400">
                  {importSummary.imported} transactions added to your private local ledger.
                  {importSummary.skipped > 0 && ` (${importSummary.skipped} rows skipped)`}
                </p>
                <div className="pt-2">
                  <Button size="sm" variant="secondary" onClick={() => { setWizardStep(1); setRawCsvText(''); }}>
                    Import Another File
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export & Full JSON Backup */}
        <div className="p-6 rounded-2xl bg-surface border border-surface-border glass-panel flex flex-col justify-between space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export & Backup Archives</span>
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Export data in universal formats or backup everything with end-to-end client-side encryption.
            </p>

            {/* CSV Export Button */}
            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Standard CSV Ledger</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const csvData = exportTransactionsToCsv(transactions, categories);
                    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `spendwise_export_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                  }}
                  icon={<Download className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Export CSV ({transactions.length})
                </Button>
              </div>
              <p className="text-[11px] text-slate-400">
                Formula-injection sanitized RFC 4180 format compatible with Excel, Google Sheets, and Numbers.
              </p>
            </div>

            {/* Full JSON Backup Button */}
            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Complete JSON Snapshot</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadLocalJsonBackup()}
                    className="text-xs"
                  >
                    Plain JSON
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setPassphraseMode('encrypt');
                      setPassphraseModalOpen(true);
                    }}
                    icon={<Lock className="w-3.5 h-3.5" />}
                    className="text-xs"
                  >
                    Encrypted JSON
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Backs up transactions, categories, budgets, recurring rules, and preferences in one atomic file.
              </p>
            </div>

            {/* Restore from JSON file */}
            <div className="p-4 rounded-xl bg-surface-elevated/70 border border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">Restore from File</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => jsonRestoreRef.current?.click()}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Select File
                </Button>
                <input
                  ref={jsonRestoreRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleJsonRestoreFile}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Supports both standard and AES-GCM encrypted SpendWise snapshot files.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Passphrase Modal */}
      <PassphraseModal
        isOpen={passphraseModalOpen}
        onClose={() => {
          setPassphraseModalOpen(false);
          setPendingRestoreFile(null);
        }}
        mode={passphraseMode}
        onSubmit={async passphrase => {
          if (passphraseMode === 'encrypt') {
            await downloadLocalJsonBackup(passphrase);
          } else if (passphraseMode === 'decrypt' && pendingRestoreFile) {
            await restoreFromJsonFile(pendingRestoreFile, passphrase);
            alert('Encrypted backup successfully verified and restored!');
          }
        }}
      />
    </div>
  );
};
