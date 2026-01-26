import { Worker, Job } from "bullmq";
import { redis } from "@/lib/cache/redis";
import { prisma } from "@/lib/db/client";
import type { MetricsJobData } from "../queue";
import fs from "fs/promises";
import path from "path";

/**
 * Metrics Aggregation Worker
 *
 * Processes completed sessions to aggregate metrics from log files
 * and store them in the database for fast querying.
 */
export function createMetricsWorker() {
  const worker = new Worker<MetricsJobData>(
    "metrics-aggregation",
    async (job: Job<MetricsJobData>) => {
      const { sessionId } = job.data;

      console.log(`📊 Aggregating metrics for session: ${sessionId}`);

      try {
        // Fetch session
        const session = await prisma.session.findUnique({
          where: { id: sessionId },
        });

        if (!session) {
          throw new Error(`Session not found: ${sessionId}`);
        }

        // Check if session has log path
        if (!session.logPath) {
          console.warn(`Session ${sessionId} has no log path, skipping metrics aggregation`);
          return { success: false, reason: "No log path" };
        }

        // Read messages from log file
        const messagesPath = path.join(session.logPath, "messages.jsonl");

        let messages: any[] = [];
        try {
          const content = await fs.readFile(messagesPath, "utf-8");
          const lines = content.trim().split("\n").filter(Boolean);
          messages = lines.map((line) => JSON.parse(line));
        } catch (error) {
          console.error(`Failed to read messages file for session ${sessionId}:`, error);
          return { success: false, reason: "Failed to read messages" };
        }

        if (messages.length === 0) {
          console.warn(`No messages found for session ${sessionId}`);
          return { success: false, reason: "No messages" };
        }

        // Aggregate metrics
        const sentMessages = messages.filter((m) => m.direction === "sent");
        const receivedMessages = messages.filter((m) => m.direction === "received");

        // Calculate summary metrics
        const messageCount = sentMessages.length;
        const totalTokens = receivedMessages.reduce(
          (sum, m) => sum + (m.tokenUsage?.totalTokens || 0),
          0
        );
        const avgResponseTimeMs =
          messageCount > 0
            ? sentMessages.reduce((sum, m) => sum + (m.responseTimeMs || 0), 0) / messageCount
            : 0;
        const errorCount = sentMessages.filter((m) => !m.success).length;

        // Calculate percentiles for response time
        const responseTimes = sentMessages
          .map((m) => m.responseTimeMs || 0)
          .filter((t) => t > 0)
          .sort((a, b) => a - b);

        const p50 = responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.5)] : 0;
        const p95 = responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.95)] : 0;
        const p99 = responseTimes.length > 0 ? responseTimes[Math.floor(responseTimes.length * 0.99)] : 0;

        // Calculate error rate
        const errorRate = messageCount > 0 ? errorCount / messageCount : 0;

        // Calculate token efficiency (tokens per second)
        const totalTimeSeconds =
          session.completedAt && session.startedAt
            ? (new Date(session.completedAt).getTime() - new Date(session.startedAt).getTime()) / 1000
            : 0;

        const tokensPerSecond = totalTimeSeconds > 0 ? totalTokens / totalTimeSeconds : 0;

        // Group errors by type
        const errorsByType: Record<string, number> = {};
        sentMessages
          .filter((m) => !m.success && m.error)
          .forEach((m) => {
            const errorType = m.error?.split(":")[0] || "Unknown";
            errorsByType[errorType] = (errorsByType[errorType] || 0) + 1;
          });

        // Create detailed metrics entry
        const aggregatedMetrics = {
          messageCount,
          totalTokens,
          avgResponseTimeMs: Math.round(avgResponseTimeMs * 100) / 100,
          errorCount,
          errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimals
          p50ResponseTimeMs: p50,
          p95ResponseTimeMs: p95,
          p99ResponseTimeMs: p99,
          tokensPerSecond: Math.round(tokensPerSecond * 100) / 100,
          errorsByType,
          minResponseTimeMs: responseTimes.length > 0 ? responseTimes[0] : 0,
          maxResponseTimeMs: responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0,
        };

        // Update session with aggregated metrics
        await prisma.session.update({
          where: { id: sessionId },
          data: {
            summaryMetrics: aggregatedMetrics as any,
          },
        });

        console.log(`✅ Metrics aggregated for session ${sessionId}`);
        console.log(`   Messages: ${messageCount}, Tokens: ${totalTokens}, Errors: ${errorCount}`);
        console.log(`   Avg response: ${avgResponseTimeMs.toFixed(2)}ms, P95: ${p95}ms, P99: ${p99}ms`);

        return {
          success: true,
          sessionId,
          metrics: aggregatedMetrics,
        };
      } catch (error) {
        console.error(`❌ Metrics aggregation failed for session ${sessionId}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.METRICS_WORKER_CONCURRENCY || "3"),
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  );

  // Event handlers
  worker.on("completed", (job) => {
    console.log(`✅ Metrics job completed: ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Metrics job failed: ${job?.id}`, err);
  });

  worker.on("error", (err) => {
    console.error("❌ Metrics worker error:", err);
  });

  return worker;
}
