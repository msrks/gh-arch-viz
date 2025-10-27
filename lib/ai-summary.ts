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

  const periodLabel = periodType === "weekly" ? "今週" : "本日";
  const summaryType = periodType === "weekly" ? "週次サマリー" : "デイリーサマリー";
  const timeContext = periodType === "weekly" ? "今週何が起きたか" : "今日何が起きたか";

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

以下の構成でMarkdown形式のサマリーを生成してください：

## 📊 概要
- 全体の統計（コミット数、PR数、イシュー数）を簡潔に

## 🎯 ${periodLabel}のハイライト
- 最も重要な変更や進捗を3-5個箇条書きで
- 各ハイライトは具体的な内容を含める（例: "ユーザー認証機能の実装が完了", "パフォーマンス改善のためのリファクタリング"）

## 👥 アクティブなメンバー
- コントリビューション上位のメンバーと、その主な作業内容

## 📦 リポジトリ別アクティビティ
- アクティビティのあったリポジトリごとに、主な変更内容を要約
- 単なるリストではなく、「何をしたか」「なぜ重要か」がわかる説明

## 💡 注目トピック
- 複数のコミット/PRから見えるパターンやトレンド
- 例: "認証機能の強化に関する複数のPR", "テストカバレッジ向上の取り組み"

重要な点：
- 機械的なリストではなく、文章として読みやすく
- 技術的な詳細は適度に含めつつ、全体像がわかるように
- コミットメッセージをそのまま列挙するのではなく、意味のある単位でまとめる
- チームメンバーが「${timeContext}」を素早く理解できることを最優先に`;

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

  // Combine AI summary with original markdown
  const enhanced = `${aiSummary}\n\n---\n\n## 📋 詳細なアクティビティログ\n\n${originalMarkdown}`;

  return enhanced;
}
