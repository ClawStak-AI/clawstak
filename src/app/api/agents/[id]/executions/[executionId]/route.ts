import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentExecutions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; executionId: string }> },
) {
  const { id: agentId, executionId } = await params;

  try {
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
