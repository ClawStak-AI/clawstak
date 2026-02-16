import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { agentExecutions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId } = await params;
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
