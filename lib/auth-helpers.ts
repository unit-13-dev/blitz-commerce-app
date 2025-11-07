import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@prisma/client";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
  avatarUrl: string | null;
}

/**
 * Get current authenticated user from session
 * Server-side equivalent of useAuth().profile
 * Always fetches fresh data from database to ensure role is up-to-date
 * 
 * @param requiredRole - Optional role check (e.g., 'admin', 'vendor', 'user')
 * @returns User profile or null if not authenticated
 * @throws Error with message containing 'UNAUTHORIZED' or 'FORBIDDEN' for error handling
 */
export async function getCurrentUser(requiredRole?: UserRole): Promise<CurrentUser | null> {
  try {
    // Read session token from cookies (same way NextAuth does)
    const cookieStore = await cookies();
    const sessionToken = 
      cookieStore.get('next-auth.session-token')?.value || 
      cookieStore.get('__Secure-next-auth.session-token')?.value;
    
    if (!sessionToken) {
      return null;
    }

    // Decode JWT token to get user ID
    const token = await getToken({ 
      req: {
        headers: {
          cookie: `next-auth.session-token=${sessionToken}`,
        },
      } as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.id || typeof token.id !== 'string') {
      return null;
    }

    // Fetch profile from database (ensures fresh role)
    const profile = await prisma.profile.findUnique({
      where: { id: token.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (!profile) {
      return null;
    }

    // Check role if requiredRole is provided
    if (requiredRole && profile.role !== requiredRole) {
      throw new Error(`FORBIDDEN: ${requiredRole} access required`);
    }

    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.fullName,
      role: profile.role,
      avatarUrl: profile.avatarUrl,
    };
  } catch (error) {
    // Re-throw role check errors
    if (error instanceof Error && error.message.includes('FORBIDDEN')) {
      throw error;
    }
    // Return null for auth errors (not authenticated)
    console.error('Error getting current user:', error);
    return null;
  }
}

/**
 * Require authentication - throws error if user is not authenticated
 * @returns User profile (guaranteed to exist)
 * @throws Error if not authenticated
 */
export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }
  return user;
}

/**
 * Require specific role - throws error if user doesn't have required role
 * @param role - Required role ('admin', 'vendor', or 'user')
 * @returns User profile with required role (guaranteed to exist and have role)
 * @throws Error if not authenticated or doesn't have required role
 */
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser(role);
  if (!user) {
    throw new Error('UNAUTHORIZED: Authentication required');
  }
  // If we get here, user exists and has the required role
  return user;
}

