import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db, firebaseConfig } from './firebase';
import {
  ItemRecord,
  ClaimRecord,
  PotentialMatchRecord,
  NotificationRecord,
  AuditLogRecord,
  FirebaseConfigBridge
} from '../types';
import { findPotentialMatchesForItem } from './matchingService';

type Listener<T> = (data: T) => void;

class RealtimeStore {
  private items: ItemRecord[] = [];
  private claims: ClaimRecord[] = [];
  private potentialMatches: PotentialMatchRecord[] = [];
  private notifications: NotificationRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];

  private itemsListeners: Set<Listener<ItemRecord[]>> = new Set();
  private claimsListeners: Set<Listener<ClaimRecord[]>> = new Set();
  private matchesListeners: Set<Listener<PotentialMatchRecord[]>> = new Set();
  private notifListeners: Set<Listener<NotificationRecord[]>> = new Set();
  private auditListeners: Set<Listener<AuditLogRecord[]>> = new Set();

  private broadcastChannel: BroadcastChannel | null = null;
  public isFirestoreConnected = false;
  public firestoreStatusMessage = 'Connecting to Firebase Firestore...';

  constructor() {
    this.initStorageAndSync();
    this.initFirestoreListeners();
  }

  private initStorageAndSync() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('foundlink_realtime_bus');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'SYNC_ALL') {
            this.loadFromLocalStorage(false);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel fallback', err);
      }
    }
    this.loadFromLocalStorage(false);
  }

  private initFirestoreListeners() {
    try {
      // 1. Items Listener
      const itemsCol = collection(db, 'items');
      onSnapshot(
        itemsCol,
        (snapshot) => {
          this.isFirestoreConnected = true;
          this.firestoreStatusMessage = 'Connected to Firebase Firestore';
          if (!snapshot.empty) {
            const remoteItems: ItemRecord[] = [];
            snapshot.forEach((d) => remoteItems.push(d.data() as ItemRecord));
            // Sort newest first
            remoteItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.items = remoteItems;
            this.saveToLocalStorageAndBroadcast(false);
            this.notifyItems();
          }
        },
        (error) => {
          console.warn('Firestore items sync notice:', error.message);
          this.firestoreStatusMessage = error.code === 'permission-denied'
            ? 'Firebase Connected (Firestore Security Rules need publish)'
            : `Firebase: ${error.message}`;
        }
      );

      // 2. Claims Listener
      const claimsCol = collection(db, 'claims');
      onSnapshot(
        claimsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteClaims: ClaimRecord[] = [];
            snapshot.forEach((d) => remoteClaims.push(d.data() as ClaimRecord));
            remoteClaims.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.claims = remoteClaims;
            this.saveToLocalStorageAndBroadcast(false);
            this.notifyClaims();
          }
        },
        (err) => console.warn('Firestore claims notice:', err.message)
      );

      // 3. Potential Matches Listener
      const matchesCol = collection(db, 'potential_matches');
      onSnapshot(
        matchesCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteMatches: PotentialMatchRecord[] = [];
            snapshot.forEach((d) => remoteMatches.push(d.data() as PotentialMatchRecord));
            remoteMatches.sort((a, b) => b.score - a.score);
            this.potentialMatches = remoteMatches;
            this.saveToLocalStorageAndBroadcast(false);
            this.notifyMatches();
          }
        },
        (err) => console.warn('Firestore matches notice:', err.message)
      );

      // 4. Notifications Listener
      const notifsCol = collection(db, 'notifications');
      onSnapshot(
        notifsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteNotifs: NotificationRecord[] = [];
            snapshot.forEach((d) => remoteNotifs.push(d.data() as NotificationRecord));
            remoteNotifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.notifications = remoteNotifs;
            this.saveToLocalStorageAndBroadcast(false);
            this.notifyNotifs();
          }
        },
        (err) => console.warn('Firestore notifications notice:', err.message)
      );

      // 5. Audit Logs Listener
      const auditCol = collection(db, 'audit_logs');
      onSnapshot(
        auditCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteLogs: AuditLogRecord[] = [];
            snapshot.forEach((d) => remoteLogs.push(d.data() as AuditLogRecord));
            remoteLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            this.auditLogs = remoteLogs;
            this.saveToLocalStorageAndBroadcast(false);
            this.notifyAudit();
          }
        },
        (err) => console.warn('Firestore audit notice:', err.message)
      );
    } catch (e) {
      console.warn('Firestore initialization fallback active', e);
    }
  }

  private loadFromLocalStorage(notify = true) {
    if (typeof window === 'undefined') return;
    try {
      const itemsRaw = localStorage.getItem('foundlink_items');
      const claimsRaw = localStorage.getItem('foundlink_claims');
      const matchesRaw = localStorage.getItem('foundlink_matches');
      const notifsRaw = localStorage.getItem('foundlink_notifications');
      const auditRaw = localStorage.getItem('foundlink_audit_logs');

      this.items = itemsRaw ? JSON.parse(itemsRaw) : [];
      this.claims = claimsRaw ? JSON.parse(claimsRaw) : [];
      this.potentialMatches = matchesRaw ? JSON.parse(matchesRaw) : [];
      this.notifications = notifsRaw ? JSON.parse(notifsRaw) : [];
      this.auditLogs = auditRaw ? JSON.parse(auditRaw) : [];

      if (notify) {
        this.notifyAll();
      }
    } catch (e) {
      console.error('Failed to load local state', e);
    }
  }

  private saveToLocalStorageAndBroadcast(broadcast = true) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('foundlink_items', JSON.stringify(this.items));
      localStorage.setItem('foundlink_claims', JSON.stringify(this.claims));
      localStorage.setItem('foundlink_matches', JSON.stringify(this.potentialMatches));
      localStorage.setItem('foundlink_notifications', JSON.stringify(this.notifications));
      localStorage.setItem('foundlink_audit_logs', JSON.stringify(this.auditLogs));

      if (broadcast && this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'SYNC_ALL' });
      }
    } catch (e) {
      console.error('Save state error', e);
    }
  }

  private notifyItems() {
    this.itemsListeners.forEach((fn) => fn([...this.items]));
  }
  private notifyClaims() {
    this.claimsListeners.forEach((fn) => fn([...this.claims]));
  }
  private notifyMatches() {
    this.matchesListeners.forEach((fn) => fn([...this.potentialMatches]));
  }
  private notifyNotifs() {
    this.notifListeners.forEach((fn) => fn([...this.notifications]));
  }
  private notifyAudit() {
    this.auditListeners.forEach((fn) => fn([...this.auditLogs]));
  }

  private notifyAll() {
    this.notifyItems();
    this.notifyClaims();
    this.notifyMatches();
    this.notifyNotifs();
    this.notifyAudit();
  }

  // ---------------- SUBSCRIPTIONS ----------------
  subscribeItems(listener: Listener<ItemRecord[]>): () => void {
    this.itemsListeners.add(listener);
    listener([...this.items]);
    return () => this.itemsListeners.delete(listener);
  }

  subscribeClaims(listener: Listener<ClaimRecord[]>): () => void {
    this.claimsListeners.add(listener);
    listener([...this.claims]);
    return () => this.claimsListeners.delete(listener);
  }

  subscribeMatches(listener: Listener<PotentialMatchRecord[]>): () => void {
    this.matchesListeners.add(listener);
    listener([...this.potentialMatches]);
    return () => this.matchesListeners.delete(listener);
  }

  subscribeNotifications(listener: Listener<NotificationRecord[]>): () => void {
    this.notifListeners.add(listener);
    listener([...this.notifications]);
    return () => this.notifListeners.delete(listener);
  }

  subscribeAuditLogs(listener: Listener<AuditLogRecord[]>): () => void {
    this.auditListeners.add(listener);
    listener([...this.auditLogs]);
    return () => this.auditListeners.delete(listener);
  }

  // ---------------- ACTIONS (Instant update + Firestore setDoc) ----------------
  async createItem(itemData: Omit<ItemRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ItemRecord> {
    const now = new Date().toISOString();
    const newItem: ItemRecord = {
      ...itemData,
      id: `FL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      createdAt: now,
      updatedAt: now
    };

    // Instant local optimistic update
    this.items.unshift(newItem);

    // Audit log
    this.logAudit({
      action: newItem.type === 'lost' ? 'Lost Item Reported' : 'Found Item Surrendered',
      actorName: newItem.reportedBy.name || 'Campus Member',
      actorRole: newItem.reportedBy.role,
      entityType: 'item',
      entityId: newItem.id,
      details: `${newItem.title} (${newItem.category}) at ${newItem.location}`
    });

    // Auto-run attribute matching
    const newMatches = findPotentialMatchesForItem(newItem, this.items);
    if (newMatches.length > 0) {
      this.potentialMatches = [...newMatches, ...this.potentialMatches];
      if (newMatches[0].score >= 60) {
        newItem.status = 'Potential Match';
      }

      const bestMatch = newMatches[0];
      this.createNotification({
        title: `Match Detected (${bestMatch.score}%)`,
        message: `Correlation between "${bestMatch.lostItemTitle}" and "${bestMatch.foundItemTitle}".`,
        type: 'match',
        relatedItemId: newItem.id
      });

      // Save match to Firestore
      try {
        await setDoc(doc(db, 'potential_matches', bestMatch.id), bestMatch);
      } catch (err) {
        // Fallback local
      }
    }

    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();

    // Async write to Firebase Firestore
    try {
      await setDoc(doc(db, 'items', newItem.id), newItem);
    } catch (err) {
      console.warn('Firestore write item error (local fallback maintained):', err);
    }

    return newItem;
  }

  async updateItem(
    id: string,
    updates: Partial<ItemRecord>,
    actorName = 'Custodian Staff',
    actorRole = 'admin'
  ): Promise<boolean> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) return false;

    const prevStatus = this.items[index].status;
    const updatedItem = {
      ...this.items[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.items[index] = updatedItem;

    if (updates.status && updates.status !== prevStatus) {
      this.logAudit({
        action: `Status: ${updates.status}`,
        actorName,
        actorRole,
        entityType: 'item',
        entityId: id,
        details: `Item "${updatedItem.title}" updated to ${updates.status}`
      });

      this.createNotification({
        title: `Status: ${updates.status}`,
        message: `Case ${id} (${updatedItem.title}) changed to ${updates.status}.`,
        type: 'status',
        relatedItemId: id
      });
    }

    // Instant local broadcast
    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();

    // Async update Firestore
    try {
      await updateDoc(doc(db, 'items', id), {
        ...updates,
        updatedAt: updatedItem.updatedAt
      });
    } catch (err) {
      console.warn('Firestore updateDoc notice:', err);
    }

    return true;
  }

  async deleteItem(id: string, actorName = 'Admin', actorRole = 'admin'): Promise<boolean> {
    const item = this.items.find((i) => i.id === id);
    if (!item) return false;

    this.items = this.items.filter((i) => i.id !== id);
    this.potentialMatches = this.potentialMatches.filter((m) => m.lostItemId !== id && m.foundItemId !== id);
    this.claims = this.claims.filter((c) => c.foundItemId !== id && c.lostItemId !== id);

    this.logAudit({
      action: 'Item Removed',
      actorName,
      actorRole,
      entityType: 'item',
      entityId: id,
      details: `Deleted record ${id} (${item.title})`
    });

    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();

    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (err) {
      console.warn('Firestore deleteDoc notice:', err);
    }

    return true;
  }

  // ---------------- CLAIMS ACTIONS ----------------
  async createClaim(claimData: Omit<ClaimRecord, 'id' | 'createdAt' | 'status'>): Promise<ClaimRecord> {
    const newClaim: ClaimRecord = {
      ...claimData,
      id: `CLM-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      status: 'Under Verification',
      createdAt: new Date().toISOString()
    };

    this.claims.unshift(newClaim);

    // Update target found item status
    const foundItem = this.items.find((i) => i.id === newClaim.foundItemId);
    if (foundItem) {
      foundItem.status = 'Under Verification';
      foundItem.updatedAt = new Date().toISOString();
      try {
        await updateDoc(doc(db, 'items', foundItem.id), {
          status: 'Under Verification',
          updatedAt: foundItem.updatedAt
        });
      } catch (e) {
        // local fallback
      }
    }

    this.logAudit({
      action: 'Claim Submitted',
      actorName: newClaim.claimantName,
      actorRole: 'claimant',
      entityType: 'claim',
      entityId: newClaim.id,
      details: `Claim filed for "${newClaim.foundItemTitle}" by ${newClaim.claimantName}`
    });

    this.createNotification({
      title: 'New Ownership Claim',
      message: `${newClaim.claimantName} filed a verification claim for "${newClaim.foundItemTitle}".`,
      type: 'claim',
      relatedClaimId: newClaim.id,
      relatedItemId: newClaim.foundItemId
    });

    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();

    try {
      await setDoc(doc(db, 'claims', newClaim.id), newClaim);
    } catch (err) {
      console.warn('Firestore create claim notice:', err);
    }

    return newClaim;
  }

  async updateClaim(
    claimId: string,
    updates: Partial<ClaimRecord>,
    staffName: string,
    staffRole = 'admin'
  ): Promise<boolean> {
    const claim = this.claims.find((c) => c.id === claimId);
    if (!claim) return false;

    Object.assign(claim, updates);

    const foundItem = this.items.find((i) => i.id === claim.foundItemId);
    if (updates.status === 'Approved' && foundItem) {
      foundItem.status = 'Approved';
      foundItem.updatedAt = new Date().toISOString();
      this.createNotification({
        title: 'Claim Approved for Release',
        message: `Claim for "${claim.foundItemTitle}" approved. Ready for custody pickup.`,
        type: 'verification',
        relatedClaimId: claim.id,
        relatedItemId: foundItem.id
      });
      try {
        await updateDoc(doc(db, 'items', foundItem.id), {
          status: 'Approved',
          updatedAt: foundItem.updatedAt
        });
      } catch (e) {
        // fallback
      }
    } else if (updates.status === 'Returned' && foundItem) {
      foundItem.status = 'Returned';
      foundItem.updatedAt = new Date().toISOString();
      this.createNotification({
        title: 'Item Returned',
        message: `Item "${foundItem.title}" released to ${claim.claimantName}.`,
        type: 'handover',
        relatedClaimId: claim.id,
        relatedItemId: foundItem.id
      });
      try {
        await updateDoc(doc(db, 'items', foundItem.id), {
          status: 'Returned',
          updatedAt: foundItem.updatedAt
        });
      } catch (e) {
        // fallback
      }
    } else if (updates.status === 'Rejected' && foundItem) {
      foundItem.status = 'Found';
      foundItem.updatedAt = new Date().toISOString();
      try {
        await updateDoc(doc(db, 'items', foundItem.id), {
          status: 'Found',
          updatedAt: foundItem.updatedAt
        });
      } catch (e) {
        // fallback
      }
    }

    this.logAudit({
      action: `Claim ${updates.status || 'Updated'}`,
      actorName: staffName,
      actorRole: staffRole,
      entityType: 'claim',
      entityId: claim.id,
      details: updates.verificationNotes || `Claim ${claimId} evaluated`
    });

    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();

    try {
      await updateDoc(doc(db, 'claims', claimId), updates);
    } catch (err) {
      console.warn('Firestore update claim notice:', err);
    }

    return true;
  }

  // ---------------- NOTIFICATIONS & AUDIT ----------------
  async createNotification(notif: Omit<NotificationRecord, 'id' | 'isRead' | 'createdAt'>): Promise<void> {
    const newNotif: NotificationRecord = {
      ...notif,
      id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(newNotif);
    if (this.notifications.length > 40) {
      this.notifications = this.notifications.slice(0, 40);
    }
    this.notifyNotifs();

    try {
      await setDoc(doc(db, 'notifications', newNotif.id), newNotif);
    } catch (e) {
      // local
    }
  }

  markNotificationRead(id: string): void {
    const n = this.notifications.find((item) => item.id === id);
    if (n) {
      n.isRead = true;
      this.saveToLocalStorageAndBroadcast(true);
      this.notifyNotifs();
      try {
        updateDoc(doc(db, 'notifications', id), { isRead: true });
      } catch (e) {
        // local
      }
    }
  }

  markAllNotificationsRead(): void {
    this.notifications.forEach((n) => {
      n.isRead = true;
    });
    this.saveToLocalStorageAndBroadcast(true);
    this.notifyNotifs();
  }

  private async logAudit(entry: Omit<AuditLogRecord, 'id' | 'timestamp'>): Promise<void> {
    const log: AuditLogRecord = {
      ...entry,
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 100) {
      this.auditLogs = this.auditLogs.slice(0, 100);
    }
    this.notifyAudit();

    try {
      await setDoc(doc(db, 'audit_logs', log.id), log);
    } catch (e) {
      // local
    }
  }

  clearAllData(): void {
    this.items = [];
    this.claims = [];
    this.potentialMatches = [];
    this.notifications = [];
    this.auditLogs = [];
    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();
  }

  seedCapstoneDemoData(): void {
    const now = new Date();
    const dAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

    const sampleItems: ItemRecord[] = [
      {
        id: 'FL-K79-01',
        type: 'found',
        title: 'Lenovo ThinkPad 65W USB-C Charger',
        category: 'Electronics & Gadgets',
        description: 'Found plugged into wall socket after evening class.',
        color: 'Black',
        brand: 'Lenovo',
        location: 'Main Academic Building - 3rd Floor IT Computer Lab',
        dateTime: dAgo(1),
        distinctiveMarks: 'Initials "BJ" written in silver marker',
        secretDetails: 'Serial ending in 9842, small nick on US prong',
        photoUrl: null,
        status: 'Found',
        reportedBy: {
          uid: 'finder-101',
          name: 'Ramon Lab Custodian',
          email: 'custodian.lab@ptc.edu.ph',
          role: 'staff',
          phone: '+63 917 555 1201'
        },
        custodyLocation: 'Campus Security Office - Cabinet A (Electronics)',
        createdAt: dAgo(1),
        updatedAt: dAgo(1)
      },
      {
        id: 'FL-K79-02',
        type: 'lost',
        title: 'Lenovo 65W Laptop Charger',
        category: 'Electronics & Gadgets',
        description: 'Left in Lab 302 during BSIT lecture.',
        color: 'Black',
        brand: 'Lenovo',
        location: 'Main Academic Building - 3rd Floor IT Computer Lab',
        dateTime: dAgo(1),
        distinctiveMarks: 'Silver pentel initials "BJ" on charger brick',
        secretDetails: 'Type-C connector, rubber strap attached',
        photoUrl: null,
        status: 'Potential Match',
        reportedBy: {
          uid: 'student-verdera',
          name: 'Brian Jomarie Verdera',
          email: 'brian.verdera@ptc.edu.ph',
          role: 'student',
          idNumber: '2023-3TL-0482',
          phone: '+63 928 441 9902'
        },
        createdAt: dAgo(1),
        updatedAt: dAgo(1)
      },
      {
        id: 'FL-K79-03',
        type: 'found',
        title: 'Brown Leather Bi-Fold Wallet',
        category: 'Wallets, Purses & Cash',
        description: 'Discovered on table in canteen near window.',
        color: 'Brown / Tan',
        brand: 'Leather Co',
        location: 'Student Center & Canteen',
        dateTime: dAgo(2),
        distinctiveMarks: 'Green PTC lanyard attached to zipper pouch',
        secretDetails: 'Beep card with sticker and 2x 100 peso bills inside',
        photoUrl: null,
        status: 'Under Verification',
        reportedBy: {
          uid: 'student-204',
          name: 'Camille Santos',
          email: 'camille.santos@ptc.edu.ph',
          role: 'student',
          idNumber: '2024-1BSBA-019'
        },
        custodyLocation: 'Campus Security Office - Safe Box (IDs & Valuables)',
        createdAt: dAgo(2),
        updatedAt: dAgo(2)
      },
      {
        id: 'FL-K79-04',
        type: 'found',
        title: 'AquaFlask 32oz Cobalt Tumbler',
        category: 'Tumblers & Personal Items',
        description: 'Left on bench beside Covered Court after sports practice.',
        color: 'Blue / Navy',
        brand: 'AquaFlask',
        location: 'Campus Quadrangle & Covered Court',
        dateTime: dAgo(3),
        distinctiveMarks: 'Anime stickers on bottom silicone boot',
        secretDetails: 'Spout cap has small dent; sticker says "PTC IT"',
        photoUrl: null,
        status: 'Found',
        reportedBy: {
          uid: 'security-01',
          name: 'Officer Dela Cruz',
          email: 'security.gate1@ptc.edu.ph',
          role: 'admin',
          phone: 'Ext. 104'
        },
        custodyLocation: 'Library Custody Desk',
        createdAt: dAgo(3),
        updatedAt: dAgo(3)
      }
    ];

    this.items = sampleItems;
    this.potentialMatches = [
      {
        id: 'match_FL-K79-02_FL-K79-01',
        lostItemId: 'FL-K79-02',
        foundItemId: 'FL-K79-01',
        lostItemTitle: 'Lenovo 65W Laptop Charger',
        foundItemTitle: 'Lenovo ThinkPad 65W USB-C Charger',
        score: 95,
        factors: [
          { factor: 'Category', match: true, scoreWeight: 30, detail: 'Electronics & Gadgets' },
          { factor: 'Location', match: true, scoreWeight: 20, detail: 'Exact location match' },
          { factor: 'Color', match: true, scoreWeight: 15, detail: 'Black' },
          { factor: 'Brand', match: true, scoreWeight: 15, detail: 'Lenovo' },
          { factor: 'Date Proximity', match: true, scoreWeight: 10, detail: 'Within 24 hours' },
          { factor: 'Keywords', match: true, scoreWeight: 5, detail: '65W charger' }
        ],
        status: 'pending',
        detectedAt: dAgo(1)
      }
    ];

    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();
  }

  getFirebaseConfig(): FirebaseConfigBridge {
    return {
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
      isConnected: true,
      lastSyncAt: new Date().toISOString()
    };
  }

  getFirestoreExportSchema() {
    return {
      schemaVersion: '1.0',
      projectId: firebaseConfig.projectId,
      collections: {
        items: this.items,
        claims: this.claims,
        potential_matches: this.potentialMatches,
        notifications: this.notifications,
        audit_logs: this.auditLogs
      }
    };
  }
}

export const realtimeStore = new RealtimeStore();
