import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "./lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Redirect to sign-in if accessing protected routes without session
  if (!session && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  // Redirect to home if accessing auth pages while authenticated
  if (session && (
    request.nextUrl.pathname.startsWith("/auth/sign-in") ||
    request.nextUrl.pathname.startsWith("/auth/sign-up")
  )) {
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