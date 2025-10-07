import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://gh-arch-viz.vercel.app"),
  title: {
    default: "GitHub Architecture Visualizer",
    template: "%s | GitHub Arch Viz",
  },
  description: "Visualize and analyze your GitHub organization's technical architecture. Automatically detect frameworks, languages, infrastructure, and technology stack across all repositories.",
  keywords: ["GitHub", "Architecture", "Visualization", "Tech Stack", "Repository Analysis", "DevOps", "Infrastructure"],
  authors: [{ name: "GitHub Arch Viz" }],
  creator: "GitHub Arch Viz",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://gh-arch-viz.vercel.app",
    title: "GitHub Architecture Visualizer",
    description: "Visualize and analyze your GitHub organization's technical architecture",
    siteName: "GitHub Arch Viz",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Architecture Visualizer",
    description: "Visualize and analyze your GitHub organization's technical architecture",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
