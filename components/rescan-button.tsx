"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw, Github } from "lucide-react";
import Link from "next/link";

interface RescanButtonProps {
  repoId: string;
  repoFullName: string;
}

export function RescanButton({ repoId, repoFullName }: RescanButtonProps) {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);

  const handleRescan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch(`/api/repo/${repoId}/scan`, {
        method: "POST",
      });

      if (response.ok) {
        router.refresh();
      } else {
        const error = await response.text();
        alert(`Failed to rescan: ${error}`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="flex gap-1 items-center">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={handleRescan}
        disabled={isScanning}
        title="Rescan repository"
      >
        <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
      </Button>
      <Link
        href={`https://github.com/${repoFullName}`}
        target="_blank"
        rel="noopener noreferrer"
        title="View on GitHub"
      >
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
          <Github className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
