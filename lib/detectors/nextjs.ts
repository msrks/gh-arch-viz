import type { Detector, DetectorResult } from "../scan";

/**
 * Detect Next.js framework
 */
export const detectNextJs: Detector = async ({ tree, read }) => {
  const result: DetectorResult = {
    patch: {},
    proofs: [],
    score: 0,
  };

  // Check for Next.js config files
  const hasNextConfig =
    tree.some((f) => f.path === "next.config.js") ||
    tree.some((f) => f.path === "next.config.mjs") ||
    tree.some((f) => f.path === "next.config.ts");

  const hasAppDir = tree.some((f) => f.path?.startsWith("app/"));
  const hasPagesDir = tree.some((f) => f.path?.startsWith("pages/"));

  if (!hasNextConfig && !hasAppDir && !hasPagesDir) {
    return result;
  }

  // Read package.json to confirm Next.js version
  const packageContent = await read("package.json");
  if (packageContent) {
    try {
      const pkg = JSON.parse(packageContent);
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (allDeps.next) {
        const version = allDeps.next.replace(/[\^~]/, "");
        const framework = `Next.js ${version}`;

        result.patch = {
          frameworks: [framework],
        };

        result.proofs = [
          {
            file: "package.json",
            snippet: `"next": "${allDeps.next}"`,
          },
        ];

        if (hasNextConfig) {
          result.proofs.push({
            file: "next.config.*",
            snippet: "Next.js configuration file found",
          });
        }

        result.score = 1.0;
      }
    } catch (error) {
      console.error("Failed to parse package.json:", error);
    }
  }

  return result;
};
