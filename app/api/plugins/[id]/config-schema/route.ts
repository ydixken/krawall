import { NextRequest, NextResponse } from "next/server";
import { PluginLoader } from "@/lib/connectors/plugins/loader";

/**
 * GET /api/plugins/[id]/config-schema
 * Return the config schema for UI form generation
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
        pluginId: plugin.id,
        pluginName: plugin.name,
        configSchema: plugin.configSchema ?? [],
      },
    });
  } catch (error) {
    console.error(`GET /api/plugins/${id}/config-schema error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch config schema", message: (error as Error).message },
      { status: 500 }
    );
  }
}
