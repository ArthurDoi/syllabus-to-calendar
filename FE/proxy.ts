import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/env";

// Routes that don't require authentication
const publicRoutes = ["/", "/login", "/register"];

// Routes that require authentication
const protectedRoutes = ["/courses", "/calendar", "/tasks", "/settings"];

/**
 * Check if JWT error indicates expired token
 */
function isExpiredTokenError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED';
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth-token")?.value;

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if route is public
  const isPublicRoute = publicRoutes.includes(pathname);

  // Check if token is valid (for protected routes)
  let isValidToken = false;
  let isExpired = false;
  if (isProtectedRoute && token) {
    try {
      const jwtSecret = getJwtSecret();
      await jwtVerify(token, jwtSecret);
      isValidToken = true;
    } catch (error) {
      // Token is invalid - check if it's expired or just invalid
      if (isExpiredTokenError(error)) {
        isExpired = true;
      }
      // If token is invalid for any reason, treat as no auth
      isValidToken = false;
    }
  }

  // Redirect to login if accessing protected route without auth or with invalid/expired token
  if (isProtectedRoute && (!token || !isValidToken)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    if (isExpired) {
      loginUrl.searchParams.set("expired", "true");
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth pages while logged in with valid token
  if ((pathname === "/login" || pathname === "/register") && token && isValidToken) {
    // Check if there's a redirect parameter and use it, otherwise go to courses
    const redirectTo = request.nextUrl.searchParams.get("redirect") || "/courses";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

