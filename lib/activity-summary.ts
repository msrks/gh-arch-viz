import { Octokit } from "@octokit/rest";
import { format, subDays } from "date-fns";
import { db } from "@/lib/db";
import { activitySummaries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  getRepoCommits,
  getOrgPullRequests,
  getOrgIssues,
  listOrgRepos,
} from "@/lib/github";
import { enhanceMarkdownWithAI } from "@/lib/ai-summary";

export interface ActivityData {
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    authorAvatar: string | null;
    date: Date;
    url: string;
    repo: string;
  }>;
  pullRequests: Array<{
    number: number;
    title: string;
    state: string;
    merged: boolean;
    author: string;
    authorAvatar: string | null;
    repo: string;
    url: string;
    createdAt: Date;
    closedAt: Date | null;
  }>;
  issues: Array<{
    number: number;
    title: string;
    state: string;
    author: string;
    authorAvatar: string | null;
    repo: string;
    url: string;
    createdAt: Date;
    closedAt: Date | null;
  }>;
}

/**
 * Collect activity data for an organization within a date range
 */
export async function collectActivityData(
  octokit: Octokit,
  org: string,
  since: Date,
  until: Date
): Promise<ActivityData> {
  console.log(`Collecting activity data for ${org} from ${since.toISOString()} to ${until.toISOString()}`);

  // Fetch PRs and Issues (org-wide)
  const [pullRequests, issues] = await Promise.all([
    getOrgPullRequests(octokit, org, since, until),
    getOrgIssues(octokit, org, since, until),
  ]);

  // Fetch commits from all repos
  const repos = await listOrgRepos(octokit, org);
  const commitsPromises = repos.map(async (repo) => {
    try {
      const repoCommits = await getRepoCommits(
        octokit,
        org,
        repo.name,
        since,
        until
      );
      return repoCommits.map((commit) => ({
        ...commit,
        repo: repo.name,
      }));
    } catch (error) {
      console.warn(`Failed to fetch commits for ${org}/${repo.name}:`, error);
      return [];
    }
  });

  const commitsResults = await Promise.all(commitsPromises);
  const commits = commitsResults.flat();

  return {
    commits,
    pullRequests,
    issues,
  };
}

/**
 * Group activities by repository
 */
export function groupByRepository(data: ActivityData): Map<string, {
  commits: ActivityData['commits'];
  pullRequests: ActivityData['pullRequests'];
  issues: ActivityData['issues'];
}> {
  const grouped = new Map<string, {
    commits: ActivityData['commits'];
    pullRequests: ActivityData['pullRequests'];
    issues: ActivityData['issues'];
  }>();

  // Group commits
  for (const commit of data.commits) {
    if (!grouped.has(commit.repo)) {
      grouped.set(commit.repo, { commits: [], pullRequests: [], issues: [] });
    }
    grouped.get(commit.repo)!.commits.push(commit);
  }

  // Group PRs
  for (const pr of data.pullRequests) {
    if (!grouped.has(pr.repo)) {
      grouped.set(pr.repo, { commits: [], pullRequests: [], issues: [] });
    }
    grouped.get(pr.repo)!.pullRequests.push(pr);
  }

  // Group issues
  for (const issue of data.issues) {
    if (!grouped.has(issue.repo)) {
      grouped.set(issue.repo, { commits: [], pullRequests: [], issues: [] });
    }
    grouped.get(issue.repo)!.issues.push(issue);
  }

  return grouped;
}

/**
 * Group activities by member
 */
export function groupByMember(data: ActivityData): Map<string, {
  commits: number;
  pullRequests: number;
  issues: number;
  totalActivity: number;
}> {
  const members = new Map<string, {
    commits: number;
    pullRequests: number;
    issues: number;
    totalActivity: number;
  }>();

  // Count commits
  for (const commit of data.commits) {
    if (!members.has(commit.author)) {
      members.set(commit.author, { commits: 0, pullRequests: 0, issues: 0, totalActivity: 0 });
    }
    const member = members.get(commit.author)!;
    member.commits++;
    member.totalActivity++;
  }

  // Count PRs
  for (const pr of data.pullRequests) {
    if (!members.has(pr.author)) {
      members.set(pr.author, { commits: 0, pullRequests: 0, issues: 0, totalActivity: 0 });
    }
    const member = members.get(pr.author)!;
    member.pullRequests++;
    member.totalActivity++;
  }

  // Count issues
  for (const issue of data.issues) {
    if (!members.has(issue.author)) {
      members.set(issue.author, { commits: 0, pullRequests: 0, issues: 0, totalActivity: 0 });
    }
    const member = members.get(issue.author)!;
    member.issues++;
    member.totalActivity++;
  }

  return members;
}

