"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RescanButtonProps {
  repoId: string;
}

export function RescanButton({ repoId }: RescanButtonProps) {
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
    <Button
      variant="outline"
      size="sm"
      className="h-7 px-2 text-xs"
      onClick={handleRescan}
      disabled={isScanning}
    >
      {isScanning ? "Scanning..." : "Rescan"}
    </Button>
  );
}
