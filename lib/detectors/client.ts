import type { Detector } from "../scan";
import { hasPackageDependency } from "./helpers";

/**
 * Detect client framework: Vue, React, Next.js, Nuxt.js
 */
export const clientDetector: Detector = async ({ tree, read }) => {
  let client: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  // Check for Next.js (highest priority as it includes React)
  const nextConfigFile = tree.find((f) =>
    f.path?.endsWith("next.config.js") ||
    f.path?.endsWith("next.config.mjs") ||
    f.path?.endsWith("next.config.ts")
  );

  if (nextConfigFile) {
    client = "Next.js";
    proofs.push({ file: nextConfigFile.path!, snippet: "Next.js configuration detected" });
  }

  // Check for Nuxt.js (highest priority as it includes Vue)
  if (!client) {
    const nuxtConfigFile = tree.find((f) =>
      f.path?.endsWith("nuxt.config.js") ||
      f.path?.endsWith("nuxt.config.ts") ||
      f.path?.endsWith(".nuxtrc")
    );

    if (nuxtConfigFile) {
      client = "Nuxt.js";
      proofs.push({ file: nuxtConfigFile.path!, snippet: "Nuxt.js configuration detected" });
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