/**
 * Format commit summary
 */
function formatCommitSummary(commits: ActivityData['commits']): string {
  if (commits.length === 0) return "";

  const lines = commits.slice(0, 5).map((commit) => {
    const firstLine = commit.message.split('\n')[0];
    const truncated = firstLine.length > 80 ? firstLine.substring(0, 80) + "..." : firstLine;
    return `  - @${commit.author}: ${truncated}`;
  });

  if (commits.length > 5) {
    lines.push(`  - _... and ${commits.length - 5} more commits_`);
  }

  return lines.join('\n');
}

/**
 * Format PR summary
 */
function formatPRSummary(prs: ActivityData['pullRequests']): string {
  if (prs.length === 0) return "";

  const merged = prs.filter((pr) => pr.merged);
  const open = prs.filter((pr) => pr.state === "open" && !pr.merged);
  const closed = prs.filter((pr) => pr.state === "closed" && !pr.merged);

  const lines: string[] = [];

  if (merged.length > 0) {
    lines.push(`  - **Merged (${merged.length})**:`);
    merged.slice(0, 3).forEach((pr) => {
      lines.push(`    - #${pr.number}: ${pr.title} by @${pr.author}`);
    });
    if (merged.length > 3) {
      lines.push(`    - _... and ${merged.length - 3} more_`);
    }
  }

  if (open.length > 0) {
    lines.push(`  - **Opened (${open.length})**:`);
    open.slice(0, 3).forEach((pr) => {
      lines.push(`    - #${pr.number}: ${pr.title} by @${pr.author}`);
    });
    if (open.length > 3) {
      lines.push(`    - _... and ${open.length - 3} more_`);
    }
  }

  if (closed.length > 0) {
    lines.push(`  - **Closed (${closed.length})**`);
  }

  return lines.join('\n');
}

/**
 * Format issue summary
 */
function formatIssueSummary(issues: ActivityData['issues']): string {
  if (issues.length === 0) return "";

  const opened = issues.filter((issue) => issue.state === "open");
  const closed = issues.filter((issue) => issue.state === "closed");

  const lines: string[] = [];

  if (opened.length > 0) {
    lines.push(`  - **Opened (${opened.length})**:`);
    opened.slice(0, 3).forEach((issue) => {
      lines.push(`    - #${issue.number}: ${issue.title} by @${issue.author}`);
    });
    if (opened.length > 3) {
      lines.push(`    - _... and ${opened.length - 3} more_`);
    }
  }

  if (closed.length > 0) {
    lines.push(`  - **Closed (${closed.length})**`);
  }

  return lines.join('\n');
}

/**
 * Generate markdown summary from activity data
 */
