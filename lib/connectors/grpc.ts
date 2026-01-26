import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { BaseConnector, ConnectorConfig, ConnectorResponse, HealthStatus, MessageMetadata } from "./base";
import { ConnectorRegistry } from "./registry";
import path from "path";

/**
 * gRPC Connector
 *
 * Handles high-performance RPC communication with chatbot APIs via gRPC protocol.
 * Supports both unary and streaming RPC calls.
 */
export class gRPCConnector extends BaseConnector {
  private client: any = null;
  private isConnected = false;
  private packageDefinition: protoLoader.PackageDefinition | null = null;

  /**
   * Connect to gRPC endpoint
   */
  async connect(): Promise<void> {
    try {
      // Load proto file if specified in config
      const protoPath = this.config.protocolConfig?.protoPath as string | undefined;

      if (!protoPath) {
        throw new Error("Proto file path is required for gRPC connector");
      }

      // Load proto definition
      this.packageDefinition = protoLoader.loadSync(protoPath, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });

      const protoDescriptor = grpc.loadPackageDefinition(this.packageDefinition);

      // Get service from proto (default to ChatService if not specified)
      const serviceName = (this.config.protocolConfig?.serviceName as string) || "ChatService";
      const packageName = (this.config.protocolConfig?.packageName as string) || "chat";

      const ServiceClient = (protoDescriptor[packageName] as any)?.[serviceName];

      if (!ServiceClient) {
        throw new Error(
          `Service ${packageName}.${serviceName} not found in proto definition`
        );
      }

      // Create credentials
      const credentials = this.buildGrpcCredentials();

      // Create client
      this.client = new ServiceClient(this.config.endpoint, credentials);

      this.isConnected = true;
      console.log(`✅ gRPC connected: ${this.config.endpoint}`);
    } catch (error) {
      console.error("gRPC connection failed:", error);
      throw error;
    }
  }

  /**
   * Disconnect from gRPC endpoint
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // gRPC client doesn't have an explicit close method
      // Channel cleanup happens automatically
      this.client = null;
    }

    this.isConnected = false;
  }

  /**
   * Send message via gRPC
   */
  async sendMessage(message: string, metadata?: MessageMetadata): Promise<ConnectorResponse> {
    if (!this.isConnected || !this.client) {
      throw new Error("gRPC client is not connected");
    }

    const startTime = Date.now();

    // Apply request template
    const payload = this.applyRequestTemplate(message);

    // Get method name from config (default to SendMessage)
    const methodName = (this.config.protocolConfig?.methodName as string) || "SendMessage";

    return new Promise((resolve, reject) => {
      // Create gRPC metadata
      const grpcMetadata = new grpc.Metadata();

      // Add authentication metadata
      if (this.config.authType === "BEARER_TOKEN" && this.config.authConfig?.token) {
        grpcMetadata.add("authorization", `Bearer ${this.config.authConfig.token}`);
      } else if (this.config.authType === "API_KEY" && this.config.authConfig?.apiKey) {
        grpcMetadata.add("x-api-key", String(this.config.authConfig.apiKey));
      }

      // Add custom headers from auth config
      if (this.config.authConfig?.headers) {
        for (const [key, value] of Object.entries(this.config.authConfig.headers)) {
          grpcMetadata.add(key, String(value));
        }
      }

      // Call gRPC method
      this.client[methodName](
        payload,
        grpcMetadata,
        (error: grpc.ServiceError | null, response: any) => {
          const responseTimeMs = Date.now() - startTime;

          if (error) {
            reject(new Error(`gRPC error (${error.code}): ${error.message}`));
            return;
          }

          try {
            const content = this.extractResponse(response);
            const tokenUsage = this.extractTokenUsage(response);

            resolve({
              content,
              responseTimeMs,
              success: true,
              tokenUsage,
            });
          } catch (extractError) {
            reject(extractError);
          }
        }
      );
    });
  }

  /**
   * Build gRPC credentials based on auth config
   */
  private buildGrpcCredentials(): grpc.ChannelCredentials {
    // Check if TLS/SSL is required
    const useTls = this.config.protocolConfig?.useTls !== false; // Default to true

    if (!useTls) {
      return grpc.credentials.createInsecure();
    }

    // Use TLS
    if (this.config.protocolConfig?.rootCert) {
      const rootCert = Buffer.from(String(this.config.protocolConfig.rootCert));
      return grpc.credentials.createSsl(rootCert);
    }

    // Default TLS
    return grpc.credentials.createSsl();
  }

  /**
   * Check gRPC health
   */
  async healthCheck(): Promise<HealthStatus> {
    if (!this.isConnected || !this.client) {
      return {
        healthy: false,
        message: "gRPC client is not connected",
        latencyMs: 0,
      };
    }

    const startTime = Date.now();

    return new Promise((resolve) => {
      // Try to call a health check method if available
      const healthMethod = this.config.protocolConfig?.healthCheckMethod || "Check";

      if (this.client[healthMethod]) {
        this.client[healthMethod]({}, (error: grpc.ServiceError | null, response: any) => {
          if (error) {
            resolve({
              healthy: false,
              message: `gRPC health check failed: ${error.message}`,
              latencyMs: Date.now() - startTime,
            });
          } else {
            resolve({
              healthy: true,
              message: "gRPC service is healthy",
              latencyMs: Date.now() - startTime,
            });
          }
        });
      } else {
        // If no health check method, just verify client exists
        resolve({
          healthy: this.isConnected,
          message: this.isConnected ? "gRPC client is connected" : "gRPC client is not connected",
          latencyMs: Date.now() - startTime,
        });
      }

      // Timeout
      setTimeout(() => {
        resolve({
          healthy: false,
          message: "gRPC health check timeout",
          latencyMs: Date.now() - startTime,
        });
      }, 5000);
    });
  }

  /**
   * Check if gRPC supports streaming
   */
  supportsStreaming(): boolean {
    return true; // gRPC supports bidirectional streaming
  }
}

// Auto-register gRPCConnector
ConnectorRegistry.register("GRPC", gRPCConnector);
