import type { BaseConnector, ConnectorConfig } from "./base";
import { HTTPConnector } from "./http";
import type { ConnectorType } from "@prisma/client";

/**
 * Connector Registry
 *
 * Central registry for all connector types.
 * Provides factory methods for creating connector instances based on type.
 */

type ConnectorConstructor = new (targetId: string, config: ConnectorConfig) => BaseConnector;

export class ConnectorRegistry {
  private static connectors = new Map<string, ConnectorConstructor>();

  /**
   * Register a connector type
   */
  static register(type: string, connector: ConnectorConstructor): void {
    if (this.connectors.has(type)) {
      console.warn(`⚠️  Connector ${type} is already registered, overwriting`);
    }

    this.connectors.set(type, connector);
    console.log(`✅ Registered connector: ${type}`);
  }

  /**
   * Create a connector instance
   */
  static create(type: ConnectorType, targetId: string, config: ConnectorConfig): BaseConnector {
    const ConnectorClass = this.connectors.get(type);

    if (!ConnectorClass) {
      throw new Error(`Unknown connector type: ${type}. Available: ${Array.from(this.connectors.keys()).join(", ")}`);
    }

    return new ConnectorClass(targetId, config);
  }

  /**
   * Get all registered connector types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.connectors.keys());
  }

  /**
   * Check if a connector type is registered
   */
  static isRegistered(type: string): boolean {
    return this.connectors.has(type);
  }

  /**
   * Unregister a connector (primarily for testing)
   */
  static unregister(type: string): boolean {
    return this.connectors.delete(type);
  }

  /**
   * Clear all registered connectors (primarily for testing)
   */
  static clear(): void {
    this.connectors.clear();
  }
}

// Auto-register built-in connectors
ConnectorRegistry.register("HTTP_REST", HTTPConnector);

// Additional connectors will be registered when their modules are imported
// import "./websocket";  // Auto-registers WebSocketConnector
// import "./grpc";       // Auto-registers gRPCConnector
// import "./sse";        // Auto-registers SSEConnector
