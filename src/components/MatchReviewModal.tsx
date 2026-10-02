import React from 'react';
import {
  X,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { PotentialMatchRecord, ItemRecord } from '../types';

interface MatchReviewModalProps {
  match: PotentialMatchRecord;
  lostItem?: ItemRecord;
  foundItem?: ItemRecord;
  onClose: () => void;
  onInitiateClaim: (foundItem: ItemRecord, lostItem?: ItemRecord) => void;
  onDismissMatch: (matchId: string) => void;
}

export const MatchReviewModal: React.FC<MatchReviewModalProps> = ({
  match,
  lostItem,
  foundItem,
  onClose,
  onInitiateClaim,
  onDismissMatch
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Attribute Match Analysis Station
              </h2>
              <p className="text-xs text-slate-300">
                Automated attribute correlation based on capstone recovery algorithm
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Match Score Banner */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Overall Correlation Confidence
              </div>
              <div className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums flex items-baseline gap-2">
                <span>{match.score}%</span>
                <span className="text-xs font-normal text-slate-500">
                  {match.score >= 75
                    ? 'High Probability Match'
                    : match.score >= 50
                    ? 'Moderate Probability Match'
                    : 'Partial Attribute Correlation'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Note: A potential match does not establish legal ownership. Physical verification remains mandatory.
              </p>
            </div>

            {/* Visual Ring/Bar */}
            <div className="w-full sm:w-48 bg-slate-200 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  match.score >= 75
                    ? 'bg-emerald-500'
                    : match.score >= 50
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${match.score}%` }}
              />
            </div>
          </div>

          {/* Side by Side Item Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Lost Item Card */}
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Lost Item Report
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {lostItem?.id || match.lostItemId}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">
                {lostItem?.title || match.lostItemTitle}
              </h3>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div>
                  <strong>Category:</strong> {lostItem?.category || 'N/A'}
                </div>
                <div>
                  <strong>Brand:</strong> {lostItem?.brand || 'Unbranded'}
                </div>
                <div>
                  <strong>Color:</strong> {lostItem?.color || 'N/A'}
                </div>
                <div>
                  <strong>Location Lost:</strong> {lostItem?.location || 'N/A'}
                </div>
                <div>
                  <strong>Date:</strong>{' '}
                  {lostItem?.dateTime
                    ? new Date(lostItem.dateTime).toLocaleDateString()
                    : 'N/A'}
                </div>
                <div className="pt-2 border-t border-rose-100 text-[11px] text-slate-700 italic">
                  "{lostItem?.description}"
                </div>
              </div>
            </div>

            {/* Found Item Card */}
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  Found in Custody
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {foundItem?.id || match.foundItemId}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">
                {foundItem?.title || match.foundItemTitle}
              </h3>

              <div className="space-y-1.5 text-xs text-slate-600">
                <div>
                  <strong>Category:</strong> {foundItem?.category || 'N/A'}
                </div>
                <div>
                  <strong>Brand:</strong> {foundItem?.brand || 'Unbranded'}
                </div>
                <div>
                  <strong>Color:</strong> {foundItem?.color || 'N/A'}
                </div>
                <div>
                  <strong>Location Found:</strong> {foundItem?.location || 'N/A'}
                </div>
                <div>
                  <strong>Date:</strong>{' '}
                  {foundItem?.dateTime
                    ? new Date(foundItem.dateTime).toLocaleDateString()
                    : 'N/A'}
                </div>
                <div className="pt-2 border-t border-emerald-100 text-[11px] text-slate-700 italic">
                  "{foundItem?.description}"
                </div>
              </div>
            </div>
          </div>

          {/* Factors Breakdown Table */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Attribute Factor Scoring Breakdown
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
              {(match.factors || []).map((f, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {f.match ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <div>
                      <span className="font-semibold text-slate-900 block">
                        {f.factor}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {f.detail}
                      </span>
                    </div>
                  </div>

                  <span className="font-mono text-slate-600 text-xs tabular-nums shrink-0">
                    Max: {f.scoreWeight}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance & Ownership Notice */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Recovery Protocol:</strong> Confirming this match will initiate the
              formal Ownership Claim stage. You will be prompted to provide private
              ownership proof (serial numbers, concealed items, or receipts) to be evaluated
              by the Campus Custodian before physical handover.
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => onDismissMatch(match.id)}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            Dismiss as Unrelated
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg transition-colors"
            >
              Close
            </button>

            {foundItem && (
              <button
                onClick={() => {
                  onClose();
                  onInitiateClaim(foundItem, lostItem);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                <span>Initiate Ownership Claim</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
