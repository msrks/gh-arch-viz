import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  const pathname = request.nextUrl.pathname;

  // Public routes - no authentication required
  const publicRoutes = ["/"];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Protected routes - require authentication
  const protectedRoutes = ["/app", "/repo", "/insights"];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtectedRoute && !session) {
    // Redirect to landing page if trying to access protected routes without session
    return NextResponse.redirect(new URL("/", request.url));
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