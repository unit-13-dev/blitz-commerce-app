import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/option";
import { UserRole } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  image?: string | null;
}

/**
 * Get the current user from the session (optional - returns null if not authenticated)
 * @param request - Optional request object (kept for backward compatibility, not used)
 */
export async function getCurrentUser(request?: Request): Promise<AuthenticatedUser | null> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return null;
    }

    return {
      id: session.user.id || "",
      email: session.user.email || "",
      name: session.user.name || null,
      role: (session.user as any).role || "user",
      image: session.user.image || null,
    };
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

/**
 * Require authentication - throws error if user is not authenticated
 * @param request - Optional request object (kept for backward compatibility, not used)
 */
export async function requireAuth(request?: Request): Promise<AuthenticatedUser> {
  const user = await getCurrentUser(request);
  
  if (!user) {
    const error = new Error("UNAUTHORIZED: Authentication required");
    (error as any).statusCode = 401;
    throw error;
  }

  return user;
}

/**
 * Require a specific role - throws error if user doesn't have the required role
 */
export async function requireRole(role: UserRole | UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  const requiredRoles = Array.isArray(role) ? role : [role];
  
  if (!requiredRoles.includes(user.role as UserRole)) {
    const error = new Error("FORBIDDEN: Insufficient permissions");
    (error as any).statusCode = 403;
    throw error;
  }

  return user;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(role: UserRole | UserRole[]): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;
  
  const requiredRoles = Array.isArray(role) ? role : [role];
  return requiredRoles.includes(user.role as UserRole);
}

