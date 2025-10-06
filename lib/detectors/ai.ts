import type { Detector } from "../scan";

/**
 * Detect AI services: opencv, sagemaker, vertex-ai
 */
export const aiDetector: Detector = async ({ tree, read, current }) => {
  let ai: string | null = null;
  const proofs: Array<{ file: string; snippet: string }> = [];

  const pkgFile = await read("package.json");
  const reqFile = await read("requirements.txt");
  const pipFile = await read("Pipfile");

  // Check package.json
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps["@google-cloud/aiplatform"] || deps["@google-cloud/vertexai"]) {
        ai = "Vertex AI";
        proofs.push({ file: "package.json", snippet: "Vertex AI detected" });
      } else if (deps["@aws-sdk/client-sagemaker"]) {
        ai = "SageMaker";
        proofs.push({ file: "package.json", snippet: "AWS SageMaker detected" });
      } else if (deps.opencv4nodejs || deps["opencv.js"]) {
        ai = "OpenCV";
        proofs.push({ file: "package.json", snippet: "OpenCV detected" });
      }
    } catch {
      // ignore parse errors
    }
  }

  // Check Python dependencies
  if (!ai && (reqFile || pipFile)) {
    const pythonDeps = reqFile || pipFile || "";

    if (pythonDeps.includes("google-cloud-aiplatform")) {
      ai = "Vertex AI";
      proofs.push({ file: "requirements.txt", snippet: "Vertex AI detected" });
    } else if (pythonDeps.includes("sagemaker")) {
      ai = "SageMaker";
      proofs.push({ file: "requirements.txt", snippet: "AWS SageMaker detected" });
    } else if (pythonDeps.includes("opencv-python") || pythonDeps.includes("cv2")) {
      ai = "OpenCV";
      proofs.push({ file: "requirements.txt", snippet: "OpenCV detected" });
    }
  }

  return {
    patch: { ai },
    proofs,
    score: ai ? 1.0 : 0.0,
  };
};
