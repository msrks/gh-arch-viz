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
 * Schedule: Monday at 11 PM UTC (= Tuesday 8 AM JST)
 * Cron expression: 0 23 * * 1
 *
 * Summarizes activities from the previous week (Monday-Friday)
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

    // 4. Calculate date range (previous week Monday-Friday)
    // Current execution: Sunday 23:00 UTC = Monday 8:00 JST
    // Target: Previous week's Monday-Friday (1-5 days ago)
    const today = new Date();
    const lastFriday = subDays(today, 2); // Sunday - 2 days = Friday
    const lastMonday = subDays(today, 6); // Sunday - 6 days = Monday

    const weekLabel = `${format(lastMonday, 'MMM dd')} - ${format(lastFriday, 'MMM dd, yyyy')}`;

    console.log(`[Cron] Generating weekly summary for ${org}: ${weekLabel}`);

    // 5. Generate summary
    const summaryId = await generateWeeklySummary(octokit, org, lastMonday, lastFriday);

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
    const emailResult = await sendDailySummary(recipients, subject, markdown, lastFriday);

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
