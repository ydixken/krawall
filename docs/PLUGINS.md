# Plugin Development Guide

Krawall's plugin system lets you extend connectors with additional capabilities - conversation history management, custom auth flows, token usage extraction, audit logging, and more - without modifying the connector code itself.

Plugins hook into the connector lifecycle via a priority-ordered pipeline. Every message passes through all active plugins before reaching the connector and after returning from it.

---

## Table of Contents

- [Architecture](#architecture)
- [Built-in Plugins](#built-in-plugins)
- [Writing a Custom Plugin](#writing-a-custom-plugin)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Configuration Schema](#configuration-schema)
- [Priority System](#priority-system)
- [Plugin API Endpoints](#plugin-api-endpoints)
- [Interface Reference](#interface-reference)

---

## Architecture

```
                        Plugin Pipeline (sorted by priority)
                        ====================================

  Session Executor
       |
       v
  +-----------+     +-----------+     +-----------+     +-----------+
  | Auth (10) | --> | OpenAI(50)| --> | Custom    | --> | Audit(200)|
  |           |     |           |     |   (100)   |     |           |
  | onConnect |     | beforeSend|     | beforeSend|     | beforeSend|
  +-----------+     +-----------+     +-----------+     +-----------+
                                                              |
                                                              v
                                                        [ Connector ]
                                                        sendMessage()
                                                              |
                                                              v
  +-----------+     +-----------+     +-----------+     +-----------+
  | Audit(200)| <-- | Custom    | <-- | OpenAI(50)| <-- | Auth (10) |
  |           |     |   (100)   |     |           |     |           |
  |afterReceiv|     |afterReceiv|     |afterReceiv|     |afterReceiv|
  +-----------+     +-----------+     +-----------+     +-----------+
```

Plugins are plain objects implementing the `ConnectorPlugin` interface. They register themselves with `PluginLoader` on import and execute their hooks in priority order (lower number runs first).

Key concepts:

- **Stateful context** - each plugin receives a `PluginContext` with a mutable `state` object that persists across messages within a session
- **Non-destructive** - plugins can modify messages and responses, or leave them unchanged (passthrough)
- **Auto-registration** - plugins call `PluginLoader.register()` at module scope, so importing the file is enough

Source files:

| File | Purpose |
|------|---------|
| `lib/connectors/plugins/types.ts` | Interfaces (`ConnectorPlugin`, `PluginContext`, `PluginConfigField`) |
| `lib/connectors/plugins/loader.ts` | `PluginLoader` - registration, discovery, config validation |
| `app/api/plugins/route.ts` | Plugin imports and REST API |

---

## Built-in Plugins

Krawall ships with 4 plugins:

| Plugin | ID | Priority | Compatible | Purpose |
|--------|----|----------|------------|---------|
| Multi-Step Auth | `multi-step-auth` | 10 | HTTP_REST | Auth handshake before API calls (e.g., POST /auth/token, then use bearer token) |
| OpenAI | `openai` | 50 | HTTP_REST | Conversation history, system prompts, token usage normalization for OpenAI-compatible APIs |
| Anthropic | `anthropic` | 50 | HTTP_REST | Conversation history with role alternation, token usage extraction for Anthropic APIs |
| Audit Log | `audit` | 200 | HTTP_REST, WEBSOCKET, GRPC, SSE | Passive logging of all messages with timestamps, response times, and token counts |

Source: `lib/connectors/plugins/`

---

## Writing a Custom Plugin

### Step 1: Create the plugin file

Create a new file in `lib/connectors/plugins/`. The file should export a `ConnectorPlugin` object and auto-register it.

```typescript
// lib/connectors/plugins/my-plugin.ts
import type { ConnectorPlugin, PluginContext, PluginConfigField } from "./types";
import type { ConnectorResponse, MessageMetadata } from "../base";
import { PluginLoader } from "./loader";
```

### Step 2: Define metadata

Every plugin needs an `id`, `name`, `description`, `version`, and `compatibleConnectors`:

```typescript
const myPlugin: ConnectorPlugin = {
  id: "my-plugin",
  name: "My Custom Plugin",
  description: "Does something useful with every message.",
  version: "1.0.0",
  priority: 100, // default priority - runs after auth/provider plugins
  compatibleConnectors: ["HTTP_REST", "WEBSOCKET"],
};
```

### Step 3: Add configuration (optional)

If your plugin needs user-configurable settings, define a `configSchema`. Krawall's UI auto-generates a form from this schema.

```typescript
const configSchema: PluginConfigField[] = [
  {
    key: "maxRetries",
    label: "Max Retries",
    type: "number",
    required: false,
    default: 3,
    description: "Maximum number of retries on failure.",
  },
  {
    key: "mode",
    label: "Mode",
    type: "select",
    required: true,
    default: "strict",
    description: "Processing mode.",
    options: [
      { label: "Strict", value: "strict" },
      { label: "Lenient", value: "lenient" },
    ],
  },
];

const myPlugin: ConnectorPlugin = {
  // ...metadata
  configSchema,
};
```

Supported field types: `"string"`, `"number"`, `"boolean"`, `"select"`, `"json"`.

### Step 4: Implement lifecycle hooks

See [Lifecycle Hooks](#lifecycle-hooks) for the full reference. Here's a minimal example:

```typescript
const myPlugin: ConnectorPlugin = {
  id: "my-plugin",
  name: "My Custom Plugin",
  description: "Logs message lengths and adds a custom header.",
  version: "1.0.0",
  priority: 100,
  compatibleConnectors: ["HTTP_REST"],

  async initialize(context: PluginContext): Promise<void> {
    context.state.messageCount = 0;
  },

  async beforeSend(
    message: string,
    _metadata: MessageMetadata | undefined,
    context: PluginContext
  ): Promise<{ message: string; metadata?: Record<string, unknown> }> {
    context.state.messageCount = (context.state.messageCount as number) + 1;
    console.log(`[my-plugin] Sending message #${context.state.messageCount} (${message.length} chars)`);
    return { message }; // pass through unmodified
  },

  async afterReceive(
    response: ConnectorResponse,
    context: PluginContext
  ): Promise<{ response: ConnectorResponse; metadata?: Record<string, unknown> }> {
    console.log(`[my-plugin] Received ${response.content.length} chars`);
    return { response }; // pass through unmodified
  },

  onError(error: Error, hookName: string, context: PluginContext): void {
    console.error(`[my-plugin] Error in ${hookName} for session ${context.sessionId}:`, error.message);
  },
};
```

### Step 5: Auto-register

At the bottom of your file, register the plugin and export it:

```typescript
// Auto-register
PluginLoader.register(myPlugin);

export { myPlugin };
```

### Step 6: Import in the API route

Add your plugin import to `app/api/plugins/route.ts` so it loads on startup:

```typescript
import "@/lib/connectors/plugins/openai-plugin";
import "@/lib/connectors/plugins/anthropic-plugin";
import "@/lib/connectors/plugins/multi-step-auth-plugin";
import "@/lib/connectors/plugins/audit-plugin";
import "@/lib/connectors/plugins/my-plugin"; // <-- add this
```

That's it. Your plugin is now active and will appear in the `/api/plugins` endpoint.

---

## Lifecycle Hooks

All hooks are optional and async (except `onError`). They execute in priority order.

### `initialize(context)`

Called once when a session starts. Use it to set up initial state.

```typescript
async initialize(context: PluginContext): Promise<void> {
  context.state.messages = [];
  context.state.tokenCount = 0;
}
```

### `onConnect(config, context)`

Called when the connector establishes a connection. Can modify and return a new `ConnectorConfig` - useful for auth flows that need to inject tokens or headers.

```typescript
async onConnect(config: ConnectorConfig, context: PluginContext): Promise<ConnectorConfig> {
  const token = await fetchAuthToken();
  return {
    ...config,
    authType: "CUSTOM_HEADER",
    authConfig: { headers: { Authorization: `Bearer ${token}` } },
  };
}
```

### `beforeSend(message, metadata, context)`

Called before each message is sent to the connector. Can modify the message string or add metadata.

```typescript
async beforeSend(
  message: string,
  metadata: MessageMetadata | undefined,
  context: PluginContext
): Promise<{ message: string; metadata?: Record<string, unknown> }> {
  // Prepend a prefix to every message
  return { message: `[test] ${message}` };
}
```

### `afterReceive(response, context)`

Called after the connector returns a response. Can transform the response content, normalize token usage, or enrich metadata.

```typescript
async afterReceive(
  response: ConnectorResponse,
  context: PluginContext
): Promise<{ response: ConnectorResponse; metadata?: Record<string, unknown> }> {
  // Normalize token usage from a custom format
  if (response.metadata.rawResponse?.usage) {
    response.metadata.tokenUsage = {
      promptTokens: response.metadata.rawResponse.usage.input,
      completionTokens: response.metadata.rawResponse.usage.output,
      totalTokens: response.metadata.rawResponse.usage.total,
    };
  }
  return { response };
}
```

### `onDisconnect(context)`

Called when the session ends. Clean up plugin state.

```typescript
async onDisconnect(context: PluginContext): Promise<void> {
  context.state.messages = [];
  context.state.tokenCount = 0;
}
```

### `onError(error, hookName, context)`

Synchronous error handler called when any of this plugin's hooks throws. Use it for logging or recovery.

```typescript
onError(error: Error, hookName: string, context: PluginContext): void {
  console.error(`[my-plugin] ${hookName} failed for session ${context.sessionId}:`, error.message);
}
```

---

## Configuration Schema

Plugins can declare a `configSchema` array of `PluginConfigField` objects. The UI auto-generates a configuration form from this schema, and the values are passed to hooks via `context.pluginConfig`.

### Field types

| Type | Description | Extra properties |
|------|-------------|-----------------|
| `string` | Free text input | - |
| `number` | Numeric input | - |
| `boolean` | Toggle/checkbox | - |
| `select` | Dropdown | `options: { label, value }[]` |
| `json` | JSON editor | Validated on parse |

### Example

```typescript
const configSchema: PluginConfigField[] = [
  {
    key: "apiKey",
    label: "API Key",
    type: "string",
    required: true,
    description: "Your service API key.",
  },
  {
    key: "verbose",
    label: "Verbose Logging",
    type: "boolean",
    required: false,
    default: false,
    description: "Enable detailed log output.",
  },
];
```

### Accessing config in hooks

```typescript
async initialize(context: PluginContext): Promise<void> {
  const apiKey = context.pluginConfig?.apiKey as string;
  const verbose = (context.pluginConfig?.verbose as boolean) ?? false;
}
```

### Validating config via API

```
POST /api/plugins/{id}/validate-config
Content-Type: application/json

{ "apiKey": "sk-...", "verbose": true }
```

Returns `{ valid: true, errors: [] }` or `{ valid: false, errors: ["Field 'apiKey' is required"] }`.

---

## Priority System

Priority determines execution order. Lower numbers run first.

| Range | Convention | Examples |
|-------|-----------|----------|
| 1-20 | Auth and security | Multi-Step Auth (10) |
| 21-80 | Provider-specific logic | OpenAI (50), Anthropic (50) |
| 81-150 | General-purpose (default: 100) | Custom plugins |
| 151-255 | Observability and logging | Audit (200) |

If no `priority` is set, it defaults to `100`.

Auth plugins run first so tokens are available before other plugins process messages. Audit plugins run last so they observe the final state of every message.

---

## Plugin API Endpoints

### List all plugins

```
GET /api/plugins
```

Returns an array of plugin metadata:

```json
[
  {
    "id": "openai",
    "name": "OpenAI Conversation Plugin",
    "description": "Manages conversation history...",
    "version": "1.0.0",
    "compatibleConnectors": ["HTTP_REST"],
    "priority": 50
  }
]
```

### Get plugin details

```
GET /api/plugins/{id}
```

Returns the full plugin metadata including config schema.

### Get config schema

```
GET /api/plugins/{id}/config-schema
```

Returns the configuration schema for UI form generation:

```json
{
  "pluginId": "openai",
  "pluginName": "OpenAI Conversation Plugin",
  "configSchema": [
    {
      "key": "model",
      "label": "Model",
      "type": "select",
      "required": true,
      "default": "gpt-4",
      "description": "OpenAI model to use",
      "options": [
        { "label": "GPT-4", "value": "gpt-4" },
        { "label": "GPT-4o", "value": "gpt-4o" }
      ]
    }
  ]
}
```

### Validate config

```
POST /api/plugins/{id}/validate-config
Content-Type: application/json

{ "model": "gpt-4", "temperature": 0.7 }
```

Returns:

```json
{ "valid": true, "errors": [] }
```

---

## Interface Reference

### ConnectorPlugin

```typescript
interface ConnectorPlugin {
  id: string;                          // unique identifier
  name: string;                        // human-readable name
  description: string;                 // what this plugin does
  version: string;                     // semver version
  compatibleConnectors: string[];      // e.g. ["HTTP_REST", "WEBSOCKET"]
  priority?: number;                   // execution order (default 100)
  minConnectorVersion?: string;        // minimum connector version
  configSchema?: PluginConfigField[];  // UI config schema

  initialize?(context: PluginContext): Promise<void>;
  onConnect?(config: ConnectorConfig, context: PluginContext): Promise<ConnectorConfig>;
  beforeSend?(message: string, metadata: MessageMetadata | undefined, context: PluginContext): Promise<{ message: string; metadata?: Record<string, unknown> }>;
  afterReceive?(response: ConnectorResponse, context: PluginContext): Promise<{ response: ConnectorResponse; metadata?: Record<string, unknown> }>;
  onDisconnect?(context: PluginContext): Promise<void>;
  onError?(error: Error, hookName: string, context: PluginContext): void;
}
```

### PluginContext

```typescript
interface PluginContext {
  sessionId: string;                       // current session ID
  targetId: string;                        // target being tested
  state: Record<string, unknown>;          // mutable state (persists across messages)
  connector: BaseConnector;                // underlying connector instance
  pluginConfig?: Record<string, unknown>;  // user-provided config values
}
```

### PluginConfigField

```typescript
interface PluginConfigField {
  key: string;                                          // config key
  label: string;                                        // UI label
  type: "string" | "number" | "boolean" | "select" | "json";
  required: boolean;
  default?: unknown;
  description: string;
  options?: { label: string; value: string }[];         // for select type
}
```

### PluginMetadata

```typescript
interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  compatibleConnectors: string[];
  priority?: number;
}
```

---

## Full Example: Response Logger Plugin

A complete plugin that logs response statistics to the console and tracks cumulative metrics in state.

```typescript
// lib/connectors/plugins/response-logger-plugin.ts
import type { ConnectorPlugin, PluginContext, PluginConfigField } from "./types";
import type { ConnectorResponse, MessageMetadata } from "../base";
import { PluginLoader } from "./loader";

const configSchema: PluginConfigField[] = [
  {
    key: "logLevel",
    label: "Log Level",
    type: "select",
    required: false,
    default: "info",
    description: "Verbosity of log output.",
    options: [
      { label: "Info", value: "info" },
      { label: "Debug", value: "debug" },
    ],
  },
  {
    key: "slowThresholdMs",
    label: "Slow Threshold (ms)",
    type: "number",
    required: false,
    default: 2000,
    description: "Responses slower than this are flagged as slow.",
  },
];

const responseLoggerPlugin: ConnectorPlugin = {
  id: "response-logger",
  name: "Response Logger Plugin",
  description: "Logs response times and flags slow responses.",
  version: "1.0.0",
  priority: 190,
  compatibleConnectors: ["HTTP_REST", "WEBSOCKET", "GRPC", "SSE"],
  configSchema,

  async initialize(context: PluginContext): Promise<void> {
    context.state.totalResponses = 0;
    context.state.totalResponseTimeMs = 0;
    context.state.slowResponses = 0;
    context.state.slowThresholdMs = (context.pluginConfig?.slowThresholdMs as number) ?? 2000;
    context.state.logLevel = (context.pluginConfig?.logLevel as string) ?? "info";
  },

  async beforeSend(
    message: string,
    _metadata: MessageMetadata | undefined,
    context: PluginContext
  ): Promise<{ message: string; metadata?: Record<string, unknown> }> {
    context.state.sendTimestamp = Date.now();
    return { message };
  },

  async afterReceive(
    response: ConnectorResponse,
    context: PluginContext
  ): Promise<{ response: ConnectorResponse; metadata?: Record<string, unknown> }> {
    const responseTimeMs = context.state.sendTimestamp
      ? Date.now() - (context.state.sendTimestamp as number)
      : response.metadata.responseTimeMs;

    context.state.totalResponses = (context.state.totalResponses as number) + 1;
    context.state.totalResponseTimeMs = (context.state.totalResponseTimeMs as number) + responseTimeMs;

    const threshold = context.state.slowThresholdMs as number;
    if (responseTimeMs > threshold) {
      context.state.slowResponses = (context.state.slowResponses as number) + 1;
      console.warn(
        `[response-logger] SLOW response: ${responseTimeMs}ms (threshold: ${threshold}ms) - session ${context.sessionId}`
      );
    } else if (context.state.logLevel === "debug") {
      console.log(`[response-logger] Response: ${responseTimeMs}ms - session ${context.sessionId}`);
    }

    return { response };
  },

  async onDisconnect(context: PluginContext): Promise<void> {
    const total = context.state.totalResponses as number;
    const avgMs = total > 0
      ? Math.round((context.state.totalResponseTimeMs as number) / total)
      : 0;

    console.log(
      `[response-logger] Session ${context.sessionId} summary: ${total} responses, avg ${avgMs}ms, ${context.state.slowResponses} slow`
    );
  },

  onError(error: Error, hookName: string, context: PluginContext): void {
    console.error(`[response-logger] Error in ${hookName} for session ${context.sessionId}:`, error.message);
  },
};

// Auto-register
PluginLoader.register(responseLoggerPlugin);

export { responseLoggerPlugin };
```
