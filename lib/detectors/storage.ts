import type { Detector } from "../scan";

/**
 * Detect storage: S3, Vercel Blob, GCS, Firebase Storage
 */
export const storageDetector: Detector = async ({ tree, read, current }) => {
  let storage: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  const pkgFile = await read("package.json");
  const reqFile = await read("requirements.txt");
  const envFile = await read(".env") || await read(".env.example") || "";

  // Check package.json
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps["@vercel/blob"]) {
        storage = "Vercel Blob";
        proofs.push({ file: "package.json", snippet: "Vercel Blob detected" });
      } else if (deps["@google-cloud/storage"]) {
        storage = "GCS";
        proofs.push({ file: "package.json", snippet: "Google Cloud Storage detected" });
      } else if (deps.firebase && envFile.includes("storage")) {
        storage = "Firebase Storage";
        proofs.push({ file: "package.json", snippet: "Firebase Storage detected" });
      } else if (deps["aws-sdk"] || deps["@aws-sdk/client-s3"]) {
        storage = "S3";
        proofs.push({ file: "package.json", snippet: "AWS S3 detected" });
      }
    } catch {
      // ignore parse errors
    }
  }

  // Check Python dependencies
  if (!storage && reqFile) {
    if (reqFile.includes("google-cloud-storage")) {
      storage = "GCS";
      proofs.push({ file: "requirements.txt", snippet: "Google Cloud Storage detected" });
    } else if (reqFile.includes("firebase-admin") && envFile.includes("storage")) {
      storage = "Firebase Storage";
      proofs.push({ file: "requirements.txt", snippet: "Firebase Storage detected" });
    } else if (reqFile.includes("boto3")) {
      storage = "S3";
      proofs.push({ file: "requirements.txt", snippet: "AWS S3 detected" });
    }
  }

  return {
    patch: { storage },
    proofs,
    score: storage ? 1.0 : 0.0,
  };
};
