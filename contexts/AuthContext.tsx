"use client";

import { useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import type { Session } from "next-auth";

interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: Session["user"] | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName?: string, role?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthContextValue {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const loading = status === "loading" || isLoading;

  // Map session user to profile format
  const profile: Profile | null = session?.user
    ? {
        id: session.user.id || "",
        email: session.user.email || "",
        fullName: session.user.name || null,
        role: (session.user as any).role || "user",
        avatarUrl: (session.user as any).image || null,
      }
    : null;

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        setIsLoading(true);
        const result = await nextAuthSignIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          return { error: result.error };
        }

        if (result?.ok) {
          router.refresh();
          return {};
        }

        return { error: "Failed to sign in" };
      } catch (error: any) {
        return { error: error.message || "Failed to sign in" };
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string,
      role?: string
    ): Promise<{ error?: string }> => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            fullName,
            role: role || "user",
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          return { error: data.message || "Failed to register" };
        }

        // After successful registration, sign in the user
        const signInResult = await nextAuthSignIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          return { error: "Account created but failed to sign in. Please try signing in manually." };
        }

        if (signInResult?.ok) {
          router.refresh();
          return {};
        }

        return { error: "Account created but failed to sign in. Please try signing in manually." };
      } catch (error: any) {
        return { error: error.message || "Failed to register" };
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await nextAuthSignOut({ redirect: false });
      router.refresh();
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return {
    user: session?.user || null,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
  };
}