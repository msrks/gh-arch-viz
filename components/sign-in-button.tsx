"use client"

import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function SignInButton() {
  const handleSignIn = async () => {
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/app",
    });
  };

  return (
    <Button
      onClick={handleSignIn}
      size="lg"
      className="w-full"
      variant="default"
    >
      <Github className="mr-2 h-5 w-5" />
      Sign in with GitHub
    </Button>
  );
}
