import React, { useState } from 'react';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  Printer,
  Plus,
  AlertCircle,
  HandHelping,
  Sparkles,
  MapPin,
  Calendar,
  Building,
  User,
  GraduationCap,
  CreditCard,
  Phone,
  Mail,
  Edit3
} from 'lucide-react';
import { ClaimRecord, ItemRecord, UserProfile } from '../types';

interface StudentPortalViewProps {
  claims: ClaimRecord[];
  items: ItemRecord[];
  userProfile: UserProfile;
  onOpenProfileModal: () => void;
  onViewSlip: (claim: ClaimRecord) => void;
  onOpenItem: (item: ItemRecord) => void;
  onOpenReportModal: (type: 'lost' | 'found') => void;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  claims,
  items,
  userProfile,
  onOpenProfileModal,
  onViewSlip,
  onOpenItem,
  onOpenReportModal
}) => {
  const [activeTab, setActiveTab] = useState<'claims' | 'my-reports' | 'profile' | 'guide'>('claims');

  const myReports = items.filter(
    (i) => i.reportedBy.role === 'student' || i.reportedBy.role === 'visitor'
  );

  const initials = userProfile.name
    ? userProfile.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  return (
    <div className="space-y-4 pb-12 text-xs">
      {/* Student Welcome Header */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-900 text-white flex items-center justify-center font-bold text-sm border-2 border-slate-200 shrink-0 shadow-xs">
            {userProfile.photoBase64 ? (
              <img
                src={userProfile.photoBase64}
                alt="Student 500x500"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                Student Recovery Portal
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-semibold">
                FIREBASE ACTIVE
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
              Welcome, {userProfile.name}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {userProfile.course} · {userProfile.yearLevel} · ID: {userProfile.studentIdNumber}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenProfileModal}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Settings</span>
          </button>

          <button
            onClick={() => onOpenReportModal('lost')}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Report Lost</span>
          </button>

          <button
            onClick={() => onOpenReportModal('found')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <HandHelping className="w-3.5 h-3.5" />
            <span>Surrender Found</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-200 px-4 gap-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('claims')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'claims'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>My Ownership Claims</span>
            <span className="text-slate-400 font-mono">({claims.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('my-reports')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'my-reports'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Reported Items</span>
            <span className="text-slate-400 font-mono">({myReports.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Student Credentials & Photo</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-slate-900 text-slate-900 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>Custody Pickup Instructions</span>
          </button>
        </div>

        {/* Tab 1: Claims List */}
        {activeTab === 'claims' && (
          <div className="p-4 space-y-3">
            {claims.length === 0 ? (
              <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                <FileCheck className="w-7 h-7 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No ownership claims filed</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Browse the catalog to find your misplaced belongings and click "Claim Item" to submit proof.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {claims.map((claim) => {
                  const isApproved = claim.status === 'Approved' || claim.status === 'Returned';
                  const relatedItem = items.find((i) => i.id === claim.foundItemId);

                  return (
                    <div
                      key={claim.id}
                      className="p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 text-[10px]">{claim.id}</span>
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[10px] border ${
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

                        <div className="text-slate-500 text-[11px]">
                          Claimant: <strong>{claim.claimantName}</strong> ({claim.claimantIdNumber}) ·{' '}
                          <span className="font-mono">{new Date(claim.createdAt).toLocaleDateString()}</span>
                        </div>

                        {claim.verificationNotes && (
                          <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 mt-1">
                            <strong>Custodian Remarks:</strong> {claim.verificationNotes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {relatedItem && (
                          <button
                            onClick={() => onOpenItem(relatedItem)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium cursor-pointer"
                          >
                            View Item
                          </button>
                        )}

                        <button
                          onClick={() => onViewSlip(claim)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{isApproved ? 'Open Recovery Slip' : 'View Claim Voucher'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Student's Reported Items */}
        {activeTab === 'my-reports' && (
          <div className="p-4 space-y-3">
            {myReports.length === 0 ? (
              <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                No items reported yet. Click "Report Lost" or "Surrender Found" to create a report.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {myReports.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            item.type === 'lost' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.type}
                        </span>
                        <span className="font-mono text-slate-400 text-[10px]">{item.id}</span>
                        <span className="font-semibold text-slate-700 text-[11px]">{item.status}</span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>

                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{item.category}</span>
                        <span>·</span>
                        <span>{item.location}</span>
                        <span>·</span>
                        <span className="font-mono">{new Date(item.dateTime).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenItem(item)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold cursor-pointer"
                    >
                      View Case
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Student Profile Credentials Card with Photo */}
        {activeTab === 'profile' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Pateros Technological College Student Credentials
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Connected to Firebase Firestore. Profile photo is formatted as a 500x500 Base64 string.
                </p>
              </div>

              <button
                onClick={onOpenProfileModal}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile & Photo</span>
              </button>
            </div>

            {/* Profile Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-300 shrink-0 flex items-center justify-center">
                {userProfile.photoBase64 ? (
                  <img
                    src={userProfile.photoBase64}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-white">{initials}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-1 w-full text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Student Name
                  </span>
                  <span className="font-bold text-slate-900">{userProfile.name}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Student ID Number
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {userProfile.studentIdNumber}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Academic Program
                  </span>
                  <span className="font-bold text-slate-900">{userProfile.course}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Year Level
                  </span>
                  <span className="font-bold text-slate-900">{userProfile.yearLevel}</span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Official Gmail
                  </span>
                  <span className="font-medium text-slate-900 truncate block">
                    {userProfile.email}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Contact Mobile
                  </span>
                  <span className="font-mono font-medium text-slate-900">
                    {userProfile.contactNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Instructions */}
        {activeTab === 'guide' && (
          <div className="p-5 space-y-3">
            <h3 className="font-bold text-slate-900 text-sm">
              In-Person Handover Requirements (Pateros Technological College)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">1. File & Wait for Approval</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Submit your claim with proof and hidden characteristics. The Campus Custodian evaluates your submission.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">2. Print Digital Slip</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Once your claim is marked <strong>Approved</strong>, open and print your official Recovery Slip with voucher reference.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <span className="font-bold text-slate-900 block">3. In-Person Handover</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  Bring your <strong>Physical PTC Student ID</strong> and Claim Slip to Gate 1 Security Custody Desk (8:00 AM – 5:00 PM).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
