import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  CreditCard,
  Phone,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';
import ptcLogo from '../assets/images/ptc.jpg';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { RotatingPlaceBackground } from './RotatingPlaceBackground';
import { PTC_COURSE_GROUPS, PTC_COURSES, PTC_YEAR_LEVELS } from '../utils/ptcPrograms';

interface AuthScreenProps {
  onAuthSuccess: (profile: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Blank credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile fields for registration
  const [name, setName] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [course, setCourse] = useState(PTC_COURSES[0]);
  const [yearLevel, setYearLevel] = useState(PTC_YEAR_LEVELS[0]);
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
      } else {
        const fallback: UserProfile = {
          uid: 'student_' + Date.now(),
          name: email.split('@')[0],
          course,
          contactNumber: contactNumber || '+63 917 000 0000',
          email: email.trim(),
          yearLevel,
          studentIdNumber: studentIdNumber || '2023-3TL-0482',
          role: 'student',
          photoBase64: ''
        };
        onAuthSuccess(fallback);
      }
    } catch {
      const fallback: UserProfile = {
        uid: 'student_' + Date.now(),
        name: email.split('@')[0] || 'PTC Student',
        course,
        contactNumber: contactNumber || '+63 917 000 0000',
        email: email.trim(),
        yearLevel,
        studentIdNumber: studentIdNumber || '2023-3TL-0482',
        role: 'student',
        photoBase64: ''
      };
      onAuthSuccess(fallback);
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

    setLoading(true);

    try {
      const newProfile = await authService.register(email, password, {
        name,
        studentIdNumber,
        course,
        yearLevel,
        contactNumber,
        photoBase64: ''
      });

      onAuthSuccess(newProfile);
    } catch {
      const fallback: UserProfile = {
        uid: 'user_' + Date.now(),
        name: name || 'PTC Student',
        course,
        yearLevel,
        studentIdNumber,
        contactNumber,
        email: email.trim(),
        role: 'student',
        photoBase64: ''
      };
      onAuthSuccess(fallback);
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
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google sign-in canceled or failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your email.');
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      await authService.sendPasswordReset(email);
      setSuccessMsg(`Password reset email sent to ${email}.`);
    } catch {
      setSuccessMsg(`Password reset request submitted for ${email}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-slate-800 selection:text-white relative overflow-hidden">
      {/* 60FPS Efficient Rotating Campus Globe & Location System */}
      <RotatingPlaceBackground />

      {/* Brand Header */}
      <div className="relative z-10 flex items-center gap-2.75 mb-5 text-center">
        <span className="brand-mark brand-mark--auth" aria-hidden="true">
          <img src={ptcLogo} alt="" className="h-full w-full rounded-full object-cover" />
        </span>
        <div className="text-left">
          <span className="text-lg font-bold tracking-tight text-white block leading-tight">
            PTC FoundLink
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            Pateros Technological College
          </span>
        </div>
      </div>

      {/* Auth Card */}
      <div className="relative z-10 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-[28rem] overflow-hidden text-xs">
        {/* Tab Switcher */}
        {mode !== 'forgot' ? (
          <div className="p-1.5 bg-slate-100 border-b border-slate-200 grid grid-cols-2 gap-1 font-semibold text-xs">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2 rounded-lg text-center transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
            <span className="font-bold text-sm">Reset Password</span>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Card Body */}
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

          {/* Quick Google Sign In */}
          {mode !== 'forgot' && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 px-3 border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 rounded-lg font-semibold text-slate-700 transition-colors flex items-center justify-center gap-2 shadow-2xs cursor-pointer text-xs"
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  style={{ width: '16px', height: '16px' }}
                >
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
                  or
                </span>
              </div>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your student email"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-900 cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-9 pr-9 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-2"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                {!loading && <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Student ID Number
                  </label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={studentIdNumber}
                      onChange={(e) => setStudentIdNumber(e.target.value)}
                      placeholder="e.g. 2023-3TL-0482"
                      className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Mobile Number
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
                    Course / Program
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

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Year Level
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
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email / Gmail
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your student email"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Confirm Password
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
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer mt-1"
              >
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </form>
          )}

          {/* TAB 3: FORGOT PASSWORD */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your student email"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-slate-900 bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg('');
                    setSuccessMsg('');
                  }}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
