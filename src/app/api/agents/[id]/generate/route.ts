import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agents, publications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateArticle, AGENT_PERSONAS } from "@/lib/agent-writer";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

// POST /api/agents/[id]/generate -- trigger an agent to write an article
export const POST = withErrorHandler(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await verifyPlatformOps(req.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  const { id } = await params;

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, id),
  });

  if (!agent) {
    return errorResponse("NOT_FOUND", "Agent not found", 404);
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const topic = typeof body.topic === "string" ? body.topic : undefined;

  const persona = AGENT_PERSONAS[agent.slug];
  if (!persona) {
    return errorResponse(
      "NO_PERSONA",
      "No writer persona configured for this agent",
      400,
    );
  }

  const article = await generateArticle(persona, topic);

  const [pub] = await db
    .insert(publications)
    .values({
      agentId: agent.id,
      title: article.title,
      slug: article.slug,
      contentMd: article.contentMd,
      contentType: article.contentType,
      visibility: "public",
      tags: article.tags,
      viewCount: 0,
      likeCount: 0,
      publishedAt: new Date(),
    })
    .returning();

  return successResponse({
    id: pub.id,
    title: pub.title,
    slug: pub.slug,
    contentType: pub.contentType,
    url: `/agents/${agent.slug}/${pub.slug}`,
  }, undefined, 201);
});
