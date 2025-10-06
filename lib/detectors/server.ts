import type { Detector } from "../scan";

/**
 * Detect server framework: Flask, FastAPI, Next.js, Nuxt.js, Express.js
 */
export const serverDetector: Detector = async ({ tree, read, current }) => {
  let server: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  const pkgFile = await read("package.json");
  const reqFile = await read("requirements.txt");
  const pipFile = await read("Pipfile");

  // Check for Next.js (can be both client and server)
  const hasNextConfig = tree.some((f) =>
    ["next.config.js", "next.config.mjs", "next.config.ts"].includes(f.path || "")
  );

  if (hasNextConfig) {
    server = "Next.js";
    proofs.push({ file: "next.config.js", snippet: "Next.js server detected" });
  }

  // Check for Nuxt.js (can be both client and server)
  if (!server) {
    const hasNuxtConfig = tree.some((f) =>
      ["nuxt.config.js", "nuxt.config.ts"].includes(f.path || "")
    );

    if (hasNuxtConfig) {
      server = "Nuxt.js";
      proofs.push({ file: "nuxt.config.js", snippet: "Nuxt.js server detected" });
    }
  }

  // Check for Express.js
  if (!server && pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps.express) {
        server = "Express.js";
        proofs.push({
          file: "package.json",
          snippet: `Express.js detected: ${deps.express}`,
        });
      }
    } catch {
      // ignore parse errors
    }
  }

  // Check for Flask
  if (!server && (reqFile || pipFile)) {
    if (reqFile && reqFile.includes("Flask")) {
      server = "Flask";
      proofs.push({ file: "requirements.txt", snippet: "Flask detected" });
    } else if (pipFile && pipFile.includes("flask")) {
      server = "Flask";
      proofs.push({ file: "Pipfile", snippet: "Flask detected" });
    }
  }

  // Check for FastAPI
  if (!server && (reqFile || pipFile)) {
    if (reqFile && reqFile.includes("fastapi")) {
      server = "FastAPI";
      proofs.push({ file: "requirements.txt", snippet: "FastAPI detected" });
    } else if (pipFile && pipFile.includes("fastapi")) {
      server = "FastAPI";
      proofs.push({ file: "Pipfile", snippet: "FastAPI detected" });
    }
  }

  return {
    patch: { server },
    proofs,
    score: server ? 1.0 : 0.0,
  };
};
