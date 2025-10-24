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
 * Sync repositories: scan new repos and rescan updated repos
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
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

    // Get already scanned repositories from database with pushedAt
    const existingRepos = await db
      .select({
        repoId: repoInventory.repoId,
        repoPushedAt: repoInventory.repoPushedAt,
      })
      .from(repoInventory)
      .where(eq(repoInventory.org, org));

    // Create map for fast lookup: repoId -> repoPushedAt
    const existingRepoMap = new Map(
      existingRepos.map((r) => [r.repoId, r.repoPushedAt])
    );

    // Separate repos into new and updated
    const newRepos = [];
    const updatedRepos = [];

    for (const repo of allRepos) {
      const existingPushedAt = existingRepoMap.get(repo.repoId);

      if (!existingPushedAt) {
        // New repository
        newRepos.push(repo);
      } else if (repo.pushedAt && repo.pushedAt > existingPushedAt) {
        // Updated repository (pushedAt is newer)
        updatedRepos.push(repo);
      }
    }

    const totalToScan = newRepos.length + updatedRepos.length;

    if (totalToScan === 0) {
      return NextResponse.json({
        message: "All repositories are up to date",
        newCount: 0,
        updatedCount: 0,
        totalScanned: 0,
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

    // Rescan updated repositories
    for (const repo of updatedRepos) {
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
        console.log(`Rescanned updated repo: ${repo.name}`);
      } catch (error) {
        console.error(`Failed to rescan updated repo ${repo.name}:`, error);
      }
    }

    return NextResponse.json({
      message: `Successfully synced ${totalToScan} repositories (${newRepos.length} new, ${updatedRepos.length} updated)`,
      newCount: newRepos.length,
      updatedCount: updatedRepos.length,
      totalScanned: totalToScan,
    });
  } catch (error) {
    console.error("Failed to sync repositories:", error);
    return NextResponse.json(
      { error: "Failed to sync repositories" },
      { status: 500 }
    );
  }
}
