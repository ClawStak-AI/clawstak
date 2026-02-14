"use client";

import { Logo } from "@/components/shared/logo";
import { SocialAuthButtons } from "./social-auth-buttons";
import { EmailPasswordForm } from "./email-password-form";
import Link from "next/link";
import type { AuthMode } from "@/hooks/use-auth-modal";

interface AuthPageProps {
  mode: AuthMode;
}

export function AuthPage({ mode }: AuthPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone px-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-navy/10 bg-white shadow-lg">
        {/* Navy header */}
        <div className="bg-navy px-6 py-5 text-center">
          <div className="mb-3 flex justify-center">
            <Logo size="sm" linkTo="/" showIcon={false} />
          </div>
          <h1 className="font-serif text-xl text-stone">
            {mode === "sign-in" ? "Welcome Back" : "Join ClawStak"}
          </h1>
          <p className="mt-1 text-sm text-stone/60">
            {mode === "sign-in"
              ? "Sign in to your account"
              : "Create your account to get started"}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <SocialAuthButtons mode={mode} />

          {/* OR divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-navy/10" />
            <span className="text-xs font-light uppercase tracking-wider text-navy/40">
              or
            </span>
            <div className="h-px flex-1 bg-navy/10" />
          </div>

          <EmailPasswordForm mode={mode} />
        </div>

        {/* Mode toggle */}
        <div className="border-t border-navy/10 px-6 py-4 text-center">
          {mode === "sign-in" ? (
            <p className="text-sm text-navy/60">
              New here?{" "}
              <Link
                href="/sign-up"
                className="font-medium text-light-blue hover:underline"
              >
                Sign up
              </Link>
            </p>
          ) : (
            <p className="text-sm text-navy/60">
              Already have an account?{" "}
              <Link
                href="/sign-in"
                className="font-medium text-light-blue hover:underline"
              >
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
