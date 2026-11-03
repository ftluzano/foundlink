import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { tursoApi } from './tursoApi';
import {
  ItemRecord,
  ItemComment,
  ItemReaction,
  ItemReactionType,
  ClaimRecord,
  PotentialMatchRecord,
  NotificationRecord,
  AuditLogRecord,
  OnlineUserRecord,
  ReputationRecord,
  RecoveryReportRecord
} from '../types';
import { findPotentialMatchesForItem } from './matchingService';

type Listener<T> = (data: T) => void;

class RealtimeStore {
  private items: ItemRecord[] = [];
  private claims: ClaimRecord[] = [];
  private potentialMatches: PotentialMatchRecord[] = [];
  private notifications: NotificationRecord[] = [];
  private auditLogs: AuditLogRecord[] = [];
  private reputation: ReputationRecord[] = [];

  private itemsListeners: Set<Listener<ItemRecord[]>> = new Set();
  private claimsListeners: Set<Listener<ClaimRecord[]>> = new Set();
  private matchesListeners: Set<Listener<PotentialMatchRecord[]>> = new Set();
  private notifListeners: Set<Listener<NotificationRecord[]>> = new Set();
  private auditListeners: Set<Listener<AuditLogRecord[]>> = new Set();
  private reputationListeners: Set<Listener<ReputationRecord[]>> = new Set();

  private broadcastChannel: BroadcastChannel | null = null;
  public isDataConnected = false;
  public dataStatusMessage = 'Connecting to Turso...';

  constructor() {
    this.initStorageAndSync();
    this.initTursoListeners();
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

  private initTursoListeners() {
    let refreshInProgress = false;
    const refresh = async () => {
      if (refreshInProgress) return;
      refreshInProgress = true;
      try {
        const collections = auth.currentUser
          ? ['items', 'claims', 'potential_matches', 'notifications', 'audit_logs', 'reputation'] as const
          : ['items'] as const;
        const remote = await tursoApi.snapshot<{
          items: ItemRecord[];
          claims: ClaimRecord[];
          potential_matches: PotentialMatchRecord[];
          notifications: NotificationRecord[];
          audit_logs: AuditLogRecord[];
          reputation: ReputationRecord[];
        }>([...collections]);
        this.items = (remote.items || [])
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.notifyItems();

        if (auth.currentUser) {
          this.claims = (remote.claims || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          this.potentialMatches = (remote.potential_matches || []).sort((a, b) => b.score - a.score);
          this.notifications = (remote.notifications || []).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          this.auditLogs = (remote.audit_logs || []).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
          this.reputation = remote.reputation || [];
        } else {
          this.claims = [];
          this.potentialMatches = [];
          this.notifications = [];
          this.auditLogs = [];
          this.reputation = [];
        }

        this.isDataConnected = true;
        this.dataStatusMessage = 'Connected to Turso';
        this.saveToLocalStorageAndBroadcast(false);
        this.notifyClaims();
        this.notifyMatches();
        this.notifyNotifs();
        this.notifyAudit();
        this.notifyReputation();
      } catch (error) {
        this.isDataConnected = false;
        this.dataStatusMessage = error instanceof Error ? error.message : 'Turso connection failed.';
        console.warn('Turso sync notice:', this.dataStatusMessage);
      } finally {
        refreshInProgress = false;
      }
    };

    onAuthStateChanged(auth, () => void refresh());
    if (typeof window !== 'undefined') {
      window.setInterval(() => {
        if (!document.hidden) void refresh();
      }, 2_500);
      window.addEventListener('focus', () => void refresh());
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) void refresh();
      });
    }
    void refresh();
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
  private notifyReputation() {
    this.reputationListeners.forEach((fn) => fn([...this.reputation]));
  }

  private notifyAll() {
    this.notifyItems();
    this.notifyClaims();
    this.notifyMatches();
    this.notifyNotifs();
    this.notifyAudit();
    this.notifyReputation();
  }

