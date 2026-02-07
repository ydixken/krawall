import { NextResponse } from "next/server";
import { getOpenAPISpec } from "@/lib/openapi/spec";

/**
 * GET /api/openapi
 * Returns the OpenAPI 3.0 specification as JSON
 */
export async function GET() {
  const spec = getOpenAPISpec();
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "public, max-age=3600",
    },
  });
}
