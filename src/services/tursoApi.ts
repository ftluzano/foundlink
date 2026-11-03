import { getAuth } from 'firebase/auth';

export type TursoCollection =
  | 'items'
  | 'claims'
  | 'potential_matches'
  | 'notifications'
  | 'audit_logs'
  | 'users'
  | 'custodians'
  | 'presence'
  | 'item_comments'
  | 'item_reactions'
  | 'recovery_reports'
  | 'reputation';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init?.body) headers.set('Content-Type', 'application/json');

  const response = await fetch(url, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Turso request failed (${response.status}).`);
  }
  return payload as T;
}

export const tursoApi = {
  async snapshot<T extends Record<string, unknown[]>>(collections: TursoCollection[]): Promise<T> {
    const query = encodeURIComponent(collections.join(','));
    const result = await request<{ records: T }>(`/api/data?collections=${query}`);
    return result.records;
  },

  async list<T>(collection: TursoCollection): Promise<T[]> {
    const result = await request<{ records: T[] }>(`/api/data?collection=${encodeURIComponent(collection)}`);
    return result.records;
  },

  async create(collection: TursoCollection, id: string, data: unknown): Promise<void> {
    await request('/api/data', {
      method: 'POST',
      body: JSON.stringify({ collection, operation: 'create', id, data })
    });
  },

  async save(collection: TursoCollection, id: string, data: unknown): Promise<void> {
    await request('/api/data', {
      method: 'POST',
      body: JSON.stringify({ collection, operation: 'update', id, data })
    });
  },

  async delete(collection: TursoCollection, id: string): Promise<void> {
    await request('/api/data', {
      method: 'POST',
      body: JSON.stringify({ collection, operation: 'delete', id })
    });
  },

  async verifyRecovery(itemId: string, finderUid?: string): Promise<void> {
    await request('/api/data', {
      method: 'POST',
      body: JSON.stringify({ operation: 'verify_recovery', id: itemId, data: { finderUid } })
    });
  }
};