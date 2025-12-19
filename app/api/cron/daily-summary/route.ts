import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { makeOctokit } from "@/lib/github";
import { generateDailySummary, collectActivityData } from "@/lib/activity-summary";
import { sendDailySummary, getRecipients } from "@/lib/email";
import { sendToTeams } from "@/lib/teams";
import { generateInfographic } from "@/lib/infographic";
import { db } from "@/lib/db";
import { activitySummaries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Vercel Cron endpoint for generating and sending daily GitHub activity summaries
 *
 * Schedule: Monday-Friday at 11 PM UTC (= Tuesday-Saturday 8 AM JST)
 * Cron expression: 0 23 * * 1-5
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
    // Priority 1: GITHUB_BOT_TOKEN (recommended - dedicated Personal Access Token)
    // Priority 2: GITHUB_CLIENT_SECRET (fallback - OAuth App secret, already configured)
    // Note: Both work, but PAT is recommended for better rate limits and explicit permissions
    const githubToken = process.env.GITHUB_BOT_TOKEN || process.env.GITHUB_CLIENT_SECRET;
    if (!githubToken) {
      return NextResponse.json(
        { error: "GitHub token not configured. Set GITHUB_CLIENT_SECRET or GITHUB_BOT_TOKEN" },
        { status: 500 }
      );
    }

    const octokit = makeOctokit(githubToken);

    // 4. Calculate date range (last 24 hours from execution time)
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const dateStr = format(now, 'yyyy-MM-dd');

    console.log(`[Cron] Generating daily summary for ${org} (last 24 hours: ${twentyFourHoursAgo.toISOString()} - ${now.toISOString()})`);

    // 5. Collect activity data (for infographic generation)
    const activityData = await collectActivityData(octokit, org, twentyFourHoursAgo, now);

    // 6. Generate infographic in parallel with summary
    const [summaryId, infographic] = await Promise.all([
      generateDailySummary(octokit, org, twentyFourHoursAgo, now),
      generateInfographic(org, activityData, 'daily'),
    ]);

    // Log infographic generation result
    if (infographic) {
      console.log('[Cron] Infographic generated successfully');
    } else {
      console.log('[Cron] Infographic generation skipped or failed');
    }

    // 7. Get generated markdown from database
    const summary = await db
      .select()
      .from(activitySummaries)
      .where(eq(activitySummaries.id, summaryId))
      .limit(1);

    if (summary.length === 0) {
      throw new Error("Summary not found after generation");
    }

    const markdown = summary[0].markdown;

    // 8. Send to email and Teams in parallel
    const recipients = await getRecipients(org);
    const subject = `GitHub Activity Summary - ${format(now, 'MMMM dd, yyyy')}`;

    const [emailResult, teamsResult] = await Promise.all([
      recipients.length > 0
        ? sendDailySummary(recipients, subject, markdown, now, infographic || undefined)
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

    console.log(`[Cron] Completed daily summary ${summaryId}`);

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
      date: dateStr,
    });
  } catch (error) {
    console.error("[Cron] Failed to generate/send daily summary:", error);
    return NextResponse.json(
      {
        error: "Failed to generate/send summary",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
