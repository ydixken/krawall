import type { ConnectorPlugin, PluginContext } from "./types";
import type { ConnectorResponse, MessageMetadata } from "../base";
import { PluginLoader } from "./loader";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * OpenAI Plugin
 *
 * Extends the HTTP connector with:
 * - Conversation history management (messages[] array)
 * - Streaming support detection
 * - OpenAI-specific token usage extraction
 */
const openaiPlugin: ConnectorPlugin = {
  id: "openai",
  name: "OpenAI Conversation Plugin",
  description:
    "Manages conversation history, streaming, and token usage extraction for OpenAI-compatible APIs.",
  compatibleConnectors: ["HTTP_REST"],

  async initialize(context: PluginContext): Promise<void> {
    context.state.messages = [] as ChatMessage[];
    context.state.totalTokens = 0;
    context.state.systemPrompt = context.pluginConfig?.systemPrompt as string | undefined;

    // Add system message if configured
    if (context.state.systemPrompt) {
      (context.state.messages as ChatMessage[]).push({
        role: "system",
        content: context.state.systemPrompt as string,
      });
    }
  },

  async beforeSend(
    message: string,
    metadata: MessageMetadata | undefined,
    context: PluginContext
  ): Promise<{ message: string; metadata?: MessageMetadata }> {
    const messages = context.state.messages as ChatMessage[];

    // Add user message to history
    messages.push({ role: "user", content: message });

    // Store updated messages in state so the connector can access them
    context.state.messages = messages;

    // The actual message transformation happens at the connector level via request template.
    // This plugin tracks history; the connector wraps the last message.
    return { message, metadata };
  },

  async afterReceive(
    response: ConnectorResponse,
    context: PluginContext
  ): Promise<ConnectorResponse> {
    const messages = context.state.messages as ChatMessage[];

    // Add assistant response to history
    messages.push({ role: "assistant", content: response.content });
    context.state.messages = messages;

    // Track cumulative token usage
    if (response.metadata.tokenUsage) {
      const raw = response.metadata.rawResponse as Record<string, any> | undefined;
      if (raw?.usage) {
        const usage = raw.usage;
        context.state.totalTokens =
          (context.state.totalTokens as number) + (usage.total_tokens || 0);

        // Normalize token usage to our standard format
        response.metadata.tokenUsage = {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        };
      }
    }

    return response;
  },

  async onDisconnect(context: PluginContext): Promise<void> {
    // Clear conversation history
    context.state.messages = [];
    context.state.totalTokens = 0;
  },
};

// Auto-register
PluginLoader.register(openaiPlugin);

export { openaiPlugin };
