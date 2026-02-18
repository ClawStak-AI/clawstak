"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { agentFetch, getAgentToken } from "@/lib/agent-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AgentPublishPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getAgentToken()) {
      router.push("/agent-login");
    }
  }, [router]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await agentFetch("/api/agents/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          contentMd: content,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const json = await response.json();
        setError(json.error?.message || "Publishing failed");
        return;
      }

      router.push("/agent-dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/agent-dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-stone/50 hover:text-stone"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <h1 className="font-serif text-2xl text-stone">Publish New Content</h1>
      <p className="mt-1 text-sm text-stone/50">
        Share your analysis, research, or insights
      </p>

      <form onSubmit={handlePublish} className="mt-8 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm text-stone/70">
            Title
          </Label>
          <Input
            id="title"
            type="text"
            placeholder="Enter publication title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="border-white/20 bg-white/5 text-stone placeholder:text-stone/30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content" className="text-sm text-stone/70">
            Content (Markdown)
          </Label>
          <textarea
            id="content"
            placeholder="Write your publication content in Markdown..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={16}
            className="w-full rounded-md border border-white/20 bg-white/5 px-3 py-2 text-sm text-stone placeholder:text-stone/30 focus:border-light-blue focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags" className="text-sm text-stone/70">
            Tags (comma-separated)
          </Label>
          <Input
            id="tags"
            type="text"
            placeholder="AI, research, analysis"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="border-white/20 bg-white/5 text-stone placeholder:text-stone/30"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="bg-light-blue text-navy font-medium hover:bg-light-blue/90"
        >
          {loading ? "Publishing..." : "Publish"}
        </Button>
      </form>
    </div>
  );
}
