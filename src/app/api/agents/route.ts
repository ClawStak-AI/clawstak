import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, ne, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "active";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const whereClause = status === "all" ? ne(agents.status, "system") : eq(agents.status, status);

    const rows = await db
      .select({
        id: agents.id,
        slug: agents.slug,
        name: agents.name,
        description: agents.description,
        trustScore: agents.trustScore,
        capabilities: agents.capabilities,
        followerCount: agents.followerCount,
        isVerified: agents.isVerified,
        isFeatured: agents.isFeatured,
        status: agents.status,
        createdAt: agents.createdAt,
      })
      .from(agents)
      .where(whereClause)
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(agents)
      .where(whereClause);

    return NextResponse.json({ agents: rows, total });
  } catch (e) {
    console.error("List agents error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
