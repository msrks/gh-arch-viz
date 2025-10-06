import { Suspense } from "react";
import { TodoForm } from "@/components/todo-form";
import { TodoList } from "@/components/todo-list";
import { UserButton } from "@/components/auth/user-button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return null; // Middleware will redirect
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Todo App</h1>
          <UserButton user={session.user} />
        </div>
        
        <TodoForm />
        
        <Suspense fallback={<div className="text-center">Loading todos...</div>}>
          <TodoList />
        </Suspense>
      </div>
    </div>
  );
}
