import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

/**
 * Verify session and return user info with GitHub token
 */
export async function requireAuth(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return {
      success: false as const,
      error: "Unauthorized",
    };
  }

  // Get GitHub account from session
  const user = session.user;
  const org = process.env.ALLOWED_GH_ORG!;

  // TODO: Get GitHub access token from account table
  // For now, we'll return the session

  return {
    success: true as const,
    session,
    user,
    org,
  };
}

/**
 * Verify org/team membership (to be implemented with TTL check)
 */
export async function verifyMembershipTTL(
  token: string,
  org: string,
  teamSlug: string,
  username: string,
  lastVerifiedAt: number | null
): Promise<boolean> {
  const ttlSeconds = parseInt(
    process.env.MEMBERSHIP_CACHE_TTL_SECONDS || "600",
    10
  );
  const now = Date.now();

  // If last verified within TTL, skip re-verification
  if (lastVerifiedAt && now - lastVerifiedAt < ttlSeconds * 1000) {
    return true;
  }

  // TODO: Re-verify membership with GitHub API
  // For now, return true (implement actual verification)
  return true;
}
