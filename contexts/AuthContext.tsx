'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { signIn as nextAuthSignIn, signOut as nextAuthSignOut, useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { Profile, UserRole } from '@prisma/client';

interface AuthContextType {
  user: Session['user'] | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    userType?: UserRole
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  isAdmin: boolean;
  isVendor: boolean;
  isUser: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const DEFAULT_SIGNIN_ERROR = new Error('Unable to sign in with the provided credentials.');
const DEFAULT_SIGNUP_ERROR = new Error('Unable to create your account.');

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const userId = session?.user?.id ?? null;

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }

    try {
      setProfileLoading(true);
      const response = await fetch(`/api/profiles/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile ?? null);
      } else if (response.status === 404) {
        setProfile(null);
      } else {
        console.error('Failed to load profile', await response.text());
        setProfile(null);
      }
    } catch (error) {
      console.error('Profile fetch error', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const signUpHandler = useCallback<
    AuthContextType['signUp']
  >(async (email, password, fullName, userType = 'user') => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          role: userType,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          error: new Error((data as { message?: string }).message || DEFAULT_SIGNUP_ERROR.message),
        };
      }

      const signInResult = await nextAuthSignIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (signInResult?.error) {
        return { error: new Error(signInResult.error) };
      }

      await fetchProfile();
      return { error: null };
    } catch (error) {
      console.error('Sign-up error', error);
      return { error: error instanceof Error ? error : DEFAULT_SIGNUP_ERROR };
    }
  }, [fetchProfile]);

  const signInHandler = useCallback<
    AuthContextType['signIn']
  >(async (email, password) => {
    try {
      const result = await nextAuthSignIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        return { error: new Error(result.error) };
      }

      await fetchProfile();
      return { error: null };
    } catch (error) {
      console.error('Sign-in error', error);
      return { error: error instanceof Error ? error : DEFAULT_SIGNIN_ERROR };
    }
  }, [fetchProfile]);

  const signOutHandler = useCallback(async () => {
    await nextAuthSignOut({ redirect: false });
    setProfile(null);
  }, []);

  const updateProfileHandler = useCallback<
    AuthContextType['updateProfile']
  >(async (updates) => {
    if (!userId) {
      return { error: new Error('No user logged in') };
    }

    try {
      const response = await fetch(`/api/profiles/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to update profile');
      }

      const data = await response.json();
      setProfile(data.profile ?? null);
      return { error: null };
    } catch (error) {
      console.error('Update profile error', error);
      return { error: error instanceof Error ? error : new Error('Failed to update profile') };
    }
  }, [userId]);

  const role = profile?.role ?? 'user';
  const loading = status === 'loading' || profileLoading;

  const value = useMemo<AuthContextType>(() => ({
    user: session?.user ?? null,
    session: session ?? null,
    profile,
    loading,
    signUp: signUpHandler,
    signIn: signInHandler,
    signOut: signOutHandler,
    updateProfile: updateProfileHandler,
    isAdmin: role === 'admin',
    isVendor: role === 'vendor',
    isUser: role === 'user',
    refreshProfile: fetchProfile,
  }), [session, profile, loading, signUpHandler, signInHandler, signOutHandler, updateProfileHandler, role, fetchProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
