import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { repoInventory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ArrowLeft, ExternalLink, FileCode } from "lucide-react";
import Link from "next/link";

export default async function RepoDetailPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const { name } = await params;
  const repoName = decodeURIComponent(name);
  const repo = await db.query.repoInventory.findFirst({
    where: eq(repoInventory.repoName, repoName),
  });

  if (!repo) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-muted-foreground">
            Repository not found
          </p>
        </div>
      </div>
    );
  }

  const evidence =
    (repo.evidence as Record<
      string,
      Array<{ file: string; snippet: string }>
    >) || {};

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/app">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Inventory
            </Button>
          </Link>
        </div>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{repo.repoName}</h1>
            <div className="flex gap-2 items-center text-muted-foreground">
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-center"
              >
                {repo.url}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
              <span>•</span>
              <span>{repo.visibility}</span>
            </div>
          </div>

          {/* Score Card */}
          <Card>
            <CardHeader>
              <CardTitle>Detection Score</CardTitle>
              <CardDescription>
                Confidence level of technology detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {repo.detectionScore != null
                  ? `${(repo.detectionScore * 100).toFixed(0)}%`
                  : "N/A"}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Last scanned:{" "}
                {repo.lastScannedAt
                  ? new Date(repo.lastScannedAt).toLocaleString()
                  : "Never"}
              </p>
            </CardContent>
          </Card>

          {/* Technology Stack */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Language & Frameworks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {repo.primaryLanguage && (
                  <div>
                    <span className="text-sm font-medium">Primary: </span>
                    <Badge>{repo.primaryLanguage}</Badge>
                  </div>
                )}
                {(repo.frameworks as string[])?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Frameworks: </span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(repo.frameworks as string[]).map((fw) => (
                        <Badge key={fw} variant="secondary">
                          {fw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Build & Package</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(repo.buildTools as string[])?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Build Tools: </span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(repo.buildTools as string[]).map((tool) => (
                        <Badge key={tool} variant="outline">
                          {tool}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(repo.packageManagers as string[])?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">
                      Package Managers:{" "}
                    </span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(repo.packageManagers as string[]).map((pm) => (
                        <Badge key={pm} variant="outline">
                          {pm}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CI/CD & Deploy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(repo.ciCd as string[])?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">CI/CD: </span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(repo.ciCd as string[]).map((ci) => (
                        <Badge key={ci} variant="outline">
                          {ci}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(repo.deployTargets as string[])?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">
                      Deploy Targets:{" "}
                    </span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(repo.deployTargets as string[]).map((target) => (
                        <Badge key={target} variant="outline">
                          {target}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Infrastructure</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(repo.container as string[])?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">Container: </span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(repo.container as string[]).map((c) => (
                        <Badge key={c} variant="outline">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {(repo.infraAsCode as string[])?.length > 0 && (
                  <div>
                    <span className="text-sm font-medium">IaC: </span>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {(repo.infraAsCode as string[]).map((iac) => (
                        <Badge key={iac} variant="outline">
                          {iac}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Evidence */}
          {Object.keys(evidence).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Evidence</CardTitle>
                <CardDescription>
                  Files and snippets used for technology detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(evidence).map(([detector, proofs]) => (
                    <Sheet key={detector}>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                        >
                          <FileCode className="mr-2 h-4 w-4" />
                          {detector} ({proofs.length} file
                          {proofs.length > 1 ? "s" : ""})
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="overflow-y-auto">
                        <SheetHeader>
                          <SheetTitle>{detector}</SheetTitle>
                          <SheetDescription>
                            Evidence from {proofs.length} file
                            {proofs.length > 1 ? "s" : ""}
                          </SheetDescription>
                        </SheetHeader>
                        <div className="mt-6 space-y-4">
                          {proofs.map(
                            (
                              proof: { file: string; snippet: string },
                              idx: number
                            ) => (
                              <div key={idx} className="border rounded p-3">
                                <p className="text-sm font-medium mb-2">
                                  {proof.file}
                                </p>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {proof.snippet}
                                </pre>
                              </div>
                            )
                          )}
                        </div>
                      </SheetContent>
                    </Sheet>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
