import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activitySummaries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/middleware/auth";

/**
 * GET /api/activity/summaries
 * Get list of all activity summaries
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { org } = authResult;

    // Fetch summaries from database
    const summaries = await db
      .select({
        id: activitySummaries.id,
        summaryDate: activitySummaries.summaryDate,
        sentAt: activitySummaries.sentAt,
        createdAt: activitySummaries.createdAt,
      })
      .from(activitySummaries)
      .where(eq(activitySummaries.org, org))
      .orderBy(desc(activitySummaries.summaryDate))
      .limit(30); // Last 30 summaries

    return NextResponse.json({
      summaries,
      total: summaries.length,
    });
  } catch (error) {
    console.error("Failed to fetch activity summaries:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch summaries",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
