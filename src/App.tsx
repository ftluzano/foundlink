import React, { useState, useEffect } from 'react';
import {
  ItemRecord,
  ClaimRecord,
  PotentialMatchRecord,
  NotificationRecord,
  AuditLogRecord,
  ItemType,
  UserProfile
} from './types';
import { realtimeStore } from './services/realtimeStore';
import { authService } from './services/authService';
import { Navbar } from './components/Navbar';
import { PublicDirectory } from './components/PublicDirectory';
import { ReportModal } from './components/ReportModal';
import { ItemDetailsModal } from './components/ItemDetailsModal';
import { MatchReviewModal } from './components/MatchReviewModal';
import { ClaimModal } from './components/ClaimModal';
import { ClaimVerificationSlip } from './components/ClaimVerificationSlip';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentPortalView } from './components/StudentPortalView';
import { NotificationCenter } from './components/NotificationCenter';
import { ProfileSettingsModal } from './components/ProfileSettingsModal';
import { AuthScreen } from './components/AuthScreen';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [matches, setMatches] = useState<PotentialMatchRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  // User Authentication Gate
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('foundlink_authenticated') === 'true';
  });

  // User Profile Credentials (Auto-persisted with Firebase Firestore)
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('foundlink_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      name: 'Francis T. Luzano',
      course: 'Bachelor of Science in Information Technology (BSIT)',
      contactNumber: '+63 917 842 1092',
      email: 'ftluzano@paterostechnologicalcollege.edu.ph',
      yearLevel: '3rd Year',
      studentIdNumber: '2023-3TL-0482',
      photoBase64: ''
    };
  });

  // Navigation & Role State
  const [currentTab, setCurrentTab] = useState<'directory' | 'claims' | 'admin' | 'my-reports'>('directory');
  const [userRole, setUserRole] = useState<'student' | 'admin'>('student');

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportModalType, setReportModalType] = useState<ItemType>('lost');
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const [selectedItemForDetails, setSelectedItemForDetails] = useState<ItemRecord | null>(null);
  const [selectedMatchForReview, setSelectedMatchForReview] = useState<PotentialMatchRecord | null>(null);
  const [selectedItemForClaim, setSelectedItemForClaim] = useState<{ found: ItemRecord; lost?: ItemRecord } | null>(null);
  const [activeClaimSlip, setActiveClaimSlip] = useState<ClaimRecord | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Modern Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 1. Subscribe to Firebase Auth and sync user profile from Firestore
  useEffect(() => {
    const unsubAuth = authService.subscribeAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        localStorage.setItem('foundlink_authenticated', 'true');

        // Subscribe to Firestore /users/{uid} document
        const unsubProfile = authService.subscribeUserProfile(
          firebaseUser.uid,
          (remoteProfile) => {
            if (remoteProfile) {
              setUserProfile(remoteProfile);
              localStorage.setItem('foundlink_user_profile', JSON.stringify(remoteProfile));
            }
          }
        );
        return () => unsubProfile();
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Subscribe to real-time pub/sub bus (Firestore items, claims, matches)
  useEffect(() => {
    const unsubItems = realtimeStore.subscribeItems(setItems);
    const unsubClaims = realtimeStore.subscribeClaims(setClaims);
    const unsubMatches = realtimeStore.subscribeMatches(setMatches);
    const unsubNotifs = realtimeStore.subscribeNotifications(setNotifications);
    const unsubAudit = realtimeStore.subscribeAuditLogs(setAuditLogs);

    return () => {
      unsubItems();
      unsubClaims();
      unsubMatches();
      unsubNotifs();
      unsubAudit();
    };
  }, []);

  // Update selected item reference when items update
  useEffect(() => {
    if (selectedItemForDetails) {
      const updated = items.find((i) => i.id === selectedItemForDetails.id);
      if (updated) setSelectedItemForDetails(updated);
    }
  }, [items]);

  // Auth Handlers
  const handleAuthSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    setIsAuthenticated(true);
    localStorage.setItem('foundlink_authenticated', 'true');
    localStorage.setItem('foundlink_user_profile', JSON.stringify(profile));
    showToast(`Welcome to PTC FoundLink, ${profile.name}!`);
  };

  const handleContinueAsGuest = () => {
    setIsAuthenticated(true);
    localStorage.setItem('foundlink_authenticated', 'true');
    showToast('Browsing as Campus Guest');
  };

  const handleSignOut = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    localStorage.removeItem('foundlink_authenticated');
    showToast('Signed out of PTC FoundLink');
  };

  // Handlers
  const handleOpenReportModal = (type: ItemType) => {
    setReportModalType(type);
    setReportModalOpen(true);
  };

  const handleSaveProfile = async (updated: UserProfile) => {
    setUserProfile(updated);
    try {
      localStorage.setItem('foundlink_user_profile', JSON.stringify(updated));
    } catch {
      // fallback
    }

    // Upload to Firebase Firestore
    const currentUid = updated.uid || authService.getCurrentUser()?.uid || 'local_user';
    try {
      await authService.saveUserProfile(currentUid, updated);
      showToast('Profile & 500x500 photo synced to Firebase');
    } catch {
      showToast('Profile saved locally');
    }
  };

  const handleItemCreated = async (itemData: Omit<ItemRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const created = await realtimeStore.createItem(itemData);
    showToast(itemData.type === 'lost' ? 'Lost report published' : 'Found item surrendered');
    return created;
  };

  const handleMatchDiscovered = (item: ItemRecord) => {
    const related = matches.find((m) => m.lostItemId === item.id || m.foundItemId === item.id);
    if (related) {
      setSelectedMatchForReview(related);
    }
  };

  const handleUpdateStatus = (id: string, status: ItemRecord['status']) => {
    realtimeStore.updateItem(id, { status }, 'Custodian Officer', userRole);
    showToast(`Status updated to ${status}`);
  };

  const handleUpdateCustody = (id: string, custodyLocation: string) => {
    realtimeStore.updateItem(id, { custodyLocation }, 'Custodian Officer', userRole);
    showToast('Custody location updated');
  };

  const handleDeleteItem = (id: string) => {
    realtimeStore.deleteItem(id, 'Admin Officer', userRole);
    showToast('Record deleted');
  };

  const handleSubmitClaim = async (claimData: Omit<ClaimRecord, 'id' | 'createdAt' | 'status'>) => {
    const claim = await realtimeStore.createClaim(claimData);
    showToast('Ownership claim submitted');
    return claim;
  };

  const handleClaimSuccess = (claim: ClaimRecord) => {
    setSelectedItemForClaim(null);
    setActiveClaimSlip(claim);
  };

  const handleUpdateClaim = (claimId: string, updates: Partial<ClaimRecord>, staffName: string) => {
    realtimeStore.updateClaim(claimId, updates, staffName, userRole);
    showToast(`Claim updated to ${updates.status || 'Updated'}`);
  };

  const handleDismissMatch = () => {
    setSelectedMatchForReview(null);
  };

  // IF NOT AUTHENTICATED: Display dedicated AuthScreen gateway
  if (!isAuthenticated) {
    return (
      <AuthScreen
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  // IF AUTHENTICATED: Display full main screen
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white">
      {/* 1. Modern Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenReportModal={handleOpenReportModal}
        userRole={userRole}
        onChangeRole={setUserRole}
        notifications={notifications}
        onOpenNotifications={() => setNotificationsOpen(true)}
        userProfile={userProfile}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* 2. Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5">
        {currentTab === 'directory' && (
          <PublicDirectory
            items={items}
            onSelectItem={setSelectedItemForDetails}
            onOpenReportModal={handleOpenReportModal}
            onOpenClaimModal={(foundItem) => setSelectedItemForClaim({ found: foundItem })}
            onSeedDemoData={() => {
              realtimeStore.seedCapstoneDemoData();
              showToast('Sample records loaded');
            }}
          />
        )}

        {currentTab === 'claims' && (
          <StudentPortalView
            claims={claims}
            items={items}
            userProfile={userProfile}
            onOpenProfileModal={() => setProfileModalOpen(true)}
            onViewSlip={setActiveClaimSlip}
            onOpenItem={setSelectedItemForDetails}
            onOpenReportModal={handleOpenReportModal}
          />
        )}

        {currentTab === 'admin' && (
          <AdminDashboard
            items={items}
            claims={claims}
            matches={matches}
            auditLogs={auditLogs}
            onUpdateClaim={handleUpdateClaim}
            onUpdateItemStatus={handleUpdateStatus}
            onUpdateCustody={handleUpdateCustody}
            onDeleteItem={handleDeleteItem}
            onOpenItemModal={setSelectedItemForDetails}
            onSeedDemoData={() => {
              realtimeStore.seedCapstoneDemoData();
              showToast('Sample records loaded');
            }}
            onClearAllData={() => {
              realtimeStore.clearAllData();
              showToast('Database reset');
            }}
            onOpenFirebaseModal={() => {}}
          />
        )}
      </main>

      {/* 3. Modals and Overlays */}
      {profileModalOpen && (
        <ProfileSettingsModal
          profile={userProfile}
          onClose={() => setProfileModalOpen(false)}
          onSaveProfile={handleSaveProfile}
        />
      )}

      {reportModalOpen && (
        <ReportModal
          initialType={reportModalType}
          userProfile={userProfile}
          onClose={() => setReportModalOpen(false)}
          onSubmit={handleItemCreated}
          onMatchDiscovered={handleMatchDiscovered}
        />
      )}

      {selectedItemForDetails && (
        <ItemDetailsModal
          item={selectedItemForDetails}
          onClose={() => setSelectedItemForDetails(null)}
          onClaim={(item) => {
            setSelectedItemForDetails(null);
            setSelectedItemForClaim({ found: item });
          }}
          onCompareMatch={(match) => {
            setSelectedItemForDetails(null);
            setSelectedMatchForReview(match);
          }}
          potentialMatches={matches}
          userRole={userRole}
          onUpdateStatus={handleUpdateStatus}
          onUpdateCustody={handleUpdateCustody}
          onDeleteItem={handleDeleteItem}
        />
      )}

      {selectedMatchForReview && (
        <MatchReviewModal
          match={selectedMatchForReview}
          lostItem={items.find((i) => i.id === selectedMatchForReview.lostItemId)}
          foundItem={items.find((i) => i.id === selectedMatchForReview.foundItemId)}
          onClose={() => setSelectedMatchForReview(null)}
          onInitiateClaim={(found, lost) => {
            setSelectedMatchForReview(null);
            setSelectedItemForClaim({ found, lost });
          }}
          onDismissMatch={handleDismissMatch}
        />
      )}

      {selectedItemForClaim && (
        <ClaimModal
          foundItem={selectedItemForClaim.found}
          lostItem={selectedItemForClaim.lost}
          userProfile={userProfile}
          onClose={() => setSelectedItemForClaim(null)}
          onSubmitClaim={handleSubmitClaim}
          onClaimSuccess={handleClaimSuccess}
        />
      )}

      {activeClaimSlip && (
        <ClaimVerificationSlip
          claim={activeClaimSlip}
          onClose={() => setActiveClaimSlip(null)}
        />
      )}

      {notificationsOpen && (
        <NotificationCenter
          notifications={notifications}
          onClose={() => setNotificationsOpen(false)}
          onMarkRead={(id) => realtimeStore.markNotificationRead(id)}
          onMarkAllRead={() => realtimeStore.markAllNotificationsRead()}
          onSelectNotificationItem={(itemId) => {
            const it = items.find((i) => i.id === itemId);
            if (it) setSelectedItemForDetails(it);
          }}
        />
      )}

      {/* Modern Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-lg shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-800 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 4. Modern Clean Minimal Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 mt-auto text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 tracking-tight">PTC FoundLink</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">Campus Lost-and-Found Recovery</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Pateros Technological College
          </div>
        </div>
      </footer>
    </div>
  );
}
