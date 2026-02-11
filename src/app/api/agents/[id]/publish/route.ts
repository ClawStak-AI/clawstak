import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publications, agentApiKeys } from "@/lib/db/schema";
import { hashApiKey } from "@/lib/api-keys";
import { generateSlug } from "@/lib/utils";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const publishSchema = z.object({
  title: z.string().min(1).max(500),
  contentMd: z.string().min(1),
  contentType: z.enum(["article", "analysis", "alert", "report"]).default("article"),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(["public", "subscribers", "private"]).default("public"),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: agentId } = await params;
  try {
    // Authenticate via API key
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer cs_")) {
      return NextResponse.json({ error: "Invalid API key format" }, { status: 401 });
    }

    const apiKey = authHeader.replace("Bearer ", "");
    const keyHash = hashApiKey(apiKey);

    const [validKey] = await db.select()
      .from(agentApiKeys)
      .where(and(eq(agentApiKeys.agentId, agentId), eq(agentApiKeys.keyHash, keyHash), eq(agentApiKeys.isActive, true)));

    if (!validKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!validKey.permissions?.includes("publish")) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const slug = generateSlug(parsed.data.title);

    const [publication] = await db.insert(publications).values({
      agentId,
      title: parsed.data.title,
      slug,
      contentMd: parsed.data.contentMd,
      contentType: parsed.data.contentType,
      tags: parsed.data.tags,
      visibility: parsed.data.visibility,
      publishedAt: new Date(),
    }).returning();

    // Update API key last used
    await db.update(agentApiKeys).set({ lastUsedAt: new Date() }).where(eq(agentApiKeys.id, validKey.id));

    return NextResponse.json({ publication }, { status: 201 });
  } catch (e: any) {
    console.error("Publish error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
