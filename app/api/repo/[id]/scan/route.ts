import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { makeOctokit } from "@/lib/github";
import { scanOneRepo } from "@/lib/scan";
import { allDetectors } from "@/lib/detectors";
import { db } from "@/lib/db";
import { repoInventory, account } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/repo/[id]/scan
 * Trigger single repository scan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { user } = authResult;
  const { id: repoId } = await params;

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
    // Find repository in inventory
    const repo = await db.query.repoInventory.findFirst({
      where: eq(repoInventory.id, repoId),
    });

    if (!repo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    const octokit = makeOctokit(githubToken);

    // Scan the repository
    const result = await scanOneRepo(
      octokit,
      org,
      repo.repoName,
      {
        org: repo.org,
        repoId: repo.repoId,
        name: repo.repoName,
        url: repo.url,
        defaultBranch: repo.defaultBranch,
        visibility: repo.visibility,
        primaryLanguage: repo.primaryLanguage,
      },
      allDetectors
    );

    return NextResponse.json({
      message: "Scan completed",
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    console.error(`Failed to scan repository ${repoId}:`, error);
    return NextResponse.json(
      { error: "Scan failed", message: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
