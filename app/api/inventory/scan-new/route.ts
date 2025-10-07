import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { repoInventory, account } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { makeOctokit, listOrgRepos } from "@/lib/github";
import { scanOneRepo } from "@/lib/scan";
import { allDetectors } from "@/lib/detectors";

/**
 * POST /api/inventory/scan-new
 * Scan only new repositories that haven't been added to inventory yet
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
  const org = process.env.ALLOWED_GH_ORG;

  if (!org) {
    return NextResponse.json(
      { error: "Organization not configured" },
      { status: 500 }
    );
  }

  try {
    const octokit = makeOctokit(githubToken);

    // Get all repositories from GitHub
    const allRepos = await listOrgRepos(octokit, org);

    // Get already scanned repository IDs from database
    const existingRepos = await db
      .select({ repoId: repoInventory.repoId })
      .from(repoInventory)
      .where(eq(repoInventory.org, org));

    const existingRepoIds = new Set(existingRepos.map((r) => r.repoId));

    // Filter only new repositories
    const newRepos = allRepos.filter((repo) => !existingRepoIds.has(repo.repoId));

    if (newRepos.length === 0) {
      return NextResponse.json({
        message: "No new repositories to scan",
        scannedCount: 0,
      });
    }

    // Scan new repositories
    for (const repo of newRepos) {
      try {
        await scanOneRepo(
          octokit,
          repo.owner,
          repo.name,
          {
            org,
            repoId: repo.repoId,
            name: repo.name,
            url: repo.url,
            defaultBranch: repo.defaultBranch,
            visibility: repo.visibility,
            primaryLanguage: repo.primaryLanguage,
            updatedAt: repo.updatedAt,
            pushedAt: repo.pushedAt,
          },
          allDetectors
        );
        console.log(`Scanned new repo: ${repo.name}`);
      } catch (error) {
        console.error(`Failed to scan new repo ${repo.name}:`, error);
      }
    }

    return NextResponse.json({
      message: `Successfully scanned ${newRepos.length} new repositories`,
      scannedCount: newRepos.length,
    });
  } catch (error) {
    console.error("Failed to scan new repositories:", error);
    return NextResponse.json(
      { error: "Failed to scan new repositories" },
      { status: 500 }
    );
  }
}
