import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { repoInventory } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
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
import Link from "next/link";
import { ScanAllButton } from "@/components/scan-all-button";

/**
 * Format date as relative time (e.g., "2 days ago", "3 months ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) {
    return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
  } else if (diffMonth > 0) {
    return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Get language badge color based on GitHub language colors
 */
function getLanguageColor(language: string): string | undefined {
  const colors: Record<string, string> = {
    'Python': '#3572A5',
    'Jupyter Notebook': '#DA5B0B',
    'TypeScript': '#3178C6',
    'JavaScript': '#f1e05a',
    'HCL': '#844FBA',
    'Vue': '#41b883',
  };
  return colors[language];
}

export default async function AppPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  // Fetch inventory (all repositories, ordered by GitHub repo last push date descending)
  const inventory = await db
    .select()
    .from(repoInventory)
    .orderBy(desc(repoInventory.repoPushedAt))
    .limit(500); // Reasonable upper limit to avoid performance issues

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
            <ScanAllButton />
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
                <TableHead>Last Updated</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Frameworks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
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
                        title={repo.repoName}
                      >
                        {repo.repoName.length > 30
                          ? `${repo.repoName.slice(0, 30)}...`
                          : repo.repoName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {repo.repoUpdatedAt
                        ? formatRelativeTime(new Date(repo.repoUpdatedAt))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {repo.primaryLanguage && (
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: getLanguageColor(repo.primaryLanguage),
                            color: getLanguageColor(repo.primaryLanguage) ? 'white' : undefined,
                            borderColor: getLanguageColor(repo.primaryLanguage),
                          }}
                        >
                          {repo.primaryLanguage}
                        </Badge>
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
