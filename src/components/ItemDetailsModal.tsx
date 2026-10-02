import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Lock,
  HandHelping,
  Sparkles,
  Trash2,
  Building,
  User,
  Phone,
  CheckCircle2
} from 'lucide-react';
import { ItemRecord, PotentialMatchRecord } from '../types';
import { CUSTODY_LOCATIONS } from '../services/campusLocations';

interface ItemDetailsModalProps {
  item: ItemRecord;
  onClose: () => void;
  onClaim: (item: ItemRecord) => void;
  onCompareMatch: (match: PotentialMatchRecord) => void;
  potentialMatches: PotentialMatchRecord[];
  userRole: 'student' | 'admin';
  onUpdateStatus: (id: string, status: ItemRecord['status']) => void;
  onUpdateCustody: (id: string, custody: string) => void;
  onDeleteItem: (id: string) => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({
  item,
  onClose,
  onClaim,
  onCompareMatch,
  potentialMatches,
  userRole,
  onUpdateStatus,
  onUpdateCustody,
  onDeleteItem
}) => {
  const [selectedCustody, setSelectedCustody] = useState(item.custodyLocation || CUSTODY_LOCATIONS[0]);

  const relatedMatches = potentialMatches.filter(
    (m) => m.lostItemId === item.id || m.foundItemId === item.id
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-2xl w-full my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-xs">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                item.type === 'lost' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
              }`}
            >
              {item.type}
            </span>
            <span className="font-mono text-slate-300">{item.id}</span>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Title & Status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">{item.title}</h2>
              <div className="text-slate-500 text-[11px] mt-0.5">
                {item.category} · {item.brand || 'Unbranded'} · {item.color}
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800 font-semibold shrink-0">
              {item.status}
            </span>
          </div>

          {/* Description */}
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed text-slate-800">
            {item.description}
          </div>

          {/* Location & Custody */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-2.5 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Incident Area</span>
              </span>
              <p className="text-slate-900">{item.location}</p>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-600" />
                <span>Holding Custody</span>
              </span>
              <p className="text-slate-900">{item.custodyLocation || 'N/A'}</p>
            </div>
          </div>

          {/* RA 10173 Secret Identification */}
          <div className="p-3 rounded-lg bg-slate-900 text-white space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-emerald-400">
                <Lock className="w-3.5 h-3.5" />
                <span>Protected Verification Record</span>
              </span>
              <span className="text-[10px] text-slate-400">RA 10173 Protected</span>
            </div>

            {userRole === 'admin' ? (
              <div className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-[11px] text-slate-200">
                {item.secretDetails || 'No private records logged'}
              </div>
            ) : (
              <div className="text-slate-400 text-[11px]">
                Hidden to protect against fraudulent claims. Disclosed only during officer interview.
              </div>
            )}
          </div>

          {/* Matches */}
          {relatedMatches.length > 0 && (
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Attribute Matches ({relatedMatches.length})</span>
              </span>
              {relatedMatches.map((m) => (
                <div
                  key={m.id}
                  className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-slate-900">
                      {item.type === 'lost' ? m.foundItemTitle : m.lostItemTitle}
                    </span>
                    <div className="text-[10px] text-slate-600">
                      Match: <strong className="text-amber-800">{m.score}%</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => onCompareMatch(m)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium"
                  >
                    Compare
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Custodian controls */}
          {userRole === 'admin' && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <span className="font-bold text-slate-900 block">Custodian Controls</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-0.5">Status</label>
                  <select
                    value={item.status}
                    onChange={(e) => onUpdateStatus(item.id, e.target.value as ItemRecord['status'])}
                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded"
                  >
                    <option value="Lost">Lost</option>
                    <option value="Found">Found</option>
                    <option value="Potential Match">Potential Match</option>
                    <option value="Under Verification">Under Verification</option>
                    <option value="Approved">Approved</option>
                    <option value="Returned">Returned</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                {item.type === 'found' && (
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Custody Location</label>
                    <select
                      value={selectedCustody}
                      onChange={(e) => {
                        setSelectedCustody(e.target.value);
                        onUpdateCustody(item.id, e.target.value);
                      }}
                      className="w-full px-2 py-1 bg-white border border-slate-200 rounded truncate"
                    >
                      {CUSTODY_LOCATIONS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => {
                    if (confirm(`Delete case ${item.id}?`)) {
                      onDeleteItem(item.id);
                      onClose();
                    }
                  }}
                  className="text-rose-600 hover:text-rose-800 text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="font-mono text-slate-400 text-[10px]">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>

          <div className="flex items-center gap-2">
            {item.type === 'found' && item.status !== 'Returned' && (
              <button
                onClick={() => onClaim(item)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold"
              >
                Claim Item
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
