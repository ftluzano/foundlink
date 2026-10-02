import React, { useState, useMemo } from 'react';
import {
  Shield,
  FileCheck,
  Package,
  BarChart3,
  History,
  CheckCircle2,
  Trash2,
  Lock,
  Building,
  Sparkles,
  MapPin,
  TrendingUp,
  Database
} from 'lucide-react';
import {
  ItemRecord,
  ClaimRecord,
  PotentialMatchRecord,
  AuditLogRecord
} from '../types';
import { CUSTODY_LOCATIONS } from '../services/campusLocations';

interface AdminDashboardProps {
  items: ItemRecord[];
  claims: ClaimRecord[];
  matches: PotentialMatchRecord[];
  auditLogs: AuditLogRecord[];
  onUpdateClaim: (
    claimId: string,
    updates: Partial<ClaimRecord>,
    staffName: string
  ) => void;
  onUpdateItemStatus: (id: string, status: ItemRecord['status']) => void;
  onUpdateCustody: (id: string, custody: string) => void;
  onDeleteItem: (id: string) => void;
  onOpenItemModal: (item: ItemRecord) => void;
  onSeedDemoData: () => void;
  onClearAllData: () => void;
  onOpenFirebaseModal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  items,
  claims,
  matches,
  auditLogs,
  onUpdateClaim,
  onUpdateItemStatus,
  onUpdateCustody,
  onDeleteItem,
  onOpenItemModal,
  onSeedDemoData,
  onClearAllData,
  onOpenFirebaseModal
}) => {
  const [activeTab, setActiveTab] = useState<'claims' | 'inventory' | 'analytics' | 'audit'>('claims');
  const [claimFilter, setClaimFilter] = useState<'all' | 'Under Verification' | 'Approved' | 'Returned' | 'Rejected'>('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [selectedClaimForReview, setSelectedClaimForReview] = useState<ClaimRecord | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [pickupSlot, setPickupSlot] = useState('Campus Security Custody Office, Gate 1');

  // Metrics
  const totalItems = items.length;
  const lostCount = items.filter((i) => i.type === 'lost' && i.status !== 'Returned').length;
  const foundCount = items.filter((i) => i.type === 'found' && i.status !== 'Returned').length;
  const returnedCount = items.filter((i) => i.status === 'Returned').length;
  const pendingClaimsCount = claims.filter((c) => c.status === 'Under Verification').length;
  const recoveryRate = totalItems > 0 ? Math.round((returnedCount / totalItems) * 100) : 0;

  // Analytics
  const locationStats = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => {
      const cleanLoc = i.location.split('(')[0].trim();
      counts[cleanLoc] = (counts[cleanLoc] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [items]);

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((i) => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filteredClaims = useMemo(() => {
    if (claimFilter === 'all') return claims;
    return claims.filter((c) => c.status === claimFilter);
  }, [claims, claimFilter]);

  const filteredInventory = useMemo(() => {
    if (!inventorySearch.trim()) return items;
    const q = inventorySearch.toLowerCase();
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q) ||
        i.location.toLowerCase().includes(q)
    );
  }, [items, inventorySearch]);

  const handleApproveClaim = (claim: ClaimRecord) => {
    onUpdateClaim(
      claim.id,
      {
        status: 'Approved',
        verificationNotes: reviewNotes.trim() || 'Verified by Custodian Officer against internal item characteristics.',
        reviewedBy: 'Officer Dela Cruz',
        reviewedAt: new Date().toISOString(),
        pickupAppointment: pickupSlot
      },
      'Officer Dela Cruz'
    );
    setSelectedClaimForReview(null);
    setReviewNotes('');
  };

  const handleConfirmHandover = (claim: ClaimRecord) => {
    onUpdateClaim(
      claim.id,
      {
        status: 'Returned',
        handoverDate: new Date().toISOString(),
        handoverReceiptId: `RCPT-${Date.now().toString(36).toUpperCase()}`,
        handoverStaffName: 'Officer Dela Cruz'
      },
      'Officer Dela Cruz'
    );
    setSelectedClaimForReview(null);
  };

  const handleRejectClaim = (claim: ClaimRecord) => {
    const reason = prompt('Reason for rejection:', 'Proof of ownership did not match.');
    if (reason !== null) {
      onUpdateClaim(
        claim.id,
        {
          status: 'Rejected',
          verificationNotes: reason,
          reviewedBy: 'Officer Dela Cruz',
          reviewedAt: new Date().toISOString()
        },
        'Officer Dela Cruz'
      );
      setSelectedClaimForReview(null);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Console Top Toolbar */}
      <div className="bg-slate-900 text-white rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <Shield className="w-3.5 h-3.5" />
            <span>CUSTODIAN CONSOLE</span>
          </div>
          <h1 className="text-lg font-bold tracking-tight text-white mt-0.5">
            Lost-and-Found Case Administration
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSeedDemoData}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Populate test records"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Seed Sample</span>
          </button>

          <button
            onClick={() => {
              if (confirm('Clear all items and claims?')) onClearAllData();
            }}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-rose-950 text-rose-300 border border-slate-700 rounded-md text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs">
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[11px]">Total Items</span>
          <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
            {totalItems}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[11px]">Active Lost</span>
          <span className="text-xl font-bold font-mono text-rose-600 tabular-nums">
            {lostCount}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[11px]">In Custody</span>
          <span className="text-xl font-bold font-mono text-emerald-600 tabular-nums">
            {foundCount}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[11px]">Pending Claims</span>
          <span className="text-xl font-bold font-mono text-purple-600 tabular-nums">
            {pendingClaimsCount}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[11px]">Returned</span>
          <span className="text-xl font-bold font-mono text-blue-600 tabular-nums">
            {returnedCount}
          </span>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-slate-500 block text-[11px]">Recovery Rate</span>
          <span className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
            {recoveryRate}%
          </span>
        </div>
      </div>

      {/* Main Console Container */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab selection */}
        <div className="flex border-b border-slate-200 px-4 gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('claims')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'claims'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Claims Queue</span>
            {pendingClaimsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                {pendingClaimsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Custody Inventory</span>
            <span className="text-slate-400 font-mono">({items.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail</span>
            <span className="text-slate-400 font-mono">({auditLogs.length})</span>
          </button>
        </div>

        {/* Tab 1: Claims Queue */}
        {activeTab === 'claims' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-xs">
                {(['all', 'Under Verification', 'Approved', 'Returned', 'Rejected'] as const).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setClaimFilter(status)}
                      className={`px-2.5 py-1 rounded font-medium transition-colors ${
                        claimFilter === status
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {status === 'all' ? 'All' : status}
                    </button>
                  )
                )}
              </div>

              <span className="text-xs text-slate-500 font-mono">
                {filteredClaims.length} records
              </span>
            </div>

            {filteredClaims.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                No claims under this status.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                {filteredClaims.map((claim) => {
                  const targetItem = items.find((i) => i.id === claim.foundItemId);

                  return (
                    <div
                      key={claim.id}
                      className="p-3.5 hover:bg-slate-50 transition-colors space-y-2"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-slate-400 text-[10px]">
                              {claim.id}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
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

                          <h3 className="font-bold text-slate-900">
                            {claim.foundItemTitle}
                          </h3>

                          <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                            <span>Claimant: <strong>{claim.claimantName}</strong> ({claim.claimantIdNumber})</span>
                            <span>·</span>
                            <span>Phone: {claim.claimantPhone}</span>
                            <span>·</span>
                            <span className="font-mono">{new Date(claim.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedClaimForReview(claim)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold self-start sm:self-auto"
                        >
                          Verify Claim
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                        <div className="bg-amber-50 p-2 rounded border border-amber-200">
                          <span className="font-bold text-amber-900 block">
                            Claimant Verification Key:
                          </span>
                          <span className="text-slate-800">
                            "{claim.secretVerificationAnswer}"
                          </span>
                        </div>

                        <div className="bg-slate-50 p-2 rounded border border-slate-200">
                          <span className="font-bold text-slate-600 block">
                            Internal Recorded Secret:
                          </span>
                          <span className="text-slate-800">
                            "{targetItem?.secretDetails || 'No private records'}"
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Verification Modal */}
            {selectedClaimForReview && (
              <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden text-xs">
                  <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                    <span className="font-bold">Claim Verification Review</span>
                    <button
                      onClick={() => setSelectedClaimForReview(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
                    <div>
                      <span className="font-semibold text-slate-700 block">Claimant:</span>
                      <p className="text-slate-900">
                        {selectedClaimForReview.claimantName} ({selectedClaimForReview.claimantIdNumber})
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {selectedClaimForReview.claimantPhone} · {selectedClaimForReview.claimantEmail}
                      </p>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-700 block">Proof Statement:</span>
                      <p className="p-2 bg-slate-50 border border-slate-200 rounded text-slate-800">
                        {selectedClaimForReview.proofDescription}
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50 border border-purple-200 rounded space-y-1">
                      <span className="font-bold text-purple-900 block">Secret Detail Comparison:</span>
                      <div className="text-[11px]">
                        <strong>Claimant Answer:</strong> "{selectedClaimForReview.secretVerificationAnswer}"
                      </div>
                      <div className="text-[11px]">
                        <strong>Internal Record:</strong> "{items.find((i) => i.id === selectedClaimForReview.foundItemId)?.secretDetails || 'N/A'}"
                      </div>
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Pickup Location / Hours:
                      </label>
                      <input
                        type="text"
                        value={pickupSlot}
                        onChange={(e) => setPickupSlot(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded"
                      />
                    </div>

                    <div>
                      <label className="font-medium text-slate-700 block mb-1">
                        Officer Notes:
                      </label>
                      <textarea
                        rows={2}
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Evaluation outcome..."
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between gap-2">
                    <button
                      onClick={() => handleRejectClaim(selectedClaimForReview)}
                      className="px-3 py-1.5 text-rose-700 font-medium hover:bg-rose-50 rounded"
                    >
                      Reject
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedClaimForReview(null)}
                        className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded"
                      >
                        Cancel
                      </button>

                      {selectedClaimForReview.status !== 'Approved' && selectedClaimForReview.status !== 'Returned' && (
                        <button
                          onClick={() => handleApproveClaim(selectedClaimForReview)}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold"
                        >
                          Approve for Release
                        </button>
                      )}

                      {selectedClaimForReview.status === 'Approved' && (
                        <button
                          onClick={() => handleConfirmHandover(selectedClaimForReview)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
                        >
                          Confirm Handover & Close
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Custody Inventory */}
        {activeTab === 'inventory' && (
          <div className="p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search inventory..."
                className="w-64 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
              />
              <span className="font-mono text-slate-500">{filteredInventory.length} items</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Custody Storage</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900">{item.title}</div>
                        <div className="text-[10px] font-mono text-slate-400">{item.id}</div>
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.type === 'lost' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.type.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        <select
                          value={item.status}
                          onChange={(e) => onUpdateItemStatus(item.id, e.target.value as ItemRecord['status'])}
                          className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs"
                        >
                          <option value="Lost">Lost</option>
                          <option value="Found">Found</option>
                          <option value="Potential Match">Potential Match</option>
                          <option value="Under Verification">Under Verification</option>
                          <option value="Approved">Approved</option>
                          <option value="Returned">Returned</option>
                          <option value="Closed">Closed</option>
                        </select>
                      </td>

                      <td className="px-3 py-2">
                        {item.type === 'found' ? (
                          <select
                            value={item.custodyLocation || CUSTODY_LOCATIONS[0]}
                            onChange={(e) => onUpdateCustody(item.id, e.target.value)}
                            className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs max-w-[160px] truncate"
                          >
                            {CUSTODY_LOCATIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-slate-600 max-w-[140px] truncate">
                        {item.location}
                      </td>

                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenItemModal(item)}
                          className="text-slate-700 hover:text-slate-900 font-medium mr-2"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete case ${item.id}?`)) onDeleteItem(item.id);
                          }}
                          className="text-rose-600 hover:text-rose-800"
                        >
                          <Trash2 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Analytics */}
        {activeTab === 'analytics' && (
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Frequent Campus Areas</span>
                </span>
                <div className="space-y-1.5 pt-1">
                  {locationStats.map(([loc, count], idx) => {
                    const pct = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-slate-700">
                          <span className="truncate max-w-[200px]">{loc}</span>
                          <span className="font-mono text-slate-500">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full" style={{ width: `${Math.max(5, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Categories Incident Frequency</span>
                </span>
                <div className="space-y-1.5 pt-1">
                  {categoryStats.slice(0, 5).map(([cat, count], idx) => {
                    const pct = totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;
                    return (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between text-slate-700">
                          <span className="truncate">{cat}</span>
                          <span className="font-mono text-slate-500">{count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${Math.max(5, pct)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit */}
        {activeTab === 'audit' && (
          <div className="p-4 space-y-2 text-xs">
            <span className="font-bold text-slate-900 block">Activity Log</span>
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {auditLogs.length === 0 ? (
                <div className="p-4 text-center text-slate-400">No logs recorded.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900">{log.action}</span>
                      <span className="text-slate-500 ml-2">by {log.actorName}</span>
                      <div className="text-[11px] text-slate-600">{log.details}</div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
