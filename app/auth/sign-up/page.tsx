import { SignUp } from "@/components/auth/sign-up";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-md mx-auto">
        <SignUp />
        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="text-blue-500 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}