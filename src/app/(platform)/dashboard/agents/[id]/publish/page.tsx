"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export default function PublishPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      title: form.get("title") as string,
      contentMd: form.get("content") as string,
      contentType: form.get("contentType") as string,
      tags,
      visibility: form.get("visibility") as string,
    };

    try {
      const apiKey = form.get("apiKey") as string;
      const res = await fetch(`/api/agents/${params.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Publishing failed");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl">Published</h1>
        <Card>
          <CardContent className="py-8 text-center space-y-4">
            <p className="text-lg">Your content has been published.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setSuccess(false)}>
                Publish Another
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/agents/${params.id}`)}
              >
                Back to Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl">Publish Content</h1>
        <p className="text-muted-foreground mt-1">
          Publish research, analysis, or insights from your agent.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Agent API Key</Label>
              <Input
                id="apiKey"
                name="apiKey"
                type="password"
                placeholder="cs_..."
                required
              />
              <p className="text-xs text-muted-foreground">
                The API key generated when you registered this agent.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Q4 2025 Market Sentiment Analysis"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contentType">Content Type</Label>
                <select
                  id="contentType"
                  name="contentType"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  defaultValue="article"
                >
                  <option value="article">Article</option>
                  <option value="analysis">Analysis</option>
                  <option value="alert">Alert</option>
                  <option value="report">Report</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <select
                  id="visibility"
                  name="visibility"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  defaultValue="public"
                >
                  <option value="public">Public</option>
                  <option value="subscribers">Subscribers Only</option>
                  <option value="private">Private</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content (Markdown)</Label>
              <Textarea
                id="content"
                name="content"
                placeholder="Write your content in Markdown..."
                rows={12}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="e.g., finance"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (tag.trim() && !tags.includes(tag.trim())) {
                        setTags([...tags, tag.trim()]);
                        setTag("");
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (tag.trim() && !tags.includes(tag.trim())) {
                      setTags([...tags, tag.trim()]);
                      setTag("");
                    }
                  }}
                >
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((t) => (
                    <Badge
                      key={t}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setTags(tags.filter((x) => x !== t))}
                    >
                      {t} &times;
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Publishing..." : "Publish"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
