import React, { useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { ConversationRecord } from '../types';
import { realtimeStore } from '../services/realtimeStore';

interface MessagesDashboardProps {
  conversations: ConversationRecord[];
  userUid: string;
  onOpenConversation: (conversation: ConversationRecord) => void;
  onBrowsePosts: () => void;
}

export const MessagesDashboard: React.FC<MessagesDashboardProps> = ({
  conversations,
  userUid,
  onOpenConversation,
  onBrowsePosts
}) => {
  const [error, setError] = useState('');

  const handleDelete = async (conversation: ConversationRecord) => {
    if (conversation.ownerUid !== userUid) return;
    if (!window.confirm('Remove this conversation from your inbox? The other participant will keep their copy.')) return;
    setError('');
    try {
      await realtimeStore.deleteConversation(conversation.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove the conversation.');
    }
  };

  return (
    <div className="workspace-enter space-y-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-emerald-950/10 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase text-emerald-800">Direct contact</p>
          <h1 className="mt-1 text-xl font-extrabold text-[#173b2b] sm:text-2xl">Messages</h1>
        </div>
        <span className="text-xs text-slate-500">{conversations.length} conversations</span>
      </header>

      {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}

      {conversations.length === 0 ? (
        <div className="border-y border-slate-200 bg-white/70 py-12 text-center">
          <MessageSquare className="mx-auto h-7 w-7 text-slate-400" />
          <p className="mt-2 text-sm font-bold text-slate-800">No conversations yet</p>
          <p className="mt-1 text-xs text-slate-500">Open a post in the directory to message its owner.</p>
          <button type="button" onClick={onBrowsePosts} className="mt-4 rounded-md bg-[#174a32] px-3 py-2 text-xs font-semibold text-white hover:bg-[#103b28]">
            Browse posts
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white/85">
          {conversations.map((conversation) => {
            const isOwner = conversation.ownerUid === userUid;
            const unread = isOwner ? conversation.ownerUnread : conversation.participantUnread;
            const otherName = isOwner ? conversation.participantName : conversation.ownerName;
            return (
              <article key={conversation.id} className="flex items-center gap-3 px-3 py-3 sm:px-4">
                <button type="button" onClick={() => onOpenConversation(conversation)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7f0e9] text-[#174a32]">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate text-xs font-bold text-slate-900">{otherName || 'Campus member'}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600">{conversation.itemType} report</span>
                      {unread > 0 && <span className="rounded-full bg-emerald-700 px-1.5 py-0.5 text-[9px] font-bold text-white">{unread} new</span>}
                    </span>
                    <span className="mt-1 block truncate text-xs font-semibold text-[#174a32]">{conversation.itemTitle}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">{conversation.lastMessage || 'Conversation started'}</span>
                    {conversation.lastMessageAt && <span className="mt-1 block text-[10px] text-slate-400">{new Date(conversation.lastMessageAt).toLocaleString()}</span>}
                  </span>
                </button>
                {isOwner && (
                  <button type="button" onClick={() => void handleDelete(conversation)} aria-label="Remove conversation from your inbox" title="Remove conversation" className="shrink-0 rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};