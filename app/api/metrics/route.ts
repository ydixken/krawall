import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { z } from "zod";

const MetricsQuerySchema = z.object({
  sessionId: z.string().cuid().optional(),
  targetId: z.string().cuid().optional(),
  scenarioId: z.string().cuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["PENDING", "QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = MetricsQuerySchema.parse({
      sessionId: searchParams.get("sessionId") || undefined,
      targetId: searchParams.get("targetId") || undefined,
      scenarioId: searchParams.get("scenarioId") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || "100",
      offset: searchParams.get("offset") || "0",
    });

    const where: any = {};

    if (query.sessionId) {
      where.id = query.sessionId;
    }

    if (query.targetId) {
      where.targetId = query.targetId;
    }

    if (query.scenarioId) {
      where.scenarioId = query.scenarioId;
    }

    if (query.startDate || query.endDate) {
      where.startedAt = {};
      if (query.startDate) {
        where.startedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startedAt.lte = new Date(query.endDate);
      }
    }

    if (query.status) {
      where.status = query.status;
    }

    const limit = query.limit || 100;
    const offset = query.offset || 0;

    // Fetch sessions with metrics
    const sessions = await prisma.session.findMany({
      where,
      include: {
        target: {
          select: {
            name: true,
            connectorType: true,
          },
        },
        scenario: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startedAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const total = await prisma.session.count({ where });

    // Calculate aggregate metrics across all completed sessions
    const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
    
    let aggregateMetrics = null;
    if (completedSessions.length > 0) {
      let totalMessages = 0;
      let totalTokens = 0;
      let totalResponseTime = 0;
      let totalErrors = 0;
      let messageCount = 0;

      for (const session of completedSessions) {
        const metrics = session.summaryMetrics as any;
        if (metrics) {
          totalMessages += metrics.messageCount || 0;
          totalTokens += metrics.totalTokens || 0;
          if (metrics.avgResponseTimeMs && metrics.messageCount) {
            totalResponseTime += metrics.avgResponseTimeMs * metrics.messageCount;
            messageCount += metrics.messageCount;
          }
          totalErrors += metrics.errorCount || 0;
        }
      }

      const avgResponseTimeMs = messageCount > 0 ? totalResponseTime / messageCount : 0;
      const errorRate = totalMessages > 0 ? (totalErrors / totalMessages) * 100 : 0;

      aggregateMetrics = {
        totalSessions: completedSessions.length,
        totalMessages,
        totalTokens,
        avgResponseTimeMs: Math.round(avgResponseTimeMs * 100) / 100,
        totalErrors,
        errorRate: Math.round(errorRate * 100) / 100,
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        aggregate: aggregateMetrics,
        pagination: {
          total,
          limit,
          offset,
          hasMore: total > offset + limit,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Metrics API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
