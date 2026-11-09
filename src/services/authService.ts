import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { tursoApi } from './tursoApi';
import { UserProfile, UserRole } from '../types';

const DEFAULT_CUSTODIAN_EMAILS = new Set(['ftluzano@paterostechnologicalcollege.edu.ph']);

const resolveUserRole = (email: string, role?: UserRole): UserRole => {
  const normalizedEmail = (email || '').trim().toLowerCase();

  if (DEFAULT_CUSTODIAN_EMAILS.has(normalizedEmail)) return 'admin';

  return 'student';
};

const profileFromFirebaseUser = (user: User, profileData?: Partial<UserProfile>): UserProfile => ({
  uid: user.uid,
  name: profileData?.name?.trim() || user.displayName || '',
  course: profileData?.course?.trim() || '',
  contactNumber: profileData?.contactNumber?.trim() || user.phoneNumber || '',
  email: user.email || profileData?.email?.trim() || '',
  yearLevel: profileData?.yearLevel?.trim() || '',
  studentIdNumber: profileData?.studentIdNumber?.trim() || '',
  role: resolveUserRole(user.email || ''),
  photoBase64: profileData?.photoBase64 || user.photoURL || ''
});

const profileChanged = (current: UserProfile, next: UserProfile) =>
  Object.keys(next).some((key) => current[key as keyof UserProfile] !== next[key as keyof UserProfile]);

export const authService = {
  /**
   * Listen to Firebase Auth state
   */
  subscribeAuth(callback: (user: User | null) => void) {
    try {
      return onAuthStateChanged(auth, callback);
    } catch (err) {
      console.warn('onAuthStateChanged error:', err);
      return () => {};
    }
  },

  /**
   * Get current auth user
   */
  getCurrentUser(): User | null {
    try {
      return auth.currentUser;
    } catch {
      return null;
    }
  },

  /**
  * Register with Firebase Auth and store the profile in Turso
   */
  async register(
    email: string,
    password: string,
    profileData: Omit<UserProfile, 'email'>
  ): Promise<UserProfile> {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;

      const userProfile: UserProfile = {
        ...profileFromFirebaseUser(cred.user, profileData),
        email: cred.user.email || email.trim()
      };

      await tursoApi.create('users', uid, {
        ...userProfile,
        role: 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return userProfile;
    } catch (err: any) {
      console.warn('Firebase register error:', err.code, err.message);

      // If user already exists, reuse the authenticated account.
      if (err.code === 'auth/email-already-in-use') {
        try {
          const loggedIn = await this.login(email, password);
          if (loggedIn) return loggedIn;
        } catch {
          // continue to fallback
        }
      }

      throw err;
    }
  },

  /**
   * Sign In with Email & Password
   */
  async login(email: string, password: string): Promise<UserProfile | null> {
    const cleanEmail = email.trim();
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const uid = cred.user.uid;
      const profile = await this.getUserProfile(uid);
      if (profile) return { ...profile, role: resolveUserRole(cred.user.email || cleanEmail) };

      const newProfile = profileFromFirebaseUser(cred.user);
      await this.saveUserProfile(uid, newProfile);
      return newProfile;
    } catch (err: any) {
      console.warn('Firebase login attempt failed:', err.code, err.message);

      throw err;
    }
  },

  /**
   * Connect with Gmail / Google
   */
  async loginWithGoogle(): Promise<UserProfile> {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const user = res.user;

      const existing = await this.getUserProfile(user.uid);
      if (existing) {
        const identityProfile = profileFromFirebaseUser(user);
        const syncedProfile: UserProfile = {
          ...existing,
          uid: user.uid,
          name: existing.name || identityProfile.name,
          email: identityProfile.email || existing.email,
          contactNumber: existing.contactNumber || identityProfile.contactNumber,
          photoBase64: existing.photoBase64 || identityProfile.photoBase64,
          role: resolveUserRole(user.email || existing.email)
        };
        if (profileChanged(existing, syncedProfile)) await this.saveUserProfile(user.uid, syncedProfile);
        return syncedProfile;
      }

      const newProfile = profileFromFirebaseUser(user);
      await tursoApi.create('users', user.uid, {
        ...newProfile,
        role: 'student',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return newProfile;
    } catch (err: any) {
      console.warn('Google popup error:', err.code, err.message);

      throw err;
    }
  },

  /**
   * Send Password Reset Link
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: any) {
      console.warn('Password reset fallback:', err);
    }
  },

  /**
   * Sign Out
   */
  async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out fallback:', err);
    }
  },

  /**
  * Fetch the signed-in user's profile from Turso
   */
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const profiles = await tursoApi.list<UserProfile>('users');
      const profile = profiles.find((candidate) => candidate.uid === uid);
      if (profile) {
        return { ...profile, role: resolveUserRole(auth.currentUser?.email || profile.email) };
      }
    } catch (err) {
      console.warn('Failed to load profile from Turso:', err);
    }
    return null;
  },

  /**
  * Save or update the signed-in user's profile in Turso
   */
  async saveUserProfile(uid: string, profile: UserProfile): Promise<void> {
    const { role: _role, ...profileFields } = profile;
    await tursoApi.save('users', uid, {
      ...profileFields,
      uid,
      role: 'student',
      updatedAt: new Date().toISOString()
    });
  },

  /**
  * Poll Turso for user profile updates
   */
  subscribeUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
    try {
      let active = true;
      const refresh = () => {
        void this.getUserProfile(uid).then((profile) => {
          if (active) callback(profile);
        });
      };
      refresh();
      const interval = window.setInterval(refresh, 3_000);
      return () => {
        active = false;
        window.clearInterval(interval);
      };
    } catch (err) {
      console.warn('subscribeUserProfile fallback:', err);
      return () => {};
    }
  }
};
