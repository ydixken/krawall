import { NextResponse } from "next/server";
import { SCENARIO_TEMPLATES } from "@/lib/scenarios/templates";

/**
 * GET /api/scenarios/templates
 * Returns all pre-built scenario templates
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    data: SCENARIO_TEMPLATES,
  });
}
