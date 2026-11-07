import React from 'react';
import {
  Bell,
  Plus,
  Shield,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  Award,
  MessageSquare
} from 'lucide-react';
import ptcLogo from '../assets/images/ptc.jpg';
import { NotificationRecord, UserProfile } from '../types';

interface NavbarProps {
  currentTab: 'directory' | 'claims' | 'admin' | 'my-reports' | 'community' | 'messages';
  onSelectTab: (tab: 'directory' | 'claims' | 'admin' | 'my-reports' | 'community' | 'messages') => void;
  onOpenReportModal: (defaultType: 'lost' | 'found') => void;
  userRole: 'student' | 'admin';
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  notifications: NotificationRecord[];
  messagesUnreadCount?: number;
  onOpenNotifications: () => void;
  userProfile: UserProfile;
  onOpenProfileModal: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenReportModal,
  userRole,
  isDarkMode,
  onToggleDarkMode,
  notifications,
  messagesUnreadCount = 0,
  onOpenNotifications,
  userProfile,
  onOpenProfileModal,
  onSignOut
}) => {
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const initials = userProfile.name
    ? userProfile.name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/95 shadow-[0_2px_12px_rgba(20,45,33,0.06)] backdrop-blur-md">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-6">
        <div className="flex flex-col gap-2 py-2.5 xl:flex-row xl:items-center xl:justify-between xl:py-0">
          {/* Brand */}
          <div className="flex items-center justify-between gap-3 sm:gap-6 min-w-0">
            <button
              onClick={() => onSelectTab(userRole === 'admin' ? 'admin' : 'directory')}
              className="flex min-w-0 items-center gap-2 group text-left cursor-pointer focus:outline-hidden"
            >
              <span className="brand-mark brand-mark--nav shrink-0" aria-hidden="true">
                <img src={ptcLogo} alt="" className="h-full w-full rounded-full object-cover" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-extrabold text-[#173b2b] sm:text-base">
                  FOUNDLINK PTC
                </span>
                <span className="hidden text-[9px] font-semibold uppercase text-slate-500 sm:block">Campus lost &amp; found</span>
                {userRole === 'admin' && (
                  <span className="hidden sm:inline text-[10px] font-mono font-semibold px-1.5 py-0.2 bg-slate-900 text-white rounded">
                    CUSTODIAN
                  </span>
                )}
              </div>
            </button>

            {/* Role-Specific Navigation Tabs */}
            <nav className="hidden shrink-0 items-center gap-1 text-xs font-semibold xl:flex">
              {userRole === 'student' ? (
                <>
                  <button
                    onClick={() => onSelectTab('directory')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      currentTab === 'directory'
                        ? 'bg-[#e7f0e9] text-[#174a32] font-bold'
                        : 'text-slate-600 hover:text-[#174a32] hover:bg-emerald-50'
                    }`}
                  >
                    Browse Catalog
                  </button>

                  <button
                    onClick={() => onSelectTab('claims')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      currentTab === 'claims'
                        ? 'bg-[#e7f0e9] text-[#174a32] font-bold'
                        : 'text-slate-600 hover:text-[#174a32] hover:bg-emerald-50'
                    }`}
                  >
                    My Claims & Activity
                  </button>
                  <button
                    onClick={() => onSelectTab('community')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${currentTab === 'community' ? 'bg-[#e7f0e9] text-[#174a32] font-bold' : 'text-slate-600 hover:text-[#174a32] hover:bg-emerald-50'}`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Reputation</span>
                  </button>
                  <button
                    onClick={() => onSelectTab('messages')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${currentTab === 'messages' ? 'bg-[#e7f0e9] text-[#174a32] font-bold' : 'text-slate-600 hover:text-[#174a32] hover:bg-emerald-50'}`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Messages</span>
                    {messagesUnreadCount > 0 && <span className="rounded-full bg-emerald-700 px-1.5 py-0.5 text-[9px] text-white">{messagesUnreadCount}</span>}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelectTab('admin')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                      currentTab === 'admin'
                        ? 'bg-[#174a32] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-[#174a32] hover:bg-emerald-50'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Custodian Console</span>
                  </button>

                </>
              )}
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            {/* Quick Action Buttons */}
            {userRole === 'student' && <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={() => onOpenReportModal('lost')}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] font-bold text-rose-800 transition-colors hover:bg-rose-100 sm:px-3 sm:text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Report lost</span>
                <span className="sm:hidden">Lost</span>
              </button>

              <button
                onClick={() => onOpenReportModal('found')}
                className="flex shrink-0 cursor-pointer items-center gap-1 rounded-md bg-[#174a32] px-2.5 py-1.5 text-[10px] font-bold text-white shadow-xs transition-colors hover:bg-[#103b28] sm:px-3 sm:text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Surrender found</span>
                <span className="sm:hidden">Found</span>
              </button>
            </div>}

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleDarkMode}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDarkMode}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 shrink-0"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User Profile Button */}
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-md text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-medium transition-colors cursor-pointer shrink-0"
              title="Student Profile & Settings"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                {userProfile.photoBase64 ? (
                  <img
                    src={userProfile.photoBase64}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <span className="hidden sm:inline font-semibold truncate max-w-[100px]">
                {userProfile.name.split(' ')[0] || 'Profile'}
              </span>
              <Settings className="w-3 h-3 text-slate-400 hidden sm:inline" />
            </button>

            <span
              aria-label={`Account role: ${userRole === 'admin' ? 'Custodian' : 'Student'}`}
              className={`hidden sm:inline rounded-md border px-2 py-1 text-[11px] font-semibold ${
                userRole === 'admin'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-slate-50 text-slate-700'
              }`}
            >
              {userRole === 'admin' ? 'Custodian' : 'Student'}
            </span>

            {/* Sign Out Button */}
            <button
              onClick={onSignOut}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-transparent hover:border-rose-200 transition-colors cursor-pointer shrink-0"
              title="Sign Out of Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto border-t border-slate-100 pt-2 text-[11px] font-semibold xl:hidden">
            {(userRole === 'admin'
              ? ([['admin', 'Custodian']] as const)
              : ([['directory', 'Directory'], ['claims', 'My activity'], ['messages', 'Messages'], ['community', 'Reputation']] as const)
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => onSelectTab(tab)}
                className={`shrink-0 rounded-md px-3 py-1.5 transition-colors ${currentTab === tab ? 'bg-[#174a32] text-white' : 'text-slate-600 hover:bg-emerald-50 hover:text-[#174a32]'}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};
