import React, { useState } from 'react';
import {
  X,
  AlertCircle,
  HandHelping,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { ItemType, ItemCategory, ItemRecord, ReporterInfo, UserProfile } from '../types';
import { CAMPUS_LOCATIONS, ITEM_CATEGORIES, ITEM_COLORS, CUSTODY_LOCATIONS } from '../services/campusLocations';

interface ReportModalProps {
  initialType?: ItemType;
  userProfile?: UserProfile;
  onClose: () => void;
  onSubmit: (item: Omit<ItemRecord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ItemRecord>;
  onMatchDiscovered: (item: ItemRecord) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  initialType = 'lost',
  userProfile,
  onClose,
  onSubmit,
  onMatchDiscovered
}) => {
  const [type, setType] = useState<ItemType>(initialType);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Electronics & Gadgets');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('Black');
  const [location, setLocation] = useState(CAMPUS_LOCATIONS[1]);
  const [specificNote, setSpecificNote] = useState('');
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [description, setDescription] = useState('');
  const [distinctiveMarks, setDistinctiveMarks] = useState('');
  const [secretDetails, setSecretDetails] = useState('');
  const [custodyLocation, setCustodyLocation] = useState(CUSTODY_LOCATIONS[0]);

  // Reporter auto-filled from profile
  const [reporterName, setReporterName] = useState(userProfile?.name || '');
  const [reporterIdNumber, setReporterIdNumber] = useState(userProfile?.studentIdNumber || '');
  const [reporterEmail, setReporterEmail] = useState(userProfile?.email || '');
  const [reporterPhone, setReporterPhone] = useState(userProfile?.contactNumber || '');
  const [reporterRole, setReporterRole] = useState<'student' | 'faculty' | 'staff' | 'visitor'>('student');
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Please specify the item name.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Please provide a brief description.');
      return;
    }
    if (!isAnonymous && !reporterName.trim()) {
      setValidationError('Please provide your name or enable anonymous reporting.');
      return;
    }

    const fullLocation = specificNote.trim() ? `${location} (${specificNote.trim()})` : location;

    const reportedBy: ReporterInfo = {
      uid: `usr_${Date.now()}`,
      name: isAnonymous ? 'Anonymous Member' : reporterName.trim(),
      email: reporterEmail.trim() || 'student@ptc.edu.ph',
      role: reporterRole,
      phone: reporterPhone.trim(),
      idNumber: reporterIdNumber.trim(),
      isAnonymous
    };

    setIsSubmitting(true);
    try {
      const created = await onSubmit({
        type,
        title: title.trim(),
        category,
        brand: brand.trim() || 'Unspecified',
        color,
        location: fullLocation,
        dateTime: new Date(dateTime).toISOString(),
        description: description.trim(),
        distinctiveMarks: distinctiveMarks.trim(),
        secretDetails: secretDetails.trim(),
        photoUrl: null,
        status: type === 'lost' ? 'Lost' : 'Found',
        reportedBy,
        custodyLocation: type === 'found' ? custodyLocation : undefined
      });

      onMatchDiscovered(created);
      onClose();
    } catch (err) {
      setValidationError('Failed to save record. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-xl w-full my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            {type === 'lost' ? (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            ) : (
              <HandHelping className="w-4 h-4 text-emerald-400" />
            )}
            <h2 className="text-sm font-bold tracking-tight">
              {type === 'lost' ? 'Report Lost Belonging' : 'Log Surrendered Item'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[78vh] overflow-y-auto text-xs">
          {validationError && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {validationError}
            </div>
          )}

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('lost')}
              className={`p-2 rounded-lg border font-semibold text-center transition-colors ${
                type === 'lost'
                  ? 'border-rose-500 bg-rose-50 text-rose-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Lost Item Report
            </button>
            <button
              type="button"
              onClick={() => setType('found')}
              className={`p-2 rounded-lg border font-semibold text-center transition-colors ${
                type === 'found'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Found Item (Custody)
            </button>
          </div>

          {/* Item Info */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Item Title / Name *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lenovo ThinkPad USB-C Charger, Brown Leather Wallet"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ItemCategory)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                >
                  {ITEM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Apple, Lenovo"
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Color *</label>
                <select
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                >
                  {ITEM_COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Visual condition, stickers, contents..."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>
          </div>

          {/* Location & Time */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Campus Area *</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                >
                  {CAMPUS_LOCATIONS.filter((l) => l !== 'All Campus Locations').map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Date & Time *</label>
                <input
                  type="datetime-local"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
              </div>
            </div>

            <div>
              <input
                type="text"
                value={specificNote}
                onChange={(e) => setSpecificNote(e.target.value)}
                placeholder="Specific room #, table, or bench note (optional)"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>

            {type === 'found' && (
              <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 space-y-1">
                <label className="block font-semibold text-emerald-900">
                  Custody Holding Station *
                </label>
                <select
                  value={custodyLocation}
                  onChange={(e) => setCustodyLocation(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-md text-emerald-950 font-medium"
                >
                  {CUSTODY_LOCATIONS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Verification Fields */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Public Identifying Marks (Displayed on Listing)
              </label>
              <input
                type="text"
                value={distinctiveMarks}
                onChange={(e) => setDistinctiveMarks(e.target.value)}
                placeholder="e.g. Anime keychain, scratch on corner"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-md"
              />
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <Lock className="w-3.5 h-3.5 text-rose-600" />
                <span>Confidential Verification Details (Hidden from Public View)</span>
              </div>
              <input
                type="text"
                value={secretDetails}
                onChange={(e) => setSecretDetails(e.target.value)}
                placeholder="e.g. Serial ending in 9842, exact cash inside, lockscreen wallpaper"
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md"
              />
              <span className="text-[10px] text-slate-500 block">
                Protected by RA 10173. Only verified by Custodian during in-person release.
              </span>
            </div>
          </div>

          {/* Reporter Details */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Reporter Contact</span>
              <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer text-[11px]">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-slate-900"
                />
                <span>Anonymous</span>
              </label>
            </div>

            {!isAnonymous && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required={!isAnonymous}
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  placeholder="Full Name *"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
                <input
                  type="text"
                  value={reporterIdNumber}
                  onChange={(e) => setReporterIdNumber(e.target.value)}
                  placeholder="Student / Staff ID"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
                <input
                  type="email"
                  value={reporterEmail}
                  onChange={(e) => setReporterEmail(e.target.value)}
                  placeholder="Email"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
                <input
                  type="tel"
                  value={reporterPhone}
                  onChange={(e) => setReporterPhone(e.target.value)}
                  placeholder="Mobile Number"
                  className="px-2.5 py-1.5 border border-slate-200 rounded-md"
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-1.5 text-white font-semibold rounded-md shadow-xs transition-colors ${
                type === 'lost' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              {isSubmitting ? 'Saving...' : type === 'lost' ? 'Publish Report' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
