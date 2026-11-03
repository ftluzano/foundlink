import React, { useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { ItemRecord, RecoveryReportRecord } from '../types';

interface RecoveryVerificationModalProps {
  item: ItemRecord;
  reports: RecoveryReportRecord[];
  onClose: () => void;
  onConfirm: (finderUid?: string) => Promise<void>;
}

export const RecoveryVerificationModal: React.FC<RecoveryVerificationModalProps> = ({
  item,
  reports,
  onClose,
  onConfirm
}) => {
  const [selectedFinderUid, setSelectedFinderUid] = useState(reports[0]?.finderUid || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setSaving(true);
    setError('');
    try {
      await onConfirm(selectedFinderUid || undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not confirm recovery.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-2 sm:p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="recovery-confirm-title" className="my-2 max-h-[calc(100dvh-1rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl sm:my-6">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Owner confirmation</p>
            <h2 id="recovery-confirm-title" className="mt-1 text-base font-bold text-slate-900">Confirm recovery</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-700">{item.title}</p>
          {reports.length ? (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-xs font-semibold text-slate-700">Who returned or located your item?</legend>
              {reports.map((report) => (
                <label key={report.finderUid} className={`block cursor-pointer rounded-lg border p-3 ${selectedFinderUid === report.finderUid ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <span className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="verified-finder"
                      value={report.finderUid}
                      checked={selectedFinderUid === report.finderUid}
                      onChange={() => setSelectedFinderUid(report.finderUid)}
                      className="mt-0.5 accent-emerald-700"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-slate-900">{report.finderName}</span>
                      <span className="mt-1 block text-xs text-slate-600">{report.handoffDetails}</span>
                      <span className="mt-1 block text-[10px] text-slate-400">{new Date(report.createdAt).toLocaleString()}</span>
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">No finder reports were submitted. You can still close your lost-item report.</p>
          )}

          {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
          <footer className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-md px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="button" onClick={() => void confirm()} disabled={saving || (reports.length > 0 && !selectedFinderUid)} className="flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {saving ? 'Saving...' : 'Confirm recovery'}
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
};