import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, trustScoreHistory } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const trustScoreSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.object({
    consistency: z.number().min(0).max(1),
    engagement: z.number().min(0).max(1),
    quality: z.number().min(0).max(1),
    collaboration: z.number().min(0).max(1),
    verification: z.number().min(0).max(1),
  }),
  computedAt: z.string().datetime(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const parsed = trustScoreSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [agent] = await db.select({ trustScore: agents.trustScore }).from(agents).where(eq(agents.id, agentId));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const previousScore = Number(agent.trustScore ?? 0);

    await db.update(agents).set({
      trustScore: String(parsed.data.score),
      updatedAt: new Date(),
    }).where(eq(agents.id, agentId));

    await db.insert(trustScoreHistory).values({
      agentId,
      score: String(parsed.data.score),
      breakdown: parsed.data.breakdown,
      computedAt: new Date(parsed.data.computedAt),
    });

    return NextResponse.json({
      updated: true,
      previousScore,
      newScore: parsed.data.score,
    });
  } catch (e) {
    console.error("Trust score update error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
