import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth/next";
import { cookies } from "next/headers";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { getToken } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const profile = await prisma.profile.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!profile || !profile.passwordHash) {
          return null;
        }

        const isValid = await compare(credentials.password, profile.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: profile.id,
          email: profile.email,
          name: profile.fullName ?? profile.email,
          image: profile.avatarUrl ?? undefined,
          role: profile.role,
        } as any;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.email = user.email || token.email;
      }

      // Refresh user data periodically or on session update
      if (token.email && (!token.id || !token.role || trigger === 'update')) {
        const profile = await prisma.profile.findUnique({ where: { email: token.email } });
        if (profile) {
          token.id = profile.id;
          token.role = profile.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const getAuthSession = async () => {
  try {
    // In Next.js App Router API routes, we need to get the session token from cookies
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('next-auth.session-token')?.value ||
      cookieStore.get('__Secure-next-auth.session-token')?.value;

    if (!sessionToken) {
      // Fallback to getServerSession if no token found
      return await getServerSession(authOptions);
    }

    // Get the token and decode it to get user info
    // Construct cookie string for getToken
    const cookieString = `next-auth.session-token=${sessionToken}`;
    const token = await getToken({
      req: {
        headers: {
          cookie: cookieString,
        },
      } as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token || !token.id) {
      return null;
    }

    // Get user profile to ensure we have the latest role
    const profile = await prisma.profile.findUnique({
      where: { id: token.id as string },
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

    // Return session-like object
    return {
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.fullName || profile.email,
        image: profile.avatarUrl || undefined,
        role: profile.role,
      },
      expires: token.exp && typeof token.exp === 'number'
        ? new Date(token.exp * 1000).toISOString()
        : undefined,
    } as any;
  } catch (error) {
    console.error('Error getting auth session:', error);
    // Fallback to getServerSession
    try {
      return await getServerSession(authOptions);
    } catch (fallbackError) {
      console.error('Fallback getServerSession also failed:', fallbackError);
      return null;
    }
  }
};
