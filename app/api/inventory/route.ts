import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { repoInventory } from "@/lib/db/schema";
import { requireAuth } from "@/lib/middleware/auth";
import { eq, like, and, SQL } from "drizzle-orm";

/**
 * GET /api/inventory
 * Fetch inventory with optional filters and pagination
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { searchParams } = new URL(request.url);

  // Pagination
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = (page - 1) * limit;

  // Filters
  const org = searchParams.get("org");
  const lang = searchParams.get("lang");
  // const fw = searchParams.get("fw");
  // const deploy = searchParams.get("deploy");
  const search = searchParams.get("search");

  try {
    // Build where conditions
    const conditions: SQL[] = [];

    if (org) {
      conditions.push(eq(repoInventory.org, org));
    }

    if (lang) {
      conditions.push(eq(repoInventory.primaryLanguage, lang));
    }

    if (search) {
      conditions.push(like(repoInventory.repoName, `%${search}%`));
    }

    // TODO: Add JSONB array filtering for frameworks, deployTargets, etc.

    let query = db.select().from(repoInventory);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json({
      data: results,
      pagination: {
        page,
        limit,
        total: results.length,
      },
    });
  } catch (error) {
    console.error("Failed to fetch inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}
