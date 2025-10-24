"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export function PageNav() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="flex gap-2 items-center ml-6 mr-auto">
      <h1 className="text-2xl font-bold mr-4">gh inspector</h1>

      <Link href="/app">
        <Button variant={isActive("/app") ? "default" : "link"}>
          Repositories
        </Button>
      </Link>
      <Link href="/members">
        <Button variant={isActive("/members") ? "default" : "link"}>
          Members
        </Button>
      </Link>
      <Link href="/activity">
        <Button variant={pathname?.startsWith("/activity") ? "default" : "link"}>
          Activity
        </Button>
      </Link>
      <Link href="/recipients">
        <Button variant={pathname?.startsWith("/recipients") ? "default" : "link"}>
          Recipients
        </Button>
      </Link>
      <Link href="/insights">
        <Button variant={isActive("/insights") ? "default" : "link"}>
          Insights
        </Button>
      </Link>
    </div>
  );
}
