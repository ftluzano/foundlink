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
  | 'item_ups'
  | 'recovery_reports'
  | 'reputation'
  | 'conversations'
  | 'messages';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const user = getAuth().currentUser;
  const token = user ? await user.getIdToken() : null;
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', 'Bearer ' + token);
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
  },

  async clearAppData(): Promise<void> {
    await request('/api/data', {
      method: 'POST',
      body: JSON.stringify({ operation: 'clear_app_data' })
    });
  },

  async listMessages<T>(conversationId: string): Promise<T[]> {
    const result = await request<{ records: T[] }>(`/api/data?collection=messages&conversationId=${encodeURIComponent(conversationId)}`);
    return result.records;
  },

  async sendMessage<T>(itemId: string, text: string, conversationId?: string): Promise<T> {
    const result = await request<{ conversation: T }>('/api/data', {
      method: 'POST',
      body: JSON.stringify({
        operation: 'send_message',
        data: { itemId, text, conversationId }
      })
    });
    return result.conversation;
  },

  async markConversationRead(conversationId: string): Promise<void> {
    await request('/api/data', {
      method: 'POST',
      body: JSON.stringify({ operation: 'mark_conversation_read', data: { conversationId } })
    });
  },

  async deleteConversation(conversationId: string): Promise<void> {
    await request('/api/data', {
      method: 'POST',
      body: JSON.stringify({ operation: 'delete_conversation', data: { conversationId } })
    });
  },

  async toggleItemUp(itemId: string): Promise<{ upvoted: boolean; upCount: number }> {
    return request<{ upvoted: boolean; upCount: number }>('/api/data', {
      method: 'POST',
      body: JSON.stringify({ operation: 'toggle_item_up', data: { itemId } })
    });
  },

  async getPrivateItemVerification(itemId: string): Promise<{ secretDetails: string }> {
    const result = await request<{ item: { secretDetails: string } }>('/api/data', {
      method: 'POST',
      body: JSON.stringify({ operation: 'get_private_item', data: { itemId } })
    });
    return result.item;
  }
};
