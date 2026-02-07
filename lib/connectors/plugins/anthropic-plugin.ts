import type { ConnectorPlugin, PluginContext, PluginConfigField } from "./types";
import type { ConnectorResponse, MessageMetadata } from "../base";
import { PluginLoader } from "./loader";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

const configSchema: PluginConfigField[] = [
  {
    key: "model",
    label: "Model",
    type: "select",
    required: true,
    default: "claude-sonnet-4-5-20250929",
    description: "Anthropic model to use for messages.",
    options: [
      { label: "Claude Sonnet 4.5", value: "claude-sonnet-4-5-20250929" },
      { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
    ],
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
    key: "temperature",
    label: "Temperature",
    type: "number",
    required: false,
    default: 1,
    description: "Sampling temperature (0–1). Lower = more deterministic.",
  },
  {
    key: "systemPrompt",
    label: "System Prompt",
    type: "string",
    required: false,
    description: "System prompt sent via Anthropic's dedicated system parameter.",
  },
];

/**
 * Anthropic Plugin
 *
 * Extends the HTTP connector with:
 * - Conversation history with proper user/assistant role alternation
 * - Anthropic `content[0].text` response format handling
 * - Token usage extraction from `usage.input_tokens` / `usage.output_tokens`
 * - System prompt via Anthropic's `system` parameter (not in messages array)
 */
const anthropicPlugin: ConnectorPlugin = {
  id: "anthropic",
  name: "Anthropic Conversation Plugin",
  description:
    "Manages conversation history, response parsing, and token usage extraction for the Anthropic Messages API.",
  version: "1.0.0",
  priority: 50,
  compatibleConnectors: ["HTTP_REST"],
  configSchema,

  async initialize(context: PluginContext): Promise<void> {
    context.state.messages = [] as AnthropicMessage[];
    context.state.totalInputTokens = 0;
    context.state.totalOutputTokens = 0;
    context.state.systemPrompt = context.pluginConfig?.systemPrompt as string | undefined;
  },

  async beforeSend(
    message: string,
    _metadata: MessageMetadata | undefined,
    context: PluginContext
  ): Promise<{ message: string; metadata?: Record<string, unknown> }> {
    const messages = context.state.messages as AnthropicMessage[];

    // Ensure proper user/assistant alternation.
    // If the last message was from the user, merge or skip duplicate.
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "user") {
      // Replace the last user message to maintain alternation
      messages[messages.length - 1] = { role: "user", content: message };
    } else {
      messages.push({ role: "user", content: message });
    }

    context.state.messages = messages;

    // Pass system prompt context as metadata so the connector can use it
    const metadata: Record<string, unknown> = {};
    if (context.state.systemPrompt) {
      metadata.systemPrompt = context.state.systemPrompt;
    }

    return { message, metadata };
  },

  async afterReceive(
    response: ConnectorResponse,
    context: PluginContext
  ): Promise<{ response: ConnectorResponse; metadata?: Record<string, unknown> }> {
    const messages = context.state.messages as AnthropicMessage[];

    // Extract content from Anthropic's content[0].text format if raw response available
    const raw = response.metadata.rawResponse as Record<string, any> | undefined;
    let content = response.content;

    if (raw?.content && Array.isArray(raw.content) && raw.content.length > 0) {
      const textBlock = raw.content.find((block: any) => block.type === "text");
      if (textBlock?.text) {
        content = textBlock.text;
      }
    }

    // Add assistant response to history
    messages.push({ role: "assistant", content });
    context.state.messages = messages;

    // Extract Anthropic-specific token usage
    if (raw?.usage) {
      const inputTokens = raw.usage.input_tokens || 0;
      const outputTokens = raw.usage.output_tokens || 0;

      context.state.totalInputTokens =
        (context.state.totalInputTokens as number) + inputTokens;
      context.state.totalOutputTokens =
        (context.state.totalOutputTokens as number) + outputTokens;

      // Normalize to standard format
      response.metadata.tokenUsage = {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      };
    }

    // Update content in case we extracted from raw
    const updatedResponse: ConnectorResponse = {
      ...response,
      content,
    };

    return { response: updatedResponse };
  },

  async onDisconnect(context: PluginContext): Promise<void> {
    context.state.messages = [];
    context.state.totalInputTokens = 0;
    context.state.totalOutputTokens = 0;
  },

  onError(error: Error, hookName: string): void {
    console.error(`[anthropic-plugin] Error in ${hookName}:`, error.message);
  },
};

// Auto-register
PluginLoader.register(anthropicPlugin);

export { anthropicPlugin };
