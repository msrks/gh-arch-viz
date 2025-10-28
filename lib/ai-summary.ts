import { generateText } from "ai";
import { createAzure } from "@ai-sdk/azure";
import type { ActivityData } from "./activity-summary";

/**
 * Initialize Azure OpenAI client
 */
function getAzureOpenAI() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || "gpt-4o";

  if (!endpoint || !apiKey) {
    throw new Error("Azure OpenAI configuration missing. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY");
  }

  // Extract resource name from endpoint
  // Expected format: https://{resourceName}.openai.azure.com/ or https://japaneast.api.cognitive.microsoft.com/
  let resourceName: string;

  if (endpoint.includes("api.cognitive.microsoft.com")) {
    // Format: https://japaneast.api.cognitive.microsoft.com/
    resourceName = endpoint.replace("https://", "").replace(".api.cognitive.microsoft.com/", "").replace(".api.cognitive.microsoft.com", "");
  } else {
    // Format: https://{resourceName}.openai.azure.com/
    resourceName = endpoint.replace("https://", "").replace(".openai.azure.com/", "").replace(".openai.azure.com", "");
  }

  const azure = createAzure({
    resourceName,
    apiKey,
  });

  return azure(deploymentName);
}

/**
 * Generate AI-powered summary from activity data
 */
export async function generateAISummary(
  org: string,
  date: Date,
  data: ActivityData,
  periodType: "daily" | "weekly" = "daily"
): Promise<string> {
  const model = getAzureOpenAI();

  // Prepare structured data for the AI
  const commits = data.commits.slice(0, 50).map((c) => ({
    author: c.author,
    message: c.message,
    repo: c.repo,
    date: c.date.toISOString(),
  }));

  const pullRequests = data.pullRequests.slice(0, 30).map((pr) => ({
    title: pr.title,
    author: pr.author,
    repo: pr.repo,
    state: pr.state,
    merged: pr.merged,
    number: pr.number,
  }));

  const issues = data.issues.slice(0, 30).map((issue) => ({
    title: issue.title,
    author: issue.author,
    repo: issue.repo,
    state: issue.state,
    number: issue.number,
  }));

  const periodLabel = periodType === "weekly" ? "今週" : "今日";
  const summaryType = periodType === "weekly" ? "週次サマリー" : "デイリーサマリー";

  const prompt = `あなたは開発チームのエンジニアリングマネージャーです。以下のGitHubアクティビティデータを分析して、チームメンバー向けの読みやすく有用な${summaryType}を日本語で生成してください。

組織: ${org}
${periodType === "weekly" ? `期間: ${date.toLocaleDateString("ja-JP")} を含む週` : `日付: ${date.toLocaleDateString("ja-JP")}`}

# アクティビティデータ

## コミット (${data.commits.length}件)
${JSON.stringify(commits, null, 2)}

## プルリクエスト (${data.pullRequests.length}件)
${JSON.stringify(pullRequests, null, 2)}

## イシュー (${data.issues.length}件)
${JSON.stringify(issues, null, 2)}

# 生成してほしいサマリーの形式

以下の5つのセクションを順番に生成してください。各セクションは番号付きで明確に区切ってください：

1. **🎯 ${periodLabel}のハイライト**

（最も重要な変更や進捗を箇条書きで最大2つまで。異なるリポジトリの内容を選ぶ。各項目は「リポジトリ名: 具体的な内容」の形式で）

2. **👥 アクティブなメンバーの貢献内容**

（コントリビューション上位メンバーの主な作業を2-3文で要約。具体的な機能名や技術要素を含める）

3. **📦 リポジトリ別アクティビティ**

（アクティブなリポジトリごとに主な変更内容を要約。箇条書きで。「何をしたか」「どう進んだか」がわかる説明）

4. **💡 注目トピック**

（複数のコミット/PRから見えるパターンやトレンド。チーム全体の方向性や注力分野を箇条書きで）

5. **最後のメッセージ**

（${periodLabel}の成果をポジティブに総括し、来週/明日への示唆や提案を含める。2-3文で）

重要な点：
- 必ず「1. **🎯...」「2. **👥...」のように番号とセクション名を含めて出力する
- 各セクションの後は改行を入れて区切る
- 機械的なリストではなく、読みやすい文章で
- 技術的な詳細は適度に含める
- 全体として前向きで建設的なトーン
- 空のセクションは作らない（必ず何か意味のある内容を書く）`;

  try {
    const { text } = await generateText({
      model,
      prompt,
    });

    return text;
  } catch (error) {
    console.error("Failed to generate AI summary:", error);
    throw error;
  }
}

