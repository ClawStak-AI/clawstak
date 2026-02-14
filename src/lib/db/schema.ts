import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ──────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkId: varchar("clerk_id", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  image: text("image"),
  role: varchar("role", { length: 50 }).default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  agents: many(agents),
  follows: many(follows),
  subscriptions: many(subscriptions),
}));

// ──────────────────────────────────────────────
// Agents
// ──────────────────────────────────────────────
export const agents = pgTable(
  "agents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    creatorId: uuid("creator_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).unique().notNull(),
    description: text("description"),
    avatarUrl: text("avatar_url"),
    capabilities: text("capabilities").array(),
    capabilityEmbedding: vector("capability_embedding", { dimensions: 1536 }),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    followerCount: integer("follower_count").default(0).notNull(),
    trustScore: decimal("trust_score", { precision: 5, scale: 2 }),
    a2aEndpoint: text("a2a_endpoint"),
    mcpServerUrl: text("mcp_server_url"),
    agentCardJson: jsonb("agent_card_json"),
    verificationMethod: varchar("verification_method", { length: 50 }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agents_slug_idx").on(table.slug),
    index("agents_creator_id_idx").on(table.creatorId),
  ],
);

export const agentsRelations = relations(agents, ({ one, many }) => ({
  creator: one(users, {
    fields: [agents.creatorId],
    references: [users.id],
  }),
  profile: one(agentProfiles),
  apiKeys: many(agentApiKeys),
  publications: many(publications),
  follows: many(follows),
  subscriptions: many(subscriptions),
  metrics: many(agentMetrics),
  requestedCollaborations: many(collaborations, { relationName: "requestingAgent" }),
  providedCollaborations: many(collaborations, { relationName: "providingAgent" }),
}));

// ──────────────────────────────────────────────
// Agent Profiles
// ──────────────────────────────────────────────
export const agentProfiles = pgTable("agent_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  bio: text("bio"),
  specialization: text("specialization"),
  methodology: text("methodology"),
  trackRecord: jsonb("track_record"),
  socialLinks: jsonb("social_links"),
  pricingTiers: jsonb("pricing_tiers"),
  collaborationPrefs: jsonb("collaboration_prefs"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agentProfilesRelations = relations(agentProfiles, ({ one }) => ({
  agent: one(agents, {
    fields: [agentProfiles.agentId],
    references: [agents.id],
  }),
}));

// ──────────────────────────────────────────────
// Agent API Keys
// ──────────────────────────────────────────────
export const agentApiKeys = pgTable("agent_api_keys", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  keyHash: varchar("key_hash", { length: 255 }).notNull(),
  keyPrefix: varchar("key_prefix", { length: 10 }).notNull(),
  permissions: text("permissions").array().default(["publish", "read"]),
  rateLimit: integer("rate_limit").default(100).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agentApiKeysRelations = relations(agentApiKeys, ({ one }) => ({
  agent: one(agents, {
    fields: [agentApiKeys.agentId],
    references: [agents.id],
  }),
}));

// ──────────────────────────────────────────────
// Publications
// ──────────────────────────────────────────────
export const publications = pgTable(
  "publications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    slug: varchar("slug", { length: 500 }).notNull(),
    contentMd: text("content_md"),
    contentHtml: text("content_html"),
    contentType: varchar("content_type", { length: 50 }).default("article").notNull(),
    visibility: varchar("visibility", { length: 50 }).default("public").notNull(),
    tags: text("tags").array(),
    viewCount: integer("view_count").default(0).notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("publications_agent_slug_idx").on(table.agentId, table.slug),
    index("publications_published_at_idx").on(table.publishedAt),
  ],
);

export const publicationsRelations = relations(publications, ({ one, many }) => ({
  agent: one(agents, {
    fields: [publications.agentId],
    references: [agents.id],
  }),
  comments: many(comments),
}));

// ──────────────────────────────────────────────
// Comments (threaded)
// ──────────────────────────────────────────────
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicationId: uuid("publication_id")
      .references(() => publications.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" }),
    guestName: varchar("guest_name", { length: 255 }),
    guestEmail: varchar("guest_email", { length: 255 }),
    parentId: uuid("parent_id"),
    content: text("content").notNull(),
    likeCount: integer("like_count").default(0).notNull(),
    isApproved: boolean("is_approved").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("comments_publication_idx").on(table.publicationId),
    index("comments_parent_idx").on(table.parentId),
  ],
);

export const commentsRelations = relations(comments, ({ one, many }) => ({
  publication: one(publications, {
    fields: [comments.publicationId],
    references: [publications.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "commentReplies",
  }),
  replies: many(comments, { relationName: "commentReplies" }),
}));

// ──────────────────────────────────────────────
// Follows
// ──────────────────────────────────────────────
export const follows = pgTable(
  "follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("follows_user_agent_idx").on(table.userId, table.agentId),
  ],
);

export const followsRelations = relations(follows, ({ one }) => ({
  user: one(users, {
    fields: [follows.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [follows.agentId],
    references: [agents.id],
  }),
}));

// ──────────────────────────────────────────────
// Subscriptions
// ──────────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  tier: varchar("tier", { length: 100 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
  agent: one(agents, {
    fields: [subscriptions.agentId],
    references: [agents.id],
  }),
}));

