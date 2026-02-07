import type { ConnectorPlugin, PluginContext, PluginConfigField } from "./types";
import type { ConnectorResponse, MessageMetadata } from "../base";
import { PluginLoader } from "./loader";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const configSchema: PluginConfigField[] = [
  {
    key: "model",
    label: "Model",
    type: "select",
    required: true,
    default: "gpt-4",
    description: "OpenAI model to use for chat completions",
    options: [
      { label: "GPT-4", value: "gpt-4" },
      { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
      { label: "GPT-4o", value: "gpt-4o" },
      { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
    ],
  },
  {
    key: "temperature",
    label: "Temperature",
    type: "number",
    required: false,
    default: 1,
    description: "Sampling temperature (0–2). Lower = more deterministic.",
  },
  {
    key: "max_tokens",
    label: "Max Tokens",
    type: "number",
    required: false,
    default: 1024,
    description: "Maximum number of tokens to generate in the response.",
  },
  {
    key: "systemPrompt",
    label: "System Prompt",
    type: "string",
    required: false,
    description: "Optional system prompt prepended to the conversation.",
  },
];

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
  version: "1.0.0",
  priority: 50,
  compatibleConnectors: ["HTTP_REST"],
  configSchema,

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
    _metadata: MessageMetadata | undefined,
    context: PluginContext
  ): Promise<{ message: string; metadata?: Record<string, unknown> }> {
    const messages = context.state.messages as ChatMessage[];

    // Add user message to history
    messages.push({ role: "user", content: message });

    // Store updated messages in state so the connector can access them
    context.state.messages = messages;

    // The actual message transformation happens at the connector level via request template.
    // This plugin tracks history; the connector wraps the last message.
    return { message };
  },

  async afterReceive(
    response: ConnectorResponse,
    context: PluginContext
  ): Promise<{ response: ConnectorResponse; metadata?: Record<string, unknown> }> {
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

    return { response };
  },

  async onDisconnect(context: PluginContext): Promise<void> {
    // Clear conversation history
    context.state.messages = [];
    context.state.totalTokens = 0;
  },

  onError(error: Error, hookName: string): void {
    console.error(`[openai-plugin] Error in ${hookName}:`, error.message);
  },
};

// Auto-register
PluginLoader.register(openaiPlugin);

export { openaiPlugin };