export function generateMarkdown(
  org: string,
  date: Date,
  data: ActivityData
): string {
  const formattedDate = format(date, 'MMMM dd, yyyy');

  // Calculate totals
  const totalCommits = data.commits.length;
  const totalPRs = data.pullRequests.length;
  const totalIssues = data.issues.length;
  const mergedPRs = data.pullRequests.filter((pr) => pr.merged).length;
  const openPRs = data.pullRequests.filter((pr) => pr.state === "open" && !pr.merged).length;
  const openedIssues = data.issues.filter((issue) => issue.state === "open").length;
  const closedIssues = data.issues.filter((issue) => issue.state === "closed").length;

  // Group by member and get top contributors
  const memberStats = groupByMember(data);
  const topContributors = Array.from(memberStats.entries())
    .sort((a, b) => b[1].totalActivity - a[1].totalActivity)
    .slice(0, 5);

  // Group by repository
  const repoGroups = groupByRepository(data);
  const activeRepos = Array.from(repoGroups.entries())
    .filter(([, activity]) =>
      activity.commits.length > 0 ||
      activity.pullRequests.length > 0 ||
      activity.issues.length > 0
    )
    .sort((a, b) =>
      (b[1].commits.length + b[1].pullRequests.length + b[1].issues.length) -
      (a[1].commits.length + a[1].pullRequests.length + a[1].issues.length)
    );

  // Build markdown
  let markdown = `# GitHub Activity Summary - ${formattedDate}\n\n`;
  markdown += `**Organization**: ${org}\n\n`;

  // Overview section
  markdown += `## 📊 Overview\n\n`;
  markdown += `- **Total Commits**: ${totalCommits}\n`;
  markdown += `- **Pull Requests**: ${totalPRs} (${mergedPRs} merged, ${openPRs} open)\n`;
  markdown += `- **Issues**: ${totalIssues} (${openedIssues} opened, ${closedIssues} closed)\n`;
  markdown += `- **Active Members**: ${memberStats.size}\n`;
  markdown += `- **Active Repositories**: ${activeRepos.length}\n\n`;

  // Top contributors section
  if (topContributors.length > 0) {
    markdown += `## 👥 Top Contributors\n\n`;
    topContributors.forEach(([username, stats], index) => {
      markdown += `${index + 1}. **@${username}** - ${stats.commits} commits, ${stats.pullRequests} PRs, ${stats.issues} issues\n`;
    });
    markdown += `\n`;
  }

  // Repository activity section
  if (activeRepos.length > 0) {
    markdown += `## 📦 Repository Activity\n\n`;
    activeRepos.slice(0, 10).forEach(([repo, activity]) => {
      markdown += `### ${repo}\n\n`;

      if (activity.commits.length > 0) {
        markdown += `**Commits (${activity.commits.length})**:\n`;
        markdown += formatCommitSummary(activity.commits) + '\n\n';
      }

      if (activity.pullRequests.length > 0) {
        markdown += `**Pull Requests (${activity.pullRequests.length})**:\n`;
        markdown += formatPRSummary(activity.pullRequests) + '\n\n';
      }

      if (activity.issues.length > 0) {
        markdown += `**Issues (${activity.issues.length})**:\n`;
        markdown += formatIssueSummary(activity.issues) + '\n\n';
      }
    });

    if (activeRepos.length > 10) {
      markdown += `_... and ${activeRepos.length - 10} more repositories with activity_\n\n`;
    }
  }

  // No activity message
  if (totalCommits === 0 && totalPRs === 0 && totalIssues === 0) {
    markdown += `## 🤷 No Activity\n\n`;
    markdown += `No commits, pull requests, or issues were created on ${formattedDate}.\n\n`;
  }

  // Footer
  markdown += `---\n\n`;
  markdown += `*Generated at ${new Date().toISOString()}*\n`;

  return markdown;
}

/**
 * Generate daily summary for an organization
 * @param octokit - Authenticated Octokit instance
 * @param org - Organization name
 * @param startDate - Start date/time (defaults to yesterday 00:00 UTC)
 * @param endDate - End date/time (defaults to yesterday 23:59 UTC)
 * @param useAI - Whether to use AI to enhance the summary (defaults to true)
 * @returns The generated summary ID
 */
