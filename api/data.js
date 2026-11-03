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
  'item_comments',
  'item_reactions',
  'recovery_reports',
  'reputation'
]);
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
    email: typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
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

function authorizeRead(collection, id, record, identity, admin) {
  if (collection === 'reputation') return true;
  if (collection === 'items') return true;
  if (collection === 'item_comments' || collection === 'item_reactions') return true;
  if (!identity) return false;
  if (collection === 'potential_matches') return true;
  if (collection === 'claims') return admin || ownsClaim(record, identity.uid);
  if (collection === 'notifications') return admin || record.userId === identity.uid;
  if (collection === 'audit_logs') return admin;
  if (collection === 'users') return admin || id === identity.uid;
  if (collection === 'custodians') return admin || id === identity.uid;
  if (collection === 'presence') return admin;
  if (collection === 'recovery_reports') {
    return admin || record.finderUid === identity.uid || record.ownerUid === identity.uid;
  }
  return false;
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
  if (collection === 'audit_logs') return operation === 'create';
  if (collection === 'users') {
    if (operation === 'delete') return admin;
    return (admin || id === identity.uid) && data.uid === id && data.role !== 'admin';
  }
  if (collection === 'custodians') {
    return identity.email === PRIMARY_CUSTODIAN_EMAIL && id !== identity.uid;
  }
  if (collection === 'presence') {
    if (operation === 'delete') return id === identity.uid;
    return id === identity.uid && data.uid === identity.uid && typeof data.isOnline === 'boolean';
  }
  if (collection === 'item_comments') {
    if (operation === 'delete') {
      const current = await readRecord(db, collection, id);
      return current?.authorId === identity.uid;
    }
    const current = await readRecord(db, collection, id);
    return data.authorId === identity.uid && typeof data.text === 'string' && data.text.length > 0 && data.text.length <= 500 &&
      (operation === 'create' ? !current : current?.authorId === identity.uid);
  }
  if (collection === 'item_reactions') {
    if (operation === 'delete') return id.endsWith(`:${identity.uid}`);
    const current = await readRecord(db, collection, id);
    return id.endsWith(`:${identity.uid}`) && data.userId === identity.uid &&
      ['like', 'love', 'support'].includes(data.type) &&
      (operation === 'create' ? !current : !current || current.userId === identity.uid);
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
            .map((row) => JSON.parse(row.data));
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
        .map((row) => JSON.parse(row.data));
      return response.status(200).json({ records });
    }

    if (!identity) return response.status(401).json({ error: 'Sign in with Firebase before changing site data.' });
    const { collection, operation, id, data } = request.body || {};
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
        args: [collection, id, JSON.stringify(data), new Date().toISOString()]
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