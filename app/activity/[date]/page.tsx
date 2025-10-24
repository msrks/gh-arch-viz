import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activitySummaries } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
import { Badge } from "@/components/ui/badge";
import { marked } from "marked";

// Configure marked for GitHub-flavored markdown
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface PageProps {
  params: Promise<{
    date: string;
  }>;
}

export default async function ActivityDetailPage({ params }: PageProps) {
  // Check authentication
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((mod) => mod.headers()),
  });

  if (!session) {
    redirect("/");
  }

  const org = process.env.ALLOWED_GH_ORG!;
  const { date } = await params;

  // Parse date and create local midnight (not UTC)
  const [year, month, day] = date.split('-').map(Number);
  const summaryDate = new Date(year, month - 1, day, 0, 0, 0, 0);

  if (isNaN(summaryDate.getTime())) {
    notFound();
  }

  // Fetch summary from database
  const summary = await db
    .select()
    .from(activitySummaries)
    .where(
      and(
        eq(activitySummaries.org, org),
        eq(activitySummaries.summaryDate, summaryDate)
      )
    )
    .limit(1);

  if (summary.length === 0) {
    notFound();
  }

  const summaryData = summary[0];

  // Convert markdown to HTML
  const htmlContent = marked.parse(summaryData.markdown) as string;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <Link href="/activity">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Activity
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">
                Activity Summary
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(summaryData.summaryDate), "MMMM dd, yyyy")}
                </div>
                {summaryData.sentAt ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Sent on {format(new Date(summaryData.sentAt), "MMM dd, HH:mm")}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Not Sent
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Content */}
        <Card>
          <CardHeader>
            <CardTitle>GitHub Activity Summary</CardTitle>
            <CardDescription>
              Generated on {format(new Date(summaryData.createdAt), "MMMM dd, yyyy 'at' HH:mm")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{
                fontSize: '0.95rem',
                lineHeight: '1.7',
              }}
            />
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Summary Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Summary ID:</span>
              <span className="font-mono text-xs">{summaryData.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Organization:</span>
              <span className="font-medium">{summaryData.org}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span>{format(new Date(summaryData.createdAt), "MMM dd, yyyy HH:mm")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Updated:</span>
              <span>{format(new Date(summaryData.updatedAt), "MMM dd, yyyy HH:mm")}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
