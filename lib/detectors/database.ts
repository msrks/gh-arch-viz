import type { Detector } from "../scan";

/**
 * Detect database: Neon, Supabase, Firestore, AWS RDB, AWS DynamoDB, AWS Aurora, MongoDB, Redis
 */
export const databaseDetector: Detector = async ({ tree, read, current }) => {
  let db: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  // Check for firebase.json with firestore configuration
  const firebaseConfigFile = tree.find((f) => f.path?.endsWith("firebase.json"));
  if (firebaseConfigFile) {
    const firebaseConfig = await read(firebaseConfigFile.path!);
    if (firebaseConfig) {
      try {
        const config = JSON.parse(firebaseConfig);
        if (config.firestore) {
          db = "Firestore";
          proofs.push({ file: firebaseConfigFile.path!, snippet: "Firestore config in firebase.json detected" });
          return {
            patch: { db },
            proofs,
            score: 1.0,
          };
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // Check for firestore.rules file
  const firestoreRulesFile = tree.find((f) => f.path?.endsWith("firestore.rules"));
  if (firestoreRulesFile) {
    db = "Firestore";
    proofs.push({ file: firestoreRulesFile.path!, snippet: "Firestore rules file detected" });
    return {
      patch: { db },
      proofs,
      score: 1.0,
    };
  }

  const pkgFile = await read("package.json");
  const reqFile = await read("requirements.txt");
  const pipFile = await read("Pipfile");
  const envFile = await read(".env") || await read(".env.example") || "";

  // Check package.json
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps["@neondatabase/serverless"] || deps["@neon/serverless"]) {
        db = "Neon";
        proofs.push({ file: "package.json", snippet: "Neon database detected" });
      } else if (deps["@supabase/supabase-js"]) {
        db = "Supabase";
        proofs.push({ file: "package.json", snippet: "Supabase detected" });
      } else if (deps.firebase || deps["@firebase/firestore"]) {
        db = "Firestore";
        proofs.push({ file: "package.json", snippet: "Firestore detected" });
      } else if (deps["aws-sdk"] && envFile.includes("RDS")) {
        db = "AWS RDS";
        proofs.push({ file: "package.json", snippet: "AWS RDS detected" });
      } else if (deps["aws-sdk"] && (envFile.includes("DynamoDB") || envFile.includes("DYNAMODB"))) {
        db = "AWS DynamoDB";
        proofs.push({ file: "package.json", snippet: "AWS DynamoDB detected" });
      } else if (deps.mongodb || deps.mongoose) {
        db = "MongoDB";
        proofs.push({ file: "package.json", snippet: "MongoDB detected" });
      } else if (deps.redis || deps.ioredis) {
        db = "Redis";
        proofs.push({ file: "package.json", snippet: "Redis detected" });
      }
    } catch {
      // ignore parse errors
    }
  }

  // Check Python dependencies
  if (!db && (reqFile || pipFile)) {
    const pythonDeps = reqFile || pipFile || "";

    if (pythonDeps.includes("psycopg2") && envFile.includes("neon")) {
      db = "Neon";
      proofs.push({ file: "requirements.txt", snippet: "Neon (PostgreSQL) detected" });
    } else if (pythonDeps.includes("supabase")) {
      db = "Supabase";
      proofs.push({ file: "requirements.txt", snippet: "Supabase detected" });
    } else if (pythonDeps.includes("firebase-admin")) {
      db = "Firestore";
      proofs.push({ file: "requirements.txt", snippet: "Firestore detected" });
    } else if (pythonDeps.includes("boto3") && envFile.includes("rds")) {
      db = "AWS RDS";
      proofs.push({ file: "requirements.txt", snippet: "AWS RDS detected" });
    } else if (pythonDeps.includes("boto3") && envFile.includes("dynamodb")) {
      db = "AWS DynamoDB";
      proofs.push({ file: "requirements.txt", snippet: "AWS DynamoDB detected" });
    } else if (pythonDeps.includes("pymongo")) {
      db = "MongoDB";
      proofs.push({ file: "requirements.txt", snippet: "MongoDB detected" });
    } else if (pythonDeps.includes("redis")) {
      db = "Redis";
      proofs.push({ file: "requirements.txt", snippet: "Redis detected" });
    }
  }

  return {
    patch: { db },
    proofs,
    score: db ? 1.0 : 0.0,
  };
};
