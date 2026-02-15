"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CollaborationCard } from "@/components/collaborations/collaboration-card";
import { agentFetch } from "@/lib/agent-session";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface CollaborationAgent {
  id: string;
  name: string;
  slug: string;
}

interface CollaborationRow {
  id: string;
  requestingAgentId: string;
  providingAgentId: string;
  status: string;
  taskDescription: string | null;
  qualityScore: string | null;
  completedAt: string | null;
  createdAt: string;
  requestingAgent?: CollaborationAgent;
  providingAgent?: CollaborationAgent;
}

interface CollaborationListProps {
  agentId: string;
}

type TabValue = "active" | "proposed" | "completed";

// ──────────────────────────────────────────────
// CollaborationList Component
// ──────────────────────────────────────────────

export function CollaborationList({ agentId }: CollaborationListProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("active");
  const [collaborations, setCollaborations] = useState<Record<TabValue, CollaborationRow[]>>({
    active: [],
    proposed: [],
    completed: [],
  });
  const [loading, setLoading] = useState<Record<TabValue, boolean>>({
    active: true,
    proposed: true,
    completed: true,
  });
  const [agentNames, setAgentNames] = useState<Map<string, { name: string; slug: string }>>(new Map());

  const fetchCollaborations = useCallback(async (status: TabValue) => {
    setLoading((prev) => ({ ...prev, [status]: true }));
    try {
      const res = await agentFetch(
        `/api/collaborations?agentId=${encodeURIComponent(agentId)}&status=${status}&limit=20`
      );
      if (res.ok) {
        const json = await res.json();
        const rows = (json.data ?? []) as CollaborationRow[];

        // Collect unknown agent IDs to resolve names
        const unknownIds = new Set<string>();
        for (const row of rows) {
          if (!agentNames.has(row.requestingAgentId)) unknownIds.add(row.requestingAgentId);
          if (!agentNames.has(row.providingAgentId)) unknownIds.add(row.providingAgentId);
        }

        // Resolve agent names by fetching individual collaboration details
        if (unknownIds.size > 0) {
          const newNames = new Map(agentNames);
          for (const row of rows) {
            try {
              const detailRes = await agentFetch(`/api/collaborations/${row.id}`);
              if (detailRes.ok) {
                const detailJson = await detailRes.json();
                const detail = detailJson.data;
                if (detail?.requestingAgent) {
                  newNames.set(detail.requestingAgent.id, {
                    name: detail.requestingAgent.name,
                    slug: detail.requestingAgent.slug,
                  });
                }
                if (detail?.providingAgent) {
                  newNames.set(detail.providingAgent.id, {
                    name: detail.providingAgent.name,
                    slug: detail.providingAgent.slug,
                  });
                }
              }
            } catch {
              // Skip individual failures
            }
          }
          setAgentNames(newNames);
        }

        setCollaborations((prev) => ({ ...prev, [status]: rows }));
      }
    } catch {
      // Fetch failed — keep empty state
    } finally {
      setLoading((prev) => ({ ...prev, [status]: false }));
    }
  }, [agentId, agentNames]);

  // Fetch all tabs on mount
  useEffect(() => {
    void fetchCollaborations("active");
    void fetchCollaborations("proposed");
    void fetchCollaborations("completed");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  function getAgentInfo(id: string): { name: string; slug: string } {
    return agentNames.get(id) ?? { name: "Unknown Agent", slug: "" };
  }

  const counts = {
    active: collaborations.active.length,
    proposed: collaborations.proposed.length,
    completed: collaborations.completed.length,
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as TabValue)}
      className="w-full"
    >
      <TabsList className="w-full justify-start">
        <TabsTrigger value="active" className="gap-1.5">
          Active
          {counts.active > 0 && (
            <span className="rounded-full bg-blue-100 text-blue-800 px-1.5 py-0.5 text-[10px] font-medium">
              {counts.active}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="proposed" className="gap-1.5">
          Proposed
          {counts.proposed > 0 && (
            <span className="rounded-full bg-yellow-100 text-yellow-800 px-1.5 py-0.5 text-[10px] font-medium">
              {counts.proposed}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="completed" className="gap-1.5">
          Completed
          {counts.completed > 0 && (
            <span className="rounded-full bg-green-100 text-green-800 px-1.5 py-0.5 text-[10px] font-medium">
              {counts.completed}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {(["active", "proposed", "completed"] as const).map((tab) => (
        <TabsContent key={tab} value={tab} className="mt-4">
          {loading[tab] ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone/20 border-t-light-blue" />
            </div>
          ) : collaborations[tab].length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-stone/50 font-light">
                No {tab} collaborations
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {collaborations[tab].map((collab) => {
                const requesting = getAgentInfo(collab.requestingAgentId);
                const providing = getAgentInfo(collab.providingAgentId);
                return (
                  <CollaborationCard
                    key={collab.id}
                    id={collab.id}
                    status={collab.status}
                    taskDescription={collab.taskDescription}
                    qualityScore={collab.qualityScore}
                    requestingAgentName={requesting.name}
                    requestingAgentSlug={requesting.slug}
                    providingAgentName={providing.name}
                    providingAgentSlug={providing.slug}
                    completedAt={collab.completedAt}
                    createdAt={collab.createdAt}
                  />
                );
              })}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
