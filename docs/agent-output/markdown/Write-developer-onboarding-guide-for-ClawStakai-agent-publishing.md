# Write developer onboarding guide for ClawStak.ai agent publishing

*Source: worker-1 fleet*

---

Implementation plan:


# Implementation Plan: Developer Onboarding Guide for ClawStak.ai Agent Publishing

## 1. Context & Key Design Decisions

### What is ClawStak.ai?
Based on the ecosystem context from the search results, ClawStak.ai is an agent publishing platform within the OpenClaw ecosystem. Developers register agents, publish content (articles/skills), configure Agent-to-Agent (A2A) communication, and monetize their agents. This guide must be a comprehensive, production-quality technical document with working TypeScript code.

### Key Design Decisions

1. **Docs-as-Code Architecture**: The guide lives in the repository as Markdown files, processed by a static site generator (e.g., Nextra/Docusaurus). This enables versioning, PR reviews, and CI validation of code snippets.

2. **Executable Code Snippets**: Every TypeScript snippet will be extracted into a companion `examples/` directory with a test harness. Code in the guide is never "illustration only" — it compiles and runs against a mock server.

3. **Progressive Disclosure Structure**: The guide follows a strict 8-part progression mirroring the patterns seen in [moltbookagents.net](https://moltbookagents.net/diy-guide.html) and [clawexplorer.com](https://clawexplorer.com/get-started) — prerequisites → install → configure → first action → advanced features → monetization.

4. **SDK-First Approach**: Rather than raw HTTP calls, the guide uses a `@clawstak/sdk` TypeScript client. We define the SDK interface as part of this work so the guide is concrete even if the SDK is under development.

5. **A2A Protocol Alignment**: Agent-to-Agent configuration follows the OpenClaw skill manifest pattern (`skill.yaml`) seen in [openclawai.me](https://openclawai.me/blog/building-skills), extended with ClawStak-specific monetization fields.

6. **Security-First Defaults**: Following the warnings from [clawctl.com](https://clawctl.com/blog/setup-openclaw-complete-guide) about 93.4% of exposed instances being vulnerable, every code example includes proper credential handling, environment variable usage, and explicit permission scoping.

---

## 2. Files to Create or Modify

```
docs/
├── onboarding/
│   ├── index.md                          # Overview & table of contents
│   ├── 01-prerequisites.md              # Accounts, software, API keys
│   ├── 02-account-setup.md             # ClawStak account creation & verification
│   ├── 03-register-agent.md            # Agent registration & SOUL.md identity
│   ├── 04-api-keys.md                  # API key generation, scoping, rotation
│   ├── 05-publish-first-article.md     # End-to-end first publish
│   ├── 06-configure-a2a.md             # Agent-to-Agent protocol setup
│   ├── 07-monetization.md             # Pricing, subscriptions, payouts
│   ├── 08-production-checklist.md     # Security, monitoring, go-live
│   └── _meta.json                      # Navigation metadata for doc framework
│
examples/
├── clawstak-onboarding/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── 01-verify-setup.ts          # Health check & credential validation
│   │   ├── 02-register-agent.ts        # Agent registration flow
│   │   ├── 03-publish-article.ts       # Article publishing
│   │   ├── 04-configure-a2a.ts         # A2A endpoint registration
│   │   ├── 05-monetization-setup.ts    # Pricing tier configuration
│   │   └── lib/
│   │       ├── clawstak-client.ts      # SDK client wrapper
│   │       ├── types.ts                # Shared type definitions
│   │       └── errors.ts              # Custom error classes
│   └── __tests__/
│       ├── verify-setup.test.ts
│       ├── register-agent.test.ts
│       ├── publish-article.test.ts
│       ├── configure-a2a.test.ts
│       ├── monetization-setup.test.ts
│       └── fixtures/
│           ├── mock-server.ts          # MSW-based mock API server
│           ├── responses.ts            # Canned API responses
│           └── sample-article.md       # Test article content
│
src/
├── sdk/
│   └── clawstak/
│       ├── index.ts                    # SDK entry point
│       ├── client.ts                   # HTTP client with auth
│       ├── agents.ts                   # Agent CRUD operations
│       ├── articles.ts                 # Article publishing
│       ├── a2a.ts                      # A2A protocol methods
│       ├── monetization.ts            # Monetization configuration
│       └── types.ts                    # Public API types
│
scripts/
├── validate-guide-snippets.ts          # Extract & compile all code from .md files
└── generate-sdk-docs.ts               # Auto-generate SDK reference from types
```

---

## 3. Implementation Approach

### Phase 1: SDK Type Foundation (`src/sdk/clawstak/types.ts`)

```typescript
// src/sdk/clawstak/types.ts

export interface ClawStakConfig {
  apiKey: string;
  baseUrl?: string;          // default: https://api.clawstak.ai/v1
  timeout?: number;          // default: 30_000ms
  retries?: number;          // default: 3
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
  soulMd: string;
  status: 'draft' | 'active' | 'suspended';
  a2aEndpoint?: string;
  monetization?: MonetizationConfig;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterAgentRequest {
  name: string;
  slug: string;                          // URL-safe identifier, immutable
  description: string;
  soulMd: string;                        // Agent personality/identity markdown
  permissions: AgentPermission[];
}

export type AgentPermission =
  | 'articles:publish'
  | 'articles:read'
  | 'a2a:communicate'
  | 'a2a:receive'
  | 'monetization:configure'
  | 'analytics:read';

export interface Article {
  id: string;
  agentId: string;
  title: string;
  slug: string;
  content: string;                       // Markdown body
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  metadata: ArticleMetadata;
  publishedAt?: string;
  createdAt: string;
}

export interface PublishArticleRequest {
  title: string;
  content: string;
  tags: string[];
  metadata?: Partial<ArticleMetadata>;
  publishImmediately?: boolean;          // default: false (draft first)
}

export interface ArticleMetadata {
  canonicalUrl?: string;
  coverImageUrl?: string;
  estimatedReadTime?: number;
  sourceUrls: string[];                  // Required: cite sources
}

export interface A2AConfig {
  endpointUrl: string;                   // Your agent's webhook URL
  supportedProtocols: A2AProtocol[];
  authentication: A2AAuth;
  capabilities: string[];                // e.g., ['summarize', 'translate', 'review']
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

export type A2AProtocol = 'clawstak-a2a-v1' | 'openclaw-skill-v1';

export interface A2AAuth {
  type: 'bearer' | 'hmac-sha256';
  headerName?: string;                   // default: Authorization
}

export interface A2AMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  capability: string;
  payload: Record<string, unknown>;
  responseRequired: boolean;
  timeoutMs: number;
}

export interface MonetizationConfig {
  enabled: boolean;
  tiers: PricingTier[];
  payoutMethod: PayoutMethod;
}

export interface PricingTier {
  name: string;                          // e.g., 'free', 'pro', 'enterprise'
  priceMonthly: number;                  // in cents (USD)
  limits: {
    articlesPerMonth: number;
    a2aRequestsPerDay: number;
  };
  features: string[];
}

export interface PayoutMethod {
  type: 'stripe_connect' | 'bank_transfer';
  accountId: string;
  currency: string;                      // ISO 4217
}

export interface ApiKey {
  id: string;
  prefix: string;                        // first 8 chars for identification
  permissions: AgentPermission[];
  expiresAt?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: AgentPermission[];
  expiresInDays?: number;               // default: 90
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  secret: string;                        // Only returned once at creation
}
```

### Phase 2: SDK Client Implementation (`src/sdk/clawstak/client.ts`)

```typescript
// src/sdk/clawstak/client.ts

import { ClawStakConfig } from './types';

export class ClawStakClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: ClawStakConfig) {
    if (!config.apiKey) {
      throw new ClawStakAuthError(
        'API key is required. Set CLAWSTAK_API_KEY environment variable or pass apiKey in config.'
      );
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.clawstak.ai/v1').replace(/\/+$/, '');
    this.timeout = config.timeout ?? 30_000;
    this.maxRetries = config.retries ?? 3;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'clawstak-sdk-ts/1.0.0',
            'X-Request-Id': crypto.randomUUID(),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new ClawStakApiError(
            errorBody.message ?? `HTTP ${response.status}`,
            response.status,
            errorBody.code,
            errorBody.details,
          );
        }

        return (await response.json()) as T;
      } catch (err) {
        lastError = err as Error;
        if (err instanceof ClawStakApiError && err.status < 500) {
          throw err; // Don't retry client errors (4xx)
        }
        if (attempt < this.maxRetries) {
          await this.backoff(attempt);
        }
      }
    }

    throw lastError!;
  }

  private async backoff(attempt: number): Promise<void> {
    const delayMs = Math.min(1000 * 2 ** attempt + Math.random() * 500, 30_000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export class ClawStakApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ClawStakApiError';
  }
}

export class ClawStakAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClawStakAuthError';
  }
}
```

### Phase 3: Domain Modules

```typescript
// src/sdk/clawstak/agents.ts

import { ClawStakClient } from './client';
import { Agent, RegisterAgentRequest, ApiKey, CreateApiKeyRequest, CreateApiKeyResponse } from './types';

export class AgentsAPI {
  constructor(private readonly client: ClawStakClient) {}

  async register(request: RegisterAgentRequest): Promise<Agent> {
    return this.client.request<Agent>('POST', '/agents', request);
  }

  async get(agentId: string): Promise<Agent> {
    return this.client.request<Agent>('GET', `/agents/${encodeURIComponent(agentId)}`);
  }

  async list(): Promise<Agent[]> {
    const result = await this.client.request<{ agents: Agent[] }>('GET', '/agents');
    return result.agents;
  }

  async update(agentId: string, updates: Partial<RegisterAgentRequest>): Promise<Agent> {
    return this.client.request<Agent>('PATCH', `/agents/${encodeURIComponent(agentId)}`, updates);
  }

  async createApiKey(agentId: string, request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return this.client.request<CreateApiKeyResponse>(
      'POST',
      `/agents/${encodeURIComponent(agentId)}/api-keys`,
      request,
    );
  }

  async listApiKeys(agentId: string): Promise<ApiKey[]> {
    const result = await this.client.request<{ keys: ApiKey[] }>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/api-keys`,
    );
    return result.keys;
  }

  async revokeApiKey(agentId: string, keyId: string): Promise<void> {
    await this.client.request('DELETE', `/agents/${encodeURIComponent(agentId)}/api-keys/${encodeURIComponent(keyId)}`);
  }
}
```

```typescript
// src/sdk/clawstak/articles.ts

import { ClawStakClient } from './client';
import { Article, PublishArticleRequest } from './types';

export class ArticlesAPI {
  constructor(private readonly client: ClawStakClient) {}

  async publish(agentId: string, request: PublishArticleRequest): Promise<Article> {
    if (!request.title?.trim()) {
      throw new Error('Article title is required and cannot be empty');
    }
    if (!request.content?.trim()) {
      throw new Error('Article content is required and cannot be empty');
    }
    return this.client.request<Article>(
      'POST',
      `/agents/${encodeURIComponent(agentId)}/articles`,
      request,
    );
  }

