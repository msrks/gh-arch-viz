import type { Detector } from "../scan";

/**
 * Detect storage: S3, Vercel Blob, GCS, Firebase Storage
 */
export const storageDetector: Detector = async ({ tree, read }) => {
  let storage: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  // Check for firebase.json with storage configuration
  const firebaseConfigFile = tree.find((f) => f.path?.endsWith("firebase.json"));
  if (firebaseConfigFile) {
    const firebaseConfig = await read(firebaseConfigFile.path!);
    if (firebaseConfig) {
      try {
        const config = JSON.parse(firebaseConfig);
        if (config.storage) {
          storage = "Firebase Storage";
          proofs.push({ file: firebaseConfigFile.path!, snippet: "Firebase Storage config in firebase.json detected" });
          return {
            patch: { storage },
            proofs,
            score: 1.0,
          };
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // Check for storage.rules file (Firebase Storage)
  const storageRulesFile = tree.find((f) => f.path?.endsWith("storage.rules"));
  if (storageRulesFile) {
    storage = "Firebase Storage";
    proofs.push({ file: storageRulesFile.path!, snippet: "Firebase Storage rules file detected" });
    return {
      patch: { storage },
      proofs,
      score: 1.0,
    };
  }

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
