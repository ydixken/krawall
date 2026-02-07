import { NextResponse } from "next/server";
import {
  getSessionQueueStats,
  getMetricsQueueStats,
  sessionQueue,
  metricsQueue,
} from "@/lib/jobs/queue";

export async function GET() {
  try {
    const [sessionStats, metricsStats, sessionWorkers, metricsWorkers] =
      await Promise.all([
        getSessionQueueStats(),
        getMetricsQueueStats(),
        sessionQueue.getWorkers().catch(() => []),
        metricsQueue.getWorkers().catch(() => []),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        sessionQueue: {
          ...sessionStats,
          workerRunning: sessionWorkers.length > 0,
        },
        metricsQueue: {
          ...metricsStats,
          workerRunning: metricsWorkers.length > 0,
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
