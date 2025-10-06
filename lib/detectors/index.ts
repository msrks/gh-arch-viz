export { detectNode } from "./node";
export { detectNextJs } from "./nextjs";
export { detectDocker } from "./docker";
export { detectGitHubActions } from "./github-actions";
export { detectVercel } from "./vercel";
export { detectTerraform } from "./terraform";

import { detectNode } from "./node";
import { detectNextJs } from "./nextjs";
import { detectDocker } from "./docker";
import { detectGitHubActions } from "./github-actions";
import { detectVercel } from "./vercel";
import { detectTerraform } from "./terraform";

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
];
