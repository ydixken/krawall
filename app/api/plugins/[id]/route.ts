import { NextRequest, NextResponse } from "next/server";
import { PluginLoader } from "@/lib/connectors/plugins/loader";

/**
 * GET /api/plugins/[id]
 * Get plugin details including config schema
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const plugin = PluginLoader.get(id);

    if (!plugin) {
      return NextResponse.json(
        { success: false, error: "Plugin not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        compatibleConnectors: plugin.compatibleConnectors,
        priority: plugin.priority,
        minConnectorVersion: plugin.minConnectorVersion,
        configSchema: plugin.configSchema ?? [],
      },
    });
  } catch (error) {
    console.error(`GET /api/plugins/${id} error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch plugin", message: (error as Error).message },
      { status: 500 }
    );
  }
}
