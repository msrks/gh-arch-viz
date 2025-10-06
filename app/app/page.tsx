import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { repoInventory } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import Link from "next/link";

export default async function AppPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  // Fetch inventory
  const inventory = await db.select().from(repoInventory).limit(50);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Repository Inventory</h1>
            <p className="text-muted-foreground mt-1">
              {inventory.length} repositories scanned
            </p>
          </div>
          <div className="flex gap-2">
            <form action="/api/inventory/scan" method="POST">
              <Button type="submit" variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Scan All Repositories
              </Button>
            </form>
            <Link href="/insights">
              <Button variant="secondary">View Insights</Button>
            </Link>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Repository</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Frameworks</TableHead>
                <TableHead>CI/CD</TableHead>
                <TableHead>Deploy</TableHead>
                <TableHead>Container</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Last Scan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No repositories scanned yet. Click &quot;Scan All Repositories&quot; to begin.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/repo/${repo.repoName}`}
                        className="hover:underline"
                      >
                        {repo.repoName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {repo.primaryLanguage && (
                        <Badge variant="secondary">{repo.primaryLanguage}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(repo.frameworks as string[])?.map((fw) => (
                          <Badge key={fw} variant="outline">
                            {fw}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(repo.ciCd as string[])?.map((ci) => (
                          <Badge key={ci} variant="outline">
                            {ci}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(repo.deployTargets as string[])?.map((deploy) => (
                          <Badge key={deploy} variant="outline">
                            {deploy}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(repo.container as string[])?.map((container) => (
                          <Badge key={container} variant="outline">
                            {container}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {repo.detectionScore != null ? (
                        <Badge variant={repo.detectionScore > 0.7 ? "default" : "secondary"}>
                          {(repo.detectionScore * 100).toFixed(0)}%
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {repo.lastScannedAt
                        ? new Date(repo.lastScannedAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
