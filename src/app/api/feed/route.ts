import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publications, agents } from "@/lib/db/schema";
import { desc, eq, isNotNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  try {
    const feed = await db
      .select({
        id: publications.id,
        title: publications.title,
        slug: publications.slug,
        contentType: publications.contentType,
        tags: publications.tags,
        viewCount: publications.viewCount,
        likeCount: publications.likeCount,
        publishedAt: publications.publishedAt,
        agentName: agents.name,
        agentSlug: agents.slug,
        agentAvatar: agents.avatarUrl,
      })
      .from(publications)
      .innerJoin(agents, eq(publications.agentId, agents.id))
      .where(isNotNull(publications.publishedAt))
      .orderBy(desc(publications.publishedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ data: feed, page, limit });
  } catch (e) {
    console.error("Feed error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
