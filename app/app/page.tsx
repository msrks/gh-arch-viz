import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { repoInventory, orgMembers, account } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";
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
import { ScanNewButton } from "@/components/scan-new-button";
import { ContributorsAvatars } from "@/components/contributors-avatars";
import { LanguageIcon } from "@/components/language-icon";
import { RescanButton } from "@/components/rescan-button";
import { PageNav } from "@/components/page-nav";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  formatRelativeTime,
  getLanguageColor,
  getFrameworkColor,
  shortenFrameworkName,
} from "@/lib/utils";

export default async function AppPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  // Check if user is admin
  const org = process.env.ALLOWED_GH_ORG;
  let isAdmin = false;

  if (org) {
    // Get GitHub account
    const githubAccount = await db.query.account.findFirst({
      where: eq(account.userId, session.user.id as string),
    });

    if (githubAccount) {
      // Check if user exists in org_members and has admin role
      const member = await db.query.orgMembers.findFirst({
        where: and(
          eq(orgMembers.org, org),
          eq(orgMembers.userId, githubAccount.accountId as unknown as number)
        ),
      });

      isAdmin = member?.role === "admin";
    }
  }

  // Fetch inventory (all repositories, ordered by GitHub repo last push date descending)
  const inventory = await db
    .select()
    .from(repoInventory)
    .orderBy(desc(repoInventory.repoPushedAt))
    .limit(500); // Reasonable upper limit to avoid performance issues

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center mb-2">
          <h1 className="text-2xl font-bold">gh inspector</h1>

          <PageNav />

          <div className="flex gap-2 items-center">
            <span className="text-muted-foreground text-xs">
              scanned {inventory.length} repos
            </span>
            <ScanNewButton />
            {isAdmin && <ScanAllButton />}
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
                      <TooltipProvider>
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
                            )
                              .filter(
                                (lang) =>
                                  !["CSS", "Batchfile"].includes(lang.name)
                              )
                              .map((lang) => (
                                <Tooltip key={lang.name}>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center cursor-pointer">
                                      <LanguageIcon
                                        language={lang.name}
                                        size={16}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {lang.name}: {lang.percentage}%
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
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
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      {repo.client ? (
                        <Badge
                          variant="outline"
                          className="h-5 px-2 text-xs"
                          style={{
                            borderColor: getFrameworkColor(repo.client),
                            borderWidth: "2px",
                          }}
                          title={repo.client}
                        >
                          {shortenFrameworkName(repo.client)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.server ? (
                        <Badge
                          variant="outline"
                          className="h-5 px-2 text-xs"
                          style={{
                            borderColor: getFrameworkColor(repo.server),
                            borderWidth: "2px",
                          }}
                          title={repo.server}
                        >
                          {shortenFrameworkName(repo.server)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.db ? (
                        <Badge
                          variant="outline"
                          className="h-5 px-2 text-xs"
                          style={{
                            borderColor: getFrameworkColor(repo.db),
                            borderWidth: "2px",
                          }}
                          title={repo.db}
                        >
                          {shortenFrameworkName(repo.db)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.storage ? (
                        <Badge
                          variant="outline"
                          className="h-5 px-2 text-xs"
                          style={{
                            borderColor: getFrameworkColor(repo.storage),
                            borderWidth: "2px",
                          }}
                          title={repo.storage}
                        >
                          {shortenFrameworkName(repo.storage)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.hosting ? (
                        <Badge
                          variant="outline"
                          className="h-5 px-2 text-xs"
                          style={{
                            borderColor: getFrameworkColor(repo.hosting),
                            borderWidth: "2px",
                          }}
                          title={repo.hosting}
                        >
                          {shortenFrameworkName(repo.hosting)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.auth ? (
                        <Badge
                          variant="outline"
                          className="h-5 px-2 text-xs"
                          style={{
                            borderColor: getFrameworkColor(repo.auth),
                            borderWidth: "2px",
                          }}
                          title={repo.auth}
                        >
                          {shortenFrameworkName(repo.auth)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {repo.ai ? (
                        <Badge
                          variant="outline"
                          className="h-5 px-2 text-xs"
                          style={{
                            borderColor: getFrameworkColor(repo.ai),
                            borderWidth: "2px",
                          }}
                          title={repo.ai}
                        >
                          {shortenFrameworkName(repo.ai)}
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
                      <RescanButton
                        repoId={repo.id}
                        repoFullName={`${repo.org}/${repo.repoName}`}
                      />
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
