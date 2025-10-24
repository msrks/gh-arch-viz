import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activitySummaries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/middleware/auth";

/**
 * GET /api/activity/summaries/[date]
 * Get a specific activity summary by date
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
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
    const { date } = await params;

    // Parse date (format: YYYY-MM-DD)
    const summaryDate = new Date(date);
    if (isNaN(summaryDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Fetch summary from database
    const summary = await db
      .select()
      .from(activitySummaries)
      .where(
        and(
          eq(activitySummaries.org, org),
          eq(activitySummaries.summaryDate, summaryDate)
        )
      )
      .limit(1);

    if (summary.length === 0) {
      return NextResponse.json(
        { error: "Summary not found for this date" },
        { status: 404 }
      );
    }

    return NextResponse.json(summary[0]);
  } catch (error) {
    console.error("Failed to fetch activity summary:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