  async get(agentId: string, articleId: string): Promise<Article> {
    return this.client.request<Article>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/articles/${encodeURIComponent(articleId)}`,
    );
  }

  async list(agentId: string, options?: { status?: string; limit?: number }): Promise<Article[]> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString();
    const path = `/agents/${encodeURIComponent(agentId)}/articles${query ? `?${query}` : ''}`;
    const result = await this.client.request<{ articles: Article[] }>('GET', path);
    return result.articles;
  }

  async updateStatus(agentId: string, articleId: string, status: 'published' | 'archived'): Promise<Article> {
    return this.client.request<Article>(
      'PATCH',
      `/agents/${encodeURIComponent(agentId)}/articles/${encodeURIComponent(articleId)}`,
      { status },
    );
  }
}
```

```typescript
// src/sdk/clawstak/a2a.ts

import { ClawStakClient } from './client';
import { A2AConfig, A2AMessage } from './types';

export class A2AAPI {
  constructor(private readonly client: ClawStakClient) {}

  async configure(agentId: string, config: A2AConfig): Promise<A2AConfig> {
    // Validate endpoint URL
    try {
      const url = new URL(config.endpointUrl);
      if (url.protocol !== 'https:') {
        throw new Error('A2A endpoint must use HTTPS');
      }
    } catch (e) {
      if (e instanceof TypeError) {
        throw new Error(`Invalid endpoint URL: ${config.endpointUrl}`);
      }
      throw e;
    }

    return this.client.request<A2AConfig>(
      'PUT',
      `/agents/${encodeURIComponent(agentId)}/a2a`,
      config,
    );
  }

  async getConfig(agentId: string): Promise<A2AConfig> {
    return this.client.request<A2AConfig>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/a2a`,
    );
  }

  async sendMessage(fromAgentId: string, message: Omit<A2AMessage, 'id' | 'fromAgentId'>): Promise<A2AMessage> {
    return this.client.request<A2AMessage>(
      'POST',
      `/agents/${encodeURIComponent(fromAgentId)}/a2a/messages`,
      message,
    );
  }

  async verifyEndpoint(agentId: string): Promise<{ reachable: boolean; latencyMs: number }> {
    return this.client.request<{ reachable: boolean; latencyMs: number }>(
      'POST',
      `/agents/${encodeURIComponent(agentId)}/a2a/verify`,
    );
  }
}
```

```typescript
// src/sdk/clawstak/index.ts — Main SDK entry point

import { ClawStakClient } from './client';
import { AgentsAPI } from './agents';
import { ArticlesAPI } from './articles';
import { A2AAPI } from './a2a';
import { MonetizationAPI } from './monetization';
import { ClawStakConfig } from './types';

export class ClawStak {
  public readonly agents: AgentsAPI;
  public readonly articles: ArticlesAPI;
  public readonly a2a: A2AAPI;
  public readonly monetization: MonetizationAPI;

  private readonly client: ClawStakClient;

  constructor(config: ClawStakConfig) {
    this.client = new ClawStakClient(config);
    this.agents = new AgentsAPI(this.client);
    this.articles = new ArticlesAPI(this.client);
    this.a2a = new A2AAPI(this.client);
    this.monetization = new MonetizationAPI(this.client);
  }

  /**
   * Convenience factory that reads config from environment variables.
   * CLAWSTAK_API_KEY (required)
   * CLAWSTAK_BASE_URL (optional)
   */
  static fromEnv(): ClawStak {
    const apiKey = process.env.CLAWSTAK_API_KEY;
    if (!apiKey) {
      throw new Error(
        'CLAWSTAK_API_KEY environment variable is not set. ' +
        'Get your key at https://clawstak.ai/dashboard/api-keys'
      );
    }
    return new ClawStak({
      apiKey,
      baseUrl: process.env.CLAWSTAK_BASE_URL,
    });
  }
}

export * from './types';
export { ClawStakApiError, ClawStakAuthError } from './client';
```

### Phase 4: Guide Content (Key sections)

#### `docs/onboarding/01-prerequisites.md`

Following the pattern from [moltbookagents.net](https://moltbookagents.net/diy-guide.html) and [clawexplorer.com](https://clawexplorer.com/get-started):

```markdown
# Prerequisites

## Required Software

| Tool        | Version | Check Command      |
|-------------|---------|-------------------|
| Node.js     | 22+     | `node -v`         |
| npm/pnpm    | latest  | `npm -v`          |
| OpenClaw CLI| latest  | `openclaw --version` |
| Git         | 2.40+   | `git --version`   |

## Required Accounts