/**
 * Parse AI-generated sections from the response
 */
function parseAISections(aiText: string): {
  highlights: string;
  members: string;
  repositories: string;
  topics: string;
  closing: string;
} {
  console.log("=== Parsing AI sections ===");
  console.log("Raw AI text:", aiText.substring(0, 500));

  // Split by numbered sections with emoji headers
  const sectionPattern = /\d+\.\s*\*\*[🎯👥📦💡][^*]+\*\*/g;
  const headers = aiText.match(sectionPattern);

  if (headers && headers.length >= 5) {
    console.log("Found headers:", headers);

    // Split content by these headers
    const parts = aiText.split(sectionPattern);

    // parts[0] is before first header (empty), parts[1-5] are the contents
    if (parts.length >= 6) {
      const result = {
        highlights: parts[1]?.trim() || "_AI要約の生成に失敗しました_",
        members: parts[2]?.trim() || "_AI要約の生成に失敗しました_",
        repositories: parts[3]?.trim() || "_AI要約の生成に失敗しました_",
        topics: parts[4]?.trim() || "_AI要約の生成に失敗しました_",
        closing: parts[5]?.trim() || "_AI要約の生成に失敗しました_",
      };

      console.log("Parsed sections:", {
        highlights: result.highlights.substring(0, 100),
        members: result.members.substring(0, 100),
        repositories: result.repositories.substring(0, 100),
        topics: result.topics.substring(0, 100),
        closing: result.closing.substring(0, 100),
      });

      return result;
    }
  }

  console.warn("Failed to parse AI sections, using fallback");

  // Fallback: try to extract content after each keyword
  const highlights = aiText.match(/🎯[^🎯👥📦💡]+/)?.[0] || aiText.substring(0, 500);
  const members = aiText.match(/👥[^🎯👥📦💡]+/)?.[0] || "";
  const repositories = aiText.match(/📦[^🎯👥📦💡]+/)?.[0] || "";
  const topics = aiText.match(/💡[^🎯👥📦💡]+/)?.[0] || "";

  return {
    highlights: highlights.replace(/🎯\s*[^\n]*\n/, '').trim(),
    members: members.replace(/👥\s*[^\n]*\n/, '').trim(),
    repositories: repositories.replace(/📦\s*[^\n]*\n/, '').trim(),
    topics: topics.replace(/💡\s*[^\n]*\n/, '').trim(),
    closing: "",
  };
}

/**
 * Enhance existing markdown summary with AI-generated insights
 */
export async function enhanceMarkdownWithAI(
  org: string,
  date: Date,
  data: ActivityData,
  originalMarkdown: string,
  periodType: "daily" | "weekly" = "daily"
): Promise<string> {
  const aiSummary = await generateAISummary(org, date, data, periodType);
  const sections = parseAISections(aiSummary);

  console.log("=== Enhancing markdown ===");
  console.log("Original markdown length:", originalMarkdown.length);

  // Replace placeholders in the original markdown
  let enhanced = originalMarkdown;

  // Replace each section with AI content
  enhanced = enhanced.replace(
    /## 🎯 [^\n]+\n\n_AI要約を生成中..._/,
    `## 🎯 ${periodType === "weekly" ? "今週" : "今日"}のハイライト\n\n${sections.highlights}`
  );

  enhanced = enhanced.replace(
    /## 👥 アクティブなメンバーの貢献内容\n\n_AI要約を生成中..._/,
    `## 👥 アクティブなメンバーの貢献内容\n\n${sections.members}`
  );

  enhanced = enhanced.replace(
    /## 📦 リポジトリ別アクティビティ\n\n_AI要約を生成中..._/,
    `## 📦 リポジトリ別アクティビティ\n\n${sections.repositories}`
  );

  enhanced = enhanced.replace(
    /## 💡 注目トピック\n\n_AI要約を生成中..._/,
    `## 💡 注目トピック\n\n${sections.topics}`
  );

  // Remove any remaining placeholder sections (safety cleanup)
  enhanced = enhanced.replace(/## [🎯👥📦💡][^\n]+\n\n_AI要約を生成中..._\n\n/g, '');

  // Add closing message before footer
  if (sections.closing) {
    enhanced = enhanced.replace(
      /---\n\n\*Generated at/,
      `\n${sections.closing}\n\n---\n\n*Generated at`
    );
  }

  console.log("Enhanced markdown length:", enhanced.length);

  return enhanced;
}
