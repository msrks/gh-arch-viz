import type { Octokit } from "@octokit/rest";
import { getText } from "./github";

/**
 * Common configuration files that detectors frequently check
 */
const COMMON_FILES = [
  "package.json",
  "requirements.txt",
  "Pipfile",
  ".env",
  ".env.example",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "nuxt.config.js",
  "nuxt.config.ts",
  "vercel.json",
  "Dockerfile",
  "docker-compose.yml",
  ".github/workflows",
  "terraform.tf",
  "main.tf",
  "cloudbuild.yaml",
];

/**
 * Batch read multiple files from a repository with caching
 */
export async function batchReadFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  tree: { path?: string; type?: string }[]
): Promise<Map<string, string>> {
  const cache = new Map<string, string>();

  // Filter common files that exist in the tree
  const filesToFetch = COMMON_FILES.filter((file) =>
    tree.some((item) => item.path === file && item.type === "blob")
  );

  // Fetch all files in parallel
  const results = await Promise.allSettled(
    filesToFetch.map(async (file) => {
      const content = await getText(octokit, owner, repo, file);
      return { file, content };
    })
  );

  // Store successful results in cache
  results.forEach((result) => {
    if (result.status === "fulfilled" && result.value.content) {
      cache.set(result.value.file, result.value.content);
    }
  });

  return cache;
}

/**
 * Create a cached read function that uses batch-fetched data
 */
export function createCachedReader(
  cache: Map<string, string>,
  octokit: Octokit,
  owner: string,
  repo: string
) {
  return async (path: string): Promise<string | null> => {
    // Check cache first
    if (cache.has(path)) {
      return cache.get(path)!;
    }

    // Fallback to individual fetch for files not in cache
    const content = await getText(octokit, owner, repo, path);
    if (content) {
      cache.set(path, content);
    }
    return content;
  };
}
