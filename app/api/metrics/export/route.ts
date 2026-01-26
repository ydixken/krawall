import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const ExportQuerySchema = z.object({
  sessionId: z.string().cuid(),
  format: z.enum(["csv", "json"]).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = ExportQuerySchema.parse({
      sessionId: searchParams.get("sessionId") || undefined,
      format: searchParams.get("format") || "csv",
    });

    // Fetch session with metrics
    const session = await prisma.session.findUnique({
      where: { id: query.sessionId },
      include: {
        target: true,
        scenario: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const metrics = session.summaryMetrics as any;

    if (!metrics) {
      return NextResponse.json(
        { success: false, error: "No metrics available for this session" },
        { status: 404 }
      );
    }

    // For CSV, we need to flatten the metrics
    if (query.format === "csv") {
      const csvRows = [
        // Header
        [
          "Session ID",
          "Target",
          "Scenario",
          "Status",
          "Started At",
          "Completed At",
          "Message Count",
          "Total Tokens",
          "Avg Response Time (ms)",
          "Min Response Time (ms)",
          "Max Response Time (ms)",
          "P50 Response Time (ms)",
          "P95 Response Time (ms)",
          "P99 Response Time (ms)",
          "Error Count",
          "Error Rate (%)",
          "Tokens Per Second",
        ].join(","),
        // Data
        [
          session.id,
          session.target.name,
          session.scenario?.name || "N/A",
          session.status,
          session.startedAt.toISOString(),
          session.completedAt?.toISOString() || "N/A",
          metrics.messageCount || 0,
          metrics.totalTokens || 0,
          metrics.avgResponseTimeMs || 0,
          metrics.minResponseTimeMs || 0,
          metrics.maxResponseTimeMs || 0,
          metrics.p50ResponseTimeMs || 0,
          metrics.p95ResponseTimeMs || 0,
          metrics.p99ResponseTimeMs || 0,
          metrics.errorCount || 0,
          metrics.errorRate || 0,
          metrics.tokensPerSecond || 0,
        ].join(","),
      ];

      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="session-${query.sessionId}-metrics.csv"`,
        },
      });
    }

    // JSON format
    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          target: session.target.name,
          scenario: session.scenario?.name || null,
          status: session.status,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
        },
        metrics,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Metrics export API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to export metrics" },
      { status: 500 }
    );
  }
}
