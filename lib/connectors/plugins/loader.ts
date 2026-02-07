import type { ConnectorPlugin, PluginConfigField, PluginMetadata } from "./types";
import { ConnectorRegistry } from "../registry";

const DEFAULT_PRIORITY = 100;

/**
 * Plugin Loader
 *
 * Manages discovery, registration, and lifecycle of connector plugins.
 * Plugins are registered by ID and can be attached to connector instances.
 * Hooks are executed in priority order (lower number = runs first).
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
   * Get plugins compatible with a given connector type, sorted by priority (ascending).
   */
  static getCompatible(connectorType: string): ConnectorPlugin[] {
    return Array.from(this.plugins.values())
      .filter((p) => p.compatibleConnectors.includes(connectorType))
      .sort((a, b) => (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY));
  }

  /**
   * Get all plugins sorted by priority (ascending).
   */
  static getAllSorted(): ConnectorPlugin[] {
    return Array.from(this.plugins.values()).sort(
      (a, b) => (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY)
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
      version: p.version,
      compatibleConnectors: p.compatibleConnectors,
      priority: p.priority,
    }));
  }

  /**
   * Get the config schema for a plugin.
   * Returns the configSchema fields, or undefined if the plugin has none.
   */
  static getPluginConfig(pluginId: string): PluginConfigField[] | undefined {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return undefined;
    }
    return plugin.configSchema;
  }

  /**
   * Validate a config object against a plugin's configSchema.
   * Returns an array of validation error messages. Empty array = valid.
   */
  static validatePluginConfig(pluginId: string, config: unknown): string[] {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return [`Plugin "${pluginId}" is not registered`];
    }

    const schema = plugin.configSchema;
    if (!schema || schema.length === 0) {
      return [];
    }

    if (typeof config !== "object" || config === null) {
      return ["Config must be a non-null object"];
    }

    const configObj = config as Record<string, unknown>;
    const errors: string[] = [];

    for (const field of schema) {
      const value = configObj[field.key];

      // Check required fields
      if (field.required && (value === undefined || value === null || value === "")) {
        errors.push(`Field "${field.key}" is required`);
        continue;
      }

      // Skip validation for optional fields with no value
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      switch (field.type) {
        case "string":
          if (typeof value !== "string") {
            errors.push(`Field "${field.key}" must be a string`);
          }
          break;
        case "number":
          if (typeof value !== "number" || Number.isNaN(value)) {
            errors.push(`Field "${field.key}" must be a number`);
          }
          break;
        case "boolean":
          if (typeof value !== "boolean") {
            errors.push(`Field "${field.key}" must be a boolean`);
          }
          break;
        case "select":
          if (field.options && !field.options.some((o) => o.value === value)) {
            errors.push(
              `Field "${field.key}" must be one of: ${field.options.map((o) => o.value).join(", ")}`
            );
          }
          break;
        case "json":
          if (typeof value === "string") {
            try {
              JSON.parse(value);
            } catch {
              errors.push(`Field "${field.key}" must be valid JSON`);
            }
          }
          break;
      }
    }

    return errors;
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