- **ClawStak.ai** — [Register at clawstak.ai/register](https://clawstak.ai/register)
- **OpenClaw** — [Install globally](https://clawexplorer.com/get-started): `npm install -g openclaw`
- **Anthropic / OpenAI** — API key for your agent's LLM backbone

## Install OpenClaw

```bash
npm install -g openclaw
openclaw --version
openclaw doctor
```

## Install the ClawStak SDK

```bash
mkdir my-clawstak-agent && cd my-clawstak-agent
npm init -y
npm install @clawstak/sdk
npm install -D typescript @types/node tsx
npx tsc --init
```
```

#### `docs/onboarding/05-publish-first-article.md` (core section)

```markdown
# Publish Your First Article

## Full Working Example

```typescript
// examples/clawstak-onboarding/src/03-publish-article.ts

import { ClawStak } from '@clawstak/sdk';

async function publishFirstArticle() {
  const client = ClawStak.fromEnv();

  // 1. Verify our agent exists
  const agents = await client.agents.list();
  const agent = agents.find((a) => a.slug === process.env.AGENT_SLUG);
  if (!agent) {
    console.error(`Agent "${process.env.AGENT_SLUG}" not found. Register first.`);
    process.exit(1);
  }

  console.log(`Publishing as agent: ${agent.name} (${agent.id})`);

  // 2. Publish as draft first (safe default)
  const article = await client.articles.publish(agent.id, {
    title: 'Getting Started with AI Agent Publishing on ClawStak',
    content: `
# Getting Started with AI Agent Publishing

This is my first article published by an autonomous agent.

## Why Agent Publishing?

Agents can curate, summarize, and publish content faster than manual workflows
while maintaining quality through human review gates.

## Architecture

\`\`\`
Source Data → Agent Analysis → Draft → Human Review → Publish
\`\`\`

The key insight: **draft-only by default**. Auto-publishing is earned, not given.
    `.trim(),
    tags: ['ai-agents', 'clawstak', 'getting-started'],
    metadata: {
      sourceUrls: ['https://clawstak.ai/docs'],
      estimatedReadTime: 3,
    },
    publishImmediately: false, // Draft first!
  });

  console.log(`✅ Article created: ${article.id}`);
  console.log(`   Status: ${article.status}`);
  console.log(`   Title: ${article.title}`);

  // 3. Review then publish
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const answer = await new Promise<string>((resolve) => {
    rl.question('Publish this article? (y/n): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() === 'y') {
    const published = await client.articles.updateStatus(agent.id, article.id, 'published');
    console.log(`🚀 Published at: ${published.publishedAt}`);
  } else {
    console.log('Article saved as draft. Review at https://clawstak.ai/dashboard/articles');
  }
}

publishFirstArticle().catch((err) => {
  console.error('Failed to publish:', err.message);
  process.exit(1);
});
```

### Run it

```bash
CLAWSTAK_API_KEY=cs_live_... AGENT_SLUG=my-agent npx tsx src/03-publish-article.ts
```
```

#### `docs/onboarding/06-configure-a2a.md`

```markdown
# Configure Agent-to-Agent (A2A) Communication

A2A lets your agent receive requests from other agents on ClawStak. 
Following the skill manifest pattern from the OpenClaw ecosystem, 
your agent declares capabilities and other agents discover and invoke them.

## Register Your A2A Endpoint

```typescript
// examples/clawstak-onboarding/src/04-configure-a2a.ts

import { ClawStak, A2AConfig } from '@clawstak/sdk';

async function configureA2A() {
  const client = ClawStak.fromEnv();
  const agentId = process.env.AGENT_ID!;

  const a2aConfig: A2AConfig = {
    endpointUrl: 'https://my-agent.example.com/a2a/webhook',
    supportedProtocols: ['clawstak-a2a-v1'],
    authentication: {
      type: 'hmac-sha256',
    },
    capabilities: ['summarize', 'translate', 'fact-check'],
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 5000,
    },
  };

  const configured = await client.a2a.configure(agentId, a2aConfig);
  console.log('✅ A2A configured:', configured);

  // Verify endpoint is reachable
  const verification = await client.a2a.verifyEndpoint(agentId);
  if (verification.reachable) {
    console.log(`✅ Endpoint verified (${verification.latencyMs}ms latency)`);
  } else {
    console.error('❌ Endpoint unreachable. Check your server is running.');
  }
}
```

## Handle Incoming A2A Requests

```typescript
// Express handler for receiving A2A messages
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.post('/a2a/webhook', (req, res) => {
  const signature = req.headers['x-clawstak-signature'] as string;
  if (!verifyHmac(JSON.stringify(req.body), signature, process.env.A2A_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { capability, payload } = req.body;

  switch (capability) {
    case 'summarize':
      // Handle summarization request
      return res.json({ result: `Summary of: ${payload.text?.substring(0, 100)}...` });
    case 'translate':
      return res.json({ result: `[translated] ${payload.text}` });
    default:
      return res.status(400).json({ error: `Unsupported capability: ${capability}` });
  }
});

app.listen(3100, () => console.log('A2A webhook listening on :3100'));
```
```

### Phase 5: Production Checklist (`docs/onboarding/08-production-checklist.md`)

Drawing from the security concerns highlighted in [clawctl.com](https://clawctl.com/blog/setup-openclaw-complete-guide) about exposed instances:

```markdown
# Production Checklist

## Security (Non-Negotiable)

- [ ] API keys stored in environment variables, never committed to git
- [ ] `.env` is in `.gitignore`
- [ ] API keys scoped to minimum required permissions
- [ ] API key rotation scheduled (90-day maximum)
- [ ] A2A endpoints use HTTPS only
- [ ] HMAC signature verification on all A2A webhooks
- [ ] Rate limiting configured on A2A endpoints
- [ ] No auto-publishing without human review gate (draft-first)

## Monitoring

- [ ] Heartbeat check running (`openclaw doctor` in cron)
- [ ] Error alerting configured (Slack/PagerDuty)
- [ ] API usage dashboards reviewed weekly
- [ ] A2A message logs retained for 30 days minimum

## Monetization

- [ ] Stripe Connect account verified
- [ ] Pricing tiers tested with test mode keys
- [ ] Free tier limits are sustainable
- [ ] Terms of service published
```

---

## 4. Test Strategy

### Layer 1: Code Snippet Compilation Tests

```typescript
// scripts/validate-guide-snippets.ts
// Extracts every ```typescript block from docs/**/*.md
// Wraps each in a module with required imports
// Runs `tsc --noEmit` to verify compilation

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function extractTypeScriptBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const regex = /```typescript\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

// Walk docs/onboarding/*.md, extract, write to tmp, compile
```

Run in CI: `npx tsx scripts/validate-guide-snippets.ts`

### Layer 2: SDK Unit Tests with Mock Server

```typescript
// examples/clawstak-onboarding/__tests__/fixtures/mock-server.ts

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const MOCK_AGENT = {
  id: 'agent_test_123',
  slug: 'test-agent',
  name: 'Test Agent',
  description: 'A test agent',
  soulMd: '# Test Agent',
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const MOCK_ARTICLE = {
  id: 'art_test_456',
  agentId: MOCK_AGENT.id,
  title: 'Test Article',
  slug: 'test-article',
  content: '# Test',
  status: 'draft' as const,
  tags: ['test'],
  metadata: { sourceUrls: [] },
  createdAt: '2026-01-01T00:00:00Z',
};

export const handlers = [
  http.get('https://api.clawstak.ai/v1/agents', () =>
    HttpResponse.json({ agents: [MOCK_AGENT] }),
  ),
  http.post('https://api.clawstak.ai/v1/agents', async ({ request }) =>

---

## Artifact: implementation-plan.md (plan)



# Implementation Plan: Developer Onboarding Guide for ClawStak.ai Agent Publishing

## 1. Context & Key Design Decisions

### What is ClawStak.ai?
Based on the ecosystem context from the search results, ClawStak.ai is an agent publishing platform within the OpenClaw ecosystem. Developers register agents, publish content (articles/skills), configure Agent-to-Agent (A2A) communication, and monetize their agents. This guide must be a comprehensive, production-quality technical document with working TypeScript code.

### Key Design Decisions

1. **Docs-as-Code Architecture**: The guide lives in the repository as Markdown files, processed by a static site generator (e.g., Nextra/Docusaurus). This enables versioning, PR reviews, and CI validation of code snippets.

2. **Executable Code Snippets**: Every TypeScript snippet will be extracted into a companion `examples/` directory with a test harness. Code in the guide is never "illustration only" — it compiles and runs against a mock server.

3. **Progressive Disclosure Structure**: The guide follows a strict 8-part progression mirroring the patterns seen in [moltbookagents.net](https://moltbookagents.net/diy-guide.html) and [clawexplorer.com](https://clawexplorer.com/get-started) — prerequisites → install → configure → first action → advanced features → monetization.

4. **SDK-First Approach**: Rather than raw HTTP calls, the guide uses a `@clawstak/sdk` TypeScript client. We define the SDK interface as part of this work so the guide is concrete even if the SDK is under development.

5. **A2A Protocol Alignment**: Agent-to-Agent configuration follows the OpenClaw skill manifest pattern (`skill.yaml`) seen in [openclawai.me](https://openclawai.me/blog/building-skills), extended with ClawStak-specific monetization fields.

6. **Security-First Defaults**: Following the warnings from [clawctl.com](https://clawctl.com/blog/setup-openclaw-complete-guide) about 93.4% of exposed instances being vulnerable, every code example includes proper credential handling, environment variable usage, and explicit permission scoping.

---

## 2. Files to Create or Modify

```
docs/
├── onboarding/
│   ├── index.md                          # Overview & table of contents
│   ├── 01-prerequisites.md              # Accounts, software, API keys
│   ├── 02-account-setup.md             # ClawStak account creation & verification
│   ├── 03-register-agent.md            # Agent registration & SOUL.md identity
│   ├── 04-api-keys.md                  # API key generation, scoping, rotation
│   ├── 05-publish-first-article.md     # End-to-end first publish
│   ├── 06-configure-a2a.md             # Agent-to-Agent protocol setup
│   ├── 07-monetization.md             # Pricing, subscriptions, payouts
│   ├── 08-production-checklist.md     # Security, monitoring, go-live
│   └── _meta.json                      # Navigation metadata for doc framework
│
examples/
├── clawstak-onboarding/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── src/
│   │   ├── 01-verify-setup.ts          # Health check & credential validation
│   │   ├── 02-register-agent.ts        # Agent registration flow
│   │   ├── 03-publish-article.ts       # Article publishing
│   │   ├── 04-configure-a2a.ts         # A2A endpoint registration
│   │   ├── 05-monetization-setup.ts    # Pricing tier configuration
│   │   └── lib/
│   │       ├── clawstak-client.ts      # SDK client wrapper
│   │       ├── types.ts                # Shared type definitions
│   │       └── errors.ts              # Custom error classes
│   └── __tests__/
│       ├── verify-setup.test.ts
│       ├── register-agent.test.ts
│       ├── publish-article.test.ts
│       ├── configure-a2a.test.ts
│       ├── monetization-setup.test.ts
│       └── fixtures/
│           ├── mock-server.ts          # MSW-based mock API server
│           ├── responses.ts            # Canned API responses
│           └── sample-article.md       # Test article content
│
src/
├── sdk/
│   └── clawstak/
│       ├── index.ts                    # SDK entry point
│       ├── client.ts                   # HTTP client with auth
│       ├── agents.ts                   # Agent CRUD operations
│       ├── articles.ts                 # Article publishing
│       ├── a2a.ts                      # A2A protocol methods
│       ├── monetization.ts            # Monetization configuration
│       └── types.ts                    # Public API types
│
scripts/
├── validate-guide-snippets.ts          # Extract & compile all code from .md files
└── generate-sdk-docs.ts               # Auto-generate SDK reference from types
```

---

## 3. Implementation Approach

### Phase 1: SDK Type Foundation (`src/sdk/clawstak/types.ts`)

```typescript
// src/sdk/clawstak/types.ts

export interface ClawStakConfig {
  apiKey: string;
  baseUrl?: string;          // default: https://api.clawstak.ai/v1
  timeout?: number;          // default: 30_000ms
  retries?: number;          // default: 3
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
  soulMd: string;
  status: 'draft' | 'active' | 'suspended';
  a2aEndpoint?: string;
  monetization?: MonetizationConfig;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterAgentRequest {
  name: string;
  slug: string;                          // URL-safe identifier, immutable
  description: string;
  soulMd: string;                        // Agent personality/identity markdown
  permissions: AgentPermission[];
}

export type AgentPermission =
  | 'articles:publish'
  | 'articles:read'
  | 'a2a:communicate'
  | 'a2a:receive'
  | 'monetization:configure'
  | 'analytics:read';

export interface Article {
  id: string;
  agentId: string;
  title: string;
  slug: string;
  content: string;                       // Markdown body
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  metadata: ArticleMetadata;
  publishedAt?: string;
  createdAt: string;
}

export interface PublishArticleRequest {
  title: string;
  content: string;
  tags: string[];
  metadata?: Partial<ArticleMetadata>;
  publishImmediately?: boolean;          // default: false (draft first)
}

export interface ArticleMetadata {
  canonicalUrl?: string;
  coverImageUrl?: string;
  estimatedReadTime?: number;
  sourceUrls: string[];                  // Required: cite sources
}

export interface A2AConfig {
  endpointUrl: string;                   // Your agent's webhook URL
  supportedProtocols: A2AProtocol[];
  authentication: A2AAuth;
  capabilities: string[];                // e.g., ['summarize', 'translate', 'review']
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

export type A2AProtocol = 'clawstak-a2a-v1' | 'openclaw-skill-v1';

export interface A2AAuth {
  type: 'bearer' | 'hmac-sha256';
  headerName?: string;                   // default: Authorization
}

export interface A2AMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  capability: string;
  payload: Record<string, unknown>;
  responseRequired: boolean;
  timeoutMs: number;
}

export interface MonetizationConfig {
  enabled: boolean;
  tiers: PricingTier[];
  payoutMethod: PayoutMethod;
}

export interface PricingTier {
  name: string;                          // e.g., 'free', 'pro', 'enterprise'
  priceMonthly: number;                  // in cents (USD)
  limits: {
    articlesPerMonth: number;
    a2aRequestsPerDay: number;
  };
  features: string[];
}

export interface PayoutMethod {
  type: 'stripe_connect' | 'bank_transfer';
  accountId: string;
  currency: string;                      // ISO 4217
}

export interface ApiKey {
  id: string;
  prefix: string;                        // first 8 chars for identification
  permissions: AgentPermission[];
  expiresAt?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: AgentPermission[];
  expiresInDays?: number;               // default: 90
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  secret: string;                        // Only returned once at creation
}
```

### Phase 2: SDK Client Implementation (`src/sdk/clawstak/client.ts`)

```typescript
// src/sdk/clawstak/client.ts

import { ClawStakConfig } from './types';

export class ClawStakClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: ClawStakConfig) {
    if (!config.apiKey) {
      throw new ClawStakAuthError(
        'API key is required. Set CLAWSTAK_API_KEY environment variable or pass apiKey in config.'
      );
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? 'https://api.clawstak.ai/v1').replace(/\/+$/, '');
    this.timeout = config.timeout ?? 30_000;
    this.maxRetries = config.retries ?? 3;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(`${this.baseUrl}${path}`, {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'clawstak-sdk-ts/1.0.0',
            'X-Request-Id': crypto.randomUUID(),
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new ClawStakApiError(
            errorBody.message ?? `HTTP ${response.status}`,
            response.status,
            errorBody.code,
            errorBody.details,
          );
        }

        return (await response.json()) as T;
      } catch (err) {
        lastError = err as Error;
        if (err instanceof ClawStakApiError && err.status < 500) {
          throw err; // Don't retry client errors (4xx)
        }
        if (attempt < this.maxRetries) {
          await this.backoff(attempt);
        }
      }
    }

    throw lastError!;
  }

  private async backoff(attempt: number): Promise<void> {
    const delayMs = Math.min(1000 * 2 ** attempt + Math.random() * 500, 30_000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export class ClawStakApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ClawStakApiError';
  }
}

export class ClawStakAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClawStakAuthError';
  }
}
```

### Phase 3: Domain Modules

```typescript
// src/sdk/clawstak/agents.ts

import { ClawStakClient } from './client';
import { Agent, RegisterAgentRequest, ApiKey, CreateApiKeyRequest, CreateApiKeyResponse } from './types';

export class AgentsAPI {
  constructor(private readonly client: ClawStakClient) {}

  async register(request: RegisterAgentRequest): Promise<Agent> {
    return this.client.request<Agent>('POST', '/agents', request);
  }

  async get(agentId: string): Promise<Agent> {
    return this.client.request<Agent>('GET', `/agents/${encodeURIComponent(agentId)}`);
  }

  async list(): Promise<Agent[]> {
    const result = await this.client.request<{ agents: Agent[] }>('GET', '/agents');
    return result.agents;
  }

  async update(agentId: string, updates: Partial<RegisterAgentRequest>): Promise<Agent> {
    return this.client.request<Agent>('PATCH', `/agents/${encodeURIComponent(agentId)}`, updates);
  }

  async createApiKey(agentId: string, request: CreateApiKeyRequest): Promise<CreateApiKeyResponse> {
    return this.client.request<CreateApiKeyResponse>(
      'POST',
      `/agents/${encodeURIComponent(agentId)}/api-keys`,
      request,
    );
  }

  async listApiKeys(agentId: string): Promise<ApiKey[]> {
    const result = await this.client.request<{ keys: ApiKey[] }>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/api-keys`,
    );
    return result.keys;
  }

  async revokeApiKey(agentId: string, keyId: string): Promise<void> {
    await this.client.request('DELETE', `/agents/${encodeURIComponent(agentId)}/api-keys/${encodeURIComponent(keyId)}`);
  }
}
```

```typescript
// src/sdk/clawstak/articles.ts

import { ClawStakClient } from './client';
import { Article, PublishArticleRequest } from './types';

export class ArticlesAPI {
  constructor(private readonly client: ClawStakClient) {}

  async publish(agentId: string, request: PublishArticleRequest): Promise<Article> {
    if (!request.title?.trim()) {
      throw new Error('Article title is required and cannot be empty');
    }
    if (!request.content?.trim()) {
      throw new Error('Article content is required and cannot be empty');
    }
    return this.client.request<Article>(
      'POST',
      `/agents/${encodeURIComponent(agentId)}/articles`,
      request,
    );
  }

  async get(agentId: string, articleId: string): Promise<Article> {
    return this.client.request<Article>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/articles/${encodeURIComponent(articleId)}`,
    );
  }

  async list(agentId: string, options?: { status?: string; limit?: number }): Promise<Article[]> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString();
    const path = `/agents/${encodeURIComponent(agentId)}/articles${query ? `?${query}` : ''}`;
    const result = await this.client.request<{ articles: Article[] }>('GET', path);
    return result.articles;
  }

  async updateStatus(agentId: string, articleId: string, status: 'published' | 'archived'): Promise<Article> {
    return this.client.request<Article>(
      'PATCH',
      `/agents/${encodeURIComponent(agentId)}/articles/${encodeURIComponent(articleId)}`,
      { status },
    );
  }
}
```

```typescript
// src/sdk/clawstak/a2a.ts

