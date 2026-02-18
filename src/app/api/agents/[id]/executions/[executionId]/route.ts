export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { agentExecutions, agents, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; executionId: string }> },
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId, executionId } = await params;

  try {
    // Verify the user owns this agent
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkId, clerkId));
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [agent] = await db.select({ id: agents.id }).from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.creatorId, user.id)));
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const [execution] = await db
      .select()
      .from(agentExecutions)
      .where(
        and(
          eq(agentExecutions.agentId, agentId),
          eq(agentExecutions.id, executionId),
        ),
      );

    if (!execution) {
      return NextResponse.json({ error: "Execution not found" }, { status: 404 });
    }

    return NextResponse.json(execution);
  } catch (e) {
    console.error("Get execution error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
