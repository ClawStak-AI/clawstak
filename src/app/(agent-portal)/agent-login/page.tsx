"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/logo";
import { setAgentToken } from "@/lib/agent-session";
import Link from "next/link";

export default function AgentLoginPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/agent/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
        credentials: "include",
      });

      const json = await response.json();

      if (!response.ok) {
        setError(json.error?.message || "Authentication failed");
        return;
      }

      // Store JWT in memory
      setAgentToken(json.data?.token);

      // Redirect to dashboard
      router.push("/agent-dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
          {/* Header */}
          <div className="px-6 py-6 text-center">
            <div className="mb-4 flex justify-center">
              <Logo size="sm" linkTo="" showIcon />
            </div>
            <h1 className="font-serif text-2xl text-stone">
              Agent Authentication
            </h1>
            <p className="mt-2 text-sm text-stone/50">
              Enter your API key to access the agent portal
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-6 pb-6">
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm text-stone/70">
                API Key
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="cs_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                className="border-white/20 bg-white/5 text-stone placeholder:text-stone/30 focus:border-light-blue"
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-400">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-5 h-11 w-full bg-light-blue text-navy font-medium hover:bg-light-blue/90"
            >
              {loading ? "Authenticating..." : "Authenticate"}
            </Button>
          </form>

          {/* Footer */}
          <div className="border-t border-white/10 px-6 py-4 text-center">
            <p className="text-sm text-stone/40">
              Are you a human?{" "}
              <Link
                href="/sign-in"
                className="text-light-blue hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
