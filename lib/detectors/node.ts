import type { Detector, DetectorResult } from "../scan";

/**
 * Detect Node.js ecosystem tools and frameworks
 */
export const detectNode: Detector = async ({ tree, read }) => {
  const result: DetectorResult = {
    patch: {},
    proofs: [],
    score: 0,
  };

  const packageJsonFile = tree.find((f) => f.path === "package.json");
  if (!packageJsonFile) {
    return result;
  }

  const content = await read("package.json");
  if (!content) {
    return result;
  }

  try {
    const pkg = JSON.parse(content);
    const allDeps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };

    const patch: any = {
      buildTools: [],
      packageManagers: [],
      testing: [],
      lintFormat: [],
    };

    // Detect package manager
    if (tree.some((f) => f.path === "pnpm-lock.yaml")) {
      patch.packageManagers.push("pnpm");
    } else if (tree.some((f) => f.path === "yarn.lock")) {
      patch.packageManagers.push("yarn");
    } else if (tree.some((f) => f.path === "package-lock.json")) {
      patch.packageManagers.push("npm");
    }

    // Detect build tools
    if (allDeps.vite) patch.buildTools.push("Vite");
    if (allDeps.webpack) patch.buildTools.push("Webpack");
    if (allDeps.turbopack || allDeps.turborepo) patch.buildTools.push("Turbopack");
    if (allDeps.esbuild) patch.buildTools.push("esbuild");

    // Detect testing frameworks
    if (allDeps.jest) patch.testing.push("Jest");
    if (allDeps.vitest) patch.testing.push("Vitest");
    if (allDeps.mocha) patch.testing.push("Mocha");
    if (allDeps["@playwright/test"]) patch.testing.push("Playwright");
    if (allDeps.cypress) patch.testing.push("Cypress");

    // Detect linters/formatters
    if (allDeps.eslint) patch.lintFormat.push("ESLint");
    if (allDeps.prettier) patch.lintFormat.push("Prettier");
    if (allDeps.biome || allDeps["@biomejs/biome"]) patch.lintFormat.push("Biome");

    result.patch = patch;
    result.proofs = [
      {
        file: "package.json",
        snippet: JSON.stringify(pkg, null, 2).slice(0, 500),
      },
    ];
    result.score = 0.9;
  } catch (error) {
    console.error("Failed to parse package.json:", error);
  }

  return result;
};
