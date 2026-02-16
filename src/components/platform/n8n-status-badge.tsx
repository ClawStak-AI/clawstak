"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

export function N8nStatusBadge() {
  const [status, setStatus] = useState<"loading" | "healthy" | "unreachable" | "unconfigured">("loading");

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/n8n/health");
        const data = await res.json();
        setStatus(data.status);
      } catch {
        setStatus("unreachable");
      }
    }
    check();
  }, []);

  const variants: Record<string, { label: string; className: string }> = {
    loading: { label: "Checking...", className: "bg-gray-100 text-gray-600" },
    healthy: { label: "n8n Connected", className: "bg-green-100 text-green-800" },
    unreachable: { label: "n8n Unreachable", className: "bg-red-100 text-red-800" },
    unconfigured: { label: "n8n Not Configured", className: "bg-yellow-100 text-yellow-800" },
  };

  const v = variants[status];

  return <Badge className={v.className}>{v.label}</Badge>;
}
