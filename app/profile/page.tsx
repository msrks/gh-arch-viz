import { UserProfile } from "@/components/user-profile";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">User Profile</h1>
        <UserProfile user={session.user} />
      </div>
    </div>
  );
}
