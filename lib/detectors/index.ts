export { detectNode } from "./node";
export { detectNextJs } from "./nextjs";
export { detectDocker } from "./docker";
export { detectGitHubActions } from "./github-actions";
export { detectVercel } from "./vercel";
export { detectTerraform } from "./terraform";
export { clientDetector } from "./client";
export { serverDetector } from "./server";
export { databaseDetector } from "./database";
export { storageDetector } from "./storage";
export { hostingDetector } from "./hosting";
export { authDetector } from "./auth";
export { aiDetector } from "./ai";

import { detectNode } from "./node";
import { detectNextJs } from "./nextjs";
import { detectDocker } from "./docker";
import { detectGitHubActions } from "./github-actions";
import { detectVercel } from "./vercel";
import { detectTerraform } from "./terraform";
import { clientDetector } from "./client";
import { serverDetector } from "./server";
import { databaseDetector } from "./database";
import { storageDetector } from "./storage";
import { hostingDetector } from "./hosting";
import { authDetector } from "./auth";
import { aiDetector } from "./ai";

/**
 * All available detectors
 */
export const allDetectors = [
  detectNode,
  detectNextJs,
  detectDocker,
  detectGitHubActions,
  detectVercel,
  detectTerraform,
  clientDetector,
  serverDetector,
  databaseDetector,
  storageDetector,
  hostingDetector,
  authDetector,
  aiDetector,
];
