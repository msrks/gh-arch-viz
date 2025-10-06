import type { Detector } from "../scan";

/**
 * Detect auth: AWS Cognito, Firebase Auth, Next-Auth, Better-Auth
 */
export const authDetector: Detector = async ({ tree, read, current }) => {
  let auth: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  const pkgFile = await read("package.json");
  const reqFile = await read("requirements.txt");
  const envFile = await read(".env") || await read(".env.example") || "";

  // Check package.json
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps["better-auth"]) {
        auth = "Better-Auth";
        proofs.push({ file: "package.json", snippet: "Better-Auth detected" });
      } else if (deps["next-auth"]) {
        auth = "Next-Auth";
        proofs.push({ file: "package.json", snippet: "Next-Auth detected" });
      } else if (deps.firebase && (envFile.includes("AUTH") || envFile.includes("FIREBASE"))) {
        auth = "Firebase Auth";
        proofs.push({ file: "package.json", snippet: "Firebase Auth detected" });
      } else if (
        (deps["aws-amplify"] || deps["@aws-amplify/auth"]) &&
        envFile.includes("COGNITO")
      ) {
        auth = "AWS Cognito";
        proofs.push({ file: "package.json", snippet: "AWS Cognito detected" });
      } else if (deps["amazon-cognito-identity-js"]) {
        auth = "AWS Cognito";
        proofs.push({ file: "package.json", snippet: "AWS Cognito detected" });
      }
    } catch {
      // ignore parse errors
    }
  }

  // Check Python dependencies
  if (!auth && reqFile) {
    if (reqFile.includes("firebase-admin")) {
      auth = "Firebase Auth";
      proofs.push({ file: "requirements.txt", snippet: "Firebase Auth detected" });
    } else if (reqFile.includes("boto3") && envFile.includes("cognito")) {
      auth = "AWS Cognito";
      proofs.push({ file: "requirements.txt", snippet: "AWS Cognito detected" });
    }
  }

  return {
    patch: { auth },
    proofs,
    score: auth ? 1.0 : 0.0,
  };
};
