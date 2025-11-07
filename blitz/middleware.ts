import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/workflows(.*)',
  '/profile(.*)',
  '/api/workflows(.*)',
  '/api/business(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    const { userId } = await auth();
    if (!userId) {
      const redirectUrl = new URL('/sign-in', req.url);
      // Preserve the original destination so we can return after sign-in
      redirectUrl.searchParams.set('redirect_url', req.nextUrl.href);
      return NextResponse.redirect(redirectUrl);
    }
  }
});

export const config = {
  matcher: [
    '/((?!.+\\.[\\w]+$|_next).*)',
    '/(api)(.*)',
  ],
};
