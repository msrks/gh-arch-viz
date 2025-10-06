import type { Detector } from "../scan";
import { hasPackageDependency } from "./helpers";

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
    const result = await hasPackageDependency(tree, read, ["vue", "@vue/cli"]);
    if (result.found) {
      client = "Vue";
      proofs.push({
        file: result.file!,
        snippet: `Vue detected: ${result.version}`,
      });
    }
  }

  // Check for React
  if (!client) {
    const result = await hasPackageDependency(tree, read, "react");
    if (result.found) {
      client = "React";
      proofs.push({
        file: result.file!,
        snippet: `React detected: ${result.version}`,
      });
    }
  }

  return {
    patch: { client },
    proofs,
    score: client ? 1.0 : 0.0,
  };
};
