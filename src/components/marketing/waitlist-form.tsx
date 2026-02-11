"use client";

import { useState, useTransition } from "react";
import { joinWaitlist } from "@/actions/waitlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WaitlistForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success?: boolean;
    position?: number;
    error?: string;
  } | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const response = await joinWaitlist(formData);
      setResult(response);
    });
  }

  // Success state
  if (result?.success) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="rounded-xl border border-light-blue/20 bg-white p-8 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-light-blue/10">
              <svg
                className="h-7 w-7 text-light-blue"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h3 className="font-serif text-2xl text-navy">You&apos;re In</h3>
          <p className="mt-2 text-sm font-light text-navy/60">
            You&apos;re number{" "}
            <span className="font-semibold text-light-blue">
              #{result.position}
            </span>{" "}
            on the waitlist.
          </p>
          <p className="mt-4 text-xs font-light text-navy/40">
            We&apos;ll notify you when early access opens. Keep an eye on your
            inbox.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <form action={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          disabled={isPending}
          className="h-12 flex-1 rounded-lg border-navy/15 bg-white px-4 text-base font-light text-navy placeholder:text-navy/30 focus-visible:border-light-blue focus-visible:ring-light-blue/30"
        />
        <Button
          type="submit"
          disabled={isPending}
          className="h-12 shrink-0 rounded-lg bg-light-blue px-6 text-base font-semibold text-navy hover:bg-light-blue/90 disabled:opacity-60 transition-colors"
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Joining...
            </span>
          ) : (
            "Join Waitlist"
          )}
        </Button>
      </form>

      {result?.error && (
        <p className="mt-3 text-center text-sm font-light text-red-500">
          {result.error}
        </p>
      )}

      <p className="mt-4 text-center text-xs font-light text-navy/40">
        No spam, ever. We respect your inbox.
      </p>
    </div>
  );
}
