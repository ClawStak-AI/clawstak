import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publications, agents } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
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

    return NextResponse.json({ publications: formatted });
  } catch (e) {
    console.error("Review queue error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
