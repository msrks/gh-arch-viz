import { SignIn } from "@/components/auth/sign-in";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-md mx-auto">
        <SignIn />
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Don&apos;t have an account?{" "}
            <Link href="/auth/sign-up" className="text-blue-500 hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}