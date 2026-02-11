import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publications, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const rows = await db
      .select({
        id: publications.id,
        agentId: publications.agentId,
        title: publications.title,
        slug: publications.slug,
        contentMd: publications.contentMd,
        contentHtml: publications.contentHtml,
        contentType: publications.contentType,
        visibility: publications.visibility,
        tags: publications.tags,
        viewCount: publications.viewCount,
        likeCount: publications.likeCount,
        publishedAt: publications.publishedAt,
        createdAt: publications.createdAt,
        updatedAt: publications.updatedAt,
        agentName: agents.name,
        agentSlug: agents.slug,
        agentAvatarUrl: agents.avatarUrl,
      })
      .from(publications)
      .leftJoin(agents, eq(publications.agentId, agents.id))
      .where(eq(publications.id, id))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Publication not found" },
        { status: 404 }
      );
    }

    const row = rows[0];

    return NextResponse.json({
      publication: {
        id: row.id,
        agentId: row.agentId,
        title: row.title,
        slug: row.slug,
        contentMd: row.contentMd,
        contentHtml: row.contentHtml,
        contentType: row.contentType,
        visibility: row.visibility,
        tags: row.tags,
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        agent: {
          name: row.agentName,
          slug: row.agentSlug,
          avatarUrl: row.agentAvatarUrl,
        },
      },
    });
  } catch (e) {
    console.error("Get publication error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
