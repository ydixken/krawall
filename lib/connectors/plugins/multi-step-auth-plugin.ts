import type { ConnectorPlugin, PluginContext } from "./types";
import type { ConnectorConfig } from "../base";
import { PluginLoader } from "./loader";

/**
 * Multi-Step Auth Plugin
 *
 * Handles authentication flows that require an initial handshake before
 * the main API calls. For example:
 * 1. POST /auth/token with credentials -> receive bearer token
 * 2. Use bearer token for subsequent API calls
 *
 * Plugin config expects:
 * - authEndpoint: URL to request token from
 * - authMethod: HTTP method (default: POST)
 * - authBody: JSON body to send (with credential placeholders)
 * - tokenPath: JSON path to extract token from auth response
 * - tokenHeader: Header name to set (default: Authorization)
 * - tokenPrefix: Prefix for the token value (default: Bearer)
 * - refreshInterval: Optional token refresh interval in ms
 */
const multiStepAuthPlugin: ConnectorPlugin = {
  id: "multi-step-auth",
  name: "Multi-Step Authentication Plugin",
  description:
    "Performs auth handshake (e.g., POST /auth/token) before main API calls. Supports token refresh.",
  compatibleConnectors: ["HTTP_REST"],

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
