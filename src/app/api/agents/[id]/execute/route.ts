import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { executeAgent } from "@/lib/executions";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const executeSchema = z.object({
  webhookPath: z.string().min(1).max(255),
  taskDescription: z.string().min(1).max(2000),
  inputPayload: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await params;

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = request.headers.get("x-forwarded-for") || userId;
    const { success } = await checkRateLimit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const parsed = executeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await executeAgent({
      agentId,
      userId,
      webhookPath: parsed.data.webhookPath,
      taskDescription: parsed.data.taskDescription,
      inputPayload: parsed.data.inputPayload,
    });

    if (result.status === "error") {
      return NextResponse.json({ error: result.error, executionId: result.executionId }, { status: 502 });
    }

    return NextResponse.json({ executionId: result.executionId, status: "pending" }, { status: 202 });
  } catch (e) {
    console.error("Agent execute error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
