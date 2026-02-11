# n8n API Reference for ClawStak Integration

> Sourced from https://docs.n8n.io/api/ and the n8n OpenAPI v1.1.1 spec.
> Last updated: 2026-02-11

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Base URL Construction](#base-url-construction)
4. [Workflow Endpoints](#workflow-endpoints)
5. [Execution Endpoints](#execution-endpoints)
6. [Credential Endpoints](#credential-endpoints)
7. [Tag Endpoints](#tag-endpoints)
8. [Webhook Configuration](#webhook-configuration)
9. [Triggering Workflows via Webhook](#triggering-workflows-via-webhook)
10. [Pagination](#pagination)
11. [Environment Variables](#environment-variables)
12. [TypeScript Client Helper](#typescript-client-helper)
13. [Error Handling](#error-handling)
14. [Workflow JSON Schema](#workflow-json-schema)
15. [ClawStak Integration Patterns](#clawstak-integration-patterns)

---

## Quick Start

```bash
# Test connectivity - list all workflows
curl -s \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: your-api-key-here" \
  "http://localhost:5678/api/v1/workflows" | jq .
```

---

## Authentication

n8n uses API key authentication via the `X-N8N-API-KEY` header on every request.

### Creating an API Key

1. Log in to n8n.
2. Go to **Settings > n8n API**.
3. Select **Create an API key**.
4. Choose a **Label** and set an **Expiration time**.
5. Enterprise plans can assign **Scopes** to limit access.
6. Copy the key -- it is shown only once.

### Using the API Key

Pass the key as an HTTP header on every request:

```
X-N8N-API-KEY: <your-api-key>
```

### curl Example

```bash
curl -X GET \
  "http://localhost:5678/api/v1/workflows?active=true" \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: n8n_api_xxxxxxxxxxxxxxxxxxxxx"
```

### TypeScript Example

```typescript
const N8N_API_KEY = process.env.N8N_API_KEY!;
const N8N_BASE_URL = process.env.N8N_BASE_URL || "http://localhost:5678";

const headers = {
  "Accept": "application/json",
  "Content-Type": "application/json",
  "X-N8N-API-KEY": N8N_API_KEY,
};

const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows?active=true`, { headers });
const data = await res.json();
```

---

## Base URL Construction

### Self-Hosted

```
{N8N_PROTOCOL}://{N8N_HOST}:{N8N_PORT}/{N8N_PATH}/api/v1
```

Defaults: `http://localhost:5678/api/v1`

### n8n Cloud

```
https://{instance}.app.n8n.cloud/api/v1
```

### API Playground (self-hosted only)

```
{N8N_HOST}:{N8N_PORT}/{N8N_PATH}/api/v1/docs
```

The Swagger UI playground is disabled on Cloud. For self-hosted, set `N8N_PUBLIC_API_SWAGGERUI_DISABLED=false` (default).

---

## Workflow Endpoints

### List All Workflows

```
GET /api/v1/workflows
```

**Query Parameters:**

| Parameter         | Type    | Default | Description                              |
|-------------------|---------|---------|------------------------------------------|
| `active`          | boolean | -       | Filter by active/inactive status         |
| `tags`            | string  | -       | Comma-separated tag names to filter by   |
| `name`            | string  | -       | Filter by workflow name                  |
| `projectId`       | string  | -       | Filter by project ID                     |
| `excludePinnedData` | boolean | -     | Skip pinned data in response             |
| `limit`           | number  | 100     | Results per page (max 250)               |
| `cursor`          | string  | -       | Pagination cursor from previous response |

**curl:**

```bash
curl -X GET \
  "http://localhost:5678/api/v1/workflows?active=true&limit=50" \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

**TypeScript:**

```typescript
async function listWorkflows(active?: boolean): Promise<WorkflowListResponse> {
  const params = new URLSearchParams();
  if (active !== undefined) params.set("active", String(active));

  const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows?${params}`, { headers });
  if (!res.ok) throw new Error(`n8n API error: ${res.status} ${res.statusText}`);
  return res.json();
}
```

**Response (200):**

```json
{
  "data": [
    {
      "id": "2tUt1wbLX592XDdX",
      "name": "My Workflow",
      "active": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-16T14:22:00.000Z",
      "nodes": [ /* ... */ ],
      "connections": { /* ... */ },
      "settings": { /* ... */ },
      "tags": [
        { "id": "abc123", "name": "production" }
      ]
    }
  ],
  "nextCursor": "MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA"
}
```

---

### Get a Single Workflow

```
GET /api/v1/workflows/{id}
```

**curl:**

```bash
curl -X GET \
  "http://localhost:5678/api/v1/workflows/2tUt1wbLX592XDdX" \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

**TypeScript:**

```typescript
async function getWorkflow(workflowId: string): Promise<Workflow> {
  const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}`, { headers });
  if (!res.ok) throw new Error(`n8n API error: ${res.status}`);
  return res.json();
}
```

---

### Create a Workflow

```
POST /api/v1/workflows
```

**Request Body (required fields: `name`, `nodes`, `connections`, `settings`):**

```json
{
  "name": "ClawStak Intake Workflow",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "clawstak-intake",
        "responseMode": "lastNode"
      },
      "webhookId": "clawstak-intake-001"
    },
    {
      "name": "Process Data",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [450, 300],
      "parameters": {
        "jsCode": "return items;"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [{ "node": "Process Data", "type": "main", "index": 0 }]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

**curl:**

```bash
curl -X POST \
  "http://localhost:5678/api/v1/workflows" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -d '{
    "name": "ClawStak Intake",
    "nodes": [],
    "connections": {},
    "settings": { "executionOrder": "v1" }
  }'
```

**TypeScript:**

```typescript
async function createWorkflow(workflow: CreateWorkflowPayload): Promise<Workflow> {
  const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows`, {
    method: "POST",
    headers,
    body: JSON.stringify(workflow),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create workflow: ${res.status} - ${err}`);
  }
  return res.json();
}
```

---

### Update a Workflow

```
PUT /api/v1/workflows/{id}
```

Same body shape as create. Note: if the workflow is published, the updated version is automatically re-published.

**curl:**

```bash
curl -X PUT \
  "http://localhost:5678/api/v1/workflows/2tUt1wbLX592XDdX" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -d '{ "name": "Updated Name", "nodes": [], "connections": {}, "settings": {} }'
```

---

### Delete a Workflow

```
DELETE /api/v1/workflows/{id}
```

**curl:**

```bash
curl -X DELETE \
  "http://localhost:5678/api/v1/workflows/2tUt1wbLX592XDdX" \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

---

### Activate (Publish) a Workflow

```
POST /api/v1/workflows/{id}/activate
```

**Optional Request Body:**

```json
{
  "versionId": "abc123-def456",
  "name": "Version label",
  "description": "Version description"
}
```

**curl:**

```bash
curl -X POST \
  "http://localhost:5678/api/v1/workflows/2tUt1wbLX592XDdX/activate" \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

**TypeScript:**

```typescript
async function activateWorkflow(workflowId: string): Promise<Workflow> {
  const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows/${workflowId}/activate`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error(`Failed to activate: ${res.status}`);
  return res.json();
}
```

---

### Deactivate a Workflow

```
POST /api/v1/workflows/{id}/deactivate
```

**curl:**

```bash
curl -X POST \
  "http://localhost:5678/api/v1/workflows/2tUt1wbLX592XDdX/deactivate" \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

---

### Transfer a Workflow to Another Project

```
PUT /api/v1/workflows/{id}/transfer
```

**Request Body:**

```json
{ "destinationProjectId": "target-project-id" }
```

---

### Get Workflow Tags

```
GET /api/v1/workflows/{id}/tags
```

---

### Update Workflow Tags

```
PUT /api/v1/workflows/{id}/tags
```

**Request Body:**

```json
[{ "id": "tag-id-1" }, { "id": "tag-id-2" }]
```

---

## Execution Endpoints

### List All Executions

```
GET /api/v1/executions
```

**Query Parameters:**

| Parameter     | Type    | Default | Description                                       |
|---------------|---------|---------|---------------------------------------------------|
| `includeData` | boolean | false   | Include detailed execution data in response        |
| `status`      | string  | -       | Filter: `canceled`, `error`, `running`, `success`, `waiting` |
| `workflowId`  | string  | -       | Filter executions by workflow ID                   |
| `projectId`   | string  | -       | Filter by project ID                               |
| `limit`       | number  | 100     | Results per page (max 250)                         |
| `cursor`      | string  | -       | Pagination cursor                                  |

**curl:**

```bash
# Get recent failed executions for a specific workflow
curl -X GET \
  "http://localhost:5678/api/v1/executions?workflowId=2tUt1wbLX592XDdX&status=error&includeData=true" \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

**TypeScript:**

```typescript
interface ExecutionFilters {
  workflowId?: string;
  status?: "canceled" | "error" | "running" | "success" | "waiting";
  includeData?: boolean;
  limit?: number;
  cursor?: string;
}

async function listExecutions(filters: ExecutionFilters = {}): Promise<ExecutionListResponse> {
  const params = new URLSearchParams();
  if (filters.workflowId) params.set("workflowId", filters.workflowId);
  if (filters.status) params.set("status", filters.status);
  if (filters.includeData) params.set("includeData", "true");
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.cursor) params.set("cursor", filters.cursor);

  const res = await fetch(`${N8N_BASE_URL}/api/v1/executions?${params}`, { headers });
  if (!res.ok) throw new Error(`n8n API error: ${res.status}`);
  return res.json();
}
```

**Response (200):**

```json
{
  "data": [
    {
      "id": 1000,
      "finished": true,
      "mode": "webhook",
      "retryOf": null,
      "retrySuccessId": null,
      "startedAt": "2024-01-16T14:22:00.000Z",
      "stoppedAt": "2024-01-16T14:22:01.500Z",
      "workflowId": 1001,
      "waitTill": null,
      "status": "success",
      "customData": {},
      "data": { /* only if includeData=true */ }
    }
  ],
  "nextCursor": "MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA"
}
```

**Execution status values:** `canceled`, `crashed`, `error`, `new`, `running`, `success`, `unknown`, `waiting`

**Execution mode values:** `cli`, `error`, `integrated`, `internal`, `manual`, `retry`, `trigger`, `webhook`, `evaluation`, `chat`

---

### Get a Single Execution

```
GET /api/v1/executions/{id}
```

**Query Parameters:**

| Parameter     | Type    | Description                               |
|---------------|---------|-------------------------------------------|
| `includeData` | boolean | Include detailed execution data           |

**curl:**

```bash
curl -X GET \
  "http://localhost:5678/api/v1/executions/1000?includeData=true" \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

**TypeScript:**

```typescript
async function getExecution(executionId: number, includeData = false): Promise<Execution> {
  const res = await fetch(
    `${N8N_BASE_URL}/api/v1/executions/${executionId}?includeData=${includeData}`,
    { headers }
  );
  if (!res.ok) throw new Error(`n8n API error: ${res.status}`);
  return res.json();
}
```

---

### Delete an Execution

```
DELETE /api/v1/executions/{id}
```

---

### Retry a Failed Execution

```
POST /api/v1/executions/{id}/retry
```

**Optional Request Body:**

```json
{
  "loadWorkflow": true
}
```

When `loadWorkflow` is `true`, the retry uses the latest saved version of the workflow instead of the version that was active when the execution originally ran.

**curl:**

```bash
curl -X POST \
  "http://localhost:5678/api/v1/executions/1000/retry" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" \
  -d '{ "loadWorkflow": true }'
```

---

## Credential Endpoints

### List Credentials

```
GET /api/v1/credentials
```

Returns metadata only -- secrets are not included. Only available to instance owner/admin.

### Create a Credential

```
POST /api/v1/credentials
```

### Get a Credential

```
GET /api/v1/credentials/{id}
```

### Delete a Credential

```
DELETE /api/v1/credentials/{id}
```

### Get Credential Schema

```
GET /api/v1/credentials/schema/{credentialTypeName}
```

This returns the required fields for a specific credential type. Find `credentialTypeName` by exporting a workflow JSON and examining the `credentials` object on nodes.

**curl:**

```bash
curl -X GET \
  "http://localhost:5678/api/v1/credentials/schema/httpBasicAuth" \
  -H "Accept: application/json" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

### Transfer a Credential

```
PUT /api/v1/credentials/{id}/transfer
```

---

## Tag Endpoints

| Method   | Path             | Description         |
|----------|------------------|---------------------|
| `GET`    | `/api/v1/tags`   | List all tags       |
| `POST`   | `/api/v1/tags`   | Create a tag        |
| `GET`    | `/api/v1/tags/{id}` | Get a tag        |
| `PUT`    | `/api/v1/tags/{id}` | Update a tag     |
| `DELETE` | `/api/v1/tags/{id}` | Delete a tag     |

**Tag Object:**

```json
{
  "id": "2tUt1wbLX592XDdX",
  "name": "production",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-16T14:22:00.000Z"
}
```

---

## Webhook Configuration

### How n8n Webhooks Work

Workflows that start with a **Webhook node** expose HTTP endpoints. When the workflow is **active (published)**, the webhook URL becomes live and can receive requests.

### Webhook URL Format

**Production webhook** (workflow must be active):

```
{N8N_HOST}:{N8N_PORT}/{N8N_ENDPOINT_WEBHOOK}/{webhook-path}
```

Default: `http://localhost:5678/webhook/{webhook-path}`

**Test webhook** (for development, only active during manual test):

```
{N8N_HOST}:{N8N_PORT}/{N8N_ENDPOINT_WEBHOOK_TEST}/{webhook-path}
```

Default: `http://localhost:5678/webhook-test/{webhook-path}`

**Waiting webhook** (for workflows with Wait node):

```
{N8N_HOST}:{N8N_PORT}/{N8N_ENDPOINT_WEBHOOK_WAIT}/{webhook-path}
```

Default: `http://localhost:5678/webhook-waiting/{webhook-path}`

### Behind a Reverse Proxy

Set `WEBHOOK_URL` to the full public URL so n8n generates correct webhook URLs:

```env
WEBHOOK_URL=https://n8n.yourdomain.com/
```

---

## Triggering Workflows via Webhook

The primary method to trigger an n8n workflow programmatically is by calling its **Webhook node URL**. This is NOT the same as the REST API -- it is a direct HTTP call to the workflow's webhook endpoint.

### Step 1: Create a Workflow with a Webhook Trigger

Include a Webhook node as the first node:

```json
{
  "name": "Webhook",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "position": [250, 300],
  "parameters": {
    "httpMethod": "POST",
    "path": "clawstak-intake",
    "responseMode": "lastNode",
    "options": {}
  }
}
```

### Step 2: Activate the Workflow

```bash
curl -X POST \
  "http://localhost:5678/api/v1/workflows/{workflow-id}/activate" \
  -H "X-N8N-API-KEY: $N8N_API_KEY"
```

### Step 3: Call the Webhook

```bash
# Trigger the workflow by POST-ing to its webhook URL
curl -X POST \
  "http://localhost:5678/webhook/clawstak-intake" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "new_analysis_request",
    "payload": {
      "matchId": "abc-123",
      "sport": "football",
      "timestamp": "2024-01-16T14:22:00Z"
    }
  }'
```

**TypeScript:**

```typescript
async function triggerN8nWorkflow(
  webhookPath: string,
  payload: Record<string, unknown>
): Promise<unknown> {
  const webhookBaseUrl = process.env.N8N_WEBHOOK_URL || `${N8N_BASE_URL}/webhook`;
  const res = await fetch(`${webhookBaseUrl}/${webhookPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Webhook call failed: ${res.status} - ${errorText}`);
  }
  return res.json();
}

// Usage
const result = await triggerN8nWorkflow("clawstak-intake", {
  event: "new_analysis_request",
  payload: { matchId: "abc-123", sport: "football" },
});
```

### Webhook Response Modes

The Webhook node's `responseMode` parameter controls when/what gets sent back:

| Mode                  | Description                                                   |
|-----------------------|---------------------------------------------------------------|
| `onReceived`          | Respond immediately with 200 when request is received         |
| `lastNode`            | Respond with the output of the last node in the workflow      |
| `responseNode`        | Respond using a dedicated "Respond to Webhook" node           |

### Setting Up Callbacks (Webhook --> Your App)

For async workflows, configure a callback by adding an **HTTP Request node** at the end of your workflow that POSTs results back to your application:

```json
{
  "name": "Callback to ClawStak",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4,
  "position": [850, 300],
  "parameters": {
    "method": "POST",
    "url": "https://your-app.com/api/n8n-callback",
    "sendBody": true,
    "bodyParameters": {
      "parameters": [
        { "name": "executionId", "value": "={{ $execution.id }}" },
        { "name": "workflowId", "value": "={{ $workflow.id }}" },
        { "name": "status", "value": "complete" },
        { "name": "result", "value": "={{ JSON.stringify($input.all()) }}" }
      ]
    }
  }
}
```

---

## Pagination

All list endpoints return paginated results.

- **Default page size:** 100
- **Maximum page size:** 250
- **Pagination method:** Cursor-based

### Response Shape

```json
{
  "data": [ /* array of objects */ ],
  "nextCursor": "MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA"
}
```

When `nextCursor` is `null`, there are no more pages.

### Paginating Through All Results

**TypeScript:**

```typescript
async function fetchAllWorkflows(): Promise<Workflow[]> {
  const allWorkflows: Workflow[] = [];
  let cursor: string | null = null;

  do {
    const params = new URLSearchParams({ limit: "250" });
    if (cursor) params.set("cursor", cursor);

    const res = await fetch(`${N8N_BASE_URL}/api/v1/workflows?${params}`, { headers });
    const page: WorkflowListResponse = await res.json();

    allWorkflows.push(...page.data);
    cursor = page.nextCursor;
  } while (cursor);

  return allWorkflows;
}
```

---

## Environment Variables

### ClawStak .env.local Configuration

```bash
# n8n Instance Connection
N8N_BASE_URL=https://your-n8n-instance.example.com    # Self-hosted or n8n Cloud URL
N8N_API_KEY=n8n_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   # From Azure Key Vault: n8n-api-key
N8N_WEBHOOK_URL=https://your-n8n-instance.example.com/webhook
N8N_WEBHOOK_SECRET=your-shared-hmac-secret             # For verifying n8n callbacks
```

### n8n API Configuration

| Variable                            | Type    | Default | Description                                        |
|-------------------------------------|---------|---------|----------------------------------------------------|
| `N8N_PUBLIC_API_DISABLED`           | boolean | `false` | Set `true` to disable the public API entirely      |
| `N8N_PUBLIC_API_ENDPOINT`           | string  | `api`   | Path prefix for API endpoints                      |
| `N8N_PUBLIC_API_SWAGGERUI_DISABLED` | boolean | `false` | Set `true` to disable Swagger UI playground        |

### n8n Server / Deployment

| Variable                  | Type   | Default          | Description                                           |
|---------------------------|--------|------------------|-------------------------------------------------------|
| `N8N_HOST`                | string | `localhost`      | Hostname n8n runs on                                  |
| `N8N_PORT`                | number | `5678`           | HTTP port                                             |
| `N8N_PROTOCOL`            | string | `http`           | `http` or `https`                                     |
| `N8N_PATH`                | string | `/`              | Base path n8n deploys to                              |
| `N8N_EDITOR_BASE_URL`     | string | -                | Public URL for the editor (used in emails, SAML)      |
| `N8N_ENCRYPTION_KEY`      | string | auto-generated   | Key for encrypting credentials in DB                  |
| `N8N_USER_FOLDER`         | string | `user-folder`    | Path where n8n stores .n8n directory                  |
| `N8N_SSL_KEY`             | string | -                | SSL key path (for HTTPS)                              |
| `N8N_SSL_CERT`            | string | -                | SSL certificate path (for HTTPS)                      |
| `N8N_LISTEN_ADDRESS`      | string | `::`             | IP address to bind to                                 |
| `N8N_PUSH_BACKEND`        | string | `websocket`      | `websocket` or `sse` for UI updates                   |

### n8n Webhook / Endpoint Paths

| Variable                            | Type   | Default             | Description                                     |
|-------------------------------------|--------|---------------------|-------------------------------------------------|
| `N8N_ENDPOINT_REST`                 | string | `rest`              | Path for internal REST endpoint                 |
| `N8N_ENDPOINT_WEBHOOK`              | string | `webhook`           | Path for production webhook endpoint            |
| `N8N_ENDPOINT_WEBHOOK_TEST`         | string | `webhook-test`      | Path for test webhook endpoint                  |
| `N8N_ENDPOINT_WEBHOOK_WAIT`         | string | `webhook-waiting`   | Path for waiting webhook endpoint               |
| `WEBHOOK_URL`                       | string | -                   | Full public webhook URL (behind reverse proxy)  |
| `N8N_DISABLE_PRODUCTION_MAIN_PROCESS` | boolean | `false`           | Offload production webhooks from main process   |
| `N8N_PAYLOAD_SIZE_MAX`              | number | `16`                | Max payload size in MiB                         |
| `N8N_FORMDATA_FILE_SIZE_MAX`        | number | `200`               | Max file size in form-data webhooks (MiB)       |

### n8n Execution Settings

| Variable                                       | Type    | Default  | Description                                                |
|------------------------------------------------|---------|----------|------------------------------------------------------------|
| `EXECUTIONS_MODE`                              | string  | `regular`| `regular` or `queue` (for scaling)                         |
| `EXECUTIONS_TIMEOUT`                           | number  | `-1`     | Default timeout in seconds (-1 = disabled)                 |
| `EXECUTIONS_TIMEOUT_MAX`                       | number  | `3600`   | Max timeout users can set per workflow                     |
| `EXECUTIONS_DATA_SAVE_ON_ERROR`                | string  | `all`    | `all` or `none`                                            |
| `EXECUTIONS_DATA_SAVE_ON_SUCCESS`              | string  | `all`    | `all` or `none`                                            |
| `EXECUTIONS_DATA_SAVE_ON_PROGRESS`             | boolean | `false`  | Save progress per node                                     |
| `EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS`       | boolean | `true`   | Save manual execution data                                 |
| `EXECUTIONS_DATA_PRUNE`                        | boolean | `true`   | Auto-delete old execution data                             |
| `EXECUTIONS_DATA_MAX_AGE`                      | number  | `336`    | Max execution age in hours before pruning                  |
| `EXECUTIONS_DATA_PRUNE_MAX_COUNT`              | number  | `10000`  | Max executions to keep (0 = no limit)                      |
| `N8N_CONCURRENCY_PRODUCTION_LIMIT`             | number  | `-1`     | Max concurrent production executions (-1 = unlimited)      |
| `N8N_AI_TIMEOUT_MAX`                           | number  | `3600000`| HTTP timeout (ms) for AI/LLM nodes                        |

### n8n Database

| Variable                   | Type   | Default      | Description                       |
|----------------------------|--------|--------------|-----------------------------------|
| `DB_TYPE`                  | string | `sqlite`     | `sqlite` or `postgresdb`          |
| `DB_POSTGRESDB_HOST`       | string | `localhost`  | PostgreSQL host                   |
| `DB_POSTGRESDB_PORT`       | number | `5432`       | PostgreSQL port                   |
| `DB_POSTGRESDB_DATABASE`   | string | `n8n`        | Database name                     |
| `DB_POSTGRESDB_USER`       | string | `postgres`   | Database user                     |
| `DB_POSTGRESDB_PASSWORD`   | string | -            | Database password                 |
| `DB_POSTGRESDB_SCHEMA`     | string | `public`     | PostgreSQL schema                 |
| `DB_POSTGRESDB_SSL_ENABLED`| boolean| `false`      | Enable SSL                        |
| `DB_TABLE_PREFIX`          | string | -            | Table name prefix                 |

### n8n Security

| Variable                              | Type    | Default | Description                                           |
|---------------------------------------|---------|---------|-------------------------------------------------------|
| `N8N_BLOCK_ENV_ACCESS_IN_NODE`        | boolean | `false` | Block env variable access in Code node                |
| `N8N_SECURE_COOKIE`                   | boolean | `true`  | HTTPS-only cookies                                    |
| `N8N_SAMESITE_COOKIE`                 | string  | `lax`   | `strict`, `lax`, or `none`                            |

### n8n Metrics

| Variable                                        | Type    | Default  | Description                              |
|-------------------------------------------------|---------|----------|------------------------------------------|
| `N8N_METRICS`                                   | boolean | `false`  | Enable `/metrics` endpoint               |
| `N8N_METRICS_PREFIX`                            | string  | `n8n_`   | Prefix for metric names                  |
| `N8N_METRICS_INCLUDE_DEFAULT_METRICS`           | boolean | `true`   | Include system/node.js metrics           |
| `N8N_METRICS_INCLUDE_WORKFLOW_ID_LABEL`         | boolean | `false`  | Add workflow ID label to metrics         |
| `N8N_METRICS_INCLUDE_API_ENDPOINTS`             | boolean | `false`  | Expose API endpoint metrics              |

### File-Based Configuration

You can append `_FILE` to most variables to load values from a file:

```env
DB_POSTGRESDB_PASSWORD_FILE=/run/secrets/db_password
N8N_ENCRYPTION_KEY_FILE=/run/secrets/encryption_key
```

---

## TypeScript Client Helper

A reusable n8n API client class for integration code:

```typescript
interface N8nConfig {
  baseUrl: string;
  apiKey: string;
}

interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: Node[];
  connections: Record<string, unknown>;
  settings: WorkflowSettings;
  tags?: Tag[];
}

interface Node {
  id?: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, { id: string; name: string }>;
  webhookId?: string;
  disabled?: boolean;
}

interface WorkflowSettings {
  executionOrder?: string;
  saveExecutionProgress?: boolean;
  saveDataErrorExecution?: "all" | "none";
  saveDataSuccessExecution?: "all" | "none";
  executionTimeout?: number;
  errorWorkflow?: string;
  timezone?: string;
  callerPolicy?: "any" | "none" | "workflowsFromAList" | "workflowsFromSameOwner";
  callerIds?: string;
  availableInMCP?: boolean;
}

interface Execution {
  id: number;
  finished: boolean;
  mode: string;
  status: "canceled" | "crashed" | "error" | "new" | "running" | "success" | "unknown" | "waiting";
  startedAt: string;
  stoppedAt: string | null;
  workflowId: number;
  retryOf: number | null;
  retrySuccessId: number | null;
  waitTill: string | null;
  customData: Record<string, unknown>;
  data?: Record<string, unknown>;
}

interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

class N8nClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: N8nConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.headers = {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "X-N8N-API-KEY": config.apiKey,
    };
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`n8n API ${method} ${path} failed: ${res.status} - ${errorBody}`);
    }

    return res.json() as Promise<T>;
  }

  // --- Workflows ---

  async listWorkflows(params?: {
    active?: boolean;
    tags?: string;
    name?: string;
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResponse<Workflow>> {
    const qs = new URLSearchParams();
    if (params?.active !== undefined) qs.set("active", String(params.active));
    if (params?.tags) qs.set("tags", params.tags);
    if (params?.name) qs.set("name", params.name);
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.cursor) qs.set("cursor", params.cursor);
    const query = qs.toString();
    return this.request("GET", `/workflows${query ? `?${query}` : ""}`);
  }

  async getWorkflow(id: string): Promise<Workflow> {
    return this.request("GET", `/workflows/${id}`);
  }

  async createWorkflow(workflow: Omit<Workflow, "id" | "active" | "createdAt" | "updatedAt">): Promise<Workflow> {
    return this.request("POST", "/workflows", workflow);
  }

  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    return this.request("PUT", `/workflows/${id}`, workflow);
  }

  async deleteWorkflow(id: string): Promise<Workflow> {
    return this.request("DELETE", `/workflows/${id}`);
  }

  async activateWorkflow(id: string): Promise<Workflow> {
    return this.request("POST", `/workflows/${id}/activate`);
  }

  async deactivateWorkflow(id: string): Promise<Workflow> {
    return this.request("POST", `/workflows/${id}/deactivate`);
  }

  // --- Executions ---

  async listExecutions(params?: {
    workflowId?: string;
    status?: Execution["status"];
    includeData?: boolean;
    limit?: number;
    cursor?: string;
  }): Promise<PaginatedResponse<Execution>> {
    const qs = new URLSearchParams();
    if (params?.workflowId) qs.set("workflowId", params.workflowId);
    if (params?.status) qs.set("status", params.status);
    if (params?.includeData) qs.set("includeData", "true");
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.cursor) qs.set("cursor", params.cursor);
    const query = qs.toString();
    return this.request("GET", `/executions${query ? `?${query}` : ""}`);
  }

  async getExecution(id: number, includeData = false): Promise<Execution> {
    return this.request("GET", `/executions/${id}?includeData=${includeData}`);
  }

  async deleteExecution(id: number): Promise<Execution> {
    return this.request("DELETE", `/executions/${id}`);
  }

  async retryExecution(id: number, loadWorkflow = false): Promise<Execution> {
    return this.request("POST", `/executions/${id}/retry`, { loadWorkflow });
  }

  // --- Webhooks (direct workflow triggers) ---

  async triggerWebhook(
    webhookPath: string,
    payload: Record<string, unknown>,
    webhookBaseUrl?: string
  ): Promise<unknown> {
    const base = webhookBaseUrl || `${this.baseUrl}/webhook`;
    const res = await fetch(`${base}/${webhookPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Webhook trigger failed: ${res.status} - ${errorText}`);
    }
    return res.json();
  }

  // --- Tags ---

  async listTags(): Promise<PaginatedResponse<Tag>> {
    return this.request("GET", "/tags");
  }

  async createTag(name: string): Promise<Tag> {
    return this.request("POST", "/tags", { name });
  }

  // --- Credentials ---

  async listCredentials(): Promise<PaginatedResponse<unknown>> {
    return this.request("GET", "/credentials");
  }

  async getCredentialSchema(typeName: string): Promise<unknown> {
    return this.request("GET", `/credentials/schema/${typeName}`);
  }

  // --- Utility ---

  async pollExecutionUntilDone(
    executionId: number,
    intervalMs = 2000,
    timeoutMs = 60000
  ): Promise<Execution> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const exec = await this.getExecution(executionId, true);
      if (exec.status !== "running" && exec.status !== "new") {
        return exec;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Execution ${executionId} did not complete within ${timeoutMs}ms`);
  }
}

// --- Usage ---
const n8n = new N8nClient({
  baseUrl: process.env.N8N_BASE_URL || "http://localhost:5678",
  apiKey: process.env.N8N_API_KEY!,
});

// List active workflows
const workflows = await n8n.listWorkflows({ active: true });

// Trigger a webhook-based workflow
const result = await n8n.triggerWebhook("clawstak-intake", {
  event: "match_complete",
  data: { matchId: "abc-123" },
});

// Check execution status
const executions = await n8n.listExecutions({
  workflowId: "2tUt1wbLX592XDdX",
  status: "error",
  includeData: true,
});
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning                                                      |
|------|--------------------------------------------------------------|
| 200  | Success                                                      |
| 201  | Created (tags)                                               |
| 400  | Bad Request -- invalid input                                 |
| 401  | Unauthorized -- missing or invalid API key                   |
| 403  | Forbidden -- insufficient permissions                        |
| 404  | Not Found -- resource does not exist                         |
| 409  | Conflict -- e.g. duplicate tag name, execution cannot retry  |
| 415  | Unsupported Media Type                                       |

### Error Response Shape

```json
{
  "message": "Description of what went wrong"
}
```

### Common Issues

1. **401 Unauthorized**: Verify the `X-N8N-API-KEY` header is present and the key is valid.
2. **404 on webhook**: Workflow must be **active** for production webhooks to work.
3. **Webhook returns 404**: Check `N8N_ENDPOINT_WEBHOOK` matches the URL path you are calling.
4. **API disabled**: Check `N8N_PUBLIC_API_DISABLED` is not set to `true`.

### Retry Logic (TypeScript)

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { maxRetries?: number; baseDelay?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error("Unreachable");
}
```

---

## Workflow JSON Schema

### Minimal Workflow with Webhook Trigger

```json
{
  "name": "ClawStak Webhook Handler",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "clawstak-handler",
        "responseMode": "lastNode",
        "options": {}
      }
    },
    {
      "name": "Process",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [450, 300],
      "parameters": {
        "jsCode": "// Access webhook data via $input.all()\nconst items = $input.all();\nreturn items.map(item => ({\n  json: {\n    processed: true,\n    receivedAt: new Date().toISOString(),\n    data: item.json.body\n  }\n}));"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [{ "node": "Process", "type": "main", "index": 0 }]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1",
    "saveDataErrorExecution": "all",
    "saveDataSuccessExecution": "all"
  }
}
```

### Workflow with HTTP Callback

```json
{
  "name": "ClawStak Async Processor",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "parameters": {
        "httpMethod": "POST",
        "path": "clawstak-async",
        "responseMode": "onReceived",
        "options": {
          "responseData": "allEntries"
        }
      }
    },
    {
      "name": "Do Work",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [450, 300],
      "parameters": {
        "jsCode": "// Long-running processing here\nreturn $input.all();"
      }
    },
    {
      "name": "Callback",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4,
      "position": [650, 300],
      "parameters": {
        "method": "POST",
        "url": "={{ $json.body.callbackUrl || 'https://your-app.com/api/n8n-callback' }}",
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ executionId: $execution.id, workflowId: $workflow.id, status: 'complete', result: $json }) }}"
      }
    }
  ],
  "connections": {
    "Webhook": {
      "main": [
        [{ "node": "Do Work", "type": "main", "index": 0 }]
      ]
    },
    "Do Work": {
      "main": [
        [{ "node": "Callback", "type": "main", "index": 0 }]
      ]
    }
  },
  "settings": {
    "executionOrder": "v1"
  }
}
```

---

## ClawStak Integration Patterns

### Pattern A: Async Agent Execution (Fire-and-Callback)

Best for long-running agent tasks (analysis, report generation, multi-step reasoning).

```
ClawStak API                     n8n
    |                              |
    |-- POST /webhook/agent-exec ->|
    |<- 200 { received: true }  ---|
    |                              |-- [Process task]
    |                              |-- [Run AI agent]
    |                              |-- [Format results]
    |<- POST /api/webhooks/n8n  ---|
    |-- 200 { received: true }  -->|
```

**ClawStak triggers n8n:**

```typescript
// src/lib/n8n.ts - triggerAgentExecution()
const result = await n8nClient.triggerWebhook("clawstak-agent-execute", {
  executionId: "cs_exec_uuid",     // ClawStak's tracking ID
  agentId: agent.id,
  taskDescription: "Analyze Q4 earnings",
  callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/n8n`,
  metadata: { userId: user.id, priority: "normal" },
});
```

**n8n calls back to ClawStak:**

```typescript
// src/app/api/webhooks/n8n/route.ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  // Verify shared secret
  const secret = request.headers.get("x-clawstak-webhook-secret");
  if (secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Update execution record in DB
  await db.update(agentExecutions)
    .set({ status: body.status, resultPayload: body.result, completedAt: new Date() })
    .where(eq(agentExecutions.id, body.executionId));
  return NextResponse.json({ received: true });
}
```

### Pattern B: Synchronous Agent Execution

Best for quick tasks (< 10s) where the user waits for a result.

```typescript
const result = await n8nClient.triggerWebhook("clawstak-agent-quick", {
  agentId: agent.id,
  query: "What is the current sentiment on AAPL?",
});
// result contains the workflow's final output directly
```

### Pattern C: Polling Fallback

When callbacks are not possible (e.g., development/testing).

```typescript
const trigger = await n8nClient.triggerWebhook("clawstak-agent-execute", { ... });
const execution = await n8nClient.pollExecutionUntilDone(trigger.executionId, 2000, 60000);
```

### Recommended n8n Workflow Names for ClawStak

| Webhook Path                    | Purpose                                    |
|---------------------------------|--------------------------------------------|
| `clawstak-agent-execute`        | Main agent task execution pipeline         |
| `clawstak-agent-analyze`        | Market/data analysis workflow              |
| `clawstak-agent-publish`        | Auto-publish agent-generated reports       |
| `clawstak-agent-collaborate`    | Multi-agent collaboration orchestration    |
| `clawstak-agent-monitor`        | Periodic agent health/performance checks   |

---

## Complete Endpoint Reference

| Method   | Path                                     | Description                              |
|----------|------------------------------------------|------------------------------------------|
| `POST`   | `/api/v1/audit`                          | Generate security audit                  |
| `GET`    | `/api/v1/credentials`                    | List credentials                         |
| `POST`   | `/api/v1/credentials`                    | Create a credential                      |
| `GET`    | `/api/v1/credentials/{id}`               | Get a credential                         |
| `DELETE` | `/api/v1/credentials/{id}`               | Delete a credential                      |
| `GET`    | `/api/v1/credentials/schema/{type}`      | Get credential schema                    |
| `PUT`    | `/api/v1/credentials/{id}/transfer`      | Transfer credential to another project   |
| `GET`    | `/api/v1/executions`                     | List executions                          |
| `GET`    | `/api/v1/executions/{id}`                | Get an execution                         |
| `DELETE` | `/api/v1/executions/{id}`                | Delete an execution                      |
| `POST`   | `/api/v1/executions/{id}/retry`          | Retry a failed execution                 |
| `GET`    | `/api/v1/tags`                           | List tags                                |
| `POST`   | `/api/v1/tags`                           | Create a tag                             |
| `GET`    | `/api/v1/tags/{id}`                      | Get a tag                                |
| `PUT`    | `/api/v1/tags/{id}`                      | Update a tag                             |
| `DELETE` | `/api/v1/tags/{id}`                      | Delete a tag                             |
| `GET`    | `/api/v1/workflows`                      | List workflows                           |
| `POST`   | `/api/v1/workflows`                      | Create a workflow                        |
| `GET`    | `/api/v1/workflows/{id}`                 | Get a workflow                           |
| `PUT`    | `/api/v1/workflows/{id}`                 | Update a workflow                        |
| `DELETE` | `/api/v1/workflows/{id}`                 | Delete a workflow                        |
| `GET`    | `/api/v1/workflows/{id}/{versionId}`     | Get a specific workflow version          |
| `POST`   | `/api/v1/workflows/{id}/activate`        | Publish/activate a workflow              |
| `POST`   | `/api/v1/workflows/{id}/deactivate`      | Deactivate a workflow                    |
| `PUT`    | `/api/v1/workflows/{id}/transfer`        | Transfer workflow to another project     |
| `GET`    | `/api/v1/workflows/{id}/tags`            | Get tags for a workflow                  |
| `PUT`    | `/api/v1/workflows/{id}/tags`            | Update tags for a workflow               |

### Additional Endpoints (Enterprise / Source Control)

| Method   | Path                                     | Description                              |
|----------|------------------------------------------|------------------------------------------|
| `GET`    | `/api/v1/source-control/pull`            | Pull from source control                 |
| `POST`   | `/api/v1/source-control/pull`            | Pull from source control                 |
| `GET`    | `/api/v1/users`                          | List users                               |
| `GET`    | `/api/v1/users/{id}`                     | Get a user                               |
| `GET`    | `/api/v1/variables`                      | List variables                           |
| `POST`   | `/api/v1/variables`                      | Create a variable                        |
| `DELETE` | `/api/v1/variables/{id}`                 | Delete a variable                        |
| `GET`    | `/api/v1/projects`                       | List projects                            |
| `POST`   | `/api/v1/projects`                       | Create a project                         |
| `PUT`    | `/api/v1/projects/{id}`                  | Update a project                         |
| `DELETE` | `/api/v1/projects/{id}`                  | Delete a project                         |

---

## Source Documentation

- **API Overview:** https://docs.n8n.io/api/
- **Authentication:** https://docs.n8n.io/api/authentication/
- **Pagination:** https://docs.n8n.io/api/pagination/
- **API Playground:** https://docs.n8n.io/api/using-api-playground/
- **API Reference (Scalar):** https://docs.n8n.io/api/api-reference/
- **OpenAPI Spec:** https://docs.n8n.io/api/v1/openapi.yml
- **Creating Custom Nodes:** https://docs.n8n.io/integrations/creating-nodes/overview/
- **Environment Variables:** https://docs.n8n.io/hosting/configuration/environment-variables/
- **Endpoints Env Vars:** https://docs.n8n.io/hosting/configuration/environment-variables/endpoints/
- **Executions Env Vars:** https://docs.n8n.io/hosting/configuration/environment-variables/executions/
- **Deployment Env Vars:** https://docs.n8n.io/hosting/configuration/environment-variables/deployment/
- **Database Env Vars:** https://docs.n8n.io/hosting/configuration/environment-variables/database/
- **Security Env Vars:** https://docs.n8n.io/hosting/configuration/environment-variables/security/
