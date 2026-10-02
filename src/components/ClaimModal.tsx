import React, { useState } from 'react';
import {
  X,
  FileCheck,
  Lock,
  AlertCircle
} from 'lucide-react';
import { ItemRecord, ClaimRecord, UserProfile } from '../types';

interface ClaimModalProps {
  foundItem: ItemRecord;
  lostItem?: ItemRecord;
  userProfile?: UserProfile;
  onClose: () => void;
  onSubmitClaim: (claim: Omit<ClaimRecord, 'id' | 'createdAt' | 'status'>) => Promise<ClaimRecord>;
  onClaimSuccess: (claim: ClaimRecord) => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  foundItem,
  lostItem,
  userProfile,
  onClose,
  onSubmitClaim,
  onClaimSuccess
}) => {
  const [claimantName, setClaimantName] = useState(lostItem?.reportedBy.name || userProfile?.name || '');
  const [claimantIdNumber, setClaimantIdNumber] = useState(lostItem?.reportedBy.idNumber || userProfile?.studentIdNumber || '');
  const [claimantEmail, setClaimantEmail] = useState(lostItem?.reportedBy.email || userProfile?.email || '');
  const [claimantPhone, setClaimantPhone] = useState(lostItem?.reportedBy.phone || userProfile?.contactNumber || '');
  const [proofDescription, setProofDescription] = useState(lostItem ? `Associated with lost report ${lostItem.id}` : '');
  const [secretVerificationAnswer, setSecretVerificationAnswer] = useState(lostItem?.secretDetails || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimantName.trim() || !claimantIdNumber.trim() || !claimantPhone.trim()) {
      setErrorMsg('Please complete all identification fields.');
      return;
    }
    if (!secretVerificationAnswer.trim()) {
      setErrorMsg('Please provide the confidential verification answer.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg('Please affirm rightful ownership under campus regulations.');
      return;
    }

    setIsSubmitting(true);
    try {
      const newClaim = await onSubmitClaim({
        foundItemId: foundItem.id,
        foundItemTitle: foundItem.title,
        lostItemId: lostItem?.id,
        claimantId: `claimant_${Date.now()}`,
        claimantName: claimantName.trim(),
        claimantEmail: claimantEmail.trim(),
        claimantPhone: claimantPhone.trim(),
        claimantIdNumber: claimantIdNumber.trim(),
        proofDescription: proofDescription.trim(),
        secretVerificationAnswer: secretVerificationAnswer.trim(),
        verificationNotes: 'Submitted via FOUNDLINK claims portal.'
      });

      onClaimSuccess(newClaim);
    } catch (err) {
      setErrorMsg('Error submitting claim.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-xs">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Ownership Claim Submission</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Item Target */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Claiming Item
            </span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{foundItem.title}</div>
            <div className="text-slate-500 text-[11px] font-mono mt-0.5">
              Case {foundItem.id} · Custody: {foundItem.custodyLocation || 'Campus Security'}
            </div>
          </div>

          {/* Claimant Details */}
          <div className="space-y-2">
            <span className="font-semibold text-slate-700 block">Claimant Identity</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={claimantName}
                onChange={(e) => setClaimantName(e.target.value)}
                placeholder="Full Name *"
                className="px-2.5 py-1.5 border border-slate-200 rounded-md"
              />
              <input
                type="text"
                required
                value={claimantIdNumber}
                onChange={(e) => setClaimantIdNumber(e.target.value)}
                placeholder="Student / Staff ID *"
                className="px-2.5 py-1.5 border border-slate-200 rounded-md"
              />
              <input
                type="tel"
                required
                value={claimantPhone}
                onChange={(e) => setClaimantPhone(e.target.value)}
                placeholder="Mobile Number *"
                className="px-2.5 py-1.5 border border-slate-200 rounded-md"
              />
              <input
                type="email"
                required
                value={claimantEmail}
                onChange={(e) => setClaimantEmail(e.target.value)}
                placeholder="Campus Email *"
                className="px-2.5 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          {/* Proof & Verification Secret */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Ownership Proof Summary *
              </label>
              <textarea
                required
                rows={2}
                value={proofDescription}
                onChange={(e) => setProofDescription(e.target.value)}
                placeholder="Describe when you misplaced it, why it is yours..."
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 space-y-1">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Confidential Verification Detail (Mandatory) *</span>
              </span>
              <p className="text-[11px] text-amber-800">
                Hidden characteristic only known by owner (serial number, sticker under case, cash denominations, lockscreen picture).
              </p>
              <input
                type="text"
                required
                value={secretVerificationAnswer}
                onChange={(e) => setSecretVerificationAnswer(e.target.value)}
                placeholder="Enter confidential detail..."
                className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-md font-medium"
              />
            </div>
          </div>

          {/* Certification */}
          <label className="flex items-start gap-2 text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              required
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 rounded text-slate-900"
            />
            <span className="text-[11px]">
              I certify under campus policy and RA 10173 that I am the legal owner of this item.
            </span>
          </label>

          {/* Footer */}
          <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md shadow-xs transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
