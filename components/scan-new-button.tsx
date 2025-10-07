"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function ScanNewButton() {
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch("/api/inventory/scan-new", {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        if (result.totalScanned === 0) {
          alert("All repositories are up to date");
        } else {
          alert(
            `Successfully synced ${result.totalScanned} repositories\n` +
            `New: ${result.newCount}, Updated: ${result.updatedCount}`
          );
        }
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      alert(`Failed to sync: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button onClick={handleSync} disabled={syncing} variant="outline">
      <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
      {syncing ? "Syncing..." : "Sync"}
    </Button>
  );
}
