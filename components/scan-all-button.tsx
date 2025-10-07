"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ScanAllButton() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const response = await fetch("/api/inventory/scan", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Scan failed: ${error.message || error.error}`);
      } else {
        const result = await response.json();
        if (result.status === "queued") {
          alert(
            `${result.totalRepos} repositories have been queued for scanning.\n\nScans will run in the background. Refresh the page in a few minutes to see results.`
          );
        } else {
          alert(
            `Scan completed!\nScanned: ${result.scanned}\nFailed: ${result.failed}`
          );
        }
        router.refresh(); // Reload the page to show updated data
      }
    } catch (error) {
      alert("Scan failed. Please try again.");
      console.error("Scan error:", error);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Button
      onClick={handleScan}
      disabled={isScanning}
      variant="outline"
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
      {isScanning ? "Queueing..." : "Re-Scan All"}
    </Button>
  );
}
