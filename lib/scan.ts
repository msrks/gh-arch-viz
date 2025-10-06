import type { Octokit } from "@octokit/rest";
import { db } from "@/lib/db";
import { repoInventory } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getRepoTree, getText, listRepoContributors, listRepoLanguages } from "./github";
import { createId } from "@paralleldrive/cuid2";

export type DetectorContext = {
  tree: { path?: string; type?: string }[];
  read: (path: string) => Promise<string | null>;
  current: any;
};

export type DetectorResult = {
  patch?: Partial<any>;
  proofs?: Array<{ file: string; snippet: string }>;
  score?: number;
};

export type Detector = (ctx: DetectorContext) => Promise<DetectorResult>;

/**
 * Initialize inventory record with repository metadata
 */
export function initInventory(meta: {
  org: string;
  repoId: number;
  name: string;
  url: string;
  defaultBranch: string;
  visibility: string;
  primaryLanguage?: string | null;
  updatedAt?: Date | null;
  pushedAt?: Date | null;
}) {
  return {
    id: createId(),
    org: meta.org,
    repoId: meta.repoId,
    repoName: meta.name,
    defaultBranch: meta.defaultBranch,
    visibility: meta.visibility,
    url: meta.url,
    primaryLanguage: meta.primaryLanguage || null,
    repoUpdatedAt: meta.updatedAt || null,
    repoPushedAt: meta.pushedAt || null,
    frameworks: [],
    buildTools: [],
    packageManagers: [],
    container: [],
    ciCd: [],
    deployTargets: [],
    infraAsCode: [],
    databases: [],
    messaging: [],
    testing: [],
    lintFormat: [],
    lastScannedAt: null,
    detectionScore: null,
    evidence: {},
    missingSignals: [],
    policyStatus: null,
    policyViolations: null,
    languages: null,
    contributors: null,
    contributorsCount: 0,
    contributorsUpdatedAt: null,
    client: null,
    server: null,
    db: null,
    storage: null,
    auth: null,
    hosting: null,
    ai: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Merge array fields from detector patches
 */
export function mergeArrays(current: any, patch: Partial<any>): any {
  const merged = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value) && Array.isArray(merged[key])) {
      // Merge arrays and remove duplicates
      merged[key] = [...new Set([...merged[key], ...value])];
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Calculate average score
 */
export function average(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

/**
 * Scan a single repository and update inventory
 */
export async function scanOneRepo(
  octokit: Octokit,
  owner: string,
  repo: string,
  meta: {
    org: string;
    repoId: number;
    name: string;
    url: string;
    defaultBranch: string;
    visibility: string;
    primaryLanguage?: string | null;
    updatedAt?: Date | null;
    pushedAt?: Date | null;
  },
  detectors: Detector[]
) {
  // Get repository file tree
  const tree = await getRepoTree(octokit, owner, repo, meta.defaultBranch);
  const read = (path: string) => getText(octokit, owner, repo, path);

  // Check for existing inventory
  const existing = await db.query.repoInventory.findFirst({
    where: and(
      eq(repoInventory.org, meta.org),
      eq(repoInventory.repoId, meta.repoId)
    ),
  });

  let inv = existing || initInventory(meta);

  const proofs: Record<string, any[]> = {};
  const scores: number[] = [];

  // Run all detectors
  for (const detector of detectors) {
    try {
      const result = await detector({ tree, read, current: inv });

      if (result.patch) {
        inv = mergeArrays(inv, result.patch);
      }

      if (result.proofs && result.proofs.length > 0) {
        const detectorName = detector.name || "unknown";
        proofs[detectorName] = result.proofs;
      }

      if (typeof result.score === "number") {
        scores.push(result.score);
      }
    } catch (error) {
      console.error(`Detector ${detector.name} failed:`, error);
    }
  }

  // Update metadata
  inv.detectionScore = average(scores);
  inv.evidence = proofs;
  inv.lastScannedAt = new Date();
  inv.updatedAt = new Date();

  // Update GitHub repo metadata
  if (meta.pushedAt) inv.repoPushedAt = meta.pushedAt;
  if (meta.updatedAt) inv.repoUpdatedAt = meta.updatedAt;

  // Fetch languages information (20% threshold)
  try {
    const languages = await listRepoLanguages(octokit, owner, repo, 20);
    inv.languages = languages;
    // Update primaryLanguage to the most used language (first in sorted array)
    if (languages.length > 0) {
      inv.primaryLanguage = languages[0].name;
    }
  } catch (error) {
    console.error(`Failed to fetch languages for ${owner}/${repo}:`, error);
    // Keep existing languages data if fetch fails
  }

  // Fetch contributors information
  try {
    const contributors = await listRepoContributors(octokit, owner, repo);
    inv.contributors = contributors;
    inv.contributorsCount = contributors.length;
    inv.contributorsUpdatedAt = new Date();
  } catch (error) {
    console.error(`Failed to fetch contributors for ${owner}/${repo}:`, error);
    // Keep existing contributors data if fetch fails
  }

  // Upsert to database
  if (existing) {
    await db
      .update(repoInventory)
      .set(inv)
      .where(eq(repoInventory.id, existing.id));
  } else {
    await db.insert(repoInventory).values(inv);
  }

  return inv;
}
