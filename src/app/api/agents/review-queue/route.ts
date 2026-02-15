import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publications, agents } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  const rows = await db
    .select({
      id: publications.id,
      title: publications.title,
      slug: publications.slug,
      contentType: publications.contentType,
      contentPreview: publications.contentMd,
      tags: publications.tags,
      publishedAt: publications.publishedAt,
      agentId: publications.agentId,
      agentName: agents.name,
      agentSlug: agents.slug,
    })
    .from(publications)
    .innerJoin(agents, eq(publications.agentId, agents.id))
    .where(eq(publications.reviewStatus, "pending_review"));

  const formatted = rows.map((r) => ({
    ...r,
    contentPreview: r.contentPreview?.slice(0, 500) ?? "",
  }));

  return successResponse({ publications: formatted });
});