  // ---------------- SUBSCRIPTIONS ----------------
  subscribeItems(listener: Listener<ItemRecord[]>): () => void {
    this.itemsListeners.add(listener);
    listener([...this.items]);
    return () => this.itemsListeners.delete(listener);
  }

  subscribeCustodianStatus(userId: string, listener: (isCustodian: boolean) => void): () => void {
    const primaryEmail = 'ftluzano@paterostechnologicalcollege.edu.ph';
    if (auth.currentUser?.email?.trim().toLowerCase() === primaryEmail) {
      listener(true);
      return () => {};
    }
    let active = true;
    let refreshInProgress = false;
    const refresh = () => {
      if (refreshInProgress) return;
      refreshInProgress = true;
      void tursoApi.list<{ uid: string }>('custodians')
        .then((custodians) => active && listener(custodians.some((custodian) => custodian.uid === userId)))
        .catch((error) => console.warn('Turso custodian sync notice:', error))
        .finally(() => { refreshInProgress = false; });
    };
    refresh();
    const handleFocus = () => refresh();
    const interval = window.setInterval(refresh, 2_500);
    window.addEventListener('focus', handleFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }

  subscribeOnlineUsers(listener: Listener<OnlineUserRecord[]>): () => void {
    type PresenceRecord = Omit<OnlineUserRecord, 'isCustodian'> & { isOnline: boolean };
    let presenceRecords: PresenceRecord[] = [];
    let custodianIds = new Set<string>();

    const notify = () => {
      const cutoff = Date.now() - 90_000;
      listener(presenceRecords
        .filter((record) => record.isOnline && Date.now() - new Date(record.lastSeen).getTime() < 90_000)
        .map(({ isOnline: _isOnline, ...record }) => ({
          ...record,
          isCustodian: custodianIds.has(record.uid)
        }))
        .filter((record) => new Date(record.lastSeen).getTime() >= cutoff)
        .sort((a, b) => a.name.localeCompare(b.name)));
    };

    let active = true;
    let refreshInProgress = false;
    const refresh = async () => {
      if (refreshInProgress) return;
      refreshInProgress = true;
      try {
        const [presence, custodians] = await Promise.all([
          tursoApi.list<PresenceRecord>('presence'),
          tursoApi.list<{ uid: string }>('custodians')
        ]);
        if (!active) return;
        presenceRecords = presence;
        custodianIds = new Set(custodians.map((custodian) => custodian.uid));
        notify();
      } catch (error) {
        console.warn('Turso online user sync notice:', error);
      } finally {
        refreshInProgress = false;
      }
    };
    void refresh();
    const handleFocus = () => void refresh();
    const refreshTimer = window.setInterval(() => void refresh(), 2_500);
    window.addEventListener('focus', handleFocus);

    return () => {
      active = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', handleFocus);
    };
  }

  async updatePresence(name: string, isOnline: boolean): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    await tursoApi.save('presence', user.uid, {
      uid: user.uid,
      name: name.trim() || user.displayName || user.email || 'Campus member',
      email: user.email || '',
      isOnline,
      lastSeen: new Date().toISOString()
    });
  }

  async setCustodian(userId: string, name: string, email: string, isCustodian: boolean): Promise<void> {
    const user = auth.currentUser;
    const primaryEmail = 'ftluzano@paterostechnologicalcollege.edu.ph';
    if (user?.email?.trim().toLowerCase() !== primaryEmail) {
      throw new Error('Only the primary Custodian can assign Custodian access.');
    }
    if (userId === user.uid) throw new Error('Your primary Custodian access cannot be removed here.');

    if (isCustodian) {
      await tursoApi.create('custodians', userId, {
        uid: userId,
        name,
        email,
        assignedBy: user.uid,
        assignedAt: new Date().toISOString()
      });
    } else {
      await tursoApi.delete('custodians', userId);
    }
  }

