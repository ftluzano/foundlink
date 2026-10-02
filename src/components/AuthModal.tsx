import React, { useState } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  CreditCard,
  GraduationCap,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Shield
} from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onAuthSuccess: (profile: UserProfile) => void;
  initialMode?: 'login' | 'register' | 'forgot';
}

const COURSES = [
  'BS in Information Technology (BSIT)',
  'BS in Computer Science (BSCS)',
  'BS in Business Administration (BSBA)',
  'BS in Hospitality Management (BSHM)',
  'BS in Office Administration (BSOA)',
  'Associate in Computer Technology (ACT)',
  'Other Academic Program'
];

const YEAR_LEVELS = [
  '1st Year (Freshman)',
  '2nd Year (Sophomore)',
  '3rd Year (Junior)',
  '4th Year (Senior)'
];

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onAuthSuccess,
  initialMode = 'login'
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Common credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile fields for registration
  const [name, setName] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [course, setCourse] = useState(COURSES[0]);
  const [yearLevel, setYearLevel] = useState(YEAR_LEVELS[2]);
  const [contactNumber, setContactNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const profile = await authService.login(email, password);
      if (profile) {
        onAuthSuccess(profile);
        onClose();
      } else {
        // Fallback profile if Firestore doc was empty
        const fallback: UserProfile = {
          name: email.split('@')[0],
          course: 'BS in Information Technology (BSIT)',
          contactNumber: '+63 917 000 0000',
          email: email.trim(),
          yearLevel: '3rd Year (Junior)',
          studentIdNumber: '2023-3TL-0482'
        };
        onAuthSuccess(fallback);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to sign in. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const newProfile = await authService.register(email, password, {
        name,
        studentIdNumber,
        course,
        yearLevel,
        contactNumber
      });

      onAuthSuccess(newProfile);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google / Gmail Sign In
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      const profile = await authService.loginWithGoogle();
      onAuthSuccess(profile);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Google authentication canceled or failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await authService.sendPasswordReset(email);
      setSuccessMsg(`Password reset email sent to ${email}. Check your inbox.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to send password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full my-6 overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-xs">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
              PTC
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                {mode === 'login' && 'Sign in to PTC FoundLink'}
                {mode === 'register' && 'Register Student Account'}
                {mode === 'forgot' && 'Reset Account Password'}
              </h2>
              <p className="text-[11px] text-slate-300">
                Connected to Firebase Authentication
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switchers for Login / Register */}
        {mode !== 'forgot' && (
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 border-b-2 border-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 text-center transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 border-b-2 border-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Connect to Gmail / Google Button */}
          {mode !== 'forgot' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Gmail / Google</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[10px] text-slate-400 uppercase font-mono tracking-wider absolute">
                  or with email
                </span>
              </div>
            </div>
          )}

          {/* Mode 1: LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email / Gmail *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@paterostechnologicalcollege.edu.ph"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Mode 2: REGISTER FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Francis T. Luzano"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Student ID Number *
                  </label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={studentIdNumber}
                      onChange={(e) => setStudentIdNumber(e.target.value)}
                      placeholder="2023-3TL-0482"
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Contact Mobile *
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      placeholder="+63 9XX XXX XXXX"
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Course / Program *
                  </label>
                  <select
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  >
                    {COURSES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Year Level *
                  </label>
                  <select
                    value={yearLevel}
                    onChange={(e) => setYearLevel(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  >
                    {YEAR_LEVELS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Official Email / Gmail *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@paterostechnologicalcollege.edu.ph"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer mt-2"
              >
                {loading ? 'Creating Account & Syncing to Firebase...' : 'Register Account'}
              </button>
            </form>
          )}

          {/* Mode 3: FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <p className="text-slate-600 text-[11px]">
                Enter your registered PTC email or Gmail address to receive a secure password recovery link from Firebase.
              </p>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@paterostechnologicalcollege.edu.ph"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold rounded-lg cursor-pointer"
                >
                  Back to Sign In
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {loading ? 'Sending link...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
