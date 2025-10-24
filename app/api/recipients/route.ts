import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/auth";
import { db } from "@/lib/db";
import { emailRecipients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

/**
 * GET /api/recipients
 * Get all email recipients for the organization
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  const { org } = authResult;

  try {
    const recipients = await db
      .select()
      .from(emailRecipients)
      .where(eq(emailRecipients.org, org))
      .orderBy(emailRecipients.createdAt);

    return NextResponse.json({ recipients });
  } catch (error) {
    console.error("Failed to fetch recipients:", error);
    return NextResponse.json(
      { error: "Failed to fetch recipients" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/recipients
 * Add a new email recipient
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  const { org } = authResult;

  try {
    const body = await request.json();
    const { email, name } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db
      .select()
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.org, org),
          eq(emailRecipients.email, email)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    // Insert new recipient
    const recipientId = createId();
    await db.insert(emailRecipients).values({
      id: recipientId,
      org,
      email,
      name: name || null,
      active: true,
    });

    const newRecipient = await db
      .select()
      .from(emailRecipients)
      .where(eq(emailRecipients.id, recipientId))
      .limit(1);

    return NextResponse.json(
      { recipient: newRecipient[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add recipient:", error);
    return NextResponse.json(
      { error: "Failed to add recipient" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/recipients
 * Delete an email recipient
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  const { org } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const recipientId = searchParams.get("id");

    if (!recipientId) {
      return NextResponse.json(
        { error: "Recipient ID is required" },
        { status: 400 }
      );
    }

    // Verify recipient belongs to this org before deleting
    const recipient = await db
      .select()
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.id, recipientId),
          eq(emailRecipients.org, org)
        )
      )
      .limit(1);

    if (recipient.length === 0) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    await db
      .delete(emailRecipients)
      .where(eq(emailRecipients.id, recipientId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete recipient:", error);
    return NextResponse.json(
      { error: "Failed to delete recipient" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/recipients
 * Update recipient (toggle active status or update name)
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (!authResult.success) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401 }
    );
  }

  const { org } = authResult;

  try {
    const body = await request.json();
    const { id, active, name } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Recipient ID is required" },
        { status: 400 }
      );
    }

    // Verify recipient belongs to this org
    const recipient = await db
      .select()
      .from(emailRecipients)
      .where(
        and(
          eq(emailRecipients.id, id),
          eq(emailRecipients.org, org)
        )
      )
      .limit(1);

    if (recipient.length === 0) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Update recipient
    const updates: Partial<typeof emailRecipients.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (typeof active === "boolean") {
      updates.active = active;
    }

    if (name !== undefined) {
      updates.name = name || null;
    }

    await db
      .update(emailRecipients)
      .set(updates)
      .where(eq(emailRecipients.id, id));

    const updated = await db
      .select()
      .from(emailRecipients)
      .where(eq(emailRecipients.id, id))
      .limit(1);

    return NextResponse.json({ recipient: updated[0] });
  } catch (error) {
    console.error("Failed to update recipient:", error);
    return NextResponse.json(
      { error: "Failed to update recipient" },
      { status: 500 }
    );
  }
}
