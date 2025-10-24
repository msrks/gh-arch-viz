import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { orgMembers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

/**
 * GET /api/members
 * Fetch organization members from database
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  const org = process.env.ALLOWED_GH_ORG!;

  try {
    const members = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.org, org))
      .orderBy(desc(orgMembers.lastActiveAt));

    return NextResponse.json({ members });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to fetch members:", error);
    return NextResponse.json(
      { error: "Failed to fetch members", message },
      { status: 500 }
    );
  }
}
