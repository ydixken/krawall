import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * GET /api/execute/batch/[batchId]
 * Get status of all sessions in a batch
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;

  try {
    // Find all sessions that belong to this batch
    // The batchId is stored in executionConfig.batchId
    const sessions = await prisma.session.findMany({
      where: {
        executionConfig: {
          path: ["batchId"],
          equals: batchId,
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        status: true,
        startedAt: true,
        completedAt: true,
        summaryMetrics: true,
        target: { select: { id: true, name: true, connectorType: true } },
        scenario: { select: { id: true, name: true } },
      },
    });

    if (sessions.length === 0) {
      return NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 }
      );
    }

    // Compute aggregate stats
    const statusCounts = {
      pending: 0,
      queued: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const session of sessions) {
      const key = session.status.toLowerCase() as keyof typeof statusCounts;
      if (key in statusCounts) {
        statusCounts[key]++;
      }
    }

    const totalSessions = sessions.length;
    const finishedSessions = statusCounts.completed + statusCounts.failed + statusCounts.cancelled;
    const progress = totalSessions > 0 ? (finishedSessions / totalSessions) * 100 : 0;

    const batchStatus =
      finishedSessions === totalSessions
        ? statusCounts.failed > 0
          ? "completed_with_errors"
          : "completed"
        : statusCounts.running > 0
          ? "running"
          : "pending";

    return NextResponse.json({
      success: true,
      data: {
        batchId,
        status: batchStatus,
        progress: Math.round(progress * 100) / 100,
        totalSessions,
        statusCounts,
        sessions: sessions.map((s) => ({
          id: s.id,
          status: s.status,
          targetId: s.target.id,
          targetName: s.target.name,
          connectorType: s.target.connectorType,
          scenarioName: s.scenario?.name || null,
          startedAt: s.startedAt?.toISOString() || null,
          completedAt: s.completedAt?.toISOString() || null,
          summaryMetrics: s.summaryMetrics,
        })),
      },
    });
  } catch (error) {
    console.error(`GET /api/execute/batch/${batchId} error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch batch status",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
