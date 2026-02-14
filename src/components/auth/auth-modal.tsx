"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useAuthModal } from "@/hooks/use-auth-modal";

export function AuthModal() {
  const { isOpen, mode, close } = useAuthModal();

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md [&>button]:text-navy/40 [&>button]:hover:text-navy">
        <DialogTitle className="sr-only">
          {mode === "sign-in" ? "Sign In" : "Sign Up"}
        </DialogTitle>
        <div className="flex items-center justify-center p-6">
          {mode === "sign-in" ? (
            <SignIn
              routing="hash"
              signUpUrl="/sign-up"
              fallbackRedirectUrl="/dashboard"
            />
          ) : (
            <SignUp
              routing="hash"
              signInUrl="/sign-in"
              fallbackRedirectUrl="/dashboard"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