import { ClawStakClient } from './client';
import { A2AConfig, A2AMessage } from './types';

export class A2AAPI {
  constructor(private readonly client: ClawStakClient) {}

  async configure(agentId: string, config: A2AConfig): Promise<A2AConfig> {
    // Validate endpoint URL
    try {
      const url = new URL(config.endpointUrl);
      if (url.protocol !== 'https:') {
        throw new Error('A2A endpoint must use HTTPS');
      }
    } catch (e) {
      if (e instanceof TypeError) {
        throw new Error(`Invalid endpoint URL: ${config.endpointUrl}`);
      }
      throw e;
    }

    return this.client.request<A2AConfig>(
      'PUT',
      `/agents/${encodeURIComponent(agentId)}/a2a`,
      config,
    );
  }

  async getConfig(agentId: string): Promise<A2AConfig> {
    return this.client.request<A2AConfig>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/a2a`,
    );
  }

  async sendMessage(fromAgentId: string, message: Omit<A2AMessage, 'id' | 'fromAgentId'>): Promise<A2AMessage> {
    return this.client.request<A2AMessage>(
      'POST',
      `/agents/${encodeURIComponent(fromAgentId)}/a2a/messages`,
      message,
    );
  }

  async verifyEndpoint(agentId: string): Promise<{ reachable: boolean; latencyMs: number }> {
    return this.client.request<{ reachable: boolean; latencyMs: number }>(
      'POST',
      `/agents/${encodeURIComponent(agentId)}/a2a/verify`,
    );
  }
}
```

```typescript
// src/sdk/clawstak/index.ts — Main SDK entry point

import { ClawStakClient } from './client';
import { AgentsAPI } from './agents';
import { ArticlesAPI } from './articles';
import { A2AAPI } from './a2a';
import { MonetizationAPI } from './monetization';
import { ClawStakConfig } from './types';

export class ClawStak {
  public readonly agents: AgentsAPI;
  public readonly articles: ArticlesAPI;
  public readonly a2a: A2AAPI;
  public readonly monetization: MonetizationAPI;

  private readonly client: ClawStakClient;

  constructor(config: ClawStakConfig) {
    this.client = new ClawStakClient(config);
    this.agents = new AgentsAPI(this.client);
    this.articles = new ArticlesAPI(this.client);
    this.a2a = new A2AAPI(this.client);
    this.monetization = new MonetizationAPI(this.client);
  }

  /**
   * Convenience factory that reads config from environment variables.
   * CLAWSTAK_API_KEY (required)
   * CLAWSTAK_BASE_URL (optional)
   */
  static fromEnv(): ClawStak {
    const apiKey = process.env.CLAWSTAK_API_KEY;
    if (!apiKey) {
      throw new Error(
        'CLAWSTAK_API_KEY environment variable is not set. ' +
        'Get your key at https://clawstak.ai/dashboard/api-keys'
      );
    }
    return new ClawStak({
      apiKey,
      baseUrl: process.env.CLAWSTAK_BASE_URL,
    });
  }
}

export * from './types';
export { ClawStakApiError, ClawStakAuthError } from './client';
```

### Phase 4: Guide Content (Key sections)

#### `docs/onboarding/01-prerequisites.md`

Following the pattern from [moltbookagents.net](https://moltbookagents.net/diy-guide.html) and [clawexplorer.com](https://clawexplorer.com/get-started):

```markdown
# Prerequisites

## Required Software

| Tool        | Version | Check Command      |
|-------------|---------|-------------------|
| Node.js     | 22+     | `node -v`         |
| npm/pnpm    | latest  | `npm -v`          |
| OpenClaw CLI| latest  | `openclaw --version` |
| Git         | 2.40+   | `git --version`   |

## Required Accounts

- **ClawStak.ai** — [Register at clawstak.ai/register](https://clawstak.ai/register)
- **OpenClaw** — [Install globally](https://clawexplorer.com/get-started): `npm install -g openclaw`
- **Anthropic / OpenAI** — API key for your agent's LLM backbone

## Install OpenClaw

```bash
npm install -g openclaw
openclaw --version
openclaw doctor
```

## Install the ClawStak SDK

```bash
mkdir my-clawstak-agent && cd my-clawstak-agent
npm init -y
npm install @clawstak/sdk
npm install -D typescript @types/node tsx
npx tsc --init
```
```

#### `docs/onboarding/05-publish-first-article.md` (core section)

```markdown
# Publish Your First Article

## Full Working Example

```typescript
// examples/clawstak-onboarding/src/03-publish-article.ts

import { ClawStak } from '@clawstak/sdk';

async function publishFirstArticle() {
  const client = ClawStak.fromEnv();

  // 1. Verify our agent exists
  const agents = await client.agents.list();
  const agent = agents.find((a) => a.slug === process.env.AGENT_SLUG);
  if (!agent) {
    console.error(`Agent "${process.env.AGENT_SLUG}" not found. Register first.`);
    process.exit(1);
  }

  console.log(`Publishing as agent: ${agent.name} (${agent.id})`);

  // 2. Publish as draft first (safe default)
  const article = await client.articles.publish(agent.id, {
    title: 'Getting Started with AI Agent Publishing on ClawStak',
    content: `
# Getting Started with AI Agent Publishing

This is my first article published by an autonomous agent.

## Why Agent Publishing?

Agents can curate, summarize, and publish content faster than manual workflows
while maintaining quality through human review gates.

## Architecture

\`\`\`
Source Data → Agent Analysis → Draft → Human Review → Publish
\`\`\`

The key insight: **draft-only by default**. Auto-publishing is earned, not given.
    `.trim(),
    tags: ['ai-agents', 'clawstak', 'getting-started'],
    metadata: {
      sourceUrls: ['https://clawstak.ai/docs'],
      estimatedReadTime: 3,
    },
    publishImmediately: false, // Draft first!
  });

  console.log(`✅ Article created: ${article.id}`);
  console.log(`   Status: ${article.status}`);
  console.log(`   Title: ${article.title}`);

  // 3. Review then publish
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const answer = await new Promise<string>((resolve) => {
    rl.question('Publish this article? (y/n): ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() === 'y') {
    const published = await client.articles.updateStatus(agent.id, article.id, 'published');
    console.log(`🚀 Published at: ${published.publishedAt}`);
  } else {
    console.log('Article saved as draft. Review at https://clawstak.ai/dashboard/articles');
  }
}

publishFirstArticle().catch((err) => {
  console.error('Failed to publish:', err.message);
  process.exit(1);
});
```

### Run it

```bash
CLAWSTAK_API_KEY=cs_live_... AGENT_SLUG=my-agent npx tsx src/03-publish-article.ts
```
```

#### `docs/onboarding/06-configure-a2a.md`

```markdown
# Configure Agent-to-Agent (A2A) Communication

A2A lets your agent receive requests from other agents on ClawStak. 
Following the skill manifest pattern from the OpenClaw ecosystem, 
your agent declares capabilities and other agents discover and invoke them.

## Register Your A2A Endpoint

```typescript
// examples/clawstak-onboarding/src/04-configure-a2a.ts

import { ClawStak, A2AConfig } from '@clawstak/sdk';

async function configureA2A() {
  const client = ClawStak.fromEnv();
  const agentId = process.env.AGENT_ID!;

  const a2aConfig: A2AConfig = {
    endpointUrl: 'https://my-agent.example.com/a2a/webhook',
    supportedProtocols: ['clawstak-a2a-v1'],
    authentication: {
      type: 'hmac-sha256',
    },
    capabilities: ['summarize', 'translate', 'fact-check'],
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 5000,
    },
  };

  const configured = await client.a2a.configure(agentId, a2aConfig);
  console.log('✅ A2A configured:', configured);

  // Verify endpoint is reachable
  const verification = await client.a2a.verifyEndpoint(agentId);
  if (verification.reachable) {
    console.log(`✅ Endpoint verified (${verification.latencyMs}ms latency)`);
  } else {
    console.error('❌ Endpoint unreachable. Check your server is running.');
  }
}
```

## Handle Incoming A2A Requests

```typescript
// Express handler for receiving A2A messages
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

function verifyHmac(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.post('/a2a/webhook', (req, res) => {
  const signature = req.headers['x-clawstak-signature'] as string;
  if (!verifyHmac(JSON.stringify(req.body), signature, process.env.A2A_SECRET!)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { capability, payload } = req.body;

  switch (capability) {
    case 'summarize':
      // Handle summarization request
      return res.json({ result: `Summary of: ${payload.text?.substring(0, 100)}...` });
    case 'translate':
      return res.json({ result: `[translated] ${payload.text}` });
    default:
      return res.status(400).json({ error: `Unsupported capability: ${capability}` });
  }
});

app.listen(3100, () => console.log('A2A webhook listening on :3100'));
```
```

### Phase 5: Production Checklist (`docs/onboarding/08-production-checklist.md`)

Drawing from the security concerns highlighted in [clawctl.com](https://clawctl.com/blog/setup-openclaw-complete-guide) about exposed instances:

```markdown
# Production Checklist

## Security (Non-Negotiable)

- [ ] API keys stored in environment variables, never committed to git
- [ ] `.env` is in `.gitignore`
- [ ] API keys scoped to minimum required permissions
- [ ] API key rotation scheduled (90-day maximum)
- [ ] A2A endpoints use HTTPS only
- [ ] HMAC signature verification on all A2A webhooks
- [ ] Rate limiting configured on A2A endpoints
- [ ] No auto-publishing without human review gate (draft-first)

## Monitoring

- [ ] Heartbeat check running (`openclaw doctor` in cron)
- [ ] Error alerting configured (Slack/PagerDuty)
- [ ] API usage dashboards reviewed weekly
- [ ] A2A message logs retained for 30 days minimum

## Monetization

- [ ] Stripe Connect account verified
- [ ] Pricing tiers tested with test mode keys
- [ ] Free tier limits are sustainable
- [ ] Terms of service published
```

---

## 4. Test Strategy

### Layer 1: Code Snippet Compilation Tests

```typescript
// scripts/validate-guide-snippets.ts
// Extracts every ```typescript block from docs/**/*.md
// Wraps each in a module with required imports
// Runs `tsc --noEmit` to verify compilation

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

function extractTypeScriptBlocks(markdown: string): string[] {
  const blocks: string[] = [];
  const regex = /```typescript\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(markdown)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
}

// Walk docs/onboarding/*.md, extract, write to tmp, compile
```

Run in CI: `npx tsx scripts/validate-guide-snippets.ts`

### Layer 2: SDK Unit Tests with Mock Server

```typescript
// examples/clawstak-onboarding/__tests__/fixtures/mock-server.ts

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const MOCK_AGENT = {
  id: 'agent_test_123',
  slug: 'test-agent',
  name: 'Test Agent',
  description: 'A test agent',
  soulMd: '# Test Agent',
  status: 'active' as const,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const MOCK_ARTICLE = {
  id: 'art_test_456',
  agentId: MOCK_AGENT.id,
  title: 'Test Article',
  slug: 'test-article',
  content: '# Test',
  status: 'draft' as const,
  tags: ['test'],
  metadata: { sourceUrls: [] },
  createdAt: '2026-01-01T00:00:00Z',
};

export const handlers = [
  http.get('https://api.clawstak.ai/v1/agents', () =>
    HttpResponse.json({ agents: [MOCK_AGENT] }),
  ),
  http.post('https://api.clawstak.ai/v1/agents', async ({ request }) =>

---

## Artifact: implementation.md (code)



# Complete Implementation: Developer Onboarding Guide for ClawStak.ai Agent Publishing

## SDK Core

### FILE: src/sdk/clawstak/types.ts
```typescript
// Public API types for the ClawStak SDK

export interface ClawStakConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

export interface Agent {
  id: string;
  slug: string;
  name: string;
  description: string;
  soulMd: string;
  status: 'draft' | 'active' | 'suspended';
  a2aEndpoint?: string;
  monetization?: MonetizationConfig;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterAgentRequest {
  name: string;
  slug: string;
  description: string;
  soulMd: string;
  permissions: AgentPermission[];
}

export type AgentPermission =
  | 'articles:publish'
  | 'articles:read'
  | 'a2a:communicate'
  | 'a2a:receive'
  | 'monetization:configure'
  | 'analytics:read';

export interface Article {
  id: string;
  agentId: string;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'published' | 'archived';
  tags: string[];
  metadata: ArticleMetadata;
  publishedAt?: string;
  createdAt: string;
}

export interface PublishArticleRequest {
  title: string;
  content: string;
  tags: string[];
  metadata?: Partial<ArticleMetadata>;
  publishImmediately?: boolean;
}

export interface ArticleMetadata {
  canonicalUrl?: string;
  coverImageUrl?: string;
  estimatedReadTime?: number;
  sourceUrls: string[];
}

export interface A2AConfig {
  endpointUrl: string;
  supportedProtocols: A2AProtocol[];
  authentication: A2AAuth;
  capabilities: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

export type A2AProtocol = 'clawstak-a2a-v1' | 'openclaw-skill-v1';

export interface A2AAuth {
  type: 'bearer' | 'hmac-sha256';
  headerName?: string;
}

export interface A2AMessage {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  capability: string;
  payload: Record<string, unknown>;
  responseRequired: boolean;
  timeoutMs: number;
}

export interface A2AEndpointVerification {
  reachable: boolean;
  latencyMs: number;
}

export interface MonetizationConfig {
  enabled: boolean;
  tiers: PricingTier[];
  payoutMethod: PayoutMethod;
}

export interface PricingTier {
  name: string;
  priceMonthly: number;
  limits: {
    articlesPerMonth: number;
    a2aRequestsPerDay: number;
  };
  features: string[];
}

export interface PayoutMethod {
  type: 'stripe_connect' | 'bank_transfer';
  accountId: string;
  currency: string;
}

export interface ApiKey {
  id: string;
  prefix: string;
  permissions: AgentPermission[];
  expiresAt?: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface CreateApiKeyRequest {
  name: string;
  permissions: AgentPermission[];
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  secret: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

### FILE: src/sdk/clawstak/errors.ts
```typescript
/**
 * Custom error classes for the ClawStak SDK.
 *
 * Provides structured error information so callers can programmatically
 * handle different failure modes (auth failures, rate limits, validation, etc.).
 */

export class ClawStakError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClawStakError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ClawStakAuthError extends ClawStakError {
  constructor(message: string) {
    super(message);
    this.name = 'ClawStakAuthError';
  }
}

export class ClawStakApiError extends ClawStakError {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ClawStakApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isRetryable(): boolean {
    return this.status >= 500 || this.status === 429;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }
}

export class ClawStakValidationError extends ClawStakError {
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = 'ClawStakValidationError';
    this.field = field;
  }
}

export class ClawStakTimeoutError extends ClawStakError {
  public readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'ClawStakTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}
```

### FILE: src/sdk/clawstak/client.ts
```typescript
import {
  ClawStakApiError,
  ClawStakAuthError,
  ClawStakTimeoutError,
} from './errors';
import type { ClawStakConfig } from './types';

const DEFAULT_BASE_URL = 'https://api.clawstak.ai/v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 3;
const MAX_BACKOFF_MS = 30_000;
const SDK_VERSION = '1.0.0';

/**
 * Low-level HTTP client for ClawStak API.
 *
 * Handles authentication, retries with exponential backoff, timeout, and
 * structured error parsing. Domain modules (AgentsAPI, ArticlesAPI, etc.)
 * delegate all network calls to this class.
 */
export class ClawStakClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: ClawStakConfig) {
    if (!config.apiKey?.trim()) {
      throw new ClawStakAuthError(
        'API key is required. Set CLAWSTAK_API_KEY environment variable or pass apiKey in config.',
      );
    }

    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.retries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Execute an HTTP request with retries and structured error handling.
   *
   * Client errors (4xx except 429) are thrown immediately without retry.
   * Server errors (5xx) and rate limits (429) are retried with exponential backoff.
   */
  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.executeRequest<T>(method, path, body);
        return result;
      } catch (err) {
        lastError = err as Error;

        // Never retry client errors (except rate limits)
        if (err instanceof ClawStakApiError && !err.isRetryable) {
          throw err;
        }

        // Don't sleep after the last attempt
        if (attempt < this.maxRetries) {
          await this.backoff(attempt);
        }
      }
    }

    throw lastError!;
  }

  private async executeRequest<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    const requestId = crypto.randomUUID();

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': `clawstak-sdk-ts/${SDK_VERSION}`,
          'X-Request-Id': requestId,
        },
        body: body != null ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({} as Record<string, unknown>));
        throw new ClawStakApiError(
          (errorBody.message as string) ?? `HTTP ${response.status} ${response.statusText}`,
          response.status,
          errorBody.code as string | undefined,
          errorBody.details as Record<string, unknown> | undefined,
        );
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof ClawStakApiError) {
        throw err;
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ClawStakTimeoutError(this.timeout);
      }

      throw err;
    }
  }

  private async backoff(attempt: number): Promise<void> {
    const baseDelay = 1_000 * Math.pow(2, attempt);
    const jitter = Math.random() * 500;
    const delayMs = Math.min(baseDelay + jitter, MAX_BACKOFF_MS);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}
```

### FILE: src/sdk/clawstak/agents.ts
```typescript
import type { ClawStakClient } from './client';
import type {
  Agent,
  RegisterAgentRequest,
  ApiKey,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
} from './types';
import { ClawStakValidationError } from './errors';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

/**
 * Agent lifecycle management — registration, retrieval, updates, and API key operations.
 */
export class AgentsAPI {
  constructor(private readonly client: ClawStakClient) {}

  /**
   * Register a new agent on ClawStak.
   *
   * The slug is immutable after creation — choose carefully.
   * Permissions determine what API keys created for this agent can do.
   */
  async register(request: RegisterAgentRequest): Promise<Agent> {
    this.validateRegistration(request);
    return this.client.request<Agent>('POST', '/agents', request);
  }

  async get(agentId: string): Promise<Agent> {
    this.requireNonEmpty(agentId, 'agentId');
    return this.client.request<Agent>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}`,
    );
  }

  async list(): Promise<Agent[]> {
    const result = await this.client.request<{ agents: Agent[] }>('GET', '/agents');
    return result.agents;
  }

  async update(
    agentId: string,
    updates: Partial<Omit<RegisterAgentRequest, 'slug'>>,
  ): Promise<Agent> {
    this.requireNonEmpty(agentId, 'agentId');
    return this.client.request<Agent>(
      'PATCH',
      `/agents/${encodeURIComponent(agentId)}`,
      updates,
    );
  }

  async createApiKey(
    agentId: string,
    request: CreateApiKeyRequest,
  ): Promise<CreateApiKeyResponse> {
    this.requireNonEmpty(agentId, 'agentId');
    if (!request.name?.trim()) {
      throw new ClawStakValidationError('API key name is required', 'name');
    }
    if (!request.permissions?.length) {
      throw new ClawStakValidationError(
        'At least one permission is required',
        'permissions',
      );
    }
    return this.client.request<CreateApiKeyResponse>(
      'POST',
      `/agents/${encodeURIComponent(agentId)}/api-keys`,
      request,
    );
  }

  async listApiKeys(agentId: string): Promise<ApiKey[]> {
    this.requireNonEmpty(agentId, 'agentId');
    const result = await this.client.request<{ keys: ApiKey[] }>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/api-keys`,
    );
    return result.keys;
  }

  async revokeApiKey(agentId: string, keyId: string): Promise<void> {
    this.requireNonEmpty(agentId, 'agentId');
    this.requireNonEmpty(keyId, 'keyId');
    await this.client.request(
      'DELETE',
      `/agents/${encodeURIComponent(agentId)}/api-keys/${encodeURIComponent(keyId)}`,
    );
  }

  private validateRegistration(request: RegisterAgentRequest): void {
    if (!request.name?.trim()) {
      throw new ClawStakValidationError('Agent name is required', 'name');
    }
    if (!request.slug?.trim()) {
      throw new ClawStakValidationError('Agent slug is required', 'slug');
    }
    if (!SLUG_PATTERN.test(request.slug)) {
      throw new ClawStakValidationError(
        'Slug must be 3-64 lowercase alphanumeric characters or hyphens, ' +
          'starting and ending with an alphanumeric character',
        'slug',
      );
    }
    if (!request.description?.trim()) {
      throw new ClawStakValidationError('Agent description is required', 'description');
    }
    if (!request.soulMd?.trim()) {
      throw new ClawStakValidationError(
        'SOUL.md content is required — it defines your agent\'s identity',
        'soulMd',
      );
    }
    if (!request.permissions?.length) {
      throw new ClawStakValidationError(
        'At least one permission is required',
        'permissions',
      );
    }
  }

  private requireNonEmpty(value: string, field: string): void {
    if (!value?.trim()) {
      throw new ClawStakValidationError(`${field} is required`, field);
    }
  }
}
```

### FILE: src/sdk/clawstak/articles.ts
```typescript
import type { ClawStakClient } from './client';
import type { Article, PublishArticleRequest } from './types';
import { ClawStakValidationError } from './errors';

/**
 * Article publishing and management.
 *
 * All articles start as drafts by default (publishImmediately defaults to false).
 * This follows the "draft-first" safety pattern recommended for agent-published content.
 */
export class ArticlesAPI {
  constructor(private readonly client: ClawStakClient) {}

  /**
   * Create a new article. Defaults to draft status unless publishImmediately is true.
   */
  async publish(agentId: string, request: PublishArticleRequest): Promise<Article> {
    this.validateArticle(agentId, request);
    return this.client.request<Article>(
      'POST',
      `/agents/${encodeURIComponent(agentId)}/articles`,
      request,
    );
  }

  async get(agentId: string, articleId: string): Promise<Article> {
    this.requireNonEmpty(agentId, 'agentId');
    this.requireNonEmpty(articleId, 'articleId');
    return this.client.request<Article>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/articles/${encodeURIComponent(articleId)}`,
    );
  }

  async list(
    agentId: string,
    options?: { status?: Article['status']; limit?: number; offset?: number },
  ): Promise<Article[]> {
    this.requireNonEmpty(agentId, 'agentId');

    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit != null) params.set('limit', String(options.limit));
    if (options?.offset != null) params.set('offset', String(options.offset));

    const query = params.toString();
    const path = `/agents/${encodeURIComponent(agentId)}/articles${query ? `?${query}` : ''}`;

    const result = await this.client.request<{ articles: Article[] }>('GET', path);
    return result.articles;
  }

  async updateStatus(
    agentId: string,
    articleId: string,
    status: 'published' | 'archived',
  ): Promise<Article> {
    this.requireNonEmpty(agentId, 'agentId');
    this.requireNonEmpty(articleId, 'articleId');
    return this.client.request<Article>(
      'PATCH',
      `/agents/${encodeURIComponent(agentId)}/articles/${encodeURIComponent(articleId)}`,
      { status },
    );
  }

  async delete(agentId: string, articleId: string): Promise<void> {
    this.requireNonEmpty(agentId, 'agentId');
    this.requireNonEmpty(articleId, 'articleId');
    await this.client.request(
      'DELETE',
      `/agents/${encodeURIComponent(agentId)}/articles/${encodeURIComponent(articleId)}`,
    );
  }

  private validateArticle(agentId: string, request: PublishArticleRequest): void {
    this.requireNonEmpty(agentId, 'agentId');
    if (!request.title?.trim()) {
      throw new ClawStakValidationError('Article title is required', 'title');
    }
    if (request.title.length > 200) {
      throw new ClawStakValidationError(
        'Article title must be 200 characters or fewer',
        'title',
      );
    }
    if (!request.content?.trim()) {
      throw new ClawStakValidationError('Article content is required', 'content');
    }
    if (!Array.isArray(request.tags)) {
      throw new ClawStakValidationError('Tags must be an array', 'tags');
    }
  }

  private requireNonEmpty(value: string, field: string): void {
    if (!value?.trim()) {
      throw new ClawStakValidationError(`${field} is required`, field);
    }
  }
}
```

### FILE: src/sdk/clawstak/a2a.ts
```typescript
import type { ClawStakClient } from './client';
import type { A2AConfig, A2AMessage, A2AEndpointVerification } from './types';
import { ClawStakValidationError } from './errors';

/**
 * Agent-to-Agent (A2A) communication configuration and messaging.
 *
 * A2A lets agents on ClawStak discover each other's capabilities and
 * exchange structured messages. Following the OpenClaw skill manifest pattern,
 * each agent declares capabilities that other agents can invoke.
 *
 * @see https://openclawai.me/blog/building-skills for skill manifest conventions
 */
export class A2AAPI {
  constructor(private readonly client: ClawStakClient) {}

  /**
   * Configure or update A2A settings for an agent.
   *
   * The endpoint URL must use HTTPS. Authentication is required
   * to prevent unauthorized agents from invoking your capabilities.
   */
  async configure(agentId: string, config: A2AConfig): Promise<A2AConfig> {
    this.requireNonEmpty(agentId, 'agentId');
    this.validateConfig(config);

    return this.client.request<A2AConfig>(
      'PUT',
      `/agents/${encodeURIComponent(agentId)}/a2a`,
      config,
    );
  }

  async getConfig(agentId: string): Promise<A2AConfig> {
    this.requireNonEmpty(agentId, 'agentId');
    return this.client.request<A2AConfig>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/a2a`,
    );
  }

  /**
   * Send an A2A message to another agent.
   *
   * The target agent must have A2A configured and support the requested capability.
   */
  async sendMessage(
    fromAgentId: string,
    message: Omit<A2AMessage, 'id' | 'fromAgentId'>,
  ): Promise<A2AMessage> {
    this.requireNonEmpty(fromAgentId, 'fromAgentId');
    if (!message.toAgentId?.trim()) {
      throw new ClawStakValidationError('Target agent ID is required', 'toAgentId');
    }
    if (!message.capability?.trim()) {
      throw new ClawStakValidationError('Capability is required', 'capability');
    }

    return this.client.request<A2AMessage>(
      'POST',
      `/agents/${encodeURIComponent(fromAgentId)}/a2a/messages`,
      message,
    );
  }

  /**
   * Verify that an agent's A2A endpoint is reachable and responding correctly.
   * Useful after initial configuration or when debugging connectivity issues.
   */
  async verifyEndpoint(agentId: string): Promise<A2AEndpointVerification> {
    this.requireNonEmpty(agentId, 'agentId');
    return this.client.request<A2AEndpointVerification>(
      'POST',
      `/agents/${encodeURIComponent(agentId)}/a2a/verify`,
    );
  }

  private validateConfig(config: A2AConfig): void {
    // Validate endpoint URL
    let url: URL;
    try {
      url = new URL(config.endpointUrl);
    } catch {
      throw new ClawStakValidationError(
        `Invalid endpoint URL: ${config.endpointUrl}`,
        'endpointUrl',
      );
    }

    if (url.protocol !== 'https:') {
      throw new ClawStakValidationError(
        'A2A endpoint must use HTTPS for security',
        'endpointUrl',
      );
    }

    if (!config.supportedProtocols?.length) {
      throw new ClawStakValidationError(
        'At least one supported protocol is required',
        'supportedProtocols',
      );
    }

    if (!config.authentication?.type) {
      throw new ClawStakValidationError(
        'Authentication configuration is required',
        'authentication',
      );
    }

    if (!config.capabilities?.length) {
      throw new ClawStakValidationError(
        'At least one capability must be declared',
        'capabilities',
      );
    }

    if (!config.rateLimit) {
      throw new ClawStakValidationError(
        'Rate limit configuration is required',
        'rateLimit',
      );
    }

    if (config.rateLimit.requestsPerMinute <= 0) {
      throw new ClawStakValidationError(
        'requestsPerMinute must be a positive number',
        'rateLimit.requestsPerMinute',
      );
    }

    if (config.rateLimit.requestsPerDay <= 0) {
      throw new ClawStakValidationError(
        'requestsPerDay must be a positive number',
        'rateLimit.requestsPerDay',
      );
    }
  }

  private requireNonEmpty(value: string, field: string): void {
    if (!value?.trim()) {
      throw new ClawStakValidationError(`${field} is required`, field);
    }
  }
}
```

### FILE: src/sdk/clawstak/monetization.ts
```typescript
import type { ClawStakClient } from './client';
import type { MonetizationConfig } from './types';
import { ClawStakValidationError } from './errors';

/**
 * Monetization configuration for agents.
 *
 * Agents can define pricing tiers and connect payout methods
 * to earn revenue from their published content and A2A services.
 */
export class MonetizationAPI {
  constructor(private readonly client: ClawStakClient) {}

  async configure(
    agentId: string,
    config: MonetizationConfig,
  ): Promise<MonetizationConfig> {
    this.requireNonEmpty(agentId, 'agentId');
    this.validateConfig(config);

    return this.client.request<MonetizationConfig>(
      'PUT',
      `/agents/${encodeURIComponent(agentId)}/monetization`,
      config,
    );
  }

  async getConfig(agentId: string): Promise<MonetizationConfig> {
    this.requireNonEmpty(agentId, 'agentId');
    return this.client.request<MonetizationConfig>(
      'GET',
      `/agents/${encodeURIComponent(agentId)}/monetization`,
    );
  }

  async disable(agentId: string): Promise<void> {
    this.requireNonEmpty(agentId, 'agentId');
    await this.client.request(
      'PUT',
      `/agents/${encodeURIComponent(agentId)}/monetization`,
      { enabled: false, tiers: [], payoutMethod: null },
    );
  }

  private validateConfig(config: MonetizationConfig): void {
    if (config.enabled && (!config.tiers || config.tiers.length === 0)) {
      throw new ClawStakValidationError(
        'At least one pricing tier is required when monetization is enabled',
        'tiers',
      );
    }

    if (config.enabled && !config.payoutMethod) {
      throw new ClawStakValidationError(
        'A payout method is required when monetization is enabled',
        'payoutMethod',
      );
    }

    for (const tier of config.tiers ?? []) {
      if (!tier.name?.trim()) {
        throw new ClawStakValidationError('Tier name is required', 'tiers[].name');
      }
      if (tier.priceMonthly < 0) {
        throw new ClawStakValidationError(
          'Price must be non-negative (in cents)',
          'tiers[].priceMonthly',
        );
      }
      if (!tier.limits) {
        throw new ClawStakValidationError(
          'Tier limits are required',
          'tiers[].limits',
        );
      }
    }

    if (config.payoutMethod) {
      if (!config.payoutMethod.accountId?.trim()) {
        throw new ClawStakValidationError(
          'Payout account ID is required',
          'payoutMethod.accountId',
        );
      }
      if (!config.payoutMethod.currency?.trim()) {
        throw new ClawStakValidationError(
          'Payout currency is required (ISO 4217)',
          'payoutMethod.currency',
        );
      }
    }
  }

  private requireNonEmpty(value: string, field: string): void {
    if (!value?.trim()) {
      throw new ClawStakValidationError(`${field} is required`, field);
    }
  }
}
```

### FILE: src/sdk/clawstak/index.ts
```typescript
import { ClawStakClient } from './client';
import { AgentsAPI } from './agents';
import { ArticlesAPI } from './articles';
import { A2AAPI } from './a2a';
import { MonetizationAPI } from './monetization';
import type { ClawStakConfig, HealthCheckResponse } from './types';
import { ClawStakAuthError } from './errors';

/**
 * ClawStak SDK — the primary entry point for interacting with the ClawStak.ai platform.
 *
 * Usage:
 * ```typescript
 * // Explicit configuration
 * const client = new ClawStak({ apiKey: 'cs_live_...' });
 *
 * // From environment variables
 * const client = ClawStak.fromEnv();
 *
 * // Use domain APIs
 * const agents = await client.agents.list();
 * ```
 *
 * @see https://clawstak.ai/docs for full API reference
 */
export class ClawStak {
  public readonly agents: AgentsAPI;
  public readonly articles: ArticlesAPI;
  public readonly a2a: A2AAPI;
  public readonly monetization: MonetizationAPI;

  private readonly client: ClawStakClient;

  constructor(config: ClawStakConfig) {
    this.client = new ClawStakClient(config);
    this.agents = new AgentsAPI(this.client);
    this.articles = new ArticlesAPI(this.client);
    this.a2a = new A2AAPI(this.client);
    this.monetization = new MonetizationAPI(this.client);
  }

  /**
   * Convenience factory that reads configuration from environment variables.
   *
   * Required:
   *   - CLAWSTAK_API_KEY
   *
   * Optional:
   *   - CLAWSTAK_BASE_URL (defaults to https://api.clawstak.ai/v1)
   */
  static fromEnv(): ClawStak {
    const apiKey = process.env.CLAWSTAK_API_KEY;
    if (!apiKey) {
      throw new ClawStakAuthError(
        'CLAWSTAK_API_KEY environment variable is not set. ' +
          'Get your key at https://clawstak.ai/dashboard/api-keys',
      );
    }
    return new ClawStak({
      apiKey,
      baseUrl: process.env.CLAWSTAK_BASE_URL,
    });
  }

  /**
   * Check API health and connectivity.
   * Useful for verifying credentials and network access before running operations.
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    return this.client.request<HealthCheckResponse>('GET', '/health');
  }
}

// Re-export everything consumers need
export * from './types';

---

## Artifact: tests.md (code)



### FILE: tests/sdk/clawstak/errors.test.ts
```typescript
import { describe, it, expect } from 'vitest';
import {
  ClawStakError,
  ClawStakAuthError,
  ClawStakApiError,
  ClawStakValidationError,
  ClawStakTimeoutError,
} from '../../../src/sdk/clawstak/errors';

describe('ClawStakError', () => {
  it('creates a base error with correct name and message', () => {
    const error = new ClawStakError('something broke');
    expect(error.message).toBe('something broke');
    expect(error.name).toBe('ClawStakError');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ClawStakError);
  });
});

describe('ClawStakAuthError', () => {
  it('is an instance of both ClawStakError and Error', () => {
    const error = new ClawStakAuthError('bad key');
    expect(error.name).toBe('ClawStakAuthError');
    expect(error.message).toBe('bad key');
    expect(error).toBeInstanceOf(ClawStakError);
    expect(error).toBeInstanceOf(Error);
  });
});

describe('ClawStakApiError', () => {
  it('stores status, code, and details', () => {
    const details = { field: 'slug', reason: 'taken' };
    const error = new ClawStakApiError('Conflict', 409, 'SLUG_TAKEN', details);
    expect(error.status).toBe(409);
    expect(error.code).toBe('SLUG_TAKEN');
    expect(error.details).toEqual(details);
    expect(error.name).toBe('ClawStakApiError');
  });

  it('works without optional code and details', () => {
    const error = new ClawStakApiError('Not Found', 404);
    expect(error.code).toBeUndefined();
    expect(error.details).toBeUndefined();
  });

  describe('isRetryable', () => {
    it('returns true for 500 server error', () => {
      expect(new ClawStakApiError('err', 500).isRetryable).toBe(true);
    });

    it('returns true for 502 bad gateway', () => {
      expect(new ClawStakApiError('err', 502).isRetryable).toBe(true);
    });

    it('returns true for 429 rate limit', () => {
      expect(new ClawStakApiError('err', 429).isRetryable).toBe(true);
    });

    it('returns false for 400 bad request', () => {
      expect(new ClawStakApiError('err', 400).isRetryable).toBe(false);
    });

    it('returns false for 404 not found', () => {
      expect(new ClawStakApiError('err', 404).isRetryable).toBe(false);
    });

    it('returns false for 422 validation error', () => {
      expect(new ClawStakApiError('err', 422).isRetryable).toBe(false);
    });
  });

  describe('convenience getters', () => {
    it('isRateLimited is true only for 429', () => {
      expect(new ClawStakApiError('err', 429).isRateLimited).toBe(true);
      expect(new ClawStakApiError('err', 500).isRateLimited).toBe(false);
    });

    it('isNotFound is true only for 404', () => {
      expect(new ClawStakApiError('err', 404).isNotFound).toBe(true);
      expect(new ClawStakApiError('err', 400).isNotFound).toBe(false);
    });

    it('isValidationError is true only for 422', () => {
      expect(new ClawStakApiError('err', 422).isValidationError).toBe(true);
      expect(new ClawStakApiError('err', 400).isValidationError).toBe(false);
    });
  });
});

describe('ClawStakValidationError', () => {
  it('stores the offending field name', () => {
    const error = new ClawStakValidationError('bad slug', 'slug');
    expect(error.field).toBe('slug');
    expect(error.message).toBe('bad slug');
    expect(error.name).toBe('ClawStakValidationError');
    expect(error).toBeInstanceOf(ClawStakError);
  });
});

describe('ClawStakTimeoutError', () => {
  it('stores timeout duration and produces descriptive message', () => {
    const error = new ClawStakTimeoutError(5000);
    expect(error.timeoutMs).toBe(5000);
    expect(error.message).toBe('Request timed out after 5000ms');
    expect(error.name).toBe('ClawStakTimeoutError');
    expect(error).toBeInstanceOf(ClawStakError);
  });
});
```

### FILE: tests/sdk/clawstak/client.test.ts
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClawStakClient } from '../../../src/sdk/clawstak/client';
import {
  ClawStakAuthError,
  ClawStakApiError,
  ClawStakTimeoutError,
} from '../../../src/sdk/clawstak/errors';

// Helper to build a mock Response
function mockResponse(
  status: number,
  body?: unknown,
  statusText = 'OK',
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: vi.fn().mockResolvedValue(body ?? {}),
    headers: new Headers(),
  } as unknown as Response;
}

describe('ClawStakClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('throws ClawStakAuthError when apiKey is empty', () => {
      expect(() => new ClawStakClient({ apiKey: '' })).toThrow(ClawStakAuthError);
    });

    it('throws ClawStakAuthError when apiKey is whitespace', () => {
      expect(() => new ClawStakClient({ apiKey: '   ' })).toThrow(ClawStakAuthError);
    });

    it('accepts a valid apiKey', () => {
      expect(() => new ClawStakClient({ apiKey: 'cs_test_123' })).not.toThrow();
    });

    it('strips trailing slashes from baseUrl', () => {
      const client = new ClawStakClient({
        apiKey: 'cs_test_123',
        baseUrl: 'https://custom.api.com/v2///',
      });
      // We can verify by making a request and checking the URL
      const fetchMock = vi.fn().mockResolvedValue(mockResponse(200, { ok: true }));
      globalThis.fetch = fetchMock;

      client.request('GET', '/health');

      // Advance so the request completes
      return vi.advanceTimersByTimeAsync(0).then(() => {
        const calledUrl = fetchMock.mock.calls[0][0] as string;
        expect(calledUrl).toBe('https://custom.api.com/v2/health');
      });
    });
  });

  describe('request', () => {
    let client: ClawStakClient;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      client = new ClawStakClient({
        apiKey: 'cs_test_key',
        retries: 2,
        timeout: 5000,
      });
      fetchMock = vi.fn();
      globalThis.fetch = fetchMock;
    });

    it('sends GET request with correct headers', async () => {
      fetchMock.mockResolvedValue(mockResponse(200, { id: '1' }));

      const result = await client.request('GET', '/agents');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe('https://api.clawstak.ai/v1/agents');
      expect(options.method).toBe('GET');
      expect(options.headers.Authorization).toBe('Bearer cs_test_key');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers.Accept).toBe('application/json');
      expect(options.headers['User-Agent']).toMatch(/^clawstak-sdk-ts\//);
      expect(options.headers['X-Request-Id']).toBeDefined();
      expect(options.body).toBeUndefined();
      expect(result).toEqual({ id: '1' });
    });

    it('sends POST request with JSON body', async () => {
      const body = { name: 'test-agent' };
      fetchMock.mockResolvedValue(mockResponse(200, { id: '1', name: 'test-agent' }));

      await client.request('POST', '/agents', body);

      const [, options] = fetchMock.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify(body));
    });

    it('handles 204 No Content by returning undefined', async () => {
      fetchMock.mockResolvedValue(mockResponse(204));

      const result = await client.request('DELETE', '/agents/1');

      expect(result).toBeUndefined();
    });

    it('throws ClawStakApiError on 4xx with error body', async () => {
      fetchMock.mockResolvedValue(
        mockResponse(422, {
          message: 'Invalid slug',
          code: 'VALIDATION_ERROR',
          details: { field: 'slug' },
        }),
      );

      await expect(client.request('POST', '/agents')).rejects.toThrow(
        ClawStakApiError,
      );

      try {
        await client.request('POST', '/agents');
      } catch (err) {
        const apiErr = err as ClawStakApiError;
        expect(apiErr.status).toBe(422);
        expect(apiErr.code).toBe('VALIDATION_ERROR');
        expect(apiErr.details).toEqual({ field: 'slug' });
      }
    });

    it('does not retry non-retryable client errors (4xx)', async () => {
      fetchMock.mockResolvedValue(
        mockResponse(400, { message: 'Bad Request' }),
      );

      await expect(client.request('POST', '/agents')).rejects.toThrow(
        ClawStakApiError,
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('retries on 500 server error up to maxRetries', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(500, { message: 'Internal Error' }))
        .mockResolvedValueOnce(mockResponse(500, { message: 'Internal Error' }))
        .mockResolvedValueOnce(mockResponse(200, { ok: true }));

      const resultPromise = client.request('GET', '/health');

      // Advance past backoff timers
      await vi.advanceTimersByTimeAsync(60_000);

      const result = await resultPromise;
      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('retries on 429 rate limit', async () => {
      fetchMock
        .mockResolvedValueOnce(mockResponse(429, { message: 'Rate limited' }))
        .mockResolvedValueOnce(mockResponse(200, { ok: true }));

      const resultPromise = client.request('GET', '/health');
      await vi.advanceTimersByTimeAsync(60_000);

      const result = await resultPromise;
      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('throws after exhausting all retries on server error', async () => {
      fetchMock.mockResolvedValue(
        mockResponse(500, { message: 'Internal Error' }),
      );

      const resultPromise = client.request('GET', '/health');
      await vi.advanceTimersByTimeAsync(120_000);

      await expect(resultPromise).rejects.toThrow(ClawStakApiError);
      // initial + 2 retries = 3
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('throws ClawStakTimeoutError when request times out', async () => {
      fetchMock.mockImplementation(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );

      const resultPromise = client.request('GET', '/slow');
      await vi.advanceTimersByTimeAsync(120_000);

      await expect(resultPromise).rejects.toThrow(ClawStakTimeoutError);
    });

    it('handles non-JSON error response gracefully', async () => {
      const resp = {
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: vi.fn().mockRejectedValue(new Error('not JSON')),
        headers: new Headers(),
      } as unknown as Response;
      fetchMock.mockResolvedValue(resp);

      const resultPromise = client.request('GET', '/health');
      await vi.advanceTimersByTimeAsync(120_000);

      await expect(resultPromise).rejects.toThrow(ClawStakApiError);
    });
  });
});
```

### FILE: tests/sdk/clawstak/agents.test.ts
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentsAPI } from '../../../src/sdk/clawstak/agents';
import { ClawStakClient } from '../../../src/sdk/clawstak/client';
import { ClawStakValidationError } from '../../../src/sdk/clawstak/errors';
import type {
  Agent,
  RegisterAgentRequest,
  CreateApiKeyRequest,
  CreateApiKeyResponse,
  ApiKey,
} from '../../../src/sdk/clawstak/types';

// Mock the client — we test HTTP concerns in client.test.ts
vi.mock('../../../src/sdk/clawstak/client', () => ({
  ClawStakClient: vi.fn(),
}));

function createMockClient(): ClawStakClient {
  return {
    request: vi.fn(),
  } as unknown as ClawStakClient;
}

function validRegistration(
  overrides?: Partial<RegisterAgentRequest>,
): RegisterAgentRequest {
  return {
    name: 'My Test Agent',
    slug: 'my-test-agent',
    description: 'A test agent for unit tests',
    soulMd: '# Soul\nI am a testing agent.',
    permissions: ['articles:publish'],
    ...overrides,
  };
}

function fakeAgent(overrides?: Partial<Agent>): Agent {
  return {
    id: 'agent_123',
    slug: 'my-test-agent',
    name: 'My Test Agent',
    description: 'A test agent',
    soulMd: '# Soul',
    status: 'draft',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('AgentsAPI', () => {
  let client: ClawStakClient;
  let agents: AgentsAPI;

  beforeEach(() => {
    client = createMockClient();
    agents = new AgentsAPI(client);
  });

  describe('register', () => {
    it('sends a POST to /agents with the registration payload', async () => {
      const reg = validRegistration();
      const expected = fakeAgent();
      vi.mocked(client.request).mockResolvedValue(expected);

      const result = await agents.register(reg);

      expect(client.request).toHaveBeenCalledWith('POST', '/agents', reg);
      expect(result).toEqual(expected);
    });

    describe('validation', () => {
      it('rejects empty name', async () => {
        await expect(
          agents.register(validRegistration({ name: '' })),
        ).rejects.toThrow(ClawStakValidationError);
        await expect(
          agents.register(validRegistration({ name: '   ' })),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('rejects empty slug', async () => {
        await expect(
          agents.register(validRegistration({ slug: '' })),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('rejects invalid slug formats', async () => {
        const badSlugs = [
          'AB', // too short
          '-bad-start', // starts with hyphen
          'bad-end-', // ends with hyphen
          'UPPERCASE', // uppercase
          'a', // too short (< 3 chars)
          'ab', // still too short
          'has spaces',
          'has_underscores',
          'a'.repeat(65), // too long
        ];

        for (const slug of badSlugs) {
          await expect(
            agents.register(validRegistration({ slug })),
          ).rejects.toThrow(ClawStakValidationError);
        }
      });

      it('accepts valid slug formats', async () => {
        vi.mocked(client.request).mockResolvedValue(fakeAgent());

        const goodSlugs = [
          'abc', // minimum 3 chars
          'my-agent',
          'agent-123',
          '123-agent',
          'a1b',
          'a'.repeat(64), // max 64 chars
        ];

        for (const slug of goodSlugs) {
          await expect(
            agents.register(validRegistration({ slug })),
          ).resolves.toBeDefined();
        }
      });

      it('rejects empty description', async () => {
        await expect(
          agents.register(validRegistration({ description: '' })),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('rejects empty soulMd', async () => {
        await expect(
          agents.register(validRegistration({ soulMd: '' })),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('rejects empty permissions array', async () => {
        await expect(
          agents.register(validRegistration({ permissions: [] })),
        ).rejects.toThrow(ClawStakValidationError);
      });
    });
  });

  describe('get', () => {
    it('fetches an agent by ID', async () => {
      const expected = fakeAgent();
      vi.mocked(client.request).mockResolvedValue(expected);

      const result = await agents.get('agent_123');

      expect(client.request).toHaveBeenCalledWith('GET', '/agents/agent_123');
      expect(result).toEqual(expected);
    });

    it('encodes special characters in agentId', async () => {
      vi.mocked(client.request).mockResolvedValue(fakeAgent());

      await agents.get('agent/with/slashes');

      expect(client.request).toHaveBeenCalledWith(
        'GET',
        '/agents/agent%2Fwith%2Fslashes',
      );
    });

    it('throws validation error for empty agentId', async () => {
      await expect(agents.get('')).rejects.toThrow(ClawStakValidationError);
      await expect(agents.get('  ')).rejects.toThrow(ClawStakValidationError);
    });
  });

  describe('list', () => {
    it('returns array of agents from response wrapper', async () => {
      const agentsList = [fakeAgent(), fakeAgent({ id: 'agent_456' })];
      vi.mocked(client.request).mockResolvedValue({ agents: agentsList });

      const result = await agents.list();

      expect(client.request).toHaveBeenCalledWith('GET', '/agents');
      expect(result).toEqual(agentsList);
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no agents exist', async () => {
      vi.mocked(client.request).mockResolvedValue({ agents: [] });

      const result = await agents.list();
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('sends PATCH with partial updates', async () => {
      const updated = fakeAgent({ name: 'Updated Name' });
      vi.mocked(client.request).mockResolvedValue(updated);

      const result = await agents.update('agent_123', { name: 'Updated Name' });

      expect(client.request).toHaveBeenCalledWith(
        'PATCH',
        '/agents/agent_123',
        { name: 'Updated Name' },
      );
      expect(result.name).toBe('Updated Name');
    });

    it('throws validation error for empty agentId', async () => {
      await expect(agents.update('', { name: 'x' })).rejects.toThrow(
        ClawStakValidationError,
      );
    });
  });

  describe('createApiKey', () => {
    const validKeyRequest: CreateApiKeyRequest = {
      name: 'Production Key',
      permissions: ['articles:publish', 'articles:read'],
    };

    it('creates an API key for an agent', async () => {
      const response: CreateApiKeyResponse = {
        apiKey: {
          id: 'key_abc',
          prefix: 'cs_live_',
          permissions: ['articles:publish', 'articles:read'],
          createdAt: '2025-01-01T00:00:00Z',
        },
        secret: 'cs_live_full_secret_key',
      };
      vi.mocked(client.request).mockResolvedValue(response);

      const result = await agents.createApiKey('agent_123', validKeyRequest);

      expect(client.request).toHaveBeenCalledWith(
        'POST',
        '/agents/agent_123/api-keys',
        validKeyRequest,
      );
      expect(result.secret).toBe('cs_live_full_secret_key');
    });

    it('rejects empty agentId', async () => {
      await expect(
        agents.createApiKey('', validKeyRequest),
      ).rejects.toThrow(ClawStakValidationError);
    });

    it('rejects empty key name', async () => {
      await expect(
        agents.createApiKey('agent_123', { ...validKeyRequest, name: '' }),
      ).rejects.toThrow(ClawStakValidationError);
    });

    it('rejects empty permissions', async () => {
      await expect(
        agents.createApiKey('agent_123', { ...validKeyRequest, permissions: [] }),
      ).rejects.toThrow(ClawStakValidationError);
    });
  });

  describe('listApiKeys', () => {
    it('returns API keys from response wrapper', async () => {
      const keys: ApiKey[] = [
        {
          id: 'key_1',
          prefix: 'cs_live_',
          permissions: ['articles:publish'],
          createdAt: '2025-01-01T00:00:00Z',
        },
      ];
      vi.mocked(client.request).mockResolvedValue({ keys });

      const result = await agents.listApiKeys('agent_123');

      expect(client.request).toHaveBeenCalledWith(
        'GET',
        '/agents/agent_123/api-keys',
      );
      expect(result).toEqual(keys);
    });

    it('rejects empty agentId', async () => {
      await expect(agents.listApiKeys('')).rejects.toThrow(
        ClawStakValidationError,
      );
    });
  });

  describe('revokeApiKey', () => {
    it('sends DELETE for the specified key', async () => {
      vi.mocked(client.request).mockResolvedValue(undefined);

      await agents.revokeApiKey('agent_123', 'key_abc');

      expect(client.request).toHaveBeenCalledWith(
        'DELETE',
        '/agents/agent_123/api-keys/key_abc',
      );
    });

    it('rejects empty agentId', async () => {
      await expect(agents.revokeApiKey('', 'key_abc')).rejects.toThrow(
        ClawStakValidationError,
      );
    });

    it('rejects empty keyId', async () => {
      await expect(agents.revokeApiKey('agent_123', '')).rejects.toThrow(
        ClawStakValidationError,
      );
    });
  });
});
```

### FILE: tests/sdk/clawstak/articles.test.ts
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticlesAPI } from '../../../src/sdk/clawstak/articles';
import { ClawStakClient } from '../../../src/sdk/clawstak/client';
import { ClawStakValidationError } from '../../../src/sdk/clawstak/errors';
import type { Article, PublishArticleRequest } from '../../../src/sdk/clawstak/types';

vi.mock('../../../src/sdk/clawstak/client', () => ({
  ClawStakClient: vi.fn(),
}));

function createMockClient(): ClawStakClient {
  return { request: vi.fn() } as unknown as ClawStakClient;
}

function validArticle(
  overrides?: Partial<PublishArticleRequest>,
): PublishArticleRequest {
  return {
    title: 'How to Build AI Agents',
    content: '# Introduction\nThis is a guide to building AI agents.',
    tags: ['ai', 'agents', 'tutorial'],
    ...overrides,
  };
}

function fakeArticle(overrides?: Partial<Article>): Article {
  return {
    id: 'art_123',
    agentId: 'agent_123',
    title: 'How to Build AI Agents',
    slug: 'how-to-build-ai-agents',
    content: '# Introduction',
    status: 'draft',
    tags: ['ai'],
    metadata: { sourceUrls: [] },
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('ArticlesAPI', () => {
  let client: ClawStakClient;
  let articles: ArticlesAPI;

  beforeEach(() => {
    client = createMockClient();
    articles = new ArticlesAPI(client);
  });

  describe('publish', () => {
    it('sends POST to create an article', async () => {
      const req = validArticle();
      const expected = fakeArticle();
      vi.mocked(client.request).mockResolvedValue(expected);

      const result = await articles.publish('agent_123', req);

      expect(client.request).toHaveBeenCalledWith(
        'POST',
        '/agents/agent_123/articles',
        req,
      );
      expect(result).toEqual(expected);
    });

    it('passes publishImmediately flag', async () => {
      const req = validArticle({ publishImmediately: true });
      vi.mocked(client.request).mockResolvedValue(
        fakeArticle({ status: 'published' }),
      );

      const result = await articles.publish('agent_123', req);

      const [, , body] = vi.mocked(client.request).mock.calls[0];
      expect((body as PublishArticleRequest).publishImmediately).toBe(true);
      expect(result.status).toBe('published');
    });

    describe('validation', () => {
      it('rejects empty agentId', async () => {
        await expect(
          articles.publish('', validArticle()),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('rejects empty title', async () => {
        await expect(
          articles.publish('agent_123', validArticle({ title: '' })),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('rejects whitespace-only title', async () => {
        await expect(
          articles.publish('agent_123', validArticle({ title: '   ' })),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('rejects title longer than 200 characters', async () => {
        const longTitle = 'a'.repeat(201);
        await expect(
          articles.publish('agent_123', validArticle({ title: longTitle })),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('accepts title of exactly 200 characters', async () => {
        vi.mocked(client.request).mockResolvedValue(fakeArticle());
        const title = 'a'.repeat(200);
        await expect(
          articles.publish('agent_123', validArticle({ title })),
        ).resolves.toBeDefined();
      });

      it('rejects empty content', async () => {
        await expect(
          articles.publish('agent_123', validArticle({ content: '' })),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('rejects non-array tags', async () => {
        await expect(
          articles.publish(
            'agent_123',
            validArticle({ tags: 'not-an-array' as unknown as string[] }),
          ),
        ).rejects.toThrow(ClawStakValidationError);
      });

      it('accepts empty tags array', async () => {
        vi.mocked(client.request).mockResolvedValue(fakeArticle());
        await expect(
          articles.publish('agent_123', validArticle({ tags: [] })),
        ).resolves.toBeDefined();
      });
    });
  });

  describe('get', () => {
    it('fetches article by agentId and articleId', async () => {
      const expected = fakeArticle();
      vi.mocked(client.request).mockResolvedValue(expected);

      const result = await articles.get('agent_123', 'art_123');

      expect(client.request).toHaveBeenCalledWith(
        'GET',
        '/agents/agent_123/articles/art_123',
      );
      expect(result).toEqual(expected);
    });

    it('rejects empty agentId', async () => {
      await expect(articles.get('', 'art_123')).rejects.toThrow(
        ClawStakValidationError,
      );
    });

    it('rejects empty articleId', async () => {
      await expect(articles.get('agent_123', '')).rejects.toThrow(
        ClawStakValidationError,
      );
    });
  });

  describe('list', () => {
    it('lists

