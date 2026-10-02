import React, { useState } from 'react';
import {
  FileCheck,
  CheckCircle2,
  Printer,
  Building,
  Search
} from 'lucide-react';
import { ClaimRecord, ItemRecord } from '../types';

interface ClaimsCenterViewProps {
  claims: ClaimRecord[];
  items: ItemRecord[];
  onViewSlip: (claim: ClaimRecord) => void;
  onOpenItem: (item: ItemRecord) => void;
  onOpenReportModal: () => void;
}

export const ClaimsCenterView: React.FC<ClaimsCenterViewProps> = ({
  claims,
  items,
  onViewSlip,
  onOpenItem,
  onOpenReportModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClaims = claims.filter(
    (c) =>
      c.claimantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.foundItemTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.claimantIdNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-12 text-xs">
      {/* Top Banner */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">
            Ownership Claims & Release Vouchers
          </h1>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Track verification progress and print your recovery voucher for physical custody pickup.
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 text-[11px]">
          <Building className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Custody Pickup: Campus Security Office, Gate 1 (8AM - 5PM)</span>
        </div>
      </div>

      {/* Claims List */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by your name or ID #..."
            className="w-64 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs"
          />
          <span className="font-mono text-slate-400">{filteredClaims.length} records</span>
        </div>

        {filteredClaims.length === 0 ? (
          <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
            No active claims. Select any surrendered item in the catalog to file an ownership claim.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {filteredClaims.map((claim) => {
              const relatedFoundItem = items.find((i) => i.id === claim.foundItemId);
              const isApproved = claim.status === 'Approved' || claim.status === 'Returned';

              return (
                <div
                  key={claim.id}
                  className="p-3 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-400 text-[10px]">{claim.id}</span>
                      <span
                        className={`font-semibold px-1.5 py-0.2 rounded text-[10px] border ${
                          claim.status === 'Approved'
                            ? 'bg-teal-50 text-teal-800 border-teal-200'
                            : claim.status === 'Under Verification'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : claim.status === 'Returned'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {claim.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm">
                      {claim.foundItemTitle}
                    </h3>

                    <div className="text-slate-500 text-[11px] flex items-center gap-2">
                      <span>{claim.claimantName}</span>
                      <span>·</span>
                      <span>ID: {claim.claimantIdNumber}</span>
                      <span>·</span>
                      <span className="font-mono">{new Date(claim.createdAt).toLocaleDateString()}</span>
                    </div>

                    {claim.verificationNotes && (
                      <div className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-200">
                        <strong>Custodian Note:</strong> {claim.verificationNotes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {relatedFoundItem && (
                      <button
                        onClick={() => onOpenItem(relatedFoundItem)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium"
                      >
                        View Item
                      </button>
                    )}

                    <button
                      onClick={() => onViewSlip(claim)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isApproved ? 'Recovery Voucher' : 'Claim Slip'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
