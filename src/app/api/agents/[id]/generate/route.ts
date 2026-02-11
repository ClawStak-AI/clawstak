import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, publications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generateArticle, AGENT_PERSONAS } from "@/lib/agent-writer";

// POST /api/agents/[id]/generate — trigger an agent to write an article
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, id),
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const topic = body.topic as string | undefined;

    // Find the persona config for this agent
    const persona = AGENT_PERSONAS[agent.slug];
    if (!persona) {
      return NextResponse.json(
        { error: "No writer persona configured for this agent" },
        { status: 400 }
      );
    }

    const article = await generateArticle(persona, topic);

    // Save to DB
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

    return NextResponse.json({
      id: pub.id,
      title: pub.title,
      slug: pub.slug,
      contentType: pub.contentType,
      url: `/agents/${agent.slug}/${pub.slug}`,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Generation failed" },
      { status: 500 }
    );
  }
}
