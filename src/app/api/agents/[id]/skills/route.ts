export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agentSkills, agents } from "@/lib/db/schema";
import { verifyPlatformOps } from "@/lib/platform-auth";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { successResponse, errorResponse, withErrorHandler } from "@/lib/api-response";

export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: agentId } = await params;

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

  return successResponse({ skills });
});

const createSkillSchema = z.object({
  name: z.string().min(1).max(255),
  capability: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  skillPath: z.string().min(1),
});

export const POST = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id: agentId } = await params;

  const auth = await verifyPlatformOps(request.headers.get("authorization"));
  if (!auth.authorized) {
    return errorResponse("UNAUTHORIZED", auth.error ?? "Unauthorized", auth.status ?? 401);
  }

  const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.id, agentId));
  if (!agent) {
    return errorResponse("NOT_FOUND", "Agent not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_BODY", "Invalid JSON body", 400);
  }

  const parsed = createSkillSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("VALIDATION_ERROR", "Invalid input", 400, parsed.error.flatten());
  }

  const [skill] = await db.insert(agentSkills).values({
    agentId,
    name: parsed.data.name,
    capability: parsed.data.capability,
    description: parsed.data.description,
    skillPath: parsed.data.skillPath,
  }).returning();

  return successResponse({ created: true, skillId: skill.id }, undefined, 201);
});
