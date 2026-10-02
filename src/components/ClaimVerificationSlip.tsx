import React from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Building,
  QrCode,
  FileText
} from 'lucide-react';
import { ClaimRecord } from '../types';

interface ClaimVerificationSlipProps {
  claim: ClaimRecord;
  onClose: () => void;
}

export const ClaimVerificationSlip: React.FC<ClaimVerificationSlipProps> = ({
  claim,
  onClose
}) => {
  const handlePrint = () => {
    window.print();
  };

  const isApproved = claim.status === 'Approved' || claim.status === 'Returned';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150 print:m-0 print:border-none print:shadow-none">
        {/* Slip Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                FOUNDLINK RECOVERY SLIP
              </h2>
              <p className="text-xs text-slate-300">
                Official Campus Lost-and-Found Verification Voucher
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Voucher Body */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Claim Verification Status
              </span>
              <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                {isApproved ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Clock className="w-4 h-4 text-purple-600" />
                )}
                {claim.status}
              </span>
            </div>

            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Voucher Reference
              </span>
              <span className="font-mono font-bold text-slate-900">
                {claim.id}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px] block">Claimant Name</span>
                <span className="font-bold text-slate-900 text-sm">{claim.claimantName}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Student / Campus ID</span>
                <span className="font-mono font-bold text-slate-900">{claim.claimantIdNumber}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px] block">Target Item Name</span>
                <span className="font-semibold text-slate-900">{claim.foundItemTitle}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Found Case ID</span>
                <span className="font-mono text-slate-700">{claim.foundItemId}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-slate-400 text-[11px] block">Contact Mobile</span>
                <span className="font-mono text-slate-700">{claim.claimantPhone}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">Date Filed</span>
                <span className="font-mono text-slate-700">
                  {new Date(claim.createdAt).toLocaleDateString('en-PH')}
                </span>
              </div>
            </div>
          </div>

          {/* Custody Instructions */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2 text-emerald-950">
            <div className="font-bold flex items-center gap-1.5 text-emerald-900">
              <Building className="w-4 h-4 text-emerald-700" />
              <span>Custody Release Instructions</span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-900">
              Present this digital slip along with your physical <strong>Pateros Technological College School ID</strong> at the Campus Security & Custody Office (Ground Floor Main Academic Building) between 8:00 AM – 5:00 PM, Monday to Friday.
            </p>
            {claim.verificationNotes && (
              <div className="text-[11px] pt-1 border-t border-emerald-200/60 font-mono text-emerald-800">
                <strong>Officer Notes:</strong> {claim.verificationNotes}
              </div>
            )}
          </div>

          {/* Mock Barcode / Verification Stamp */}
          <div className="p-3 bg-slate-100 rounded-lg text-center font-mono text-[10px] text-slate-500 tracking-widest border border-slate-200">
            * {claim.id} * VERIFIED BY FOUNDLINK ENGINE *
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
