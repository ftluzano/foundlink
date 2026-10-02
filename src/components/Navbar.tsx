import React from 'react';
import {
  Bell,
  Plus,
  Shield,
  Package,
  User,
  Settings,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import ptcLogo from '../assets/images/ptc.jpg';
import { NotificationRecord, UserProfile } from '../types';

interface NavbarProps {
  currentTab: 'directory' | 'claims' | 'admin' | 'my-reports';
  onSelectTab: (tab: 'directory' | 'claims' | 'admin' | 'my-reports') => void;
  onOpenReportModal: (defaultType: 'lost' | 'found') => void;
  userRole: 'student' | 'admin';
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  notifications: NotificationRecord[];
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
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onSelectTab(userRole === 'admin' ? 'admin' : 'directory')}
              className="flex items-center gap-2 group text-left cursor-pointer focus:outline-hidden"
            >
              <img
                src={ptcLogo}
                alt="PTC FoundLink logo"
                className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-sm group-hover:opacity-90 transition-opacity"
              />
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold tracking-tight text-slate-900 group-hover:text-slate-700">
                  PTC FoundLink
                </span>
                {userRole === 'admin' && (
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 bg-slate-900 text-white rounded">
                    OFFICER
                  </span>
                )}
              </div>
            </button>

            {/* Role-Specific Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
              {userRole === 'student' ? (
                <>
                  <button
                    onClick={() => onSelectTab('directory')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      currentTab === 'directory'
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    Browse Catalog
                  </button>

                  <button
                    onClick={() => onSelectTab('claims')}
                    className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                      currentTab === 'claims'
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    My Claims & Activity
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelectTab('admin')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                      currentTab === 'admin'
                        ? 'bg-slate-900 text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Custodian Console</span>
                  </button>

                  <button
                    onClick={() => onSelectTab('directory')}
                    className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                      currentTab === 'directory'
                        ? 'bg-slate-100 text-slate-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>All Items Directory</span>
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenReportModal('lost')}
                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/80 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Lost Item</span>
              </button>

              {userRole === 'admin' && (
                <button
                  onClick={() => onOpenReportModal('found')}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Found Item</span>
                </button>
              )}
            </div>

            {/* Notification Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
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
              className="rounded-md border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User Profile Button */}
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-md text-slate-700 hover:bg-slate-100 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
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
              className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${
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
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
              title="Sign Out of Account"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
