import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/dashboard/stats
 * Returns aggregated statistics for the dashboard homepage
 */
export async function GET() {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Run all queries in parallel
    const [
      targetCount,
      scenarioCount,
      activeSessions,
      totalSessions,
      completedSessions,
      failedSessions,
      sessionsLast24h,
      recentSessions,
      tokenMetrics,
      responseTimeMetrics,
    ] = await Promise.all([
      // Counts
      prisma.target.count(),
      prisma.scenario.count(),
      prisma.session.count({
        where: { status: { in: ["RUNNING", "QUEUED"] } },
      }),
      prisma.session.count(),
      prisma.session.count({ where: { status: "COMPLETED" } }),
      prisma.session.count({ where: { status: "FAILED" } }),
      prisma.session.count({
        where: { createdAt: { gte: twentyFourHoursAgo } },
      }),

      // Recent sessions with target and scenario names
      prisma.session.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          startedAt: true,
          summaryMetrics: true,
          target: { select: { name: true } },
          scenario: { select: { name: true } },
        },
      }),

      // Aggregate token usage from session metrics
      prisma.sessionMetric.aggregate({
        _sum: { totalTokens: true },
      }),

      // Aggregate response times from session metrics
      prisma.sessionMetric.aggregate({
        _avg: { responseTimeMs: true },
        where: { success: true },
      }),
    ]);

    const errorRate =
      totalSessions > 0 ? failedSessions / totalSessions : 0;

    const formattedRecentSessions = recentSessions.map((s) => ({
      id: s.id,
      targetName: s.target.name,
      scenarioName: s.scenario?.name || null,
      status: s.status,
      startedAt: s.startedAt?.toISOString() || null,
      summaryMetrics: s.summaryMetrics,
    }));

    return NextResponse.json({
      success: true,
      data: {
        counts: {
          targets: targetCount,
          scenarios: scenarioCount,
          activeSessions,
          totalSessions,
        },
        metrics: {
          avgResponseTimeMs:
            Math.round(
              (responseTimeMetrics._avg.responseTimeMs ?? 0) * 100
            ) / 100,
          totalTokensConsumed: tokenMetrics._sum.totalTokens ?? 0,
          errorRate: Math.round(errorRate * 10000) / 10000,
          sessionsLast24h,
        },
        recentSessions: formattedRecentSessions,
      },
    });
  } catch (error) {
    console.error("GET /api/dashboard/stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard stats",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
