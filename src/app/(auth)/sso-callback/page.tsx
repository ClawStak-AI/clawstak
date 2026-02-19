"use client";

export const dynamic = "force-dynamic";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SSOCallbackPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-navy/20 border-t-navy" />
        <p className="text-sm text-navy/60">Completing sign in...</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
