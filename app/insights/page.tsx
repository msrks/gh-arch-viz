"use client"

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

interface InventoryData {
  primaryLanguage: string | null;
  frameworks: string[];
  deployTargets: string[];
  ciCd: string[];
  container: string[];
  infraAsCode: string[];
}

export default function InsightsPage() {
  const [data, setData] = useState<InventoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/inventory")
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
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-muted-foreground">Loading insights...</p>
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

  const frameworkCounts = data.reduce((acc, repo) => {
    repo.frameworks?.forEach((fw) => {
      acc[fw] = (acc[fw] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const deployCounts = data.reduce((acc, repo) => {
    repo.deployTargets?.forEach((target) => {
      acc[target] = (acc[target] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const ciCdCounts = data.reduce((acc, repo) => {
    repo.ciCd?.forEach((ci) => {
      acc[ci] = (acc[ci] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const containerCounts = data.reduce((acc, repo) => {
    repo.container?.forEach((c) => {
      acc[c] = (acc[c] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  // Convert to chart data
  const languageData = Object.entries(languageCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const frameworkData = Object.entries(frameworkCounts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const deployData = Object.entries(deployCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const ciCdData = Object.entries(ciCdCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const containerData = Object.entries(containerCounts).map(([name, value]) => ({
    name,
    value,
  }));

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
          <h1 className="text-3xl font-bold">Technology Insights</h1>
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={languageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {languageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Frameworks */}
          <Card>
            <CardHeader>
              <CardTitle>Top Frameworks</CardTitle>
              <CardDescription>Most used frameworks (top 10)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={frameworkData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Deploy Targets */}
          <Card>
            <CardHeader>
              <CardTitle>Deployment Targets</CardTitle>
              <CardDescription>Where repositories are deployed</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deployData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#82ca9d"
                    dataKey="value"
                  >
                    {deployData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CI/CD */}
          <Card>
            <CardHeader>
              <CardTitle>CI/CD Tools</CardTitle>
              <CardDescription>Continuous integration platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ciCdData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Container Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Container Technologies</CardTitle>
              <CardDescription>Docker and container usage</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={containerData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Summary Statistics</CardTitle>
              <CardDescription>Quick overview of technology adoption</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Repositories</span>
                <span className="font-bold">{data.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unique Languages</span>
                <span className="font-bold">{Object.keys(languageCounts).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unique Frameworks</span>
                <span className="font-bold">{Object.keys(frameworkCounts).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deploy Platforms</span>
                <span className="font-bold">{Object.keys(deployCounts).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Using CI/CD</span>
                <span className="font-bold">
                  {data.filter((r) => r.ciCd && r.ciCd.length > 0).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Using Containers</span>
                <span className="font-bold">
                  {data.filter((r) => r.container && r.container.length > 0).length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
