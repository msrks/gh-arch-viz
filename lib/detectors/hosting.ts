import type { Detector } from "../scan";

/**
 * Detect hosting: Vercel, CloudRun, EC2, Docker, Firebase Hosting
 */
export const hostingDetector: Detector = async ({ tree, read, current }) => {
  let hosting: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  // Check for Vercel
  const hasVercelConfig = tree.some((f) =>
    ["vercel.json", ".vercel"].includes(f.path || "")
  );
  if (hasVercelConfig) {
    hosting = "Vercel";
    proofs.push({ file: "vercel.json", snippet: "Vercel deployment detected" });
  }

  // Check for Firebase Hosting
  if (!hosting) {
    const hasFirebaseConfig = tree.some((f) =>
      ["firebase.json", ".firebaserc"].includes(f.path || "")
    );
    if (hasFirebaseConfig) {
      const firebaseConfig = await read("firebase.json");
      if (firebaseConfig && firebaseConfig.includes("hosting")) {
        hosting = "Firebase Hosting";
        proofs.push({ file: "firebase.json", snippet: "Firebase Hosting detected" });
      }
    }
  }

  // Check for Docker
  if (!hosting) {
    const hasDockerfile = tree.some((f) =>
      ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"].includes(f.path || "")
    );
    if (hasDockerfile) {
      hosting = "Docker";
      proofs.push({ file: "Dockerfile", snippet: "Docker deployment detected" });
    }
  }

  // Check for Cloud Run (cloudbuild.yaml or app.yaml)
  if (!hosting) {
    const hasCloudRunConfig = tree.some((f) =>
      ["cloudbuild.yaml", "cloudbuild.yml", "app.yaml"].includes(f.path || "")
    );
    if (hasCloudRunConfig) {
      hosting = "CloudRun";
      proofs.push({ file: "cloudbuild.yaml", snippet: "Cloud Run deployment detected" });
    }
  }

  // Check for EC2 (terraform or cloudformation files with EC2)
  if (!hosting) {
    const hasEC2Config = tree.some((f) => {
      const path = f.path || "";
      return path.endsWith(".tf") || path.endsWith(".tfvars") || path.endsWith(".yaml");
    });

    if (hasEC2Config) {
      // Check terraform files for EC2 instances
      for (const file of tree) {
        if (file.path?.endsWith(".tf")) {
          const content = await read(file.path);
          if (content && (content.includes("aws_instance") || content.includes("ec2"))) {
            hosting = "EC2";
            proofs.push({ file: file.path, snippet: "AWS EC2 instance detected" });
            break;
          }
        }
      }
    }
  }

  return {
    patch: { hosting },
    proofs,
    score: hosting ? 1.0 : 0.0,
  };
};
