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
  Database,
  Users,
  UserPlus,
  UserMinus,
  Inbox
} from 'lucide-react';
import {
  ItemRecord,
  ClaimRecord,
  PotentialMatchRecord,
  AuditLogRecord,
  OnlineUserRecord,
  RecoveryReportRecord
} from '../types';
import { CUSTODY_LOCATIONS } from '../services/campusLocations';
import { tursoApi } from '../services/tursoApi';

const PRIMARY_CUSTODIAN_EMAIL = 'ftluzano@paterostechnologicalcollege.edu.ph';

interface AdminDashboardProps {
  items: ItemRecord[];
  claims: ClaimRecord[];
  matches: PotentialMatchRecord[];
  auditLogs: AuditLogRecord[];
  onlineUsers: OnlineUserRecord[];
  recoveryReports: RecoveryReportRecord[];
  canManageCustodians: boolean;
  onSetCustodian: (user: OnlineUserRecord, isCustodian: boolean) => Promise<void>;
  onUpdateClaim: (
    claimId: string,
    updates: Partial<ClaimRecord>,
    staffName: string
  ) => void;
  onUpdateItemStatus: (id: string, status: ItemRecord['status']) => void;
  onUpdateCustody: (id: string, custody: string) => void;
  onDeleteItem: (id: string) => void;
  onOpenItemModal: (item: ItemRecord) => void;
  onClearAllData: () => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  items,
  claims,
  matches,
  auditLogs,
  onlineUsers,
  recoveryReports,
  canManageCustodians,
  onSetCustodian,
  onUpdateClaim,
  onUpdateItemStatus,
  onUpdateCustody,
  onDeleteItem,
  onOpenItemModal,
  onClearAllData
}) => {
  const [activeTab, setActiveTab] = useState<'claims' | 'recovery' | 'inventory' | 'analytics' | 'audit' | 'users'>('claims');
  const [claimFilter, setClaimFilter] = useState<'all' | 'Under Verification' | 'Approved' | 'Returned' | 'Rejected'>('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryType, setInventoryType] = useState<'all' | 'lost' | 'found'>('all');
  const [inventoryStatus, setInventoryStatus] = useState<'all' | ItemRecord['status']>('all');
  const [inventoryDate, setInventoryDate] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditDate, setAuditDate] = useState('');
  const [custodianError, setCustodianError] = useState('');
  const [updatingCustodianId, setUpdatingCustodianId] = useState('');
  const [selectedClaimForReview, setSelectedClaimForReview] = useState<ClaimRecord | null>(null);
  const [privateVerificationDetail, setPrivateVerificationDetail] = useState('');
  const [privateVerificationLoading, setPrivateVerificationLoading] = useState(false);
  const [privateVerificationError, setPrivateVerificationError] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [pickupSlot, setPickupSlot] = useState('Campus Security Custody Office, Gate 1');
  const [clearingData, setClearingData] = useState(false);
  const [clearDataError, setClearDataError] = useState('');

  // Metrics
  const totalItems = items.length;
  const lostCount = items.filter((i) => i.type === 'lost' && i.status !== 'Returned' && i.status !== 'Recovered').length;
  const foundCount = items.filter((i) => i.type === 'found' && i.status !== 'Returned').length;
  const returnedCount = items.filter((i) => i.status === 'Returned' || i.status === 'Recovered').length;
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
    const query = inventorySearch.trim().toLowerCase();
    return items.filter((item) => {
      if (inventoryType !== 'all' && item.type !== inventoryType) return false;
      if (inventoryStatus !== 'all' && item.status !== inventoryStatus) return false;
      if (inventoryDate && item.dateTime.slice(0, 10) !== inventoryDate) return false;
      if (!query) return true;
      const claimantDetails = claims
        .filter((claim) => claim.foundItemId === item.id || claim.lostItemId === item.id)
        .map((claim) => `${claim.claimantName} ${claim.claimantIdNumber} ${claim.claimantEmail}`)
        .join(' ');
      return [item.title, item.id, item.category, item.location, item.status, item.type, item.reportedBy.name, claimantDetails]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [items, claims, inventorySearch, inventoryType, inventoryStatus, inventoryDate]);

  const filteredAuditLogs = useMemo(() => {
    const query = auditSearch.trim().toLowerCase();
    return auditLogs.filter((log) => {
      if (auditDate && log.timestamp.slice(0, 10) !== auditDate) return false;
      if (!query) return true;
      return `${log.action} ${log.actorName} ${log.actorRole} ${log.details} ${log.entityId || ''}`
        .toLowerCase()
        .includes(query);
    });
  }, [auditLogs, auditSearch, auditDate]);

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

  const handleSetCustodian = async (user: OnlineUserRecord) => {
    setCustodianError('');
    setUpdatingCustodianId(user.uid);
    try {
      await onSetCustodian(user, !user.isCustodian);
    } catch (error) {
      setCustodianError(error instanceof Error ? error.message : 'Could not update Custodian access.');
    } finally {
      setUpdatingCustodianId('');
    }
  };

  const handleOpenClaimReview = async (claim: ClaimRecord) => {
    setSelectedClaimForReview(claim);
    setPrivateVerificationDetail('');
    setPrivateVerificationError('');
    setPrivateVerificationLoading(true);
    try {
      const privateRecord = await tursoApi.getPrivateItemVerification(claim.foundItemId);
      setPrivateVerificationDetail(privateRecord.secretDetails);
    } catch (error) {
      setPrivateVerificationError(error instanceof Error ? error.message : 'Could not load private verification details.');
    } finally {
      setPrivateVerificationLoading(false);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm('Delete all items, claims, messages, notifications, Up! votes, and reputation? Append-only audit history, user profiles, and custodian access will be kept. This cannot be undone.')) return;
    setClearDataError('');
    setClearingData(true);
    try {
      await onClearAllData();
    } catch (error) {
      setClearDataError(error instanceof Error ? error.message : 'Could not clear site records.');
    } finally {
      setClearingData(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Console Top Toolbar */}
      <header className="flex flex-col justify-between gap-3 border-b border-emerald-950/10 pb-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-emerald-800">
            <Shield className="h-3.5 w-3.5" />
            <span>Custodian workspace</span>
          </div>
          <h1 className="mt-1 text-xl font-extrabold text-[#173b2b] sm:text-2xl">
            Case management
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              void handleClearAllData();
            }}
            disabled={clearingData}
            className="flex cursor-pointer items-center gap-1 rounded-md border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{clearingData ? 'Clearing...' : 'Clear All Records'}</span>
          </button>
        </div>
        {clearDataError && <p role="alert" className="text-xs font-medium text-rose-700">{clearDataError}</p>}
      </header>

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
          <span className="text-slate-500 block text-[11px]">Recovered / Returned</span>
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
      <div className="overflow-hidden border-y border-slate-200 bg-white/85">
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
            <span>Claims</span>
            {pendingClaimsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                {pendingClaimsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('recovery')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeTab === 'recovery' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <Inbox className="w-4 h-4" />
            <span>Recovery Inbox</span>
            <span className="text-slate-400 font-mono">({recoveryReports.length})</span>
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
            <span>Inventory</span>
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
            <span>Audit</span>
            <span className="text-slate-400 font-mono">({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Online Users</span>
            <span className="text-slate-400 font-mono">({onlineUsers.length})</span>
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
                          onClick={() => void handleOpenClaimReview(claim)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold self-start sm:self-auto"
                        >
                          Verify Claim
                        </button>
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
                        <strong>Internal Record:</strong>{' '}
                        {privateVerificationLoading ? 'Loading securely...' : privateVerificationError || privateVerificationDetail || 'No private details recorded.'}
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

        {activeTab === 'recovery' && (
          <div className="space-y-3 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-slate-900">Finder reports</h2>
                <p className="mt-0.5 text-[11px] text-slate-500">Review reports and help post owners confirm recoveries.</p>
              </div>
              <span className="font-mono text-slate-500">{recoveryReports.length} reports</span>
            </div>
            {recoveryReports.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500">
                No finder reports are waiting for review.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border-y border-slate-200">
                {recoveryReports.map((report) => {
                  const item = items.find((record) => record.id === report.itemId);
                  return (
                    <article key={`${report.itemId}:${report.finderUid}`} className="flex flex-wrap items-start justify-between gap-3 py-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">{report.itemTitle}</h3>
                          <span className="font-mono text-[10px] text-slate-400">{report.itemId}</span>
                        </div>
                        <p className="text-slate-600">Finder: <strong>{report.finderName}</strong></p>
                        <p className="text-slate-700">Handoff: {report.handoffDetails}</p>
                        <p className="text-[10px] text-slate-400">Reported {new Date(report.createdAt).toLocaleString()}</p>
                      </div>
                      {item && (
                        <button type="button" onClick={() => onOpenItemModal(item)} className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50">
                          Open case
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Custody Inventory */}
        {activeTab === 'inventory' && (
          <div className="p-4 space-y-3 text-xs">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Search ID, location, date, or claimant..."
                className="min-w-0 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded"
              />
              <select value={inventoryType} onChange={(event) => setInventoryType(event.target.value as typeof inventoryType)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded">
                <option value="all">All types</option><option value="lost">Lost</option><option value="found">Found</option>
              </select>
              <select value={inventoryStatus} onChange={(event) => setInventoryStatus(event.target.value as typeof inventoryStatus)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded">
                <option value="all">All statuses</option>
                {(['Lost', 'Found', 'Potential Match', 'Under Verification', 'Approved', 'Recovered', 'Returned', 'Closed'] as const).map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <input aria-label="Filter by report date" type="date" value={inventoryDate} onChange={(event) => setInventoryDate(event.target.value)} className="px-2.5 py-1.5 bg-white border border-slate-200 rounded" />
            </div>
            <p className="text-right font-mono text-slate-500">{filteredInventory.length} items</p>

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
                          <option value="Recovered">Recovered</option>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-900">Append-only Case History</span>
              <span className="text-[10px] text-slate-500">{filteredAuditLogs.length} of {auditLogs.length} events</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]">
              <input value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} placeholder="Search actor, action, case ID, or details..." className="min-w-0 rounded border border-slate-200 px-2.5 py-1.5" />
              <input aria-label="Filter audit history by date" type="date" value={auditDate} onChange={(event) => setAuditDate(event.target.value)} className="rounded border border-slate-200 px-2.5 py-1.5" />
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              {filteredAuditLogs.length === 0 ? (
                <div className="p-4 text-center text-slate-400">No matching case history.</div>
              ) : (
                filteredAuditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-slate-900">{log.action}</span>
                      <span className="text-slate-500 ml-2">by {log.actorName}</span>
                      <div className="text-[11px] text-slate-600">{log.details}</div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-slate-900">Online now</h2>
              <span className="text-slate-500">{onlineUsers.length} active</span>
            </div>
            {custodianError && <p role="alert" className="text-rose-700">{custodianError}</p>}
            {onlineUsers.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-300 px-4 py-10 text-center text-slate-500">
                No users are online right now.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {onlineUsers.map((user) => (
                  <div key={user.uid} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="truncate font-semibold text-slate-900">{user.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${user.isCustodian ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                          {user.isCustodian ? 'Custodian' : 'Student'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate pl-4 text-[11px] text-slate-500">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-slate-400">Active {new Date(user.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {canManageCustodians && user.email.trim().toLowerCase() !== PRIMARY_CUSTODIAN_EMAIL && (
                        <button
                          type="button"
                          onClick={() => void handleSetCustodian(user)}
                          disabled={updatingCustodianId === user.uid}
                          className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 font-semibold disabled:opacity-50 ${user.isCustodian ? 'border border-slate-200 text-slate-600 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
                        >
                          {user.isCustodian ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                          {updatingCustodianId === user.uid ? 'Saving...' : user.isCustodian ? 'Remove' : 'Make Custodian'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
