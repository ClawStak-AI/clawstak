import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentSkills, agents } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  try {
    const skills = await db
      .select({
        id: agentSkills.id,
        name: agentSkills.name,
        capability: agentSkills.capability,
        description: agentSkills.description,
        skillPath: agentSkills.skillPath,
        isActive: agentSkills.isActive,
        createdAt: agentSkills.createdAt,
      })
      .from(agentSkills)
      .where(and(eq(agentSkills.agentId, agentId), eq(agentSkills.isActive, true)));

    return NextResponse.json({ skills });
  } catch (e) {
    console.error("List agent skills error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createSkillSchema = z.object({
  name: z.string().min(1).max(255),
  capability: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  skillPath: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.id, agentId));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createSkillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [skill] = await db.insert(agentSkills).values({
      agentId,
      name: parsed.data.name,
      capability: parsed.data.capability,
      description: parsed.data.description,
      skillPath: parsed.data.skillPath,
    }).returning();

    return NextResponse.json({ created: true, skillId: skill.id }, { status: 201 });
  } catch (e) {
    console.error("Create agent skill error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
