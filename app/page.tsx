import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { Github } from "lucide-react";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If user is already logged in, redirect to app
  if (session) {
    redirect("/app");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-2xl mx-auto p-8">
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold mb-2">
              GitHub Architecture Visualizer
            </CardTitle>
            <CardDescription className="text-lg">
              Automatically detect and visualize your team&apos;s repository technology stacks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>gh-arch-viz</strong> scans your organization&apos;s repositories to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Detect frameworks, build tools, and deployment targets</li>
                <li>Generate architecture evidence and scores</li>
                <li>Identify technology drift and compliance issues</li>
                <li>Provide searchable inventory across all team repos</li>
              </ul>
            </div>

            <div className="pt-4">
              <form action="/api/auth/signin/github" method="POST">
                <Button type="submit" size="lg" className="w-full" variant="default">
                  <Github className="mr-2 h-5 w-5" />
                  Sign in with GitHub
                </Button>
              </form>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Only members of the configured organization and team can access this application
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
