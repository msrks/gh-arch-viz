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
import { ContributorsAvatars } from "@/components/contributors-avatars";
import { LanguageIcon } from "@/components/language-icon";
import { RescanButton } from "@/components/rescan-button";

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
    return `${diffYear} year${diffYear > 1 ? "s" : ""} ago`;
  } else if (diffMonth > 0) {
    return `${diffMonth} month${diffMonth > 1 ? "s" : ""} ago`;
  } else if (diffDay > 0) {
    return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
  } else if (diffHour > 0) {
    return `${diffHour} hour${diffHour > 1 ? "s" : ""} ago`;
  } else if (diffMin > 0) {
    return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  } else {
    return "just now";
  }
}

/**
 * Get language badge color based on GitHub language colors
 */
function getLanguageColor(language: string): string | undefined {
  const colors: Record<string, string> = {
    Python: "#3572A5",
    "Jupyter Notebook": "#DA5B0B",
    TypeScript: "#3178C6",
    JavaScript: "#f1e05a",
    HCL: "#844FBA",
    Vue: "#41b883",
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
            <Link href="/members">
              <Button variant="secondary">View Members</Button>
            </Link>
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
                <TableHead>Client</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Database</TableHead>
                <TableHead>Storage</TableHead>
                <TableHead>Hosting</TableHead>
                <TableHead>Auth</TableHead>
                <TableHead>AI</TableHead>
                <TableHead>Contributors</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={12}
                    className="text-center text-muted-foreground py-8"
                  >
                    No repositories scanned yet. Click &quot;Scan All
                    Repositories&quot; to begin.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((repo) => (
                  <TableRow key={repo.id}>
                    <TableCell className="font-medium py-2 truncate max-w-[140px]">
                      <Link
                        href={`/repo/${repo.repoName}`}
                        className="hover:underline"
                        title={repo.repoName}
                      >
                        {repo.repoName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground py-2">
                      {repo.repoUpdatedAt
                        ? formatRelativeTime(new Date(repo.repoUpdatedAt))
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap items-center">
                        {repo.languages &&
                        (
                          repo.languages as Array<{
                            name: string;
                            percentage: number;
                          }>
                        ).length > 0 ? (
                          (
                            repo.languages as Array<{
                              name: string;
                              percentage: number;
                            }>
                          ).map((lang) => (
                            <div
                              key={lang.name}
                              className="flex items-center gap-1 text-xs"
                              title={lang.name}
                            >
                              <LanguageIcon language={lang.name} size={16} />
                              <span className="font-medium">
                                {lang.percentage}%
                              </span>
                            </div>
                          ))
                        ) : repo.primaryLanguage ? (
                          <Badge
                            variant="secondary"
                            className="h-5 px-2 text-xs"
                            style={{
                              backgroundColor: getLanguageColor(
                                repo.primaryLanguage
                              ),
                              color: getLanguageColor(repo.primaryLanguage)
                                ? "white"
                                : undefined,
                              borderColor: getLanguageColor(
                                repo.primaryLanguage
                              ),
                            }}
                          >
                            {repo.primaryLanguage}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {repo.client ? (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {repo.client}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.server ? (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {repo.server}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.db ? (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {repo.db}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.storage ? (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {repo.storage}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.hosting ? (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {repo.hosting}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.auth ? (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {repo.auth}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.ai ? (
                        <Badge variant="outline" className="h-5 px-2 text-xs">
                          {repo.ai}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ContributorsAvatars
                        contributors={
                          repo.contributors as Array<{
                            login: string;
                            avatarUrl: string;
                            profileUrl: string;
                            contributions: number;
                          }> | null
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <RescanButton repoId={repo.id} />
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
