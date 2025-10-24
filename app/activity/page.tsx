import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activitySummaries } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { format } from "date-fns";
import { ArrowLeft, Calendar, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function ActivityPage() {
  // Check authentication
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((mod) => mod.headers()),
  });

  if (!session) {
    redirect("/");
  }

  const org = process.env.ALLOWED_GH_ORG!;

  // Fetch summaries from database
  const summaries = await db
    .select()
    .from(activitySummaries)
    .where(eq(activitySummaries.org, org))
    .orderBy(desc(activitySummaries.summaryDate))
    .limit(30);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/app">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Repositories
                </Button>
              </Link>
            </div>
            <h1 className="text-2xl font-bold">Daily Activity Summaries</h1>
            <p className="text-sm text-muted-foreground">
              Automated daily digests of GitHub activity sent every weekday at 8 AM JST
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Summaries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaries.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Emails Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaries.filter((s) => s.sentAt).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaries[0]?.sentAt
                  ? format(new Date(summaries[0].sentAt), "MMM dd")
                  : "Never"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summaries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Summary History</CardTitle>
            <CardDescription>
              View past GitHub activity summaries for {org}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">No Summaries Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Daily summaries will be generated automatically every weekday at 8 AM JST
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Email Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((summary) => (
                    <TableRow key={summary.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(summary.summaryDate), "MMMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        {summary.sentAt ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Not Sent
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {summary.sentAt
                          ? format(new Date(summary.sentAt), "MMM dd, yyyy HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/activity/${format(
                            new Date(summary.summaryDate),
                            "yyyy-MM-dd"
                          )}`}
                        >
                          <Button variant="ghost" size="sm">
                            View Summary
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
