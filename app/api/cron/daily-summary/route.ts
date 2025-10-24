import { NextRequest, NextResponse } from "next/server";
import { subDays, format } from "date-fns";
import { makeOctokit } from "@/lib/github";
import { generateDailySummary } from "@/lib/activity-summary";
import { sendDailySummary, getRecipients } from "@/lib/email";
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

    // 4. Calculate date (yesterday)
    const yesterday = subDays(new Date(), 1);
    const dateStr = format(yesterday, 'yyyy-MM-dd');

    console.log(`[Cron] Generating daily summary for ${org} on ${dateStr}`);

    // 5. Generate summary
    const summaryId = await generateDailySummary(octokit, org, yesterday);

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
        date: dateStr,
      });
    }

    const subject = `GitHub Activity Summary - ${format(yesterday, 'MMMM dd, yyyy')}`;
    const emailResult = await sendDailySummary(recipients, subject, markdown, yesterday);

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

    console.log(`[Cron] Successfully sent daily summary ${summaryId} to ${recipients.length} recipients`);

    return NextResponse.json({
      success: true,
      summaryId,
      emailId: emailResult.id,
      recipients: recipients.length,
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
