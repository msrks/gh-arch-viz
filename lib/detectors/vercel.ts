import type { Detector, DetectorResult } from "../scan";

/**
 * Detect Vercel deployment
 */
export const detectVercel: Detector = async ({ tree, read }) => {
  const result: DetectorResult = {
    patch: {},
    proofs: [],
    score: 0,
  };

  const hasVercelJson = tree.some((f) => f.path === "vercel.json");
  const hasVercelDir = tree.some((f) => f.path === ".vercel");

  if (!hasVercelJson && !hasVercelDir) {
    return result;
  }

  const deployTargets: string[] = ["Vercel"];
  const proofs: Array<{ file: string; snippet: string }> = [];

  if (hasVercelJson) {
    const content = await read("vercel.json");
    if (content) {
      proofs.push({
        file: "vercel.json",
        snippet: content.slice(0, 300),
      });
    }
  }

  result.patch = { deployTargets };
  result.proofs = proofs;
  result.score = 0.9;

  return result;
};
