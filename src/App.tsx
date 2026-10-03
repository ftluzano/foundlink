import React, { useState, useEffect, useRef } from 'react';
import {
  ItemRecord,
  ClaimRecord,
  PotentialMatchRecord,
  NotificationRecord,
  AuditLogRecord,
  ItemType,
  UserProfile,
  OnlineUserRecord
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

const CUSTODIAN_EMAIL = 'ftluzano@paterostechnologicalcollege.edu.ph';

const resolveUserRole = (_profile?: Partial<UserProfile>): 'student' | 'admin' =>
  authService.getCurrentUser()?.email?.trim().toLowerCase() === CUSTODIAN_EMAIL ? 'admin' : 'student';

export default function App() {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [matches, setMatches] = useState<PotentialMatchRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUserRecord[]>([]);
  const [firebaseUid, setFirebaseUid] = useState(() => authService.getCurrentUser()?.uid || '');
  const toastedRecoveryIds = useRef(new Set<string>());

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
      role: 'student',
      photoBase64: ''
    };
  });

  // Navigation & Role State
  const [currentTab, setCurrentTab] = useState<'directory' | 'claims' | 'admin' | 'my-reports'>('directory');
  const [userRole, setUserRole] = useState<'student' | 'admin'>(() => resolveUserRole());
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('foundlink_theme') === 'dark');

  useEffect(() => {
    const firebaseUser = authService.getCurrentUser();
    if (!firebaseUser || firebaseUser.uid !== firebaseUid) {
      setUserRole('student');
      return;
    }

    if (firebaseUser.email?.trim().toLowerCase() === CUSTODIAN_EMAIL) {
      setUserRole('admin');
      return;
    }

    return realtimeStore.subscribeCustodianStatus(firebaseUser.uid, (isCustodian) => {
      setUserRole(isCustodian ? 'admin' : 'student');
    });
  }, [firebaseUid]);

  useEffect(() => {
    if (userRole === 'student' && currentTab === 'admin') {
      setCurrentTab('directory');
    }
  }, [userRole, currentTab]);

  useEffect(() => {
    localStorage.setItem('foundlink_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

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
        setFirebaseUid(firebaseUser.uid);
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
      } else {
        setFirebaseUid('');
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Subscribe to real-time pub/sub bus (Firestore items, claims, matches)
  useEffect(() => {
    const unsubItems = realtimeStore.subscribeItems(setItems);
    const unsubClaims = realtimeStore.subscribeClaims(setClaims);
    const unsubMatches = realtimeStore.subscribeMatches(setMatches);
    const unsubAudit = realtimeStore.subscribeAuditLogs(setAuditLogs);

    return () => {
      unsubItems();
      unsubClaims();
      unsubMatches();
      unsubAudit();
    };
  }, []);

  useEffect(() => {
    if (!firebaseUid) {
      setNotifications([]);
      return;
    }

    const listeningSince = Date.now();
    toastedRecoveryIds.current.clear();
    return realtimeStore.subscribeNotifications(firebaseUid, (userNotifications) => {
      setNotifications(userNotifications);
      const newRecovery = userNotifications.find((notification) =>
        notification.type === 'recovery' &&
        new Date(notification.createdAt).getTime() >= listeningSince &&
        !toastedRecoveryIds.current.has(notification.id)
      );
      if (newRecovery) {
        toastedRecoveryIds.current.add(newRecovery.id);
        setToastMessage(`${newRecovery.title}: ${newRecovery.message}`);
        window.setTimeout(() => setToastMessage(null), 6000);
      }
    });
  }, [firebaseUid]);

  useEffect(() => {
    if (!firebaseUid) return;

    const refreshPresence = () => {
      void realtimeStore.updatePresence(userProfile.name, true).catch((error) => {
        console.warn('Presence update notice:', error);
      });
    };
    const markOffline = () => {
      void realtimeStore.updatePresence(userProfile.name, false).catch(() => {});
    };

    refreshPresence();
    const heartbeat = window.setInterval(refreshPresence, 30_000);
    window.addEventListener('pagehide', markOffline);
    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener('pagehide', markOffline);
      markOffline();
    };
  }, [firebaseUid, userProfile.name]);

  useEffect(() => {
    if (userRole !== 'admin') {
      setOnlineUsers([]);
      return;
    }
    return realtimeStore.subscribeOnlineUsers(setOnlineUsers);
  }, [userRole]);

  // Update selected item reference when items update
  useEffect(() => {
    if (selectedItemForDetails) {
      const updated = items.find((i) => i.id === selectedItemForDetails.id);
      if (updated) setSelectedItemForDetails(updated);
    }
  }, [items]);

  // Auth Handlers
  const handleAuthSuccess = (profile: UserProfile) => {
    const normalizedProfile: UserProfile = {
      ...profile,
      role: resolveUserRole(profile),
      email: (profile.email || '').trim()
    };

    setUserProfile(normalizedProfile);
    setUserRole(resolveUserRole(normalizedProfile));
    setIsAuthenticated(true);
    localStorage.setItem('foundlink_authenticated', 'true');
    localStorage.setItem('foundlink_user_profile', JSON.stringify(normalizedProfile));
    showToast(`Welcome to PTC FoundLink, ${normalizedProfile.name}!`);
  };

  const handleContinueAsGuest = () => {
    setIsAuthenticated(true);
    localStorage.setItem('foundlink_authenticated', 'true');
    showToast('Browsing as Campus Guest');
  };

  const handleSignOut = async () => {
    await realtimeStore.updatePresence(userProfile.name, false).catch(() => {});
    try {
      await authService.logout();
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setUserRole('student');
    localStorage.removeItem('foundlink_authenticated');
    showToast('Signed out of PTC FoundLink');
  };

  // Handlers
  const handleOpenReportModal = (type: ItemType) => {
    if (type === 'found' && userRole !== 'admin') return;
    setReportModalType(type);
    setReportModalOpen(true);
  };

  const handleReportLostItemFound = async (item: ItemRecord, handoffDetails: string) => {
    await realtimeStore.reportLostItemFound(item.id, userProfile.name, handoffDetails);
    showToast('The person who posted this item has been notified.');
  };

  const handleMarkItemRecovered = async (item: ItemRecord) => {
    await realtimeStore.markItemRecovered(item.id);
    showToast('Your post is now marked as recovered.');
  };

  const handleSetCustodian = async (onlineUser: OnlineUserRecord, isCustodian: boolean) => {
    await realtimeStore.setCustodian(onlineUser.uid, onlineUser.name, onlineUser.email, isCustodian);
    showToast(isCustodian ? `${onlineUser.name} is now a Custodian.` : `Custodian access removed for ${onlineUser.name}.`);
  };

  const handleSaveProfile = async (updated: UserProfile) => {
    const normalizedProfile: UserProfile = {
      ...updated,
      role: resolveUserRole(updated),
      email: (updated.email || '').trim()
    };

    setUserProfile(normalizedProfile);
    try {
      localStorage.setItem('foundlink_user_profile', JSON.stringify(normalizedProfile));
    } catch {
      // fallback
    }

    // Upload to Firebase Firestore
    const currentUid = normalizedProfile.uid || authService.getCurrentUser()?.uid || 'local_user';
    try {
      await authService.saveUserProfile(currentUid, normalizedProfile);
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
    <div className={`app-shell min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-slate-900 selection:text-white ${isDarkMode ? 'dark-mode' : ''}`}>
      {/* 1. Modern Top Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenReportModal={handleOpenReportModal}
        userRole={userRole}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((dark) => !dark)}
        notifications={notifications}
        onOpenNotifications={() => setNotificationsOpen(true)}
        userProfile={userProfile}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* 2. Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-3 sm:pt-5">
        {currentTab === 'directory' && (
          <PublicDirectory
            items={items}
            userProfile={userProfile}
            onReportFound={handleReportLostItemFound}
            onMarkRecovered={handleMarkItemRecovered}
            onSelectItem={setSelectedItemForDetails}
            onOpenReportModal={handleOpenReportModal}
            onOpenClaimModal={(foundItem) => setSelectedItemForClaim({ found: foundItem })}
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

        {currentTab === 'admin' && userRole === 'admin' && (
          <AdminDashboard
            items={items}
            claims={claims}
            matches={matches}
            auditLogs={auditLogs}
            onlineUsers={onlineUsers}
            canManageCustodians={authService.getCurrentUser()?.email?.trim().toLowerCase() === CUSTODIAN_EMAIL}
            onSetCustodian={handleSetCustodian}
            onUpdateClaim={handleUpdateClaim}
            onUpdateItemStatus={handleUpdateStatus}
            onUpdateCustody={handleUpdateCustody}
            onDeleteItem={handleDeleteItem}
            onOpenItemModal={setSelectedItemForDetails}
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
          canReportFound={userRole === 'admin'}
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
