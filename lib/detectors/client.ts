import type { Detector } from "../scan";

/**
 * Detect client framework: Vue, React, Next.js, Nuxt.js
 */
export const clientDetector: Detector = async ({ tree, read, current }) => {
  let client: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  // Check for Next.js (highest priority as it includes React)
  const hasNextConfig = tree.some((f) =>
    ["next.config.js", "next.config.mjs", "next.config.ts"].includes(f.path || "")
  );

  if (hasNextConfig) {
    client = "Next.js";
    proofs.push({ file: "next.config.js", snippet: "Next.js configuration detected" });
  }

  // Check for Nuxt.js (highest priority as it includes Vue)
  if (!client) {
    const hasNuxtConfig = tree.some((f) =>
      ["nuxt.config.js", "nuxt.config.ts", ".nuxtrc"].includes(f.path || "")
    );

    if (hasNuxtConfig) {
      client = "Nuxt.js";
      proofs.push({ file: "nuxt.config.js", snippet: "Nuxt.js configuration detected" });
    }
  }

  // Check for Vue
  if (!client) {
    const pkgFile = await read("package.json");
    if (pkgFile) {
      try {
        const pkg = JSON.parse(pkgFile);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.vue || deps["@vue/cli"]) {
          client = "Vue";
          proofs.push({
            file: "package.json",
            snippet: `Vue detected: ${deps.vue || deps["@vue/cli"]}`,
          });
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // Check for React
  if (!client) {
    const pkgFile = await read("package.json");
    if (pkgFile) {
      try {
        const pkg = JSON.parse(pkgFile);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        if (deps.react) {
          client = "React";
          proofs.push({
            file: "package.json",
            snippet: `React detected: ${deps.react}`,
          });
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  return {
    patch: { client },
    proofs,
    score: client ? 1.0 : 0.0,
  };
};
