import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  writeBatch
} from 'firebase/firestore';
import { auth, db, firebaseConfig } from './firebase';
import {
  ItemRecord,
  ItemComment,
  ItemReaction,
  ItemReactionType,
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
          const remoteItems: ItemRecord[] = [];
          snapshot.forEach((d) => remoteItems.push(d.data() as ItemRecord));
          remoteItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.items = remoteItems;
          this.saveToLocalStorageAndBroadcast(false);
          this.notifyItems();
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

      // 4. Audit Logs Listener
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

      this.items = this.sanitizeLocalData(itemsRaw ? JSON.parse(itemsRaw) : [], 'item');
      this.claims = this.sanitizeLocalData(claimsRaw ? JSON.parse(claimsRaw) : [], 'claim');
      this.potentialMatches = this.sanitizeLocalData(matchesRaw ? JSON.parse(matchesRaw) : [], 'match');
      this.notifications = this.sanitizeLocalData(notifsRaw ? JSON.parse(notifsRaw) : [], 'notification');
      this.auditLogs = this.sanitizeLocalData(auditRaw ? JSON.parse(auditRaw) : [], 'audit');

      if (this.items.length === 0 && itemsRaw) {
        localStorage.removeItem('foundlink_items');
      }
      if (this.claims.length === 0 && claimsRaw) {
        localStorage.removeItem('foundlink_claims');
      }
      if (this.potentialMatches.length === 0 && matchesRaw) {
        localStorage.removeItem('foundlink_matches');
      }
      if (this.notifications.length === 0 && notifsRaw) {
        localStorage.removeItem('foundlink_notifications');
      }
      if (this.auditLogs.length === 0 && auditRaw) {
        localStorage.removeItem('foundlink_audit_logs');
      }

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
      if (this.items.length === 0) {
        localStorage.removeItem('foundlink_items');
      } else {
        localStorage.setItem('foundlink_items', JSON.stringify(this.items));
      }

      if (this.claims.length === 0) {
        localStorage.removeItem('foundlink_claims');
      } else {
        localStorage.setItem('foundlink_claims', JSON.stringify(this.claims));
      }

      if (this.potentialMatches.length === 0) {
        localStorage.removeItem('foundlink_matches');
      } else {
        localStorage.setItem('foundlink_matches', JSON.stringify(this.potentialMatches));
      }

      if (this.notifications.length === 0) {
        localStorage.removeItem('foundlink_notifications');
      } else {
        localStorage.setItem('foundlink_notifications', JSON.stringify(this.notifications));
      }

      if (this.auditLogs.length === 0) {
        localStorage.removeItem('foundlink_audit_logs');
      } else {
        localStorage.setItem('foundlink_audit_logs', JSON.stringify(this.auditLogs));
      }

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

  subscribeItemSocial(
    itemId: string,
    listener: (comments: ItemComment[], reactions: ItemReaction[]) => void
  ): () => void {
    let comments: ItemComment[] = [];
    let reactions: ItemReaction[] = [];
    const notify = () => listener([...comments], [...reactions]);

    const unsubscribeComments = onSnapshot(
      collection(db, 'items', itemId, 'comments'),
      (snapshot) => {
        comments = snapshot.docs
          .map((commentDoc) => commentDoc.data() as ItemComment)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        notify();
      },
      (error) => console.warn('Item comments sync notice:', error.message)
    );
    const unsubscribeReactions = onSnapshot(
      collection(db, 'items', itemId, 'reactions'),
      (snapshot) => {
        reactions = snapshot.docs.map((reactionDoc) => reactionDoc.data() as ItemReaction);
        notify();
      },
      (error) => console.warn('Item reactions sync notice:', error.message)
    );

    return () => {
      unsubscribeComments();
      unsubscribeReactions();
    };
  }

  async createItemComment(itemId: string, authorName: string, text: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in with your account to comment.');

    const comment: ItemComment = {
      id: `comment_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      authorId: user.uid,
      authorName,
      text: text.trim(),
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'items', itemId, 'comments', comment.id), comment);
  }

  async setItemReaction(itemId: string, type: ItemReactionType | null, userName: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in with your account to react.');

    const reactionRef = doc(db, 'items', itemId, 'reactions', user.uid);
    if (!type) {
      await deleteDoc(reactionRef);
      return;
    }

    const reaction: ItemReaction = {
      userId: user.uid,
      userName,
      type,
      updatedAt: new Date().toISOString()
    };
    await setDoc(reactionRef, reaction);
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

  subscribeNotifications(userId: string, listener: Listener<NotificationRecord[]>): () => void {
    this.notifListeners.add(listener);
    this.notifications = [];
    listener([]);
    const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(
      notificationsQuery,
      (snapshot) => {
        this.notifications = snapshot.docs
          .map((notificationDoc) => notificationDoc.data() as NotificationRecord)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        this.saveToLocalStorageAndBroadcast(false);
        this.notifyNotifs();
      },
      (error) => console.warn('User notifications sync notice:', error.message)
    );
    return () => {
      unsubscribe();
      this.notifListeners.delete(listener);
    };
  }

  async reportLostItemFound(itemId: string, finderName: string, handoffDetails: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in with your account before reporting a found item.');

    const item = this.items.find((record) => record.id === itemId);
    if (!item || item.type !== 'lost' || item.status === 'Recovered' || item.status === 'Returned') {
      throw new Error('This lost-item post is no longer accepting found reports.');
    }
    if (!item.reportedBy.uid || item.reportedBy.uid === user.uid) {
      throw new Error('You can only report finding another user’s lost item.');
    }

    const details = handoffDetails.trim();
    if (!details) throw new Error('Enter where the owner can meet you or collect the item.');

    const createdAt = new Date().toISOString();
    const notificationId = `RECOVERY-${item.id}-${user.uid}`;
    const notification: NotificationRecord = {
      id: notificationId,
      userId: item.reportedBy.uid,
      senderUid: user.uid,
      title: 'Someone found your lost item',
      message: `${finderName} reports finding “${item.title}”. Handoff details: ${details}`,
      type: 'recovery',
      relatedItemId: item.id,
      isRead: false,
      createdAt
    };
    const batch = writeBatch(db);
    batch.set(doc(db, 'items', item.id, 'recovery_reports', user.uid), {
      itemId: item.id,
      itemTitle: item.title,
      ownerUid: item.reportedBy.uid,
      finderUid: user.uid,
      finderName,
      handoffDetails: details,
      createdAt
    });
    batch.set(doc(db, 'notifications', notificationId), notification);
    await batch.commit();
  }

  async markItemRecovered(itemId: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in with your account before marking this item recovered.');

    const item = this.items.find((record) => record.id === itemId);
    if (!item || item.type !== 'lost' || item.reportedBy.uid !== user.uid) {
      throw new Error('Only the person who posted this lost item can mark it recovered.');
    }
    if (item.status === 'Recovered') return;

    const updatedAt = new Date().toISOString();
    await updateDoc(doc(db, 'items', itemId), { status: 'Recovered', updatedAt });
    this.items = this.items.map((record) => record.id === itemId
      ? { ...record, status: 'Recovered', updatedAt }
      : record);
    this.saveToLocalStorageAndBroadcast(true);
    this.notifyItems();
  }

  subscribeAuditLogs(listener: Listener<AuditLogRecord[]>): () => void {
    this.auditListeners.add(listener);
    listener([...this.auditLogs]);
    return () => this.auditListeners.delete(listener);
  }

  // ---------------- ACTIONS (Instant update + Firestore setDoc) ----------------
  async createItem(itemData: Omit<ItemRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ItemRecord> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      throw new Error('Your session is not connected to Firebase. Sign in again before publishing a report.');
    }

    const now = new Date().toISOString();
    const newItem: ItemRecord = {
      ...itemData,
      reportedBy: { ...itemData.reportedBy, uid: firebaseUser.uid },
      id: `FL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
      createdAt: now,
      updatedAt: now
    };

    try {
      await setDoc(doc(db, 'items', newItem.id), newItem);
    } catch (err) {
      console.warn('Firestore publish item error:', err);
      throw new Error('Could not publish this report to the shared directory. Please sign in again and retry.');
    }

    // Instant local optimistic update
    this.items = [newItem, ...this.items.filter((item) => item.id !== newItem.id)];

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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('foundlink_items');
      localStorage.removeItem('foundlink_claims');
      localStorage.removeItem('foundlink_matches');
      localStorage.removeItem('foundlink_notifications');
      localStorage.removeItem('foundlink_audit_logs');
    }
    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();
  }

  private sanitizeLocalData<T extends Record<string, any>>(records: T[], type: 'item' | 'claim' | 'match' | 'notification' | 'audit'): T[] {
    if (!Array.isArray(records)) return [];

    const isDemoRecord = (record: Record<string, any>) => {
      const rawId = String(record.id ?? '');
      const rawTitle = String(record.title ?? '');
      const rawName = String(record.reportedBy?.name ?? '');
      return rawId.startsWith('FL-K79') || rawId.startsWith('match_FL-K79') || rawTitle.includes('Lenovo') || rawName.includes('Ramon Lab') || rawName.includes('Brian Jomarie');
    };

    const filtered = records.filter((record) => {
      if (!record || typeof record !== 'object') return false;
      if (type === 'item' && isDemoRecord(record)) return false;
      if (type === 'claim' && record.foundItemId && String(record.foundItemId).startsWith('FL-K79')) return false;
      if (type === 'match' && (String(record.id ?? '').startsWith('match_FL-K79') || String(record.lostItemId ?? '').startsWith('FL-K79') || String(record.foundItemId ?? '').startsWith('FL-K79'))) return false;
      if (type === 'notification' && String(record.relatedItemId ?? '').startsWith('FL-K79')) return false;
      if (type === 'audit' && String(record.entityId ?? '').startsWith('FL-K79')) return false;
      return true;
    });

    return filtered;
  }

  seedCapstoneDemoData(): void {
    this.items = [];
    this.claims = [];
    this.potentialMatches = [];
    this.notifications = [];
    this.auditLogs = [];

    if (typeof window !== 'undefined') {
      localStorage.removeItem('foundlink_items');
      localStorage.removeItem('foundlink_claims');
      localStorage.removeItem('foundlink_matches');
      localStorage.removeItem('foundlink_notifications');
      localStorage.removeItem('foundlink_audit_logs');
    }

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
