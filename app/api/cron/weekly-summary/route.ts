import { NextRequest, NextResponse } from "next/server";
import { subDays, format, startOfWeek, endOfWeek } from "date-fns";
import { makeOctokit } from "@/lib/github";
import { generateWeeklySummary } from "@/lib/activity-summary";
import { sendDailySummary, getRecipients } from "@/lib/email";
import { db } from "@/lib/db";
import { activitySummaries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Vercel Cron endpoint for generating and sending weekly GitHub activity summaries
 *
 * Schedule: Sunday at 11 PM UTC (= Monday 8 AM JST)
 * Cron expression: 0 23 * * 0
 *
 * Summarizes activities from the previous week (Monday 00:00 - Sunday 23:59)
 *
 * Authentication: Bearer token (CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify authentication (Vercel Cron secret)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error("CRON_SECRET environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error("Unauthorized cron request");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get organization from environment
    const org = process.env.ALLOWED_GH_ORG;
    if (!org) {
      return NextResponse.json(
        { error: "ALLOWED_GH_ORG not configured" },
        { status: 500 }
      );
    }

    // 3. Get GitHub token for API access
    const githubToken = process.env.GITHUB_BOT_TOKEN || process.env.GITHUB_CLIENT_SECRET;
    if (!githubToken) {
      return NextResponse.json(
        { error: "GitHub token not configured. Set GITHUB_CLIENT_SECRET or GITHUB_BOT_TOKEN" },
        { status: 500 }
      );
    }

    const octokit = makeOctokit(githubToken);

    // 4. Calculate date range (previous week Monday-Sunday in JST)
    // Current execution: Sunday 23:00 UTC = Monday 8:00 JST
    // Target: Previous Monday 00:00 JST - Sunday 23:59 JST
    //
    // JST = UTC + 9 hours
    // Monday 00:00 JST = Sunday 15:00 UTC (previous day)
    // Sunday 23:59 JST = Sunday 14:59 UTC (same day)
    //
    // At execution time (Sunday 23:00 UTC):
    // - Last Sunday 14:59 UTC was 8 hours ago
    // - Previous Monday 00:00 JST = 7 days + 8 hours ago in UTC
    const now = new Date();

    // Get last Sunday 14:59:59 UTC (= Sunday 23:59:59 JST)
    const lastSundayUTC = new Date(now);
    lastSundayUTC.setUTCHours(14, 59, 59, 999);

    // Get last Monday 15:00 UTC (= Monday 00:00 JST)
    const lastMondayUTC = subDays(lastSundayUTC, 6);
    lastMondayUTC.setUTCHours(15, 0, 0, 0);

    const weekLabel = `${format(lastMondayUTC, 'MMM dd')} - ${format(lastSundayUTC, 'MMM dd, yyyy')}`;

    console.log(`[Cron] Generating weekly summary for ${org}: ${weekLabel}`);

    // 5. Generate summary (pass UTC times directly - they will be used as-is by GitHub API)
    const summaryId = await generateWeeklySummary(octokit, org, lastMondayUTC, lastSundayUTC);

    // 6. Get generated markdown from database
    const summary = await db
      .select()
      .from(activitySummaries)
      .where(eq(activitySummaries.id, summaryId))
      .limit(1);

    if (summary.length === 0) {
      throw new Error("Summary not found after generation");
    }

    const markdown = summary[0].markdown;

    // 7. Send email
    const recipients = await getRecipients(org);
    if (recipients.length === 0) {
      console.warn("No recipients found in database or environment variable, skipping email");
      return NextResponse.json({
        success: true,
        summaryId,
        message: "Summary generated but no recipients found",
        weekLabel,
      });
    }

    const subject = `GitHub Weekly Summary - ${weekLabel}`;
    const emailResult = await sendDailySummary(recipients, subject, markdown, lastSundayUTC);

    if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
      return NextResponse.json(
        {
          error: "Failed to send email",
          details: emailResult.error,
          summaryId,
        },
        { status: 500 }
      );
    }

    // 8. Update sentAt timestamp
    await db
      .update(activitySummaries)
      .set({ sentAt: new Date() })
      .where(eq(activitySummaries.id, summaryId));

    console.log(`[Cron] Successfully sent weekly summary ${summaryId} to ${recipients.length} recipients`);

    return NextResponse.json({
      success: true,
      summaryId,
      emailId: emailResult.id,
      recipients: recipients.length,
      weekLabel,
    });
  } catch (error) {
    console.error("[Cron] Failed to generate/send weekly summary:", error);
    return NextResponse.json(
      {
        error: "Failed to generate/send summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
