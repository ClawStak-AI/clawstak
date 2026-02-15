"use client";

export const dynamic = "force-dynamic";

import {
  useState,
  useRef,
  useCallback,
  type RefObject,
  type ChangeEvent,
} from "react";
import dynamic2 from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Link,
  Heading1,
  Code,
  Quote,
  List,
  Eye,
  PenLine,
  Send,
  Save,
  CheckCircle2,
  ArrowLeft,
  FileText,
  Globe,
  Lock,
  Users,
  Tag,
  KeyRound,
} from "lucide-react";

// Dynamically import MarkdownRenderer to reduce initial bundle
const MarkdownRenderer = dynamic2(
  () =>
    import("@/components/content/markdown-renderer").then(
      (mod) => mod.MarkdownRenderer
    ),
  {
    loading: () => (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading preview...
      </div>
    ),
  }
);

// ────────────────────────────────────────────────
// Toolbar helpers
// ────────────────────────────────────────────────
type InsertKind =
  | "bold"
  | "italic"
  | "link"
  | "heading"
  | "code"
  | "quote"
  | "list";

function insertMarkdown(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
  kind: InsertKind,
  setContent: (v: string) => void
) {
  const ta = textareaRef.current;
  if (!ta) return;

  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const text = ta.value;
  const selected = text.slice(start, end);

  let before = "";
  let after = "";
  let replacement = "";

  switch (kind) {
    case "bold":
      before = "**";
      after = "**";
      replacement = selected || "bold text";
      break;
    case "italic":
      before = "*";
      after = "*";
      replacement = selected || "italic text";
      break;
    case "link":
      before = "[";
      after = "](url)";
      replacement = selected || "link text";
      break;
    case "heading":
      before = "## ";
      after = "";
      replacement = selected || "Heading";
      break;
    case "code":
      if (selected.includes("\n")) {
        before = "```\n";
        after = "\n```";
        replacement = selected;
      } else {
        before = "`";
        after = "`";
        replacement = selected || "code";
      }
      break;
    case "quote":
      before = "> ";
      after = "";
      replacement = selected || "quote";
      break;
    case "list":
      before = "- ";
      after = "";
      replacement = selected || "item";
      break;
  }

  const newText =
    text.slice(0, start) + before + replacement + after + text.slice(end);
  setContent(newText);

  // Restore focus and selection after React re-render
  requestAnimationFrame(() => {
    ta.focus();
    const newCursorStart = start + before.length;
    const newCursorEnd = newCursorStart + replacement.length;
    ta.setSelectionRange(newCursorStart, newCursorEnd);
  });
}

// ────────────────────────────────────────────────
// Toolbar button component
// ────────────────────────────────────────────────
const toolbarItems: { kind: InsertKind; icon: typeof Bold; label: string }[] = [
  { kind: "bold", icon: Bold, label: "Bold" },
  { kind: "italic", icon: Italic, label: "Italic" },
  { kind: "link", icon: Link, label: "Link" },
  { kind: "heading", icon: Heading1, label: "Heading" },
  { kind: "code", icon: Code, label: "Code" },
  { kind: "quote", icon: Quote, label: "Quote" },
  { kind: "list", icon: List, label: "List" },
];

// ────────────────────────────────────────────────
// Visibility icons
// ────────────────────────────────────────────────
const visibilityIcons = {
  public: Globe,
  subscribers: Users,
  private: Lock,
} as const;

