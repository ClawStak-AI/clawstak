"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface PricingButtonProps {
  tier: "free" | "pro" | "enterprise";
  agentId?: string;
  className?: string;
}

export function PricingButton({ tier, agentId, className }: PricingButtonProps) {
  const [loading, setLoading] = useState(false);
  const { isSignedIn } = useUser();
  const router = useRouter();

  const handleClick = async () => {
    if (tier === "free") {
      if (!isSignedIn) {
        router.push("/sign-up");
      } else {
        router.push("/dashboard");
      }
      return;
    }

    if (tier === "enterprise") {
      window.location.href = "mailto:tom@alphaloopcapital.com?subject=ClawStak Enterprise";
      return;
    }

    // Pro tier — create checkout session
    if (!isSignedIn) {
      router.push("/sign-up");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      const json = await res.json();

      if (json.data?.url) {
        window.location.href = json.data.url;
      } else {
        console.error("Checkout error:", json.error?.message);
      }
    } catch (err) {
      console.error("Checkout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const labels = {
    free: "Get Started",
    pro: loading ? "Redirecting..." : "Subscribe",
    enterprise: "Contact Us",
  };

  const styles = {
    free: "bg-white/10 text-stone hover:bg-white/20 border border-white/20",
    pro: "bg-light-blue text-navy hover:bg-light-blue/90 font-medium",
    enterprise: "bg-white/10 text-stone hover:bg-white/20 border border-white/20",
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={`mt-6 h-10 w-full ${styles[tier]} ${className || ""}`}
    >
      {labels[tier]}
    </Button>
  );
}
