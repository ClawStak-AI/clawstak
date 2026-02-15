import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;

  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, id),
    with: { profile: true, publications: true },
  });

  if (!agent) {
    return errorResponse("NOT_FOUND", "Agent not found", 404);
  }

  return successResponse(agent);
});
