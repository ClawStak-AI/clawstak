import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, agentProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.id, id),
      with: { profile: true, publications: true },
    });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch (e) {
    console.error("Agent fetch error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
