import { NextResponse } from "next/server";
import { PluginLoader } from "@/lib/connectors/plugins/loader";

// Ensure plugins are registered by importing them
import "@/lib/connectors/plugins/openai-plugin";
import "@/lib/connectors/plugins/anthropic-plugin";
import "@/lib/connectors/plugins/multi-step-auth-plugin";
import "@/lib/connectors/plugins/audit-plugin";

/**
 * GET /api/plugins
 * List all registered plugins with metadata
 */
export async function GET() {
  try {
    const plugins = PluginLoader.listMetadata();

    return NextResponse.json({
      success: true,
      data: plugins,
      count: plugins.length,
    });
  } catch (error) {
    console.error("GET /api/plugins error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch plugins", message: (error as Error).message },
      { status: 500 }
    );
  }
}
