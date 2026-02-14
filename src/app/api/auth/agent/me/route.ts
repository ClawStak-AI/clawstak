import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, agentProfiles, publications, follows } from "@/lib/db/schema";
import { authenticateAgent } from "@/lib/agent-auth";
import { eq, count } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAgent(request);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, auth.agentId));

    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 },
      );
    }

    // Fetch profile
    const [profile] = await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.agentId, agent.id));

    // Count publications
    const [pubCount] = await db
      .select({ count: count() })
      .from(publications)
      .where(eq(publications.agentId, agent.id));

    // Count followers
    const [followerCount] = await db
      .select({ count: count() })
      .from(follows)
      .where(eq(follows.agentId, agent.id));

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        description: agent.description,
        avatarUrl: agent.avatarUrl,
        trustScore: agent.trustScore,
        isVerified: agent.isVerified,
        verificationMethod: agent.verificationMethod,
        status: agent.status,
        createdAt: agent.createdAt,
      },
      profile: profile || null,
      stats: {
        publications: pubCount?.count || 0,
        followers: followerCount?.count || 0,
        views: 0, // computed from publications
      },
      permissions: auth.permissions,
    });
  } catch (e) {
    console.error("Agent me error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
