import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { makeOctokit, listOrgMembers, getUserDetails, getMemberRole } from "@/lib/github";
import { db } from "@/lib/db";
import { orgMembers, account } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * POST /api/members/sync
 * Sync organization members from GitHub
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;

  // Get GitHub token from account table
  const githubAccount = await db.query.account.findFirst({
    where: eq(account.userId, user.id as string),
  });

  if (!githubAccount?.accessToken) {
    return NextResponse.json(
      { error: "GitHub token not found" },
      { status: 401 }
    );
  }

  const githubToken = githubAccount.accessToken;
  const org = process.env.ALLOWED_GH_ORG!;

  try {
    const octokit = makeOctokit(githubToken);

    // Fetch all organization members
    const members = await listOrgMembers(octokit, org);

    const results = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < members.length; i += BATCH_SIZE) {
      const batch = members.slice(i, i + BATCH_SIZE);
      console.log(`Processing member batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(members.length / BATCH_SIZE)} (${batch.length} members)`);

      const batchResults = await Promise.all(
        batch.map(async (member) => {
          try {
            // Get user details (name, etc.)
            const details = await getUserDetails(octokit, member.username);

            // Get member role
            const role = await getMemberRole(octokit, org, member.username);

            // Upsert member data
            const memberId = nanoid(32);
            // Check if member already exists
            const existingMember = await db.query.orgMembers.findFirst({
              where: (fields, { and, eq }) =>
                and(
                  eq(fields.org, org),
                  eq(fields.username, member.username)
                ),
            });

            if (existingMember) {
              // Update existing member
              await db
                .update(orgMembers)
                .set({
                  name: details.name,
                  avatarUrl: member.avatarUrl,
                  profileUrl: member.profileUrl,
                  role,
                  lastSyncedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(orgMembers.id, existingMember.id));
            } else {
              // Insert new member
              await db
                .insert(orgMembers)
                .values({
                  id: memberId,
                  org,
                  username: member.username,
                  userId: member.userId,
                  name: details.name,
                  avatarUrl: member.avatarUrl,
                  profileUrl: member.profileUrl,
                  role,
                  lastSyncedAt: new Date(),
                });
            }

            return { username: member.username, status: "success" };
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown error";
            console.error(`Failed to sync member ${member.username}:`, error);
            return { username: member.username, status: "error", error: message };
          }
        })
      );

      results.push(...batchResults);
    }

    return NextResponse.json({
      message: "Member sync completed",
      results,
      synced: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Member sync failed:", error);
    return NextResponse.json(
      { error: "Member sync failed", message },
      { status: 500 }
    );
  }
}
