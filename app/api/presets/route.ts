import { NextResponse } from "next/server";
import { getAllPresets } from "@/lib/connectors/presets";

/**
 * GET /api/presets
 * Returns all available provider presets
 */
export async function GET() {
  try {
    const presets = getAllPresets();

    return NextResponse.json({
      success: true,
      data: presets,
    });
  } catch (error) {
    console.error("GET /api/presets error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch presets",
      },
      { status: 500 }
    );
  }
}
