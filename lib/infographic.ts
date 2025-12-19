import { generateText } from 'ai';
import type { ActivityData } from './activity-summary';
import { groupByMember, groupByRepository } from './activity-summary';

export interface InfographicResult {
  imageData: Uint8Array;
  mediaType: string;
}

/**
 * Generate an infographic from activity data using Gemini 3 Pro Image
 */
export async function generateInfographic(
  org: string,
  activityData: ActivityData,
  summaryType: 'daily' | 'weekly' = 'daily'
): Promise<InfographicResult | null> {
  try {
    // Check if AI Gateway API key is configured
    if (!process.env.AI_GATEWAY_API_KEY) {
      console.warn('AI_GATEWAY_API_KEY is not set, skipping infographic generation');
      return null;
    }

    // Calculate statistics
    const totalCommits = activityData.commits.length;
    const totalPRs = activityData.pullRequests.length;
    const totalIssues = activityData.issues.length;
    const mergedPRs = activityData.pullRequests.filter((pr) => pr.merged).length;

    // Get top contributors
    const memberStats = groupByMember(activityData);
    const topContributors = Array.from(memberStats.entries())
      .sort((a, b) => b[1].totalActivity - a[1].totalActivity)
      .slice(0, 5)
      .map(([username, stats]) => ({
        username,
        commits: stats.commits,
        pullRequests: stats.pullRequests,
        issues: stats.issues,
        total: stats.totalActivity,
      }));

    // Get repository activity
    const repoGroups = groupByRepository(activityData);
    const activeRepos = Array.from(repoGroups.entries())
      .filter(([, activity]) =>
        activity.commits.length > 0 ||
        activity.pullRequests.length > 0 ||
        activity.issues.length > 0
      )
      .sort((a, b) =>
        (b[1].commits.length + b[1].pullRequests.length + b[1].issues.length) -
        (a[1].commits.length + a[1].pullRequests.length + a[1].issues.length)
      )
      .slice(0, 5)
      .map(([repoName, activity]) => ({
        name: repoName,
        commits: activity.commits.length,
        pullRequests: activity.pullRequests.length,
        issues: activity.issues.length,
      }));

    // Build data summary text for prompt
    const dataSummary = `
Organization: ${org}
Period: ${summaryType === 'daily' ? 'Daily' : 'Weekly'} Summary

📊 Overview:
- Total Commits: ${totalCommits}
- Pull Requests: ${totalPRs} (${mergedPRs} merged)
- Issues: ${totalIssues}
- Active Repositories: ${activeRepos.length}

🏆 Top Contributors:
${topContributors.map((c, i) => `${i + 1}. @${c.username} - ${c.commits} commits, ${c.pullRequests} PRs, ${c.issues} issues`).join('\n')}

📦 Repository Activity:
${activeRepos.map((r) => `- ${r.name}: ${r.commits} commits, ${r.pullRequests} PRs, ${r.issues} issues`).join('\n')}
    `.trim();

    // Create prompt for infographic generation
    const prompt = `Create a professional and clean infographic dashboard based on the following GitHub activity data.

IMPORTANT - Include ONLY these 3 sections:
1. ${summaryType === 'daily' ? 'Daily' : 'Weekly'} Overview Dashboard - Show total commits, PRs, issues, and active repositories with numbers and simple charts
2. Top Contributors - List top 5 contributors with their contribution counts (commits, PRs, issues)
3. Repository Activity - Show top 5 active repositories with their metrics IN JAPANESE (日本語で記述)

Design requirements:
- Use a modern, clean dashboard layout
- Use charts, graphs, and progress bars to visualize metrics (bar charts, pie charts, trend indicators)
- DO NOT include user icons, avatars, or profile pictures
- Use simple geometric shapes and icons for repositories (folder icons, git icons)
- Highlight key numbers prominently
- Use color coding for different metric types
- Keep it concise - focus on the most important metrics only
- Ensure text is readable with good contrast
- Use a professional color scheme (blue, green, gray tones)

Language requirements:
- Section titles and contributor names: English is fine
- Repository activity descriptions: MUST be in Japanese
- Numbers and metrics: Use standard numeric format

Data to visualize:

${dataSummary}

Extract and visualize ONLY the Overview, Top Contributors, and Repository Activity sections. For Repository Activity, write the descriptions in Japanese.`;

    console.log('[Infographic] Generating infographic with Gemini 3 Pro Image...');

    // Generate infographic using Gemini 3 Pro Image
    const result = await generateText({
      model: 'google/gemini-3-pro-image',
      prompt,
    });

    // Log any text response
    if (result.text) {
      console.log('[Infographic] Model response:', result.text);
    }

    // Filter image files
    const imageFiles = result.files?.filter((f) =>
      f.mediaType?.startsWith('image/')
    ) || [];

    if (imageFiles.length === 0) {
      console.warn('[Infographic] No images were generated');
      return null;
    }

    console.log(`[Infographic] Generated ${imageFiles.length} image(s)`);

    // Return the first image
    const firstImage = imageFiles[0];
    return {
      imageData: firstImage.uint8Array,
      mediaType: firstImage.mediaType || 'image/png',
    };
  } catch (error) {
    console.error('[Infographic] Failed to generate infographic:', error);
    return null;
  }
}
