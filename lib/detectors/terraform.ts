import type { Detector, DetectorResult } from "../scan";

/**
 * Detect Terraform IaC
 */
export const detectTerraform: Detector = async ({ tree, read }) => {
  const result: DetectorResult = {
    patch: {},
    proofs: [],
    score: 0,
  };

  const tfFiles = tree.filter((f) => f.path?.endsWith(".tf"));

  if (tfFiles.length === 0) {
    return result;
  }

  const infraAsCode: string[] = ["Terraform"];
  const proofs: Array<{ file: string; snippet: string }> = [];

  // Read first .tf file as proof
  if (tfFiles[0]?.path) {
    const content = await read(tfFiles[0].path);
    if (content) {
      const lines = content.split("\n").slice(0, 15).join("\n");
      proofs.push({
        file: tfFiles[0].path,
        snippet: lines,
      });
    }
  }

  result.patch = { infraAsCode };
  result.proofs = proofs;
  result.score = 0.95;

  return result;
};
