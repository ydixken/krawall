import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * POST /api/settings/reset
 * Reset all settings to defaults by deleting all custom settings
 */
export async function POST() {
  try {
    const result = await prisma.setting.deleteMany({});

    return NextResponse.json({
      success: true,
      data: { deletedCount: result.count },
      message: "All settings reset to defaults",
    });
  } catch (error) {
    console.error("POST /api/settings/reset error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset settings", message: (error as Error).message },
      { status: 500 }
    );
  }
}
