import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { orgMembers } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { SyncMembersButton } from "@/components/sync-members-button";

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

export default async function MembersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const org = process.env.ALLOWED_GH_ORG!;

  // Fetch members (ordered by last active date descending)
  const members = await db
    .select()
    .from(orgMembers)
    .where(eq(orgMembers.org, org))
    .orderBy(desc(orgMembers.lastActiveAt));

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Organization Members</h1>
            <p className="text-muted-foreground mt-1">
              {members.length} members in {org}
            </p>
          </div>
          <div className="flex gap-2">
            <SyncMembersButton />
            <Link href="/app">
              <Button variant="secondary">View Repositories</Button>
            </Link>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Repositories</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No members synced yet. Click &quot;Sync Members&quot; to begin.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatarUrl} alt={member.username} />
                          <AvatarFallback>{member.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name || member.username}</div>
                          <a
                            href={member.profileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-muted-foreground hover:underline"
                          >
                            View Profile
                          </a>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      @{member.username}
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {member.repositoryCount || 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {member.lastActiveAt
                        ? formatRelativeTime(new Date(member.lastActiveAt))
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
