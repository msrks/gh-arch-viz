import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { makeOctokit, listTeamRepos } from "@/lib/github";
import { scanOneRepo } from "@/lib/scan";
import { allDetectors } from "@/lib/detectors";

/**
 * POST /api/inventory/scan
 * Trigger bulk repository scan for the team
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // const { user } = authResult;

  // Get GitHub token from user account
  // TODO: Fetch from account table properly
  const githubToken = process.env.GITHUB_TOKEN; // Temporary - use actual user token
  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub token not found" },
      { status: 401 }
    );
  }

  const org = process.env.ALLOWED_GH_ORG!;
  const teamSlug = process.env.ALLOWED_GH_TEAM_SLUG!;

  try {
    const octokit = makeOctokit(githubToken);

    // List all team repositories
    const repos = await listTeamRepos(octokit, org, teamSlug);

    // Scan each repository (simplified - should use queue/background jobs)
    const results = [];
    for (const repo of repos.slice(0, 10)) {
      // Limit to 10 for now
      try {
        await scanOneRepo(
          octokit,
          org,
          repo.name,
          {
            org,
            repoId: repo.repoId,
            name: repo.name,
            url: repo.url,
            defaultBranch: repo.defaultBranch,
            visibility: repo.visibility,
            primaryLanguage: repo.primaryLanguage,
          },
          allDetectors
        );
        results.push({ repo: repo.name, status: "success" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to scan ${repo.name}:`, error);
        results.push({ repo: repo.name, status: "error", error: message });
      }
    }

    return NextResponse.json({
      message: "Scan completed",
      results,
      scanned: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Bulk scan failed:", error);
    return NextResponse.json(
      { error: "Scan failed", message },
      { status: 500 }
    );
  }
}
