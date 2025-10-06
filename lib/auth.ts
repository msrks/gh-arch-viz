import { Octokit } from "@octokit/rest";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import * as schema from "./db/schema";

/**
 * Verify user's membership in the specified GitHub org and team
 */
async function verifyMembership(
  token: string,
  org: string,
  teamSlug: string,
  username: string
): Promise<void> {
  const octokit = new Octokit({ auth: token });

  // 1) Check org membership
  try {
    const { data: orgMembership } =
      await octokit.rest.orgs.getMembershipForUser({
        org,
        username,
      });
    if (orgMembership.state !== "active") {
      throw new Error("Not an active org member");
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      throw new Error(`User ${username} is not a member of ${org}`);
    }
    throw error;
  }

  // 2) Skip team membership check if teamSlug is empty
  if (!teamSlug || teamSlug.trim() === "") {
    return; // Only org membership required
  }

  // 3) Check team membership (only if teamSlug is specified)
  try {
    const { data: teamMembership } =
      await octokit.rest.teams.getMembershipForUserInOrg({
        org,
        team_slug: teamSlug,
        username,
      });
    if (!["active", "maintainer"].includes(teamMembership.state)) {
      throw new Error("Not an active team member");
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
      throw new Error(`User ${username} is not a member of team ${teamSlug}`);
    }
    throw error;
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ["read:org", "repo"],
    },
  },
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET!,
  callbacks: {
    async signIn({ user, account }: { user: Record<string, unknown>; account: Record<string, unknown> }) {
      if ((account as { provider?: string }).provider === "github") {
        const token = (account as { access_token?: string }).access_token;
        const username = (user as { name?: string }).name || (account as { providerAccountId?: string }).providerAccountId;

        if (!token || !username) {
          throw new Error("Missing GitHub token or username");
        }

        try {
          await verifyMembership(
            token,
            process.env.ALLOWED_GH_ORG!,
            process.env.ALLOWED_GH_TEAM_SLUG!,
            username
          );

          // Store additional session data
          return {
            ...user,
            githubToken: token,
            org: process.env.ALLOWED_GH_ORG,
            team: process.env.ALLOWED_GH_TEAM_SLUG,
            lastVerifiedAt: Date.now(),
          };
        } catch (err) {
          console.error("Membership verification failed:", err);
          throw new Error(
            "Not authorized: must be a member of the organization"
          );
        }
      }
      return user;
    },
  },
});
