import React, { useState, useRef } from 'react';
import {
  X,
  User,
  GraduationCap,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  CheckCircle2,
  Camera,
  Trash2,
  Upload,
  Sparkles
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { resizeImageToBase64 } from '../utils/imageUtils';
import { PTC_COURSE_GROUPS, PTC_COURSES, PTC_YEAR_LEVELS } from '../utils/ptcPrograms';

interface ProfileSettingsModalProps {
  profile: UserProfile;
  onClose: () => void;
  onSaveProfile: (profile: UserProfile) => void;
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  profile,
  onClose,
  onSaveProfile
}) => {
  const [name, setName] = useState(profile.name);
  const [course, setCourse] = useState(profile.course || PTC_COURSES[0]);
  const [contactNumber, setContactNumber] = useState(profile.contactNumber);
  const [email, setEmail] = useState(profile.email);
  const [yearLevel, setYearLevel] = useState(profile.yearLevel || PTC_YEAR_LEVELS[2]);
  const [studentIdNumber, setStudentIdNumber] = useState(profile.studentIdNumber);
  const [role, setRole] = useState<UserRole>(profile.role || (profile.email.toLowerCase() === 'ftluzano@paterostechnologicalcollege.edu.ph' ? 'admin' : 'student'));
  const [photoBase64, setPhotoBase64] = useState<string>(profile.photoBase64 || '');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    setIsProcessingImage(true);

    try {
      // Resize and center-crop to exactly 500x500 Base64 string for Firebase
      const base64 = await resizeImageToBase64(file, 500, 500);
      setPhotoBase64(base64);
    } catch (err: any) {
      setImageError(err.message || 'Failed to process image');
    } finally {
      setIsProcessingImage(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = () => {
    setPhotoBase64('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...profile,
      name: name.trim(),
      course,
      contactNumber: contactNumber.trim(),
      email: email.trim(),
      yearLevel,
      studentIdNumber: studentIdNumber.trim(),
      role,
      photoBase64
    };
    onSaveProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Student Profile & Account Settings
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Digital Campus ID Card Preview */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 rounded-xl shadow-xs border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                  PTC
                </div>
                <div>
                  <span className="text-xs font-bold tracking-tight block">
                    Pateros Technological College
                  </span>
                  <span className="text-[10px] text-slate-400">Student Recovery ID</span>
                </div>
              </div>

            </div>

            <div className="flex items-center gap-3 pt-1 border-t border-slate-700/60">
              {/* Photo Avatar */}
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-slate-800 border-2 border-slate-600 shrink-0 flex items-center justify-center">
                {photoBase64 ? (
                  <img
                    src={photoBase64}
                    alt="Profile 500x500"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-slate-300 text-base">{initials}</span>
                )}
              </div>

              {/* ID Badge info */}
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] flex-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">Student Name</span>
                  <span className="font-bold text-white truncate block">
                    {name.trim() || 'Student Name'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Student ID Number</span>
                  <span className="font-mono font-bold text-white truncate block">
                    {studentIdNumber.trim() || '202X-XXXX'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Program & Year</span>
                  <span className="text-slate-200 truncate block">
                    {course.split('(')[0].trim()} · {yearLevel.split(' ')[0]}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Contact Phone</span>
                  <span className="font-mono text-slate-200 truncate block">
                    {contactNumber.trim() || '+63 9XX XXX XXXX'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {savedSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Profile information successfully synced to Firebase!</span>
            </div>
          )}

          {/* 500x500 Base64 Photo Upload Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="font-semibold text-slate-800 block text-xs">
              Profile Photo (Base64 500x500 for Firebase)
            </span>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                {photoBase64 ? (
                  <img
                    src={photoBase64}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-6 h-6 text-slate-400" />
                )}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="profile-photo-upload"
                  />
                  <label
                    htmlFor="profile-photo-upload"
                    className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-md font-medium text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isProcessingImage ? 'Optimizing...' : 'Upload Image'}</span>
                  </label>

                  {photoBase64 && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md font-medium flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <p className="text-[10px] text-slate-500">
                  Images are automatically center-cropped and formatted to 500×500 Base64 for Firestore storage.
                </p>
                {imageError && (
                  <p className="text-[10px] text-rose-600 font-medium">{imageError}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                <span>Account Role</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white text-slate-900 text-xs font-medium"
              >
                <option value="student">Student</option>
                <option value="admin">Custodian</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* User Name */}
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Francis T. Luzano"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
              />
            </div>

            {/* Student ID Number */}
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Student ID Number *</span>
              </label>
              <input
                type="text"
                required
                value={studentIdNumber}
                onChange={(e) => setStudentIdNumber(e.target.value)}
                placeholder="e.g. 2023-3TL-0482"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white font-mono"
              />
            </div>

            {/* Course / Program */}
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>Course / Program *</span>
              </label>
              <select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white text-slate-900 text-xs font-medium"
              >
                {PTC_COURSE_GROUPS.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.courses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </optgroup>
                ))}
                <option value="Other Academic Program">Other Academic Program</option>
              </select>
            </div>

            {/* Year Level */}
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Year Level *</span>
              </label>
              <select
                value={yearLevel}
                onChange={(e) => setYearLevel(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white text-slate-900 text-xs font-medium"
              >
                {PTC_YEAR_LEVELS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Gmail / Official Email */}
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Official Gmail / Campus Email *</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ftluzano@paterostechnologicalcollege.edu.ph"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
              />
            </div>

            {/* Contact Number */}
            <div>
              <label className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Contact Mobile Number *</span>
              </label>
              <input
                type="tel"
                required
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                placeholder="+63 9XX XXX XXXX"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white font-mono"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Save Profile to Firebase
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
