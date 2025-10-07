import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date as relative time (e.g., "2 days ago", "3 months ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) {
    return `${diffYear} year${diffYear > 1 ? "s" : ""} ago`;
  } else if (diffMonth > 0) {
    return `${diffMonth} month${diffMonth > 1 ? "s" : ""} ago`;
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  } else {
    return "just now";
  }
}

/**
 * Get language badge color based on GitHub language colors
 */
export function getLanguageColor(language: string): string | undefined {
  const colors: Record<string, string> = {
    Python: "#3572A5",
    "Jupyter Notebook": "#DA5B0B",
    TypeScript: "#3178C6",
    JavaScript: "#f1e05a",
    HCL: "#844FBA",
    Vue: "#41b883",
  };
  return colors[language];
}

/**
 * Get framework badge color
 */
export function getFrameworkColor(framework: string): string | undefined {
  const colors: Record<string, string> = {
    // Client
    React: "#61DAFB",
    Vue: "#42b883",
    "Next.js": "#000000",
    "Nuxt.js": "#00DC82",

    // Server
    Flask: "#000000",
    FastAPI: "#009688",
    Streamlit: "#FF4B4B",
    "Express.js": "#000000",

    // Database
    Neon: "#00E599",
    Supabase: "#3ECF8E",
    Firestore: "#FFA611",
    MongoDB: "#47A248",
    Redis: "#DC382D",
    "AWS RDS": "#527FFF",
    "AWS DynamoDB": "#4053D6",
    "AWS Aurora": "#527FFF",

    // Storage
    S3: "#569A31",
    "Vercel Blob": "#000000",
    GCS: "#4285F4",
    "Firebase Storage": "#FFA611",

    // Hosting
    Vercel: "#000000",
    CloudRun: "#4285F4",
    EC2: "#FF9900",
    Docker: "#2496ED",
    "Firebase Hosting": "#FFA611",

    // Auth
    "AWS Cognito": "#DD344C",
    "Firebase Auth": "#FFA611",
    "Next-Auth": "#000000",
    "Better-Auth": "#000000",

    // AI
    OpenCV: "#5C3EE8",
    SageMaker: "#FF9900",
    "Vertex AI": "#4285F4",
  };
  return colors[framework];
}

/**
 * Shorten framework names for display
 */
export function shortenFrameworkName(framework: string): string {
  const shortenMap: Record<string, string> = {
    "AWS Cognito": "Cognito",
    "AWS RDS": "RDS",
    "AWS DynamoDB": "DynamoDB",
    "AWS Aurora": "Aurora",
    "Firebase Hosting": "Firebase",
    "Firebase Auth": "Firebase",
    "Firebase Storage": "Firebase",
    "Vercel Blob": "Vercel",
  };
  return shortenMap[framework] || framework;
}
