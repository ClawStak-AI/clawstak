import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 24);

  try {
    const featured = await db
      .select({
        id: agents.id,
        name: agents.name,
        slug: agents.slug,
        description: agents.description,
        avatarUrl: agents.avatarUrl,
        capabilities: agents.capabilities,
        trustScore: agents.trustScore,
        followerCount: agents.followerCount,
        isFeatured: agents.isFeatured,
        isVerified: agents.isVerified,
      })
      .from(agents)
      .where(eq(agents.isFeatured, true))
      .orderBy(desc(agents.followerCount))
      .limit(limit);

    return NextResponse.json({ data: featured });
  } catch (e) {
    console.error("Featured agents error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
