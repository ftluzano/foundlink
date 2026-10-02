import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  MapPin,
  Calendar,
  LayoutGrid,
  List,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpDown,
  Filter,
  X,
  ThumbsUp,
  Heart,
  Sparkles,
  MessageCircle,
  Send
} from 'lucide-react';
import { ItemComment, ItemReaction, ItemReactionType, ItemRecord, ItemType, UserProfile } from '../types';
import { CAMPUS_LOCATIONS, ITEM_CATEGORIES } from '../services/campusLocations';
import { realtimeStore } from '../services/realtimeStore';

interface PublicDirectoryProps {
  items: ItemRecord[];
  userProfile: UserProfile;
  onSelectItem: (item: ItemRecord) => void;
  onOpenReportModal: (type: ItemType) => void;
  onOpenClaimModal: (item: ItemRecord) => void;
}

export const PublicDirectory: React.FC<PublicDirectoryProps> = ({
  items,
  userProfile,
  onSelectItem,
  onOpenReportModal,
  onOpenClaimModal
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (typeFilter !== 'all' && item.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
        if (locationFilter !== 'all' && item.location !== locationFilter) return false;
        if (statusFilter !== 'all' && item.status !== statusFilter) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.title.toLowerCase().includes(q) ||
            (item.brand || '').toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            item.location.toLowerCase().includes(q) ||
            (item.color || '').toLowerCase().includes(q) ||
            (item.distinctiveMarks || '').toLowerCase().includes(q) ||
            item.id.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.dateTime).getTime();
        const timeB = new Date(b.dateTime).getTime();
        return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
      });
  }, [items, typeFilter, categoryFilter, locationFilter, statusFilter, searchQuery, sortBy]);

  // Counts
  const totalLost = items.filter((i) => i.type === 'lost' && i.status !== 'Returned').length;
  const totalFound = items.filter((i) => i.type === 'found' && i.status !== 'Returned').length;
  const totalReturned = items.filter((i) => i.status === 'Returned').length;
  const recoveryRate = items.length > 0 ? Math.round((totalReturned / items.length) * 100) : 0;

  const hasActiveFilters =
    categoryFilter !== 'all' ||
    locationFilter !== 'all' ||
    statusFilter !== 'all' ||
    typeFilter !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div className="space-y-4 pb-12">
      {/* Modern KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Lost Reports
            </span>
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {totalLost}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 font-bold text-xs">
            L
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Items in Custody
            </span>
            <span className="text-2xl font-bold font-mono text-emerald-600 tabular-nums">
              {totalFound}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
            F
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Recovered & Returned
            </span>
            <span className="text-2xl font-bold font-mono text-blue-600 tabular-nums">
              {totalReturned}
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
            ✓
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Recovery Resolution
            </span>
            <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
              {recoveryRate}%
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
            %
          </div>
        </div>
      </div>

      {/* Main Search & Filter Control Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Search Bar with instant clear and shortcut hint */}
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search lost & found by keyword, item name, brand, location..."
              className="w-full pl-9 pr-14 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-900 transition-colors"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-white hidden sm:inline-block">
                /
              </span>
            )}
          </div>

          {/* Sort & View Mode Switcher */}
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-xs">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>

            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Table view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Segmented Type Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({items.length})
            </button>
            <button
              onClick={() => setTypeFilter('lost')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'lost'
                  ? 'bg-white text-rose-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Lost Only ({items.filter((i) => i.type === 'lost').length})
            </button>
            <button
              onClick={() => setTypeFilter('found')}
              className={`px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                typeFilter === 'found'
                  ? 'bg-white text-emerald-800 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-emerald-800'
              }`}
            >
              In Custody ({items.filter((i) => i.type === 'found').length})
            </button>
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Categories</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden max-w-[170px] truncate"
            >
              <option value="all">All Locations</option>
              {CAMPUS_LOCATIONS.filter((l) => l !== 'All Campus Locations').map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
              <option value="Potential Match">Potential Match</option>
              <option value="Under Verification">Under Verification</option>
              <option value="Approved">Approved</option>
              <option value="Returned">Returned</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setCategoryFilter('all');
                  setLocationFilter('all');
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setSearchQuery('');
                }}
                className="text-rose-600 hover:text-rose-800 font-medium px-2 py-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-sm font-semibold text-slate-700">No matching items found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {items.length === 0
              ? 'The repository is currently empty. File a report to register an item.'
              : 'Try searching with different keywords or clearing active filters.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => onOpenReportModal('lost')}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              Report Lost Item
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => (
            <ModernItemCard
              key={item.id}
              item={item}
              userProfile={userProfile}
              onSelect={() => onSelectItem(item)}
              onClaim={() => onOpenClaimModal(item)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/90 overflow-x-auto shadow-xs text-xs">
          <table className="w-full text-left divide-y divide-slate-200">
            <thead className="bg-slate-50/80 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Case ID & Item</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onSelectItem(item)}
                      className="font-bold text-slate-900 hover:text-slate-700 text-left cursor-pointer"
                    >
                      {item.title}
                    </button>
                    <div className="text-[11px] font-mono text-slate-400">{item.id}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.type === 'lost' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{item.category}</td>
                  <td className="px-3 py-3">
                    <span className="font-semibold text-slate-700">{item.status}</span>
                  </td>
                  <td className="px-3 py-3 text-slate-600 max-w-[180px] truncate">{item.location}</td>
                  <td className="px-3 py-3 text-slate-500 font-mono tabular-nums whitespace-nowrap">
                    {new Date(item.dateTime).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onSelectItem(item)}
                      className="text-slate-700 hover:text-slate-900 font-semibold mr-3 cursor-pointer"
                    >
                      Inspect
                    </button>
                    {item.type === 'found' && item.status !== 'Returned' && (
                      <button
                        onClick={() => onOpenClaimModal(item)}
                        className="text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                      >
                        Claim
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface ModernItemCardProps {
  item: ItemRecord;
  userProfile: UserProfile;
  onSelect: () => void;
  onClaim: () => void;
}

const ModernItemCard: React.FC<ModernItemCardProps> = ({ item, userProfile, onSelect, onClaim }) => {
  const [comments, setComments] = useState<ItemComment[]>([]);
  const [reactions, setReactions] = useState<ItemReaction[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [socialError, setSocialError] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const isLost = item.type === 'lost';

  useEffect(() => realtimeStore.subscribeItemSocial(item.id, (nextComments, nextReactions) => {
    setComments(nextComments);
    setReactions(nextReactions);
  }), [item.id]);

  const currentReaction = reactions.find((reaction) => reaction.userId === userProfile.uid)?.type;
  const reactionCounts = reactions.reduce<Record<ItemReactionType, number>>((counts, reaction) => {
    counts[reaction.type] += 1;
    return counts;
  }, { like: 0, love: 0, support: 0 });

  const handleReact = async (type: ItemReactionType) => {
    setSocialError('');
    try {
      await realtimeStore.setItemReaction(item.id, currentReaction === type ? null : type, userProfile.name);
    } catch (error) {
      setSocialError(error instanceof Error ? error.message : 'Could not save reaction.');
    }
  };

  const handleCommentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentText.trim()) return;

    setIsSendingComment(true);
    setSocialError('');
    try {
      await realtimeStore.createItemComment(item.id, userProfile.name, commentText);
      setCommentText('');
    } catch (error) {
      setSocialError(error instanceof Error ? error.message : 'Could not post comment.');
    } finally {
      setIsSendingComment(false);
    }
  };

  const statusBadgeStyle = {
    Lost: 'bg-rose-50 text-rose-700 border-rose-200/80',
    Found: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    'Potential Match': 'bg-blue-50 text-blue-700 border-blue-200/80',
    'Under Verification': 'bg-purple-50 text-purple-700 border-purple-200/80',
    Approved: 'bg-teal-50 text-teal-700 border-teal-200/80',
    Returned: 'bg-slate-100 text-slate-600 border-slate-200',
    Closed: 'bg-slate-100 text-slate-500 border-slate-200'
  }[item.status] || 'bg-slate-50 text-slate-700 border-slate-200';

  const dateFormatted = new Date(item.dateTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 hover:border-slate-300 shadow-xs flex flex-col justify-between transition-all group">
      {item.photoUrl ? (
        <div className="w-full h-40 overflow-hidden border-b border-slate-100 bg-slate-50">
          <img src={item.photoUrl} alt={item.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 flex items-center justify-center text-slate-400 border-b border-slate-100">
          <span className="text-[11px] font-semibold uppercase tracking-wide">No Photo</span>
        </div>
      )}

      <div className="p-4 space-y-2.5">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                isLost ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {isLost ? 'Lost' : 'Found'}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusBadgeStyle}`}>
              {item.status}
            </span>
          </div>

          <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
        </div>

        {/* Title */}
        <h3
          onClick={onSelect}
          className="text-sm font-bold text-slate-900 group-hover:text-slate-700 cursor-pointer line-clamp-1"
        >
          {item.title}
        </h3>

        {/* Metadata line with typographic separators */}
        <div className="flex items-center gap-1 text-[11px] text-slate-500 flex-wrap">
          <span className="font-medium text-slate-700">{item.category}</span>
          <span>·</span>
          <span>{item.brand || 'Unbranded'}</span>
          <span>·</span>
          <span>{item.color}</span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
          {item.description}
        </p>

        {/* Location & Incident Date */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1 truncate max-w-[200px]">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{item.location}</span>
          </div>

          <div className="flex items-center gap-1 font-mono shrink-0">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span>{dateFormatted}</span>
          </div>
        </div>

        {/* Custody Tag if Found and held in locker */}
        {item.custodyLocation && (
          <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-100/80">
            <ShieldAlert className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">Custody: {item.custodyLocation}</span>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleReact('like')}
              aria-pressed={currentReaction === 'like'}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${currentReaction === 'like' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Like this post"
            >
              <ThumbsUp className="h-3.5 w-3.5" /> Like {reactionCounts.like || ''}
            </button>
            <button
              type="button"
              onClick={() => handleReact('love')}
              aria-pressed={currentReaction === 'love'}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${currentReaction === 'love' ? 'bg-rose-50 text-rose-700' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Love this post"
            >
              <Heart className="h-3.5 w-3.5" /> Love {reactionCounts.love || ''}
            </button>
            <button
              type="button"
              onClick={() => handleReact('support')}
              aria-pressed={currentReaction === 'support'}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors ${currentReaction === 'support' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'}`}
              title="Show support for this post"
            >
              <Sparkles className="h-3.5 w-3.5" /> Support {reactionCounts.support || ''}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCommentsOpen((open) => !open)}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <MessageCircle className="h-3.5 w-3.5" /> {comments.length} comments
          </button>
        </div>

        {socialError && <p role="alert" className="mt-2 text-[11px] text-rose-600">{socialError}</p>}

        {commentsOpen && (
          <div className="mt-3 space-y-2.5">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded-md bg-slate-50 px-3 py-2">
                <p className="text-[11px] font-semibold text-slate-800">{comment.authorName}</p>
                <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-slate-600">{comment.text}</p>
              </div>
            ))}
            <form onSubmit={handleCommentSubmit} className="flex items-center gap-2">
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength={500}
                placeholder="Write a comment..."
                aria-label="Write a comment"
                className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-slate-400"
              />
              <button
                type="submit"
                disabled={!commentText.trim() || isSendingComment}
                aria-label="Post comment"
                title="Post comment"
                className="rounded-md bg-slate-900 p-2 text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Card Action footer */}
      <div className="px-4 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs rounded-b-xl">
        <button
          onClick={onSelect}
          className="text-slate-700 hover:text-slate-900 font-semibold cursor-pointer"
        >
          View Case
        </button>

        {item.type === 'found' && item.status !== 'Returned' && (
          <button
            onClick={onClaim}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Claim Item
          </button>
        )}

        {item.type === 'lost' && item.status !== 'Returned' && (
          <button
            onClick={onSelect}
            className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-md font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Match Check
          </button>
        )}

        {item.status === 'Returned' && (
          <span className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Returned</span>
          </span>
        )}
      </div>
    </div>
  );
};
