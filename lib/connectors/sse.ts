import axios, { AxiosInstance } from "axios";
import { BaseConnector, ConnectorConfig, ConnectorResponse, HealthStatus, MessageMetadata } from "./base";
import { ConnectorRegistry } from "./registry";
import EventSource from "eventsource";

/**
 * Server-Sent Events (SSE) Connector
 *
 * Handles server-sent event streams from chatbot APIs.
 * Supports long-lived connections with automatic reconnection.
 */
export class SSEConnector extends BaseConnector {
  private eventSource: EventSource | null = null;
  private httpClient: AxiosInstance | null = null;
  private _connected = false;
  private messageHandlers = new Map<string, (data: string) => void>();

  /**
   * Connect to SSE endpoint
   */
  async connect(): Promise<void> {
    // Create HTTP client for sending messages (SSE is typically one-way receive)
    this.httpClient = axios.create({
      baseURL: this.config.endpoint,
      timeout: (this.config.protocolConfig?.timeout as number) || 30000,
      headers: {
        ...this.buildAuthHeaders(),
        "Content-Type": "application/json",
      },
    });

    // SSE connection will be established on first message send
    this._connected = true;
    console.log(`SSE connector initialized: ${this.config.endpoint}`);
  }

  /**
   * Disconnect from SSE endpoint
   */
  async disconnect(): Promise<void> {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.httpClient = null;
    this._connected = false;
    this.messageHandlers.clear();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this._connected;
  }

  /**
   * Send message and receive SSE stream response
   */
  async sendMessage(message: string, metadata?: MessageMetadata): Promise<ConnectorResponse> {
    if (!this._connected || !this.httpClient) {
      throw new Error("SSE connector is not connected");
    }

    const startTime = Date.now();

    // Apply request template
    const payload = this.applyRequestTemplate(message);

    return new Promise((resolve, reject) => {
      let responseContent = "";
      let tokenUsage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined;
      let streamComplete = false;

      try {
        // For SSE, we typically POST the message and receive a stream
        const url = new URL(this.config.endpoint);

        // Build URL with query parameters for authentication if needed
        if (this.config.authType === "API_KEY" && this.config.authConfig?.apiKey) {
          url.searchParams.set("api_key", String(this.config.authConfig.apiKey));
        }

        // Create EventSource connection for this message
        const eventSource = new EventSource(url.toString(), {
          headers: this.buildAuthHeaders() as Record<string, string>,
        });

        // Handle incoming messages
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // Check if this is a completion signal
            if (data.done || data.finished || data.complete) {
              streamComplete = true;
              eventSource.close();

              const responseTimeMs = Date.now() - startTime;
              resolve({
                content: responseContent,
                metadata: {
                  responseTimeMs,
                  tokenUsage,
                },
              });
              return;
            }

            // Extract content from the chunk
            const chunk = this.extractResponse(data);
            responseContent += chunk;

            // Extract token usage if available
            if (data.usage) {
              tokenUsage = {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              };
            }
          } catch (error) {
            console.error("Failed to parse SSE message:", error);
          }
        };

        // Handle SSE errors
        eventSource.onerror = (error) => {
          console.error("SSE error:", error);
          eventSource.close();

          if (!streamComplete) {
            reject(new Error("SSE stream error"));
          }
        };

        // Timeout handler
        const timeout = setTimeout(() => {
          if (!streamComplete) {
            eventSource.close();
            reject(new Error("SSE stream timeout"));
          }
        }, (this.config.protocolConfig?.timeout as number) || 60000);

        // Send the initial message via HTTP POST
        this.httpClient!.post("/", payload)
          .then((response) => {
            // Some SSE implementations return the stream ID in the POST response
            if (response.data?.stream_id) {
              console.log(`SSE stream started: ${response.data.stream_id}`);
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            eventSource.close();
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Check SSE health
   */
  async healthCheck(): Promise<HealthStatus> {
    if (!this._connected || !this.httpClient) {
      return {
        healthy: false,
        error: "SSE connector is not connected",
        latencyMs: 0,
        timestamp: new Date(),
      };
    }

    const startTime = Date.now();

    try {
      // Perform a simple HTTP HEAD or GET request to check endpoint availability
      await this.httpClient.head("/health").catch(() => this.httpClient!.get("/"));

      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        healthy: false,
        error: `SSE endpoint unreachable: ${(error as Error).message}`,
        latencyMs: Date.now() - startTime,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check if SSE supports streaming
   */
  supportsStreaming(): boolean {
    return true; // SSE is designed for streaming
  }
}

// Auto-register SSEConnector
ConnectorRegistry.register("SSE", SSEConnector);
