import { NextResponse } from "next/server";
import { getSessionQueueStats, getMetricsQueueStats } from "@/lib/jobs/queue";

export async function GET() {
  try {
    const [sessionStats, metricsStats] = await Promise.all([
      getSessionQueueStats(),
      getMetricsQueueStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        sessionQueue: {
          ...sessionStats,
          // Basic heuristic: BullMQ doesn't expose a direct "worker attached" check from the Queue side.
          // For a more accurate check, consider using Queue.getWorkers() (BullMQ v5+).
          workerRunning: sessionStats.active > 0 || sessionStats.waiting >= 0,
        },
        metricsQueue: {
          ...metricsStats,
          workerRunning: metricsStats.active > 0 || metricsStats.waiting >= 0,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch queue status",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
