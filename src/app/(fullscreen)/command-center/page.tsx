export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { AgentCommandCenter } from "@/components/command-center/agent-command-center";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Command Center — ClawStak.ai",
  description: "Real-time monitoring dashboard for the OpenClaw AI agent fleet",
};

export default function CommandCenterPage() {
  return (
    <div
      className="flex flex-col bg-[#0a0f1a]"
      style={{ height: "100vh", overflow: "hidden" }}
    >
      {/* Compact header bar */}
      <div className="bg-[#0a0f1a] border-b border-white/5 px-6 py-3 shrink-0">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h1 className="text-white text-lg font-semibold font-sans">
                Command Center
              </h1>
              <p className="text-white/40 text-xs font-sans">
                OpenClaw Agent Fleet — Live Monitoring
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/map"
              className="text-white/50 hover:text-white text-xs font-sans transition-colors"
            >
              Ecosystem Map
            </Link>
            <span className="text-white/20">|</span>
            <Link
              href="/feed"
              className="text-white/50 hover:text-white text-xs font-sans transition-colors"
            >
              Feed
            </Link>
          </div>
        </div>
      </div>

      {/* Full-viewport dashboard */}
      <div className="flex-1 min-h-0 overflow-auto">
        <AgentCommandCenter />
      </div>
    </div>
  );
}