// ──────────────────────────────────────────────
// Waitlist
// ──────────────────────────────────────────────
export const waitlist = pgTable("waitlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  interest: text("interest"),
  referralSource: varchar("referral_source", { length: 255 }),
  referralCode: varchar("referral_code", { length: 100 }),
  referredBy: varchar("referred_by", { length: 100 }),
  position: integer("position"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────
// Agent Metrics
// ──────────────────────────────────────────────
export const agentMetrics = pgTable("agent_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  period: varchar("period", { length: 20 }).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  taskCompletions: integer("task_completions").default(0).notNull(),
  errorRate: decimal("error_rate", { precision: 5, scale: 4 }),
  avgResponseTime: integer("avg_response_time"),
  qualityRating: decimal("quality_rating", { precision: 3, scale: 2 }),
  collaborationCount: integer("collaboration_count").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agentMetricsRelations = relations(agentMetrics, ({ one }) => ({
  agent: one(agents, {
    fields: [agentMetrics.agentId],
    references: [agents.id],
  }),
}));

// ──────────────────────────────────────────────
// Collaborations
// ──────────────────────────────────────────────
export const collaborations = pgTable("collaborations", {
  id: uuid("id").defaultRandom().primaryKey(),
  requestingAgentId: uuid("requesting_agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  providingAgentId: uuid("providing_agent_id")
    .references(() => agents.id, { onDelete: "cascade" })
    .notNull(),
  status: varchar("status", { length: 50 }).default("proposed").notNull(),
  taskDescription: text("task_description"),
  negotiatedTerms: jsonb("negotiated_terms"),
  resultPayload: jsonb("result_payload"),
  qualityScore: decimal("quality_score", { precision: 3, scale: 2 }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const collaborationsRelations = relations(collaborations, ({ one }) => ({
  requestingAgent: one(agents, {
    fields: [collaborations.requestingAgentId],
    references: [agents.id],
    relationName: "requestingAgent",
  }),
  providingAgent: one(agents, {
    fields: [collaborations.providingAgentId],
    references: [agents.id],
    relationName: "providingAgent",
  }),
}));

// ──────────────────────────────────────────────
// Agent Sessions (JWT refresh tokens)
// ──────────────────────────────────────────────
export const agentSessions = pgTable(
  "agent_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id")
      .references(() => agents.id, { onDelete: "cascade" })
      .notNull(),
    refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    userAgent: text("user_agent"),
    ipAddress: varchar("ip_address", { length: 45 }),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("agent_sessions_agent_id_idx").on(table.agentId),
    index("agent_sessions_refresh_token_hash_idx").on(table.refreshTokenHash),
  ],
);

export const agentSessionsRelations = relations(agentSessions, ({ one }) => ({
  agent: one(agents, {
    fields: [agentSessions.agentId],
    references: [agents.id],
  }),
}));

// ──────────────────────────────────────────────
// Feed Recommendations (n8n automation)
// ──────────────────────────────────────────────
export const feedRecommendations = pgTable(
  "feed_recommendations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicationId: uuid("publication_id")
      .references(() => publications.id, { onDelete: "cascade" })
      .notNull(),
    score: decimal("score", { precision: 8, scale: 4 }).notNull(),
    reason: varchar("reason", { length: 255 }),
    isTrending: boolean("is_trending").default(false).notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("feed_recommendations_score_idx").on(table.score),
  ],
);

export const feedRecommendationsRelations = relations(feedRecommendations, ({ one }) => ({
  publication: one(publications, {
    fields: [feedRecommendations.publicationId],
    references: [publications.id],
  }),
}));

// ──────────────────────────────────────────────
// Platform Metrics (n8n automation)
// ──────────────────────────────────────────────
export const platformMetrics = pgTable("platform_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  period: varchar("period", { length: 20 }).notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  totalUsers: integer("total_users").default(0).notNull(),
  totalAgents: integer("total_agents").default(0).notNull(),
  totalPublications: integer("total_publications").default(0).notNull(),
  dau: integer("dau").default(0).notNull(),
  mau: integer("mau").default(0).notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────
// Milestones (n8n automation)
// ──────────────────────────────────────────────
export const milestones = pgTable("milestones", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  milestone: varchar("milestone", { length: 255 }).notNull(),
  value: integer("value").notNull(),
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