export async function generateDailySummary(
  octokit: Octokit,
  org: string,
  startDate?: Date,
  endDate?: Date,
  useAI: boolean = true
): Promise<string> {
  // Default to yesterday if dates not provided
  const yesterday = subDays(new Date(), 1);
  const startOfDay = startDate || new Date(yesterday.setHours(0, 0, 0, 0));
  const endOfDay = endDate || new Date(yesterday.setHours(23, 59, 59, 999));

  console.log(`Generating daily summary for ${org} from ${format(startOfDay, 'yyyy-MM-dd HH:mm:ss')} to ${format(endOfDay, 'yyyy-MM-dd HH:mm:ss')}`);

  // Collect activity data
  const activityData = await collectActivityData(octokit, org, startOfDay, endOfDay);

  // Generate base markdown (use endOfDay for display date)
  const baseMarkdown = generateMarkdown(org, endOfDay, activityData);

  // Enhance with AI if enabled and configured
  let markdown = baseMarkdown;
  if (useAI) {
    try {
      console.log("Enhancing summary with AI...");
      markdown = await enhanceMarkdownWithAI(org, endOfDay, activityData, baseMarkdown);
      console.log("AI enhancement completed");
    } catch (error) {
      console.warn("AI enhancement failed, using base markdown:", error);
      // Fall back to base markdown if AI fails
      markdown = baseMarkdown;
    }
  }

  // Store in database with the date at midnight for consistency
  const summaryDate = new Date(endOfDay);
  summaryDate.setUTCHours(0, 0, 0, 0);

  // Check if summary already exists
  const existing = await db
    .select()
    .from(activitySummaries)
    .where(
      and(
        eq(activitySummaries.org, org),
        eq(activitySummaries.summaryDate, summaryDate)
      )
    )
    .limit(1);

  let summaryId: string;

  if (existing.length > 0) {
    // Update existing summary
    summaryId = existing[0].id;
    await db
      .update(activitySummaries)
      .set({
        markdown,
        updatedAt: new Date(),
      })
      .where(eq(activitySummaries.id, summaryId));

    console.log(`Updated existing summary ${summaryId}`);
  } else {
    // Create new summary
    summaryId = createId();
    await db.insert(activitySummaries).values({
      id: summaryId,
      org,
      summaryDate: startOfDay,
      markdown,
      sentAt: null,
    });

    console.log(`Created new summary ${summaryId}`);
  }

  return summaryId;
}

/**
 * Generate weekly summary for an organization
 * @param octokit - Authenticated Octokit instance
 * @param org - Organization name
 * @param startDate - Start date of the week (Monday)
 * @param endDate - End date of the week (Sunday)
 * @param useAI - Whether to use AI to enhance the summary (defaults to true)
 * @returns The generated summary ID
 */
export async function generateWeeklySummary(
  octokit: Octokit,
  org: string,
  startDate: Date,
  endDate: Date,
  useAI: boolean = true
): Promise<string> {
  console.log(`Generating weekly summary for ${org} from ${format(startDate, 'yyyy-MM-dd HH:mm:ss')} to ${format(endDate, 'yyyy-MM-dd HH:mm:ss')}`);

  // Use the provided dates as-is (they are already set with correct UTC times)
  // startDate = Monday 15:00 UTC (= Monday 00:00 JST)
  // endDate = Sunday 14:59:59 UTC (= Sunday 23:59:59 JST)
  const startOfWeek = startDate;
  const endOfWeek = endDate;

  // Collect activity data for the entire week
  const activityData = await collectActivityData(octokit, org, startOfWeek, endOfWeek);

  // Generate base markdown (modified for weekly format)
  const weekLabel = `${format(startDate, 'MMMM dd')} - ${format(endDate, 'MMMM dd, yyyy')}`;
  const baseMarkdown = generateWeeklyMarkdown(org, weekLabel, activityData);

  // Enhance with AI if enabled and configured
  let markdown = baseMarkdown;
  if (useAI) {
    try {
      console.log("Enhancing weekly summary with AI...");
      // Use endDate for AI context (the last day of the week) and specify "weekly" period
      markdown = await enhanceMarkdownWithAI(org, endDate, activityData, baseMarkdown, "weekly");
      console.log("AI enhancement completed");
    } catch (error) {
      console.warn("AI enhancement failed, using base markdown:", error);
      markdown = baseMarkdown;
    }
  }

  // Store in database with the Sunday date as the summary date (in JST context)
  // endDate is Sunday 14:59 UTC = Sunday 23:59 JST
  // Convert to midnight of that day in local time for database storage
  const summaryDate = new Date(endDate);
  summaryDate.setUTCHours(0, 0, 0, 0);

  // Check if summary already exists
  const existing = await db
    .select()
    .from(activitySummaries)
    .where(
      and(
        eq(activitySummaries.org, org),
        eq(activitySummaries.summaryDate, summaryDate)
      )
    )
    .limit(1);

  let summaryId: string;

  if (existing.length > 0) {
    // Update existing summary
    summaryId = existing[0].id;
    await db
      .update(activitySummaries)
      .set({
        markdown,
        updatedAt: new Date(),
      })
      .where(eq(activitySummaries.id, summaryId));

    console.log(`Updated existing weekly summary ${summaryId}`);
  } else {
    // Create new summary
    summaryId = createId();
    await db.insert(activitySummaries).values({
      id: summaryId,
      org,
      summaryDate,
      markdown,
      sentAt: null,
    });

    console.log(`Created new weekly summary ${summaryId}`);
  }

  return summaryId;
}

