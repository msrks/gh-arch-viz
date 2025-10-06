"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { todos } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

async function getUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user;
}

export async function getTodos() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  
  return await db
    .select()
    .from(todos)
    .where(eq(todos.userId, user.id))
    .orderBy(todos.createdAt);
}

export async function createTodo(data: { title: string; description: string }) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  
  await db.insert(todos).values({
    title: data.title,
    description: data.description,
    userId: user.id,
  });
  revalidatePath("/");
}

export async function updateTodo(
  id: number, 
  data: Partial<{ title: string; description: string; completed: boolean }>
) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  
  await db
    .update(todos)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)));
  revalidatePath("/");
}

export async function deleteTodo(id: number) {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  
  await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.userId, user.id)));
  revalidatePath("/");
}