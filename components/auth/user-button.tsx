"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface UserButtonProps {
  user: User;
}

export function UserButton({ user }: UserButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
      router.push("/auth/sign-in");
      router.refresh();
    } catch (error) {
      console.error("Failed to sign out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={user.image || undefined} alt={user.name} />
          <AvatarFallback className="text-xs">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-gray-600">
          Welcome, {user.name}
        </span>
      </div>
      <Button asChild size="sm">
        <Link href="/profile">
          Profile
        </Link>
      </Button>
      <Button
        onClick={handleSignOut}
        disabled={isLoading}
        variant="destructive"
        size="sm"
      >
        {isLoading ? "Signing out..." : "Sign Out"}
      </Button>
    </div>
  );
}