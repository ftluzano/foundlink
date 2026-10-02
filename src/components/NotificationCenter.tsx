import React from 'react';
import {
  X,
  Bell,
  Sparkles,
  FileCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  CheckCheck
} from 'lucide-react';
import { NotificationRecord } from '../types';

interface NotificationCenterProps {
  notifications: NotificationRecord[];
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectNotificationItem?: (itemId?: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onSelectNotificationItem
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">Real-Time Alerts & Match Center</h2>
              <p className="text-xs text-slate-300">Live notifications across campus cases</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p>No notifications at the moment.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                New attribute matches and claim approvals will appear here in real-time.
              </p>
            </div>
          ) : (
            notifications.map(n => {
              const isMatch = n.type === 'match';
              const isClaim = n.type === 'claim';
              const isHandover = n.type === 'handover';
              const isRecovery = n.type === 'recovery';

              return (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) onMarkRead(n.id);
                    if (n.relatedItemId && onSelectNotificationItem) {
                      onSelectNotificationItem(n.relatedItemId);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    !n.isRead
                      ? 'bg-amber-50/40 border-amber-200 hover:bg-amber-50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {isMatch && <Sparkles className="w-4 h-4 text-amber-500" />}
                        {isClaim && <FileCheck className="w-4 h-4 text-purple-600" />}
                        {isHandover && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {isRecovery && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {!isMatch && !isClaim && !isHandover && !isRecovery && (
                          <Clock className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">
                            {n.title}
                          </h4>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                          {n.message}
                        </p>
                        <div className="text-[10px] text-slate-400 mt-1 font-mono">
                          {new Date(n.createdAt).toLocaleTimeString('en-PH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {n.relatedItemId && (
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
