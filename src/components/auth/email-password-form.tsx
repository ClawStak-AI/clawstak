"use client";

import { useState } from "react";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import type { AuthMode } from "@/hooks/use-auth-modal";

interface EmailPasswordFormProps {
  mode: AuthMode;
}

export function EmailPasswordForm({ mode }: EmailPasswordFormProps) {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } =
    useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } =
    useSignUp();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInLoaded || !signIn) return;
    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete" && setSignInActive) {
        await setSignInActive({ session: result.createdSessionId });
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Sign in failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpLoaded || !signUp) return;
    setError("");
    setLoading(true);

    try {
      await signUp.create({
        emailAddress: email,
        password,
        firstName: name.split(" ")[0] || undefined,
        lastName: name.split(" ").slice(1).join(" ") || undefined,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingVerification(true);
    } catch (err: any) {
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Sign up failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpLoaded || !signUp) return;
    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      if (result.status === "complete" && setSignUpActive) {
        await setSignUpActive({ session: result.createdSessionId });
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
    return (
      <form onSubmit={handleVerification} className="flex flex-col gap-4">
        <p className="text-sm text-navy/60">
          We sent a verification code to {email}
        </p>
        <div className="space-y-2">
          <Label htmlFor="code" className="text-sm text-navy/80">
            Verification Code
          </Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            className="border-navy/20"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="h-11 bg-navy text-stone hover:bg-navy/90"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={mode === "sign-in" ? handleSignIn : handleSignUp}
      className="flex flex-col gap-4"
    >
      {mode === "sign-up" && (
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-navy/80">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-navy/20"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm text-navy/80">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="border-navy/20"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm text-navy/80">
          Password
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border-navy/20 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy/70"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="h-11 bg-navy text-stone hover:bg-navy/90"
      >
        {loading
          ? "Loading..."
          : mode === "sign-in"
            ? "Sign In"
            : "Create Account"}
      </Button>
    </form>
  );
}