  subscribeItemSocial(
    itemId: string,
    listener: (comments: ItemComment[], reactions: ItemReaction[]) => void
  ): () => void {
    let active = true;
    let refreshInProgress = false;
    const refresh = async () => {
      if (refreshInProgress) return;
      refreshInProgress = true;
      try {
        const [allComments, allReactions] = await Promise.all([
          tursoApi.list<ItemComment & { itemId: string }>('item_comments'),
          tursoApi.list<ItemReaction & { itemId: string }>('item_reactions')
        ]);
        if (!active) return;
        listener(
          allComments.filter((comment) => comment.itemId === itemId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
          allReactions.filter((reaction) => reaction.itemId === itemId)
        );
      } catch (error) {
        console.warn('Turso item social sync notice:', error);
      } finally {
        refreshInProgress = false;
      }
    };
    void refresh();
    const handleFocus = () => void refresh();
    const interval = window.setInterval(() => void refresh(), 2_500);
    window.addEventListener('focus', handleFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
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
    await tursoApi.create('item_comments', `${itemId}:${comment.id}`, { ...comment, itemId });
  }

  async setItemReaction(itemId: string, type: ItemReactionType | null, userName: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in with your account to react.');

    const reactionId = `${itemId}:${user.uid}`;
    if (!type) {
      await tursoApi.delete('item_reactions', reactionId);
      return;
    }

    const reaction: ItemReaction = {
      userId: user.uid,
      userName,
      type,
      updatedAt: new Date().toISOString()
    };
    await tursoApi.save('item_reactions', reactionId, { ...reaction, itemId });
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
    const userListener: Listener<NotificationRecord[]> = (notifications) =>
      listener(notifications.filter((notification) => notification.userId === userId));
    this.notifListeners.add(userListener);
    userListener([...this.notifications]);
    return () => {
      this.notifListeners.delete(userListener);
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
    await tursoApi.create('recovery_reports', `${item.id}:${user.uid}`, {
      itemId: item.id,
      itemTitle: item.title,
      ownerUid: item.reportedBy.uid,
      finderUid: user.uid,
      finderName,
      handoffDetails: details,
      createdAt
    });
    await tursoApi.create('notifications', notificationId, notification);
  }

  async getRecoveryReports(itemId: string): Promise<RecoveryReportRecord[]> {
    const reports = await tursoApi.list<RecoveryReportRecord>('recovery_reports');
    return reports
      .filter((report) => report.itemId === itemId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async markItemRecovered(itemId: string, finderUid?: string): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in with your account before marking this item recovered.');

    const item = this.items.find((record) => record.id === itemId);
    if (!item || item.type !== 'lost' || item.reportedBy.uid !== user.uid) {
      throw new Error('Only the person who posted this lost item can mark it recovered.');
    }
    if (item.status === 'Recovered') return;

    const updatedAt = new Date().toISOString();
    await tursoApi.verifyRecovery(itemId, finderUid);
    const updatedItem = this.items.find((record) => record.id === itemId)!;
    updatedItem.status = 'Recovered';
    updatedItem.updatedAt = updatedAt;
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

  subscribeReputation(listener: Listener<ReputationRecord[]>): () => void {
    this.reputationListeners.add(listener);
    listener([...this.reputation]);
    return () => this.reputationListeners.delete(listener);
  }

  // ---------------- ACTIONS (Instant update + Turso persistence) ----------------
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
      await tursoApi.create('items', newItem.id, newItem);
    } catch (err) {
      console.warn('Turso publish item error:', err);
      throw new Error('Could not publish this report to the shared directory. Check your connection and retry.');
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
        userId: newItem.reportedBy.uid,
        title: `Match Detected (${bestMatch.score}%)`,
        message: `Correlation between "${bestMatch.lostItemTitle}" and "${bestMatch.foundItemTitle}".`,
        type: 'match',
        relatedItemId: newItem.id
      });

      // Save the match to Turso.
      try {
        await tursoApi.save('potential_matches', bestMatch.id, bestMatch);
      } catch (err) {
        // Fallback local
      }
    }

    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();

    // Keep the final status, including a detected match, in Turso.
    try {
      await tursoApi.save('items', newItem.id, newItem);
    } catch (err) {
      console.warn('Turso write item error (local fallback maintained):', err);
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
        userId: updatedItem.reportedBy.uid,
        title: `Status: ${updates.status}`,
        message: `Case ${id} (${updatedItem.title}) changed to ${updates.status}.`,
        type: 'status',
        relatedItemId: id
      });
    }

