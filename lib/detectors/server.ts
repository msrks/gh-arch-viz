import type { Detector } from "../scan";

/**
 * Detect server framework: Flask, FastAPI, Next.js, Nuxt.js, Express.js
 */
export const serverDetector: Detector = async ({ tree, read, current }) => {
  let server: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  // Find all package.json, requirements.txt, and Pipfile in the repository
  const packageJsonFiles = tree
    .filter((f) => f.path?.endsWith("package.json") && f.type === "blob")
    .map((f) => f.path!);

  const requirementsTxtFiles = tree
    .filter((f) => f.path?.endsWith("requirements.txt") && f.type === "blob")
    .map((f) => f.path!);

  const pipFiles = tree
    .filter((f) => f.path?.endsWith("Pipfile") && f.type === "blob")
    .map((f) => f.path!);

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

  // Check for Express.js in all package.json files
  if (!server) {
    for (const pkgPath of packageJsonFiles) {
      const pkgFile = await read(pkgPath);
      if (pkgFile) {
        try {
          const pkg = JSON.parse(pkgFile);
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };

          if (deps.express) {
            server = "Express.js";
            proofs.push({
              file: pkgPath,
              snippet: `Express.js detected: ${deps.express}`,
            });
            break;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  }

  // Check for Flask in all requirements.txt and Pipfile
  if (!server) {
    for (const reqPath of requirementsTxtFiles) {
      const reqFile = await read(reqPath);
      if (reqFile && reqFile.includes("Flask")) {
        server = "Flask";
        proofs.push({ file: reqPath, snippet: "Flask detected" });
        break;
      }
    }

    if (!server) {
      for (const pipPath of pipFiles) {
        const pipFile = await read(pipPath);
        if (pipFile && pipFile.includes("flask")) {
          server = "Flask";
          proofs.push({ file: pipPath, snippet: "Flask detected" });
          break;
        }
      }
    }
  }

  // Check for FastAPI in all requirements.txt and Pipfile
  if (!server) {
    for (const reqPath of requirementsTxtFiles) {
      const reqFile = await read(reqPath);
      if (reqFile && reqFile.includes("fastapi")) {
        server = "FastAPI";
        proofs.push({ file: reqPath, snippet: "FastAPI detected" });
        break;
      }
    }

    if (!server) {
      for (const pipPath of pipFiles) {
        const pipFile = await read(pipPath);
        if (pipFile && pipFile.includes("fastapi")) {
          server = "FastAPI";
          proofs.push({ file: pipPath, snippet: "FastAPI detected" });
          break;
        }
      }
    }
  }

  // Check for Streamlit in all requirements.txt and Pipfile
  if (!server) {
    for (const reqPath of requirementsTxtFiles) {
      const reqFile = await read(reqPath);
      if (reqFile && reqFile.includes("streamlit")) {
        server = "Streamlit";
        proofs.push({ file: reqPath, snippet: "Streamlit detected" });
        break;
      }
    }

    if (!server) {
      for (const pipPath of pipFiles) {
        const pipFile = await read(pipPath);
        if (pipFile && pipFile.includes("streamlit")) {
          server = "Streamlit";
          proofs.push({ file: pipPath, snippet: "Streamlit detected" });
          break;
        }
      }
    }
  }

  return {
    patch: { server },
    proofs,
    score: server ? 1.0 : 0.0,
  };
};
