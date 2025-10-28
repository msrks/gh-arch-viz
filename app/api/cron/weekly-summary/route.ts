import { NextRequest, NextResponse } from "next/server";
import { subDays, format, startOfWeek, endOfWeek } from "date-fns";
import { makeOctokit } from "@/lib/github";
import { generateWeeklySummary } from "@/lib/activity-summary";
import { sendDailySummary, getRecipients } from "@/lib/email";
import { sendToTeams } from "@/lib/teams";
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

    // 4. Calculate date range (last 7 days from execution time)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekLabel = `${format(sevenDaysAgo, 'MMM dd')} - ${format(now, 'MMM dd, yyyy')}`;

    console.log(`[Cron] Generating weekly summary for ${org} (last 7 days: ${sevenDaysAgo.toISOString()} - ${now.toISOString()})`);

    // 5. Generate summary (pass UTC times directly - they will be used as-is by GitHub API)
    const summaryId = await generateWeeklySummary(octokit, org, sevenDaysAgo, now);

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

    // 7. Send to email and Teams in parallel
    const recipients = await getRecipients(org);
    const subject = `GitHub Weekly Summary - ${weekLabel}`;

    const [emailResult, teamsResult] = await Promise.all([
      recipients.length > 0
        ? sendDailySummary(recipients, subject, markdown, now)
        : Promise.resolve({ success: false, error: 'No recipients configured' }),
      sendToTeams(markdown, org, now),
    ]);

    // Log results
    if (recipients.length === 0) {
      console.warn("No email recipients found in database or environment variable, skipped email");
    } else if (!emailResult.success) {
      console.error("Failed to send email:", emailResult.error);
    } else {
      console.log(`[Cron] Successfully sent email to ${recipients.length} recipients`);
    }

    if (!teamsResult.success) {
      console.warn("Failed to send to Teams:", teamsResult.error);
    } else {
      console.log("[Cron] Successfully sent to Teams");
    }

    // 8. Update sentAt timestamp (if at least one notification succeeded)
    if (emailResult.success || teamsResult.success) {
      await db
        .update(activitySummaries)
        .set({ sentAt: new Date() })
        .where(eq(activitySummaries.id, summaryId));
    }

    console.log(`[Cron] Completed weekly summary ${summaryId}`);

    return NextResponse.json({
      success: true,
      summaryId,
      email: {
        sent: emailResult.success,
        recipients: recipients.length,
        emailId: 'id' in emailResult ? emailResult.id : undefined,
        error: 'error' in emailResult ? emailResult.error : undefined,
      },
      teams: {
        sent: teamsResult.success,
        error: 'error' in teamsResult ? teamsResult.error : undefined,
      },
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
