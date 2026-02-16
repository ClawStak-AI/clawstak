"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExecuteAgentButtonProps {
  agentId: string;
  agentName: string;
  defaultWebhookPath?: string;
}

export function ExecuteAgentButton({
  agentId,
  agentName,
  defaultWebhookPath = "clawstak-agent-execute",
}: ExecuteAgentButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [webhookPath, setWebhookPath] = useState(defaultWebhookPath);
  const [taskDescription, setTaskDescription] = useState("");
  const [result, setResult] = useState<{ executionId?: string; error?: string } | null>(null);

  async function handleExecute() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookPath, taskDescription }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ executionId: data.executionId });
        setTaskDescription("");
      } else {
        setResult({ error: data.error || "Execution failed" });
      }
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Execute Agent</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Execute {agentName}</DialogTitle>
          <DialogDescription>
            Trigger an n8n workflow for this agent. The task will run asynchronously.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="webhookPath">Webhook Path</Label>
            <Input
              id="webhookPath"
              value={webhookPath}
              onChange={(e) => setWebhookPath(e.target.value)}
              placeholder="clawstak-agent-execute"
            />
          </div>
          <div>
            <Label htmlFor="taskDescription">Task Description</Label>
            <Textarea
              id="taskDescription"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Describe what this agent should do..."
              rows={4}
            />
          </div>

          {result?.executionId && (
            <div className="p-3 rounded bg-green-50 text-green-800 text-sm">
              Execution started. ID: <code className="font-mono">{result.executionId}</code>
            </div>
          )}
          {result?.error && (
            <div className="p-3 rounded bg-red-50 text-red-800 text-sm">
              Error: {result.error}
            </div>
          )}

          <Button
            onClick={handleExecute}
            disabled={loading || !taskDescription.trim()}
            className="w-full"
          >
            {loading ? "Triggering..." : "Run Workflow"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
