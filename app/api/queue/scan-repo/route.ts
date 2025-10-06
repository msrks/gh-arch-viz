import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { makeOctokit } from "@/lib/github";
import { scanOneRepo } from "@/lib/scan";
import { allDetectors } from "@/lib/detectors";

/**
 * POST /api/queue/scan-repo
 * Background job handler for scanning a single repository
 * Called by QStash
 */
async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { repo, githubToken, org } = body;

    if (!repo || !githubToken || !org) {
      return NextResponse.json(
        { error: "Missing required fields: repo, githubToken, org" },
        { status: 400 }
      );
    }

    const octokit = makeOctokit(githubToken);

    // Scan the repository
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

    return NextResponse.json({
      success: true,
      repo: repo.name,
      message: "Repository scanned successfully",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Queue scan failed:", error);
    return NextResponse.json(
      { error: "Scan failed", message, success: false },
      { status: 500 }
    );
  }
}

// Verify QStash signature to ensure the request is from QStash
export const POST = verifySignatureAppRouter(handler);
