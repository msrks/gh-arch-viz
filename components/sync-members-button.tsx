"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useRouter } from "next/navigation";

export function SyncMembersButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const router = useRouter();

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/members/sync", {
        method: "POST",
      });

      const result = await response.json();

      if (response.ok) {
        alert(`Successfully synced ${result.synced} members${result.failed > 0 ? ` (${result.failed} failed)` : ""}`);
        router.refresh();
      } else {
        alert(`Sync failed: ${result.message || result.error}`);
      }
    } catch (error) {
      alert(`Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button onClick={handleSync} disabled={isSyncing}>
      <Users className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing..." : "Sync Members"}
    </Button>
  );
}
