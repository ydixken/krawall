import { NextRequest, NextResponse } from "next/server";
import { PluginLoader } from "@/lib/connectors/plugins/loader";

/**
 * POST /api/plugins/[id]/validate-config
 * Validate a configuration object against the plugin's config schema
 */
export async function POST(
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

    const body = await request.json();
    const errors = PluginLoader.validatePluginConfig(id, body);

    return NextResponse.json({
      success: true,
      data: {
        valid: errors.length === 0,
        errors,
      },
    });
  } catch (error) {
    console.error(`POST /api/plugins/${id}/validate-config error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to validate config", message: (error as Error).message },
      { status: 500 }
    );
  }
}
