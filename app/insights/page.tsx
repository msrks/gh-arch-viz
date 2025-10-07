"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { LanguageIcon } from "@/components/language-icon";
import Image from "next/image";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC658",
  "#FF6B9D",
];

// Language colors based on GitHub standard
const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572A5",
  "Jupyter Notebook": "#DA5B0B",
  TypeScript: "#3178C6",
  JavaScript: "#f1e05a",
  HCL: "#844FBA",
  Vue: "#41b883",
  HTML: "#e34c26",
  C: "#555555",
  "C++": "#f34b7d",
};

interface InventoryData {
  primaryLanguage: string | null;
  frameworks: string[];
  deployTargets: string[];
  ciCd: string[];
  container: string[];
  infraAsCode: string[];
  contributors: Array<{
    login: string;
    avatarUrl: string;
    profileUrl: string;
    contributions: number;
  }> | null;
}

export default function InsightsPage() {
  const [data, setData] = useState<InventoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all repositories by setting a high limit
    fetch("/api/inventory?limit=1000")
      .then((res) => res.json())
      .then((result) => {
        setData(result.data || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Failed to fetch inventory:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-muted-foreground">
            Loading insights...
          </p>
        </div>
      </div>
    );
  }

  // Aggregate data
  const languageCounts = data.reduce((acc, repo) => {
    const lang = repo.primaryLanguage || "Unknown";
    acc[lang] = (acc[lang] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Convert to chart data (exclude Unknown)
  const languageData = Object.entries(languageCounts)
    .filter(([name]) => name !== "Unknown")
    .map(([name, value]) => ({
      name,
      value,
    }))
    .sort((a, b) => b.value - a.value);

  // Aggregate contributors
  const contributorStats = data.reduce((acc, repo) => {
    if (repo.contributors) {
      repo.contributors.forEach((contributor) => {
        if (!acc[contributor.login]) {
          acc[contributor.login] = {
            login: contributor.login,
            avatarUrl: contributor.avatarUrl,
            profileUrl: contributor.profileUrl,
            totalContributions: 0,
            repoCount: 0,
          };
        }
        acc[contributor.login].totalContributions += contributor.contributions;
        acc[contributor.login].repoCount += 1;
      });
    }
    return acc;
  }, {} as Record<string, { login: string; avatarUrl: string; profileUrl: string; totalContributions: number; repoCount: number }>);

  const topContributors = Object.values(contributorStats)
    .sort((a, b) => b.totalContributions - a.totalContributions)
    .slice(0, 10);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/app">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Inventory
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold">Technology Insights</h1>
          <p className="text-muted-foreground mt-1">
            Aggregated analysis of {data.length} repositories
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Languages Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Programming Languages</CardTitle>
              <CardDescription>Primary language distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={languageData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(props) => {
                      const entry = languageData.find(
                        (d) => d.name === props.name
                      );
                      return entry && entry.value > 5 ? props.name : "";
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {languageData.map((entry) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={
                          LANGUAGE_COLORS[entry.name] ||
                          COLORS[languageData.indexOf(entry) % COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        return (
                          <div className="bg-background border rounded p-2 shadow-lg">
                            <div className="flex items-center gap-2">
                              <LanguageIcon
                                language={data.name as string}
                                size={20}
                              />
                              <span className="font-semibold">{data.name}</span>
                            </div>
                            <p className="text-sm mt-1">
                              Repositories: {data.value}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <CardTitle>Top Contributors</CardTitle>
              <CardDescription>
                Most active contributors across all repositories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topContributors.map((contributor, index) => (
                  <div
                    key={contributor.login}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <a
                        href={contributor.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Image
                          src={contributor.avatarUrl}
                          alt={contributor.login}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                        <div>
                          <p className="font-medium">{contributor.login}</p>
                          <p className="text-sm text-muted-foreground">
                            {contributor.repoCount}{" "}
                            {contributor.repoCount === 1
                              ? "repository"
                              : "repositories"}
                          </p>
                        </div>
                      </a>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {contributor.totalContributions.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        contributions
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Statistics</CardTitle>
              <CardDescription>
                Quick overview of technology adoption
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Repositories
                </span>
                <span className="font-bold">{data.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unique Languages</span>
                <span className="font-bold">
                  {Object.keys(languageCounts).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Total Contributors
                </span>
                <span className="font-bold">
                  {Object.keys(contributorStats).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
