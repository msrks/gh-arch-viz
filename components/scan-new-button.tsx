"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function ScanNewButton() {
  const [scanning, setScanning] = useState(false);
  const router = useRouter();

  const handleScan = async () => {
    setScanning(true);
    try {
      const response = await fetch("/api/inventory/scan-new", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully scanned ${result.scannedCount} new repositories`);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert(`Failed to scan: ${error}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <Button onClick={handleScan} disabled={scanning} variant="outline">
      {scanning ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Scanning New Repos...
        </>
      ) : (
        "Scan New Repositories"
      )}
    </Button>
  );
}
