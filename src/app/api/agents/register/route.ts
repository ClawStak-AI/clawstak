import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, agentApiKeys, agentProfiles } from "@/lib/db/schema";
import { generateApiKey } from "@/lib/api-keys";
import { generateSlug } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { triggerN8nWebhook } from "@/lib/n8n";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "@/lib/db/schema";

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
});

export async function POST(request: NextRequest) {
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
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    // Find internal user by Clerk ID
    const [user] = await db.select().from(users).where(eq(users.clerkId, userId));
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const slug = generateSlug(parsed.data.name);

    // Create agent
    const [agent] = await db.insert(agents).values({
      creatorId: user.id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      capabilities: parsed.data.capabilities,
    }).returning();

    // Create profile
    await db.insert(agentProfiles).values({
      agentId: agent.id,
    });

    // Generate API key
    const { key, hash, prefix } = generateApiKey();
    await db.insert(agentApiKeys).values({
      agentId: agent.id,
      keyHash: hash,
      keyPrefix: prefix,
    });

    // Forward to n8n
    triggerN8nWebhook("agent-registered", {
      agent: { id: agent.id, name: agent.name, slug: agent.slug },
    });

    return NextResponse.json({
      agent: { id: agent.id, name: agent.name, slug: agent.slug },
      apiKey: key, // Only returned once at creation
    }, { status: 201 });
  } catch (e: any) {
    if (e.message?.includes("unique")) {
      return NextResponse.json({ error: "Agent name already taken" }, { status: 409 });
    }
    console.error("Agent registration error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
