import { createClient } from '@libsql/client';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const PRIMARY_CUSTODIAN_EMAIL = 'ftluzano@paterostechnologicalcollege.edu.ph';
const ALLOWED_COLLECTIONS = new Set([
  'items',
  'claims',
  'potential_matches',
  'notifications',
  'audit_logs',
  'users',
  'custodians',
  'presence',
  'item_ups',
  'recovery_reports',
  'reputation',
  'conversations',
  'messages'
]);
const CLEARABLE_COLLECTIONS = [
  'items',
  'claims',
  'potential_matches',
  'notifications',
  'presence',
  'item_comments',
  'item_reactions',
  'item_ups',
  'recovery_reports',
  'conversations',
  'messages'
];
const firebaseKeys = createRemoteJWKSet(new URL(
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
));

let database;
let schemaReady;

function getDatabase() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error('Turso is not configured. Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
  database ??= createClient({ url, authToken });
  schemaReady ??= Promise.all([database.execute(`
    CREATE TABLE IF NOT EXISTS app_records (
      collection TEXT NOT NULL,
      record_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (collection, record_id)
    )
  `), database.execute(`
    CREATE TABLE IF NOT EXISTS reputation_events (
      event_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      points INTEGER NOT NULL,
      reason TEXT NOT NULL,
      item_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)]);
  return database;
}

async function getIdentity(request) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('Firebase token verification is not configured. Set FIREBASE_PROJECT_ID.');

  const { payload } = await jwtVerify(token, firebaseKeys, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId
  });
  if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Invalid Firebase user token.');

  return {
    uid: payload.sub,
    email: typeof payload.email === 'string' ? payload.email.toLowerCase() : '',
    name: typeof payload.name === 'string' ? payload.name : ''
  };
}

async function isAdmin(db, identity) {
  if (identity.email === PRIMARY_CUSTODIAN_EMAIL) return true;
  const result = await db.execute({
    sql: 'SELECT record_id FROM app_records WHERE collection = ? AND record_id = ? LIMIT 1',
    args: ['custodians', identity.uid]
  });
  return result.rows.length > 0;
}

function ownsClaim(record, uid) {
  return record.claimantId === uid || record.claimantUid === uid || record.claimant?.uid === uid;
}

export function authorizeRead(collection, id, record, identity, admin) {
  if (collection === 'reputation') return true;
  if (collection === 'items') return true;
  if (collection === 'item_ups') return Boolean(identity && record.userId === identity.uid);
  if (!identity) return false;
  if (collection === 'potential_matches') return true;
  if (collection === 'claims') return admin || ownsClaim(record, identity.uid);
  if (collection === 'notifications') return admin || record.userId === identity.uid;
  if (collection === 'audit_logs') return admin;
  if (collection === 'users') return id === identity.uid;
  if (collection === 'custodians') return admin || id === identity.uid;
  if (collection === 'presence') return admin;
  if (collection === 'recovery_reports') {
    return admin || record.finderUid === identity.uid || record.ownerUid === identity.uid;
  }
  if (collection === 'conversations') {
    return (record.ownerUid === identity.uid && !record.hiddenForOwner) || record.participantUid === identity.uid;
  }
  return false;
}

export function redactRecord(collection, record, identity, admin) {
  if (collection !== 'items') return record;
  return {
    ...record,
    secretDetails: '',
    reportedBy: {
      ...record.reportedBy,
      email: '',
      phone: '',
      idNumber: ''
    }
  };
}

async function authorizeWrite(db, collection, operation, id, data, identity, admin) {
  if (collection === 'items') {
    if (operation === 'delete') {
      const current = await readRecord(db, collection, id);
      return admin || current?.reportedBy?.uid === identity.uid;
    }
    const current = await readRecord(db, collection, id);
    return admin || (data.reportedBy?.uid === identity.uid && (!current || current.reportedBy?.uid === identity.uid));
  }
  if (collection === 'claims') {
    if (operation === 'delete') return admin;
    const current = await readRecord(db, collection, id);
    if (operation === 'create') return !current;
    return admin || ownsClaim(current || {}, identity.uid);
  }
  if (collection === 'potential_matches') return true;
  if (collection === 'notifications') {
    if (operation === 'delete') {
      const current = await readRecord(db, collection, id);
      return admin || current?.userId === identity.uid;
    }
    const current = await readRecord(db, collection, id);
    if (admin || current?.userId === identity.uid) return true;
    if (operation === 'create' && data.userId === identity.uid) return true;
    if (operation === 'create' && data.type === 'recovery' && data.senderUid === identity.uid) {
      const item = await readRecord(db, 'items', data.relatedItemId);
      return item?.type === 'lost' && item.reportedBy?.uid === data.userId;
    }
    return false;
  }
  if (collection === 'audit_logs') {
    return operation === 'create' && !(await readRecord(db, collection, id));
  }
  if (collection === 'users') {
    if (operation === 'delete') return admin;
    return id === identity.uid && data.uid === id && data.role !== 'admin';
  }
  if (collection === 'custodians') {
    return identity.email === PRIMARY_CUSTODIAN_EMAIL && id !== identity.uid;
  }
  if (collection === 'presence') {
    if (operation === 'delete') return id === identity.uid;
    return id === identity.uid && data.uid === identity.uid && typeof data.isOnline === 'boolean';
  }
  if (collection === 'recovery_reports') {
    if (operation !== 'create' || data.finderUid !== identity.uid) return false;
    if (await readRecord(db, collection, id)) return false;
    const item = await readRecord(db, 'items', data.itemId);
    return item?.type === 'lost' && item.reportedBy?.uid === data.ownerUid && data.ownerUid !== identity.uid &&
      typeof data.handoffDetails === 'string' && data.handoffDetails.length > 0 && data.handoffDetails.length <= 1000;
  }
  return false;
}

async function readRecord(db, collection, id) {
  const result = await db.execute({
    sql: 'SELECT data FROM app_records WHERE collection = ? AND record_id = ? LIMIT 1',
    args: [collection, id]
  });
  return result.rows.length ? JSON.parse(result.rows[0].data) : null;
}

async function writeRecord(db, collection, id, data) {
  await db.execute({
    sql: `INSERT INTO app_records (collection, record_id, data, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(collection, record_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    args: [collection, id, JSON.stringify(data), new Date().toISOString()]
  });
}

export async function toggleItemUp(db, identity, itemId) {
  if (!identity) return { status: 401, body: { error: 'Sign in to use Up!.' } };
  if (typeof itemId !== 'string' || !itemId) return { status: 400, body: { error: 'An item is required.' } };

  const tx = await db.transaction('write');
  try {
    const item = await readRecord(tx, 'items', itemId);
    if (!item) {
      await tx.rollback();
      return { status: 404, body: { error: 'Item not found.' } };
    }
    const voteId = `${itemId}:${identity.uid}`;
    const currentVote = await readRecord(tx, 'item_ups', voteId);
    if (currentVote) {
      await tx.execute({
        sql: 'DELETE FROM app_records WHERE collection = ? AND record_id = ?',
        args: ['item_ups', voteId]
      });
      item.upCount = Math.max(0, Number(item.upCount || 0) - 1);
    } else {
      const createdAt = new Date().toISOString();
      await writeRecord(tx, 'item_ups', voteId, { id: voteId, itemId, userId: identity.uid, createdAt });
    }
    const voteCount = await tx.execute({
      sql: "SELECT COUNT(*) AS count FROM app_records WHERE collection = ? AND json_extract(data, '$.itemId') = ?",
      args: ['item_ups', itemId]
    });
    item.upCount = Number(voteCount.rows[0]?.count || 0);
    item.updatedAt = new Date().toISOString();
    await writeRecord(tx, 'items', itemId, item);
    await tx.commit();
    return { status: 200, body: { upvoted: !currentVote, upCount: item.upCount } };
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export async function handleChatOperation(db, operation, identity, data) {
  if (!identity) return { status: 401, body: { error: 'Sign in to use messages.' } };
  if (!['send_message', 'mark_conversation_read', 'delete_conversation'].includes(operation)) return null;

  const conversationId = typeof data?.conversationId === 'string' ? data.conversationId : '';
  if (operation === 'send_message') {
    const text = typeof data?.text === 'string' ? data.text.trim() : '';
    if (!text || text.length > 2000) return { status: 400, body: { error: 'Messages must be between 1 and 2000 characters.' } };

    const tx = await db.transaction('write');
    try {
      let conversation = conversationId ? await readRecord(tx, 'conversations', conversationId) : null;
      const itemId = typeof data.itemId === 'string' ? data.itemId : conversation?.itemId;
      const item = itemId ? await readRecord(tx, 'items', itemId) : null;
      if (!item) {
        await tx.rollback();
        return { status: 404, body: { error: 'This report is no longer available.' } };
      }

      if (!conversation) {
        const existingId = `${item.id}:${identity.uid}`;
        if (!conversationId) conversation = await readRecord(tx, 'conversations', existingId);
      }

      if (!conversation) {
        const ownerUid = item.reportedBy?.uid;
        if (!ownerUid || ownerUid === identity.uid || conversationId) {
          await tx.rollback();
          return { status: 403, body: { error: 'You cannot start a conversation on this post.' } };
        }
        const expectedId = `${item.id}:${identity.uid}`;
        const profile = await readRecord(tx, 'users', identity.uid);
        conversation = {
          id: expectedId,
          itemId: item.id,
          itemTitle: item.title,
          itemType: item.type,
          ownerUid,
          ownerName: item.reportedBy.name || 'Post owner',
          participantUid: identity.uid,
          participantName: profile?.name || identity.name || 'Campus member',
          lastMessage: '',
          lastMessageAt: '',
          lastSenderUid: '',
          ownerUnread: 0,
          participantUnread: 0,
          hiddenForOwner: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else if (conversation.itemId !== item.id || ![conversation.ownerUid, conversation.participantUid].includes(identity.uid)) {
        await tx.rollback();
        return { status: 403, body: { error: 'You are not a participant in this conversation.' } };
      }

      const profile = await readRecord(tx, 'users', identity.uid);
      const senderName = profile?.name || identity.name || (identity.uid === conversation.ownerUid ? conversation.ownerName : conversation.participantName);
      const createdAt = new Date().toISOString();
      const messageId = `MSG-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const message = { id: messageId, conversationId: conversation.id, senderUid: identity.uid, senderName, text, createdAt };
      const isOwner = identity.uid === conversation.ownerUid;
      conversation.lastMessage = text.slice(0, 180);
      conversation.lastMessageAt = createdAt;
      conversation.lastSenderUid = identity.uid;
      conversation.updatedAt = createdAt;
      if (isOwner) conversation.participantUnread += 1;
      else {
        conversation.ownerUnread += 1;
        conversation.hiddenForOwner = false;
      }

      await writeRecord(tx, 'conversations', conversation.id, conversation);
      await writeRecord(tx, 'messages', messageId, message);
      const recipientUid = isOwner ? conversation.participantUid : conversation.ownerUid;
      const notificationId = `CHAT-${conversation.id}-${Date.now()}`;
      await writeRecord(tx, 'notifications', notificationId, {
        id: notificationId,
        userId: recipientUid,
        senderUid: identity.uid,
        title: `New message about ${conversation.itemTitle}`,
        message: `${senderName} sent you a message about your ${conversation.itemType} item.`,
        type: 'system',
        relatedItemId: conversation.itemId,
        relatedConversationId: conversation.id,
        isRead: false,
        createdAt
      });
      await tx.commit();
      return { status: 200, body: { conversation, message } };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  if (!conversationId) return { status: 400, body: { error: 'A conversation is required.' } };
  const conversation = await readRecord(db, 'conversations', conversationId);
  if (!conversation || ![conversation.ownerUid, conversation.participantUid].includes(identity.uid) ||
      (conversation.ownerUid === identity.uid && conversation.hiddenForOwner)) {
    return { status: 404, body: { error: 'Conversation not found.' } };
  }

  if (operation === 'delete_conversation') {
    if (identity.uid !== conversation.ownerUid) {
      return { status: 403, body: { error: 'Only the post owner can remove this conversation from their inbox.' } };
    }
    conversation.hiddenForOwner = true;
    conversation.ownerUnread = 0;
    conversation.updatedAt = new Date().toISOString();
    await writeRecord(db, 'conversations', conversation.id, conversation);
    return { status: 200, body: { ok: true } };
  }

  if (identity.uid === conversation.ownerUid) conversation.ownerUnread = 0;
  else conversation.participantUnread = 0;
  conversation.updatedAt = new Date().toISOString();
  await writeRecord(db, 'conversations', conversation.id, conversation);
  return { status: 200, body: { ok: true } };
}

async function addReputationEvent(db, event) {
  await db.execute({
    sql: `INSERT INTO reputation_events (event_id, user_id, user_name, points, reason, item_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(event_id) DO NOTHING`,
    args: [event.id, event.uid, event.name || 'Campus member', event.points, event.reason, event.itemId, new Date().toISOString()]
  });
}

async function getReputationLeaderboard(db) {
  const result = await db.execute(`
    SELECT user_id AS uid,
           COALESCE(MAX(user_name), 'Campus member') AS name,
           SUM(points) AS points,
           SUM(CASE WHEN reason = 'verified_recovery' THEN 1 ELSE 0 END) AS verifiedRecoveries,
           SUM(CASE WHEN reason = 'returned_surrender' THEN 1 ELSE 0 END) AS returnedSurrenders
    FROM reputation_events
    GROUP BY user_id
    ORDER BY points DESC, name COLLATE NOCASE ASC
    LIMIT 50
  `);
  return result.rows.map((row) => ({
    ...row,
    points: Number(row.points),
    verifiedRecoveries: Number(row.verifiedRecoveries),
    returnedSurrenders: Number(row.returnedSurrenders)
  }));
}

export async function clearOperationalData(db, identity) {
  const tx = await db.transaction('write');
  try {
    const collectionPlaceholders = CLEARABLE_COLLECTIONS.map(() => '?').join(', ');
    await tx.execute({
      sql: `DELETE FROM app_records WHERE collection IN (${collectionPlaceholders})`,
      args: CLEARABLE_COLLECTIONS
    });
    await tx.execute('DELETE FROM reputation_events');
    const timestamp = new Date().toISOString();
    const auditId = `AUDIT-CLEAR-${Date.now()}`;
    await writeRecord(tx, 'audit_logs', auditId, {
      id: auditId,
      timestamp,
      actorId: identity?.uid,
      actorName: identity?.name || 'Custodian',
      actorRole: 'admin',
      action: 'Operational Records Cleared',
      details: 'Items, claims, messages, notifications, Up! votes, and reputation were cleared. Audit history was preserved.'
    });
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

export default async function handler(request, response) {
  if (!['GET', 'POST'].includes(request.method || '')) {
    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const db = getDatabase();
    await schemaReady;
    const identity = await getIdentity(request);
    const admin = identity ? await isAdmin(db, identity) : false;

    if (request.method === 'GET') {
      const requestedMessageConversation = String(request.query.conversationId || '');
      if (request.query.collection === 'messages') {
        if (!identity) return response.status(401).json({ error: 'Sign in to view messages.' });
        if (!requestedMessageConversation) return response.status(400).json({ error: 'A conversation is required.' });
        const conversation = await readRecord(db, 'conversations', requestedMessageConversation);
        if (!conversation || ![conversation.ownerUid, conversation.participantUid].includes(identity.uid) ||
            (conversation.ownerUid === identity.uid && conversation.hiddenForOwner)) {
          return response.status(404).json({ error: 'Conversation not found.' });
        }
        const result = await db.execute({
          sql: 'SELECT data FROM app_records WHERE collection = ?',
          args: ['messages']
        });
        const messages = result.rows
          .map((row) => JSON.parse(row.data))
          .filter((message) => message.conversationId === requestedMessageConversation)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return response.status(200).json({ records: messages });
      }
      const requestedCollections = request.query.collections
        ? String(request.query.collections).split(',').filter(Boolean)
        : null;
      if (requestedCollections) {
        if (requestedCollections.some((collection) => !ALLOWED_COLLECTIONS.has(collection))) {
          return response.status(400).json({ error: 'Unknown collection.' });
        }
        const records = {};
        await Promise.all(requestedCollections.map(async (collection) => {
          if (collection === 'reputation') {
            records[collection] = await getReputationLeaderboard(db);
            return;
          }
          const result = await db.execute({
            sql: 'SELECT record_id, data FROM app_records WHERE collection = ?',
            args: [collection]
          });
          records[collection] = result.rows
            .filter((row) => authorizeRead(collection, row.record_id, JSON.parse(row.data), identity, admin))
            .map((row) => redactRecord(collection, JSON.parse(row.data), identity, admin));
        }));
        return response.status(200).json({ records });
      }
      const collection = String(request.query.collection || '');
      if (!ALLOWED_COLLECTIONS.has(collection)) return response.status(400).json({ error: 'Unknown collection.' });
      if (collection === 'reputation') {
        return response.status(200).json({ records: await getReputationLeaderboard(db) });
      }
      const result = await db.execute({
        sql: 'SELECT record_id, data FROM app_records WHERE collection = ?',
        args: [collection]
      });
      const records = result.rows
        .filter((row) => authorizeRead(collection, row.record_id, JSON.parse(row.data), identity, admin))
        .map((row) => redactRecord(collection, JSON.parse(row.data), identity, admin));
      return response.status(200).json({ records });
    }

    if (!identity) return response.status(401).json({ error: 'Sign in with Firebase before changing site data.' });
    const { collection, operation, id, data } = request.body || {};
    if (operation === 'toggle_item_up') {
      const result = await toggleItemUp(db, identity, data?.itemId);
      return response.status(result.status).json(result.body);
    }
    if (operation === 'get_private_item') {
      if (!admin) return response.status(403).json({ error: 'Only a Custodian can review confidential item details.' });
      const itemId = typeof data?.itemId === 'string' ? data.itemId : '';
      const item = itemId ? await readRecord(db, 'items', itemId) : null;
      if (!item) return response.status(404).json({ error: 'Item record not found.' });
      const auditId = `AUDIT-PRIVATE-${itemId}-${Date.now()}`;
      await writeRecord(db, 'audit_logs', auditId, {
        id: auditId,
        timestamp: new Date().toISOString(),
        actorId: identity.uid,
        actorName: identity.name || 'Custodian',
        actorRole: 'admin',
        action: 'Private Verification Details Accessed',
        entityType: 'item',
        entityId: itemId,
        details: `Confidential verification detail opened for claim review on ${itemId}`
      });
      return response.status(200).json({ item: { id: item.id, title: item.title, secretDetails: item.secretDetails || '' } });
    }
    if (['send_message', 'mark_conversation_read', 'delete_conversation'].includes(operation)) {
      const result = await handleChatOperation(db, operation, identity, data || {});
      return response.status(result.status).json(result.body);
    }
    if (operation === 'clear_app_data') {
      if (!admin) return response.status(403).json({ error: 'Only a custodian can clear site records.' });
      await clearOperationalData(db, identity);
      return response.status(200).json({ ok: true });
    }
    if (operation === 'verify_recovery') {
      const tx = await db.transaction('write');
      try {
        const item = await readRecord(tx, 'items', id);
        if (!item || item.reportedBy?.uid !== identity.uid || item.type !== 'lost') {
          await tx.rollback();
          return response.status(403).json({ error: 'Only the owner can verify recovery of this lost item.' });
        }
        if (item.status === 'Recovered' || item.status === 'Returned') {
          await tx.rollback();
          return response.status(409).json({ error: 'This item has already been marked recovered.' });
        }

        if (data?.finderUid) {
          const reportId = `${id}:${data.finderUid}`;
          const report = await readRecord(tx, 'recovery_reports', reportId);
          if (!report || report.finderUid !== data.finderUid || report.ownerUid !== identity.uid) {
            await tx.rollback();
            return response.status(403).json({ error: 'That recovery report could not be verified.' });
          }
          await addReputationEvent(tx, {
            id: `recovery:${id}:${data.finderUid}`,
            uid: report.finderUid,
            name: report.finderName,
            points: 10,
            reason: 'verified_recovery',
            itemId: id
          });
        }

        item.status = 'Recovered';
        item.updatedAt = new Date().toISOString();
        await tx.execute({
          sql: 'UPDATE app_records SET data = ?, updated_at = ? WHERE collection = ? AND record_id = ?',
          args: [JSON.stringify(item), item.updatedAt, 'items', id]
        });
        const auditId = `AUDIT-RECOVERY-${id}-${Date.now()}`;
        await writeRecord(tx, 'audit_logs', auditId, {
          id: auditId,
          timestamp: item.updatedAt,
          actorId: identity.uid,
          actorName: item.reportedBy.name || 'Item owner',
          actorRole: 'owner',
          action: 'Recovery Confirmed',
          entityType: 'item',
          entityId: id,
          details: data?.finderUid ? `Recovery verified with finder ${data.finderUid}` : 'Owner confirmed item recovery'
        });
        await tx.commit();
        return response.status(200).json({ ok: true, item });
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    }
    if (!ALLOWED_COLLECTIONS.has(collection) || !['create', 'update', 'delete'].includes(operation) || typeof id !== 'string' || !id) {
      return response.status(400).json({ error: 'Invalid data operation.' });
    }
    if (operation !== 'delete' && (!data || typeof data !== 'object' || Array.isArray(data))) {
      return response.status(400).json({ error: 'A record is required.' });
    }
    if (collection === 'audit_logs' && operation !== 'create') {
      return response.status(403).json({ error: 'Audit records are append-only.' });
    }
    if (!await authorizeWrite(db, collection, operation, id, data || {}, identity, admin)) {
      return response.status(403).json({ error: 'You do not have permission to change this record.' });
    }

    let recordData = data;
    if (collection === 'items') {
      const currentItem = await readRecord(db, 'items', id);
      recordData = { ...data, upCount: Number(currentItem?.upCount || 0) };
    }

    if (operation === 'delete') {
      await db.execute({
        sql: 'DELETE FROM app_records WHERE collection = ? AND record_id = ?',
        args: [collection, id]
      });
    } else {
      await db.execute({
        sql: `INSERT INTO app_records (collection, record_id, data, updated_at)
              VALUES (?, ?, ?, ?)
              ON CONFLICT(collection, record_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
        args: [collection, id, JSON.stringify(recordData), new Date().toISOString()]
      });
    }

    if (collection === 'claims' && operation === 'update' && admin && data.status === 'Returned') {
      const returnedClaim = data;
      const foundItem = await readRecord(db, 'items', returnedClaim.foundItemId);
      if (foundItem?.type === 'found' && foundItem.reportedBy?.uid) {
        await addReputationEvent(db, {
          id: `surrender:${id}:${foundItem.id}`,
          uid: foundItem.reportedBy.uid,
          name: foundItem.reportedBy.name,
          points: 5,
          reason: 'returned_surrender',
          itemId: foundItem.id
        });
      }
    }

    return response.status(200).json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    const status = /token|unauthorized|jwt/i.test(message) ? 401 : 500;
    if (status === 500) console.error('Turso API request failed:', message);
    return response.status(status).json({ error: status === 401 ? 'Your sign-in session is invalid. Sign in again.' : 'The Turso data service is unavailable.' });
  }
}