/**
 * Generate markdown for weekly summary
 */
function generateWeeklyMarkdown(
  org: string,
  weekLabel: string,
  data: ActivityData
): string {
  // Calculate totals
  const totalCommits = data.commits.length;
  const totalPRs = data.pullRequests.length;
  const totalIssues = data.issues.length;
  const mergedPRs = data.pullRequests.filter((pr) => pr.merged).length;
  const openPRs = data.pullRequests.filter((pr) => pr.state === "open" && !pr.merged).length;
  const openedIssues = data.issues.filter((issue) => issue.state === "open").length;
  const closedIssues = data.issues.filter((issue) => issue.state === "closed").length;

  // Group by member and get top contributors
  const memberStats = groupByMember(data);
  const topContributors = Array.from(memberStats.entries())
    .sort((a, b) => b[1].totalActivity - a[1].totalActivity)
    .slice(0, 10); // Show top 10 for weekly

  // Group by repository
  const repoGroups = groupByRepository(data);
  const activeRepos = Array.from(repoGroups.entries())
    .filter(([, activity]) =>
      activity.commits.length > 0 ||
      activity.pullRequests.length > 0 ||
      activity.issues.length > 0
    )
    .sort((a, b) =>
      (b[1].commits.length + b[1].pullRequests.length + b[1].issues.length) -
      (a[1].commits.length + a[1].pullRequests.length + a[1].issues.length)
    );

  // Build markdown
  let markdown = `# GitHub Weekly Summary - ${weekLabel}\n\n`;
  markdown += `**Organization**: ${org}\n\n`;

  // Overview section
  markdown += `## 📊 Weekly Overview\n\n`;
  markdown += `- **Total Commits**: ${totalCommits}\n`;
  markdown += `- **Pull Requests**: ${totalPRs} (${mergedPRs} merged, ${openPRs} open)\n`;
  markdown += `- **Issues**: ${totalIssues} (${openedIssues} opened, ${closedIssues} closed)\n`;
  markdown += `- **Active Members**: ${memberStats.size}\n`;
  markdown += `- **Active Repositories**: ${activeRepos.length}\n\n`;

  // Top contributors section
  if (topContributors.length > 0) {
    markdown += `## 🏆 Top Contributors This Week\n\n`;
    topContributors.forEach(([username, stats], index) => {
      markdown += `${index + 1}. **@${username}** - ${stats.commits} commits, ${stats.pullRequests} PRs, ${stats.issues} issues\n`;
    });
    markdown += `\n`;
  }

  // Repository activity section (show top 15 for weekly)
  if (activeRepos.length > 0) {
    markdown += `## 📦 Repository Activity\n\n`;
    activeRepos.slice(0, 15).forEach(([repo, activity]) => {
      markdown += `### ${repo}\n\n`;

      if (activity.commits.length > 0) {
        markdown += `**Commits (${activity.commits.length})**:\n`;
        markdown += formatCommitSummary(activity.commits) + '\n\n';
      }

      if (activity.pullRequests.length > 0) {
        markdown += `**Pull Requests (${activity.pullRequests.length})**:\n`;
        markdown += formatPRSummary(activity.pullRequests) + '\n\n';
      }

      if (activity.issues.length > 0) {
        markdown += `**Issues (${activity.issues.length})**:\n`;
        markdown += formatIssueSummary(activity.issues) + '\n\n';
      }
    });

    if (activeRepos.length > 15) {
      markdown += `_... and ${activeRepos.length - 15} more repositories with activity_\n\n`;
    }
  }

  // No activity message
  if (totalCommits === 0 && totalPRs === 0 && totalIssues === 0) {
    markdown += `## 🤷 No Activity\n\n`;
    markdown += `No commits, pull requests, or issues were created this week.\n\n`;
  }

  // Footer
  markdown += `---\n\n`;
  markdown += `*Generated at ${new Date().toISOString()}*\n`;

  return markdown;
}
