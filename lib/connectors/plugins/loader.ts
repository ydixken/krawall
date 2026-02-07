import type { ConnectorPlugin, PluginMetadata } from "./types";
import { ConnectorRegistry } from "../registry";

/**
 * Plugin Loader
 *
 * Manages discovery, registration, and lifecycle of connector plugins.
 * Plugins are registered by ID and can be attached to connector instances.
 */
export class PluginLoader {
  private static plugins = new Map<string, ConnectorPlugin>();

  /**
   * Register a plugin
   */
  static register(plugin: ConnectorPlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" is already registered, overwriting`);
    }

    // Validate that compatible connectors exist
    for (const connectorType of plugin.compatibleConnectors) {
      if (!ConnectorRegistry.isRegistered(connectorType)) {
        console.warn(
          `Plugin "${plugin.id}" declares compatibility with "${connectorType}" which is not registered`
        );
      }
    }

    this.plugins.set(plugin.id, plugin);
  }

  /**
   * Unregister a plugin
   */
  static unregister(pluginId: string): boolean {
    return this.plugins.delete(pluginId);
  }

  /**
   * Get a plugin by ID
   */
  static get(pluginId: string): ConnectorPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all registered plugins
   */
  static getAll(): ConnectorPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins compatible with a given connector type
   */
  static getCompatible(connectorType: string): ConnectorPlugin[] {
    return Array.from(this.plugins.values()).filter((p) =>
      p.compatibleConnectors.includes(connectorType)
    );
  }

  /**
   * Get metadata for all registered plugins
   */
  static listMetadata(): PluginMetadata[] {
    return Array.from(this.plugins.values()).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      version: "1.0.0",
      compatibleConnectors: p.compatibleConnectors,
    }));
  }

  /**
   * Check if a plugin is registered
   */
  static isRegistered(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Clear all registered plugins (for testing)
   */
  static clear(): void {
    this.plugins.clear();
  }
}
