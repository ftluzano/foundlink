import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MessageSquare, Send, ShieldCheck, Trash2, X } from 'lucide-react';
import { ChatMessageRecord, ConversationRecord, ItemType } from '../types';
import { realtimeStore } from '../services/realtimeStore';

interface ChatThreadModalProps {
  itemId: string;
  itemTitle: string;
  itemType: ItemType;
  currentUserUid: string;
  currentUserName: string;
  initialConversation?: ConversationRecord;
  onClose: () => void;
}

export const ChatThreadModal: React.FC<ChatThreadModalProps> = ({
  itemId,
  itemTitle,
  itemType,
  currentUserUid,
  currentUserName,
  initialConversation,
  onClose
}) => {
  const [conversation, setConversation] = useState<ConversationRecord | undefined>(initialConversation);
  const [conversationId, setConversationId] = useState(initialConversation?.id || '');
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastAcknowledgedId = useRef('');
  const endOfMessages = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    void realtimeStore.markConversationRead(conversationId).catch((caught) => {
      setError(caught instanceof Error ? caught.message : 'Could not update message status.');
    });
    return realtimeStore.subscribeChatMessages(conversationId, setMessages);
  }, [conversationId]);

  useEffect(() => {
    const newest = messages[messages.length - 1];
    if (!conversationId || !newest || newest.senderUid === currentUserUid || newest.id === lastAcknowledgedId.current) return;
    lastAcknowledgedId.current = newest.id;
    void realtimeStore.markConversationRead(conversationId).catch(() => {});
  }, [messages, conversationId, currentUserUid]);

  useEffect(() => {
    endOfMessages.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const updatedConversation = await realtimeStore.sendChatMessage(itemId, text, conversationId || undefined);
      setConversation(updatedConversation);
      setConversationId(updatedConversation.id);
      setDraft('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!conversation || conversation.ownerUid !== currentUserUid) return;
    if (!window.confirm('Remove this conversation from your inbox? The other participant will keep their copy.')) return;
    setError('');
    try {
      await realtimeStore.deleteConversation(conversation.id);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove this conversation.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 sm:p-5">
      <section role="dialog" aria-modal="true" aria-labelledby="chat-thread-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-[#174a32] px-4 py-3 text-white sm:px-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10"><MessageSquare className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="chat-thread-title" className="truncate text-sm font-bold">{itemTitle}</h2>
            <p className="text-[10px] text-white/70">Private conversation · {itemType} report</p>
          </div>
          {conversation?.ownerUid === currentUserUid && (
            <button type="button" onClick={() => void handleDelete()} aria-label="Remove this conversation" title="Remove conversation" className="rounded-md p-2 text-white/75 hover:bg-white/10 hover:text-white">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onClose} aria-label="Close messages" className="rounded-md p-2 text-white/75 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-[#f5f7f5]">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5 text-[10px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>Only you and the report owner can read these messages.</span>
            <span className="ml-auto inline-flex items-center gap-1"><ArrowUpRight className="h-3 w-3" />Updates live</span>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
            {messages.length === 0 ? (
              <div className="grid min-h-48 place-content-center text-center">
                <MessageSquare className="mx-auto h-6 w-6 text-slate-300" />
                <p className="mt-2 text-xs font-semibold text-slate-700">Start the conversation</p>
                <p className="mt-1 max-w-xs text-[11px] text-slate-500">Share useful details about this report. Your message will notify the other person.</p>
              </div>
            ) : messages.map((message) => {
              const isMine = message.senderUid === currentUserUid;
              return (
                <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2 ${isMine ? 'rounded-br-sm bg-[#174a32] text-white' : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'}`}>
                    {!isMine && <p className="mb-1 text-[10px] font-bold text-emerald-800">{message.senderName}</p>}
                    <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">{message.text}</p>
                    <p className={`mt-1 text-right text-[9px] ${isMine ? 'text-white/65' : 'text-slate-400'}`}>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              );
            })}
            <div ref={endOfMessages} />
          </div>

          {error && <p role="alert" className="px-4 pb-2 text-xs font-medium text-rose-700">{error}</p>}
          <form onSubmit={handleSend} className="flex items-end gap-2 border-t border-slate-200 bg-white p-3 sm:p-4">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={2000}
              rows={2}
              placeholder="Write a message..."
              aria-label="Write a message"
              className="max-h-28 min-h-10 min-w-0 flex-1 resize-y rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-700"
            />
            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message" title="Send message" className="flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-[#174a32] px-3 text-xs font-semibold text-white hover:bg-[#103b28] disabled:cursor-not-allowed disabled:opacity-50">
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{sending ? 'Sending...' : 'Send'}</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};