    // Instant local broadcast
    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();

    // Persist the updated record.
    try {
      await tursoApi.save('items', id, updatedItem);
    } catch (err) {
      console.warn('Turso update notice:', err);
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
      await tursoApi.delete('items', id);
    } catch (err) {
      console.warn('Turso delete notice:', err);
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
        await tursoApi.save('items', foundItem.id, foundItem);
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
      userId: newClaim.claimantId,
      title: 'New Ownership Claim',
      message: `${newClaim.claimantName} filed a verification claim for "${newClaim.foundItemTitle}".`,
      type: 'claim',
      relatedClaimId: newClaim.id,
      relatedItemId: newClaim.foundItemId
    });

    this.saveToLocalStorageAndBroadcast(true);
    this.notifyAll();

    try {
      await tursoApi.create('claims', newClaim.id, newClaim);
    } catch (err) {
      console.warn('Turso create claim notice:', err);
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
        userId: claim.claimantId,
        title: 'Claim Approved for Release',
        message: `Claim for "${claim.foundItemTitle}" approved. Ready for custody pickup.`,
        type: 'verification',
        relatedClaimId: claim.id,
        relatedItemId: foundItem.id
      });
      try {
        await tursoApi.save('items', foundItem.id, foundItem);
      } catch (e) {
        // fallback
      }
    } else if (updates.status === 'Returned' && foundItem) {
      foundItem.status = 'Returned';
      foundItem.updatedAt = new Date().toISOString();
      this.createNotification({
        userId: claim.claimantId,
        title: 'Item Returned',
        message: `Item "${foundItem.title}" released to ${claim.claimantName}.`,
        type: 'handover',
        relatedClaimId: claim.id,
        relatedItemId: foundItem.id
      });
      try {
        await tursoApi.save('items', foundItem.id, foundItem);
      } catch (e) {
        // fallback
      }
    } else if (updates.status === 'Rejected' && foundItem) {
      foundItem.status = 'Found';
      foundItem.updatedAt = new Date().toISOString();
      try {
        await tursoApi.save('items', foundItem.id, foundItem);
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
      await tursoApi.save('claims', claimId, claim);
    } catch (err) {
      console.warn('Turso update claim notice:', err);
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
      await tursoApi.create('notifications', newNotif.id, newNotif);
    } catch (e) {
      console.warn('Turso notification write notice:', e);
    }
  }

  async markNotificationRead(id: string): Promise<void> {
    const n = this.notifications.find((item) => item.id === id);
    if (n) {
      n.isRead = true;
      this.saveToLocalStorageAndBroadcast(true);
      this.notifyNotifs();
      await tursoApi.save('notifications', id, n);
    }
  }

  async markAllNotificationsRead(): Promise<void> {
    this.notifications.forEach((n) => {
      n.isRead = true;
    });
    this.saveToLocalStorageAndBroadcast(true);
    this.notifyNotifs();
    await Promise.all(this.notifications.map((notification) =>
      tursoApi.save('notifications', notification.id, notification)
    ));
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
      await tursoApi.create('audit_logs', log.id, log);
    } catch (e) {
      console.warn('Turso audit log write notice:', e);
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

}

export const realtimeStore = new RealtimeStore();
