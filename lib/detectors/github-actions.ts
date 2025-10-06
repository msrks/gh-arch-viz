import type { Detector, DetectorResult } from "../scan";

/**
 * Detect GitHub Actions CI/CD
 */
export const detectGitHubActions: Detector = async ({ tree, read }) => {
  const result: DetectorResult = {
    patch: {},
    proofs: [],
    score: 0,
  };

  const workflowFiles = tree.filter(
    (f) =>
      f.path?.startsWith(".github/workflows/") &&
      (f.path.endsWith(".yml") || f.path.endsWith(".yaml"))
  );

  if (workflowFiles.length === 0) {
    return result;
  }

  const ciCd: string[] = ["GitHub Actions"];
  const proofs: Array<{ file: string; snippet: string }> = [];

  // Read first workflow file as proof
  if (workflowFiles[0]?.path) {
    const content = await read(workflowFiles[0].path);
    if (content) {
      const lines = content.split("\n").slice(0, 15).join("\n");
      proofs.push({
        file: workflowFiles[0].path,
        snippet: lines,
      });
    }
  }

  result.patch = { ciCd };
  result.proofs = proofs;
  result.score = 1.0;

  return result;
};
