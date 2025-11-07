import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Allow the request to proceed
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Require authentication for protected routes
        return !!token;
      },
    },
    pages: {
      signIn: "/auth",
    },
  }
);

// Configure which routes should be protected
// Only protect page routes - API routes handle their own authentication
export const config = {
  matcher: [
    // Protect pages that require authentication
    "/checkout/:path*",
    "/cart/:path*",
    "/orders/:path*",
    "/settings/:path*",
    "/wishlist/:path*",
    "/groups/:path*",
  ],
};

