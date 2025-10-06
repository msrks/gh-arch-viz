import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { makeOctokit, listTeamRepos, listOrgRepos } from "@/lib/github";
import { scanOneRepo } from "@/lib/scan";
import { allDetectors } from "@/lib/detectors";
import { db } from "@/lib/db";
import { account } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { qstash } from "@/lib/qstash";

/**
 * POST /api/inventory/scan
 * Trigger bulk repository scan for the team
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
  const teamSlug = process.env.ALLOWED_GH_TEAM_SLUG!;

  try {
    const octokit = makeOctokit(githubToken);

    // List all team repositories or org repositories if no team specified
    const repos = teamSlug
      ? await listTeamRepos(octokit, org, teamSlug)
      : await listOrgRepos(octokit, org);

    const isDevelopment = process.env.NODE_ENV === "development";

    if (isDevelopment) {
      // Development: Direct scan with parallel batches (skip QStash to save quota)
      console.log(`[DEV MODE] Scanning ${repos.length} repositories in parallel batches...`);

      const results = [];
      const BATCH_SIZE = 10; // Process 10 repos at a time

      // Split repos into batches
      for (let i = 0; i < repos.length; i += BATCH_SIZE) {
        const batch = repos.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(repos.length / BATCH_SIZE)} (${batch.length} repos)`);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (repo) => {
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
              return { repo: repo.name, status: "success" };
            } catch (error) {
              const message = error instanceof Error ? error.message : "Unknown error";
              console.error(`Failed to scan ${repo.name}:`, error);
              return { repo: repo.name, status: "error", error: message };
            }
          })
        );

        results.push(...batchResults);
      }

      return NextResponse.json({
        message: "Scan completed (dev mode)",
        results,
        scanned: results.filter((r) => r.status === "success").length,
        failed: results.filter((r) => r.status === "error").length,
        mode: "direct",
      });
    } else {
      // Production: Use QStash for background processing
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
      const queueUrl = `${baseUrl}/api/queue/scan-repo`;

      const enqueuePromises = repos.map((repo) =>
        qstash.publishJSON({
          url: queueUrl,
          body: {
            repo,
            githubToken,
            org,
          },
        })
      );

      await Promise.all(enqueuePromises);

      return NextResponse.json({
        message: "Scan jobs enqueued successfully",
        totalRepos: repos.length,
        status: "queued",
        mode: "qstash",
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Scan failed:", error);
    return NextResponse.json(
      { error: "Scan failed", message },
      { status: 500 }
    );
  }
}
