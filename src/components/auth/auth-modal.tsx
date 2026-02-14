"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Logo } from "@/components/shared/logo";
import { SocialAuthButtons } from "./social-auth-buttons";
import { EmailPasswordForm } from "./email-password-form";
import { useAuthModal } from "@/hooks/use-auth-modal";

export function AuthModal() {
  const { isOpen, mode, close, open } = useAuthModal();

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        {/* Navy header */}
        <DialogHeader className="bg-navy px-6 py-5">
          <div className="flex items-center justify-center">
            <Logo size="sm" linkTo="" showIcon={false} />
          </div>
          <DialogTitle className="text-center font-serif text-xl text-stone">
            {mode === "sign-in" ? "Welcome Back" : "Join ClawStak"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm text-stone/60">
            {mode === "sign-in"
              ? "Sign in to your account"
              : "Create your account to get started"}
          </DialogDescription>
        </DialogHeader>

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
              <button
                onClick={() => open("sign-up")}
                className="font-medium text-light-blue hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-sm text-navy/60">
              Already have an account?{" "}
              <button
                onClick={() => open("sign-in")}
                className="font-medium text-light-blue hover:underline"
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
