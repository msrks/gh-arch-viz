import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailRecipients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecipientsList } from "@/components/recipients-list";
import { AddRecipientForm } from "@/components/add-recipient-form";

export default async function RecipientsPage() {
  // Check authentication
  const session = await auth.api.getSession({
    headers: await import("next/headers").then((mod) => mod.headers()),
  });

  if (!session) {
    redirect("/");
  }

  const org = process.env.ALLOWED_GH_ORG!;

  // Fetch recipients from database
  const recipients = await db
    .select()
    .from(emailRecipients)
    .where(eq(emailRecipients.org, org))
    .orderBy(desc(emailRecipients.createdAt));

  const activeCount = recipients.filter((r) => r.active).length;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-5xl space-y-8">
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
            <h1 className="text-2xl font-bold">Email Recipients</h1>
            <p className="text-sm text-muted-foreground">
              Manage who receives daily GitHub activity summary emails
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recipients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recipients.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {activeCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inactive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">
                {recipients.length - activeCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Add Recipient Form */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Recipient</CardTitle>
            <CardDescription>
              Add an email address to receive daily activity summaries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AddRecipientForm />
          </CardContent>
        </Card>

        {/* Recipients List */}
        <Card>
          <CardHeader>
            <CardTitle>Recipients List</CardTitle>
            <CardDescription>
              Manage existing email recipients ({recipients.length} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecipientsList initialRecipients={recipients} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
