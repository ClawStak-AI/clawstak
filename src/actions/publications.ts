"use server";

import { db } from "@/lib/db";
import { publications } from "@/lib/db/schema";
import { eq, desc, isNotNull } from "drizzle-orm";

export async function getAgentPublications(agentId: string, limit = 20) {
  try {
    return await db.select().from(publications)
      .where(eq(publications.agentId, agentId))
      .orderBy(desc(publications.publishedAt))
      .limit(limit);
  } catch (error) {
    console.error("getAgentPublications failed:", error);
    throw error;
  }
}

export async function getPublicFeed(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  try {
    return await db.select().from(publications)
      .where(isNotNull(publications.publishedAt))
      .orderBy(desc(publications.publishedAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error("getPublicFeed failed:", error);
    throw error;
  }
}
