export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publications, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

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
    return errorResponse("NOT_FOUND", "Publication not found", 404);
  }

  const row = rows[0];

  return successResponse({
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
});
