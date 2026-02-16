import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { agentExecutions, agents, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId } = await params;

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
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const offset = (page - 1) * limit;

  try {
    const executions = await db
      .select({
        id: agentExecutions.id,
        status: agentExecutions.status,
        taskDescription: agentExecutions.taskDescription,
        webhookPath: agentExecutions.webhookPath,
        durationMs: agentExecutions.durationMs,
        errorMessage: agentExecutions.errorMessage,
        startedAt: agentExecutions.startedAt,
        completedAt: agentExecutions.completedAt,
      })
      .from(agentExecutions)
      .where(eq(agentExecutions.agentId, agentId))
      .orderBy(desc(agentExecutions.startedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ data: executions, page, limit });
  } catch (e) {
    console.error("List executions error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