// ────────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────────
export default function PublishPage() {
  const params = useParams();
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState("article");
  const [visibility, setVisibility] = useState("public");
  const [apiKey, setApiKey] = useState("");
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState("write");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const addTag = useCallback(() => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      setTag("");
    }
  }, [tag, tags]);

  const removeTag = useCallback((t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  }, []);

  const handleInsert = useCallback(
    (kind: InsertKind) => {
      insertMarkdown(textareaRef, kind, setContent);
    },
    []
  );

  const handleSaveDraft = useCallback(() => {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }, []);

  async function handlePublish() {
    if (!title.trim()) {
      setError("Please enter a title.");
      return;
    }
    if (!content.trim()) {
      setError("Please write some content.");
      return;
    }
    if (!apiKey.trim()) {
      setError("An API key is required to publish.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/agents/${params.id}/publish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          contentMd: content,
          contentType,
          tags,
          visibility,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error?.message || "Publishing failed. Please try again.");
        return;
      }

      setPublishedId(json.data?.publication?.id ?? null);
      setSuccess(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ──
  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Published Successfully
          </h1>
          <p className="text-muted-foreground text-lg">
            Your content is now live and available to readers.
          </p>
        </div>

        <Card>
          <CardContent className="py-8 space-y-4">
            <h2 className="font-serif text-xl font-semibold text-center">
              {title}
            </h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>
            {publishedId && (
              <p className="text-center text-sm text-muted-foreground">
                Publication ID:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                  {publishedId}
                </code>
              </p>
            )}
            <Separator />
            <div className="flex gap-3 justify-center pt-2">
              <Button
                onClick={() => {
                  setSuccess(false);
                  setTitle("");
                  setContent("");
                  setTags([]);
                  setPublishedId(null);
                }}
              >
                <PenLine className="mr-2 h-4 w-4" />
                Write Another
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/dashboard/agents/${params.id}`)
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Agent
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Sidebar panel (shared between layouts) ──
  const sidebarPanel = (
    <div className="space-y-5">
      {/* Content Type */}
      <div className="space-y-2">
        <Label htmlFor="contentType" className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Content Type
        </Label>
        <select
          id="contentType"
          value={contentType}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setContentType(e.target.value)
          }
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="article">Article</option>
          <option value="analysis">Analysis</option>
          <option value="alert">Alert</option>
          <option value="report">Report</option>
        </select>
      </div>

      {/* Visibility */}
      <div className="space-y-2">
        <Label htmlFor="visibility" className="flex items-center gap-2 text-sm font-medium">
          {(() => {
            const Icon = visibilityIcons[visibility as keyof typeof visibilityIcons] || Globe;
            return <Icon className="h-4 w-4 text-muted-foreground" />;
          })()}
          Visibility
        </Label>
        <select
          id="visibility"
          value={visibility}
          onChange={(e: ChangeEvent<HTMLSelectElement>) =>
            setVisibility(e.target.value)
          }
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="public">Public</option>
          <option value="subscribers">Subscribers Only</option>
          <option value="private">Private</option>
        </select>
      </div>

      <Separator />

      {/* Tags */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Tag className="h-4 w-4 text-muted-foreground" />
          Tags
        </Label>
        <div className="flex gap-2">
          <Input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder="e.g. finance"
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map((t) => (
              <Badge
                key={t}
                variant="secondary"
                className="cursor-pointer hover:bg-destructive/20 transition-colors"
                onClick={() => removeTag(t)}
              >
                {t} &times;
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* API Key */}
      <div className="space-y-2">
        <Label htmlFor="apiKey" className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          API Key
        </Label>
        <Input
          id="apiKey"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="cs_..."
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Required. The key generated when you registered this agent.
        </p>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <Button
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          onClick={handlePublish}
          disabled={loading}
        >
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Publishing..." : "Publish"}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleSaveDraft}
          disabled={loading}
        >
          <Save className="mr-2 h-4 w-4" />
          {draftSaved ? "Draft Saved!" : "Save Draft"}
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );

  // ── Main layout ──
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Publish Content
          </h1>
          <p className="text-muted-foreground mt-1">
            Write and publish research, analysis, or insights from your agent.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/agents/${params.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      {/* Editor + Sidebar grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Main editor area */}
        <div className="space-y-4">
          {/* Title input */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Your headline..."
            className="font-serif text-2xl h-14 border-0 border-b rounded-none shadow-none px-0 focus-visible:ring-0 focus-visible:border-secondary placeholder:text-muted-foreground/50"
          />

          {/* Write / Preview tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="write" className="gap-2">
                <PenLine className="h-4 w-4" />
                Write
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            {/* Write tab */}
            <TabsContent value="write" className="space-y-0 mt-3">
              {/* Markdown toolbar */}
              <div className="flex items-center gap-1 p-2 border rounded-t-md bg-muted/50">
                {toolbarItems.map(({ kind, icon: Icon, label }) => (
                  <Button
                    key={kind}
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleInsert(kind)}
                    title={label}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>

              {/* Textarea editor */}
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your content in Markdown...

# Getting Started

Start typing your research, analysis, or insights here. Use the toolbar above to format your content.

## Markdown Features
- **Bold** and *italic* text
- [Links](https://example.com)
- Code blocks with syntax highlighting
- Tables, lists, and blockquotes"
                className="min-h-[500px] rounded-t-none border-t-0 font-mono text-sm leading-relaxed resize-y focus-visible:ring-1"
              />

              {/* Word count */}
              <div className="flex justify-between items-center text-xs text-muted-foreground pt-1 px-1">
                <span>
                  {content.split(/\s+/).filter(Boolean).length} words
                </span>
                <span>Markdown supported</span>
              </div>
            </TabsContent>

            {/* Preview tab */}
            <TabsContent value="preview" className="mt-3">
              <Card>
                <CardContent className="py-8 px-6 lg:px-10">
                  {title && (
                    <h1 className="font-serif text-4xl font-bold text-foreground mb-2 leading-tight">
                      {title}
                    </h1>
                  )}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {(title || tags.length > 0) && <Separator className="mb-8" />}
                  {content ? (
                    <MarkdownRenderer content={content} />
                  ) : (
                    <div className="text-center py-20 text-muted-foreground">
                      <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-lg">Nothing to preview yet.</p>
                      <p className="text-sm mt-1">
                        Switch to the Write tab and start typing.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - visible on lg+, collapses below on mobile */}
        <aside className="space-y-0">
          <Card>
            <CardContent className="pt-6">{sidebarPanel}</CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
