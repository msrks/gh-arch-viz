import type { Detector, DetectorResult } from "../scan";

/**
 * Detect Docker and container tools
 */
export const detectDocker: Detector = async ({ tree, read }) => {
  const result: DetectorResult = {
    patch: {},
    proofs: [],
    score: 0,
  };

  const hasDockerfile = tree.some((f) => f.path === "Dockerfile");
  const hasDockerCompose =
    tree.some((f) => f.path === "docker-compose.yml") ||
    tree.some((f) => f.path === "docker-compose.yaml") ||
    tree.some((f) => f.path === "compose.yml") ||
    tree.some((f) => f.path === "compose.yaml");

  if (!hasDockerfile && !hasDockerCompose) {
    return result;
  }

  const container: string[] = [];
  const proofs: Array<{ file: string; snippet: string }> = [];

  if (hasDockerfile) {
    container.push("Docker");
    const content = await read("Dockerfile");
    if (content) {
      const lines = content.split("\n").slice(0, 10).join("\n");
      proofs.push({
        file: "Dockerfile",
        snippet: lines,
      });
    }
  }

  if (hasDockerCompose) {
    container.push("Docker Compose");
    const composeFile =
      tree.find((f) => f.path === "docker-compose.yml")?.path ||
      tree.find((f) => f.path === "docker-compose.yaml")?.path ||
      tree.find((f) => f.path === "compose.yml")?.path ||
      "compose.yaml";

    const content = await read(composeFile);
    if (content) {
      const lines = content.split("\n").slice(0, 10).join("\n");
      proofs.push({
        file: composeFile,
        snippet: lines,
      });
    }
  }

  result.patch = { container };
  result.proofs = proofs;
  result.score = 0.95;

  return result;
};
