import type { ConnectorPlugin, PluginContext, PluginConfigField } from "./types";
import type { ConnectorConfig } from "../base";
import { PluginLoader } from "./loader";

const configSchema: PluginConfigField[] = [
  {
    key: "authEndpoint",
    label: "Auth Endpoint",
    type: "string",
    required: true,
    description: "URL to request the auth token from (e.g., https://api.example.com/auth/token).",
  },
  {
    key: "authMethod",
    label: "HTTP Method",
    type: "select",
    required: false,
    default: "POST",
    description: "HTTP method for the auth request.",
    options: [
      { label: "POST", value: "POST" },
      { label: "GET", value: "GET" },
    ],
  },
  {
    key: "authBody",
    label: "Auth Body",
    type: "json",
    required: false,
    description: "JSON body to send with the auth request (with credential placeholders).",
  },
  {
    key: "tokenPath",
    label: "Token Path",
    type: "string",
    required: false,
    default: "token",
    description: "JSON path to extract the token from the auth response (e.g., 'data.access_token').",
  },
  {
    key: "tokenHeader",
    label: "Token Header",
    type: "string",
    required: false,
    default: "Authorization",
    description: "Header name to set with the extracted token.",
  },
  {
    key: "tokenPrefix",
    label: "Token Prefix",
    type: "string",
    required: false,
    default: "Bearer",
    description: "Prefix for the token value in the header (e.g., 'Bearer').",
  },
];

/**
 * Multi-Step Auth Plugin
 *
 * Handles authentication flows that require an initial handshake before
 * the main API calls. For example:
 * 1. POST /auth/token with credentials -> receive bearer token
 * 2. Use bearer token for subsequent API calls
 */
const multiStepAuthPlugin: ConnectorPlugin = {
  id: "multi-step-auth",
  name: "Multi-Step Authentication Plugin",
  description:
    "Performs auth handshake (e.g., POST /auth/token) before main API calls. Supports token refresh.",
  version: "1.0.0",
  priority: 10,
  compatibleConnectors: ["HTTP_REST"],
  configSchema,

  async initialize(context: PluginContext): Promise<void> {
    context.state.authToken = null;
    context.state.tokenExpiresAt = null;
    context.state.refreshTimer = null;
  },

  async onConnect(
    config: ConnectorConfig,
    context: PluginContext
  ): Promise<ConnectorConfig> {
    const pluginConfig = context.pluginConfig || {};
    const authEndpoint = pluginConfig.authEndpoint as string;

    if (!authEndpoint) {
      throw new Error(
        "multi-step-auth plugin requires authEndpoint in pluginConfig"
      );
    }

    const authMethod = (pluginConfig.authMethod as string) || "POST";
    const authBody = pluginConfig.authBody as Record<string, unknown> | undefined;
    const tokenPath = (pluginConfig.tokenPath as string) || "token";
    const tokenHeader = (pluginConfig.tokenHeader as string) || "Authorization";
    const tokenPrefix = (pluginConfig.tokenPrefix as string) || "Bearer";

    // Perform the auth handshake
    const response = await fetch(authEndpoint, {
      method: authMethod,
      headers: { "Content-Type": "application/json" },
      body: authBody ? JSON.stringify(authBody) : undefined,
    });

    if (!response.ok) {
      throw new Error(
        `Auth handshake failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Extract token from response
    const token = getValueAtPath(data, tokenPath);
    if (!token) {
      throw new Error(
        `No token found at path "${tokenPath}" in auth response`
      );
    }

    context.state.authToken = token;

    // Modify the connector config to include the auth token
    const updatedConfig = { ...config };
    updatedConfig.authType = "CUSTOM_HEADER";
    updatedConfig.authConfig = {
      ...config.authConfig,
      headers: {
        ...(config.authConfig?.headers as Record<string, string>),
        [tokenHeader]: `${tokenPrefix} ${token}`,
      },
    };

    return updatedConfig;
  },

  async onDisconnect(context: PluginContext): Promise<void> {
    context.state.authToken = null;
    context.state.tokenExpiresAt = null;
  },

  onError(error: Error, hookName: string): void {
    console.error(`[multi-step-auth] Error in ${hookName}:`, error.message);
  },
};

/**
 * Get value at a dot-notation JSON path
 */
function getValueAtPath(obj: unknown, path: string): unknown {
  const cleanPath = path.startsWith("$.") ? path.slice(2) : path;
  const parts = cleanPath.split(/[.\[\]]/).filter(Boolean);
  let current: any = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

// Auto-register
PluginLoader.register(multiStepAuthPlugin);

export { multiStepAuthPlugin };
