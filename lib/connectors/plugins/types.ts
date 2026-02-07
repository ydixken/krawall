import type { BaseConnector, ConnectorConfig, ConnectorResponse, MessageMetadata } from "../base";

/**
 * ConnectorPlugin Interface
 *
 * Plugins extend base connectors with additional capabilities such as
 * conversation history management, custom auth flows, streaming support,
 * and provider-specific token usage extraction.
 */
export interface ConnectorPlugin {
  /** Unique plugin identifier */
  id: string;

  /** Human-readable plugin name */
  name: string;

  /** Plugin description */
  description: string;

  /** Connector types this plugin is compatible with */
  compatibleConnectors: string[];

  /**
   * Hook called before sending a message.
   * Can modify the message or metadata before it reaches the connector.
   */
  beforeSend?(
    message: string,
    metadata: MessageMetadata | undefined,
    context: PluginContext
  ): Promise<{ message: string; metadata?: MessageMetadata }>;

  /**
   * Hook called after receiving a response.
   * Can transform the response before it's returned to the caller.
   */
  afterReceive?(
    response: ConnectorResponse,
    context: PluginContext
  ): Promise<ConnectorResponse>;

  /**
   * Hook called when establishing a connection.
   * Useful for multi-step auth handshakes.
   */
  onConnect?(config: ConnectorConfig, context: PluginContext): Promise<ConnectorConfig>;

  /**
   * Hook called when disconnecting.
   * Useful for cleanup of plugin-managed state.
   */
  onDisconnect?(context: PluginContext): Promise<void>;

  /**
   * Initialize plugin state for a session.
   */
  initialize?(context: PluginContext): Promise<void>;
}

/**
 * Plugin Context
 *
 * Shared state container passed to plugin hooks.
 * Allows plugins to maintain state across messages within a session.
 */
export interface PluginContext {
  /** The session ID this plugin instance is operating in */
  sessionId: string;

  /** The target ID being tested */
  targetId: string;

  /** Mutable state store for the plugin */
  state: Record<string, unknown>;

  /** The underlying connector instance */
  connector: BaseConnector;

  /** Plugin-specific configuration */
  pluginConfig?: Record<string, unknown>;
}

/**
 * Plugin Metadata
 *
 * Registration info for the plugin loader.
 */
export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  compatibleConnectors: string[];
}
