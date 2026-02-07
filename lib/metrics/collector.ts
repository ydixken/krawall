import { prisma } from "@/lib/db/client";

/**
 * Message-level metrics data
 */
export interface MessageMetrics {
  sessionId: string;
  messageIndex: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  requestSentAt: Date;
  responseReceivedAt: Date;
  responseTimeMs: number;
  success: boolean;
  errorType?: string;
  errorMessage?: string;
  repetitionScore?: number;
}

/**
 * Metrics Collector
 *
 * Collects per-message metrics during session execution.
 * Includes repetition detection using Levenshtein distance algorithm.
 */
export class MetricsCollector {
  private sessionId: string;
  private metrics: MessageMetrics[] = [];
  private previousResponses: string[] = [];
  private maxPreviousResponses = 10;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Record a message metric
   */
  async recordMessage(
    metrics: Omit<MessageMetrics, "sessionId" | "repetitionScore">
  ): Promise<void> {
    this.metrics.push({
      ...metrics,
      sessionId: this.sessionId,
    });
  }

  /**
   * Record a message with response content for repetition detection
   */
  async recordWithResponse(
    metrics: Omit<MessageMetrics, "sessionId" | "repetitionScore">,
    responseContent: string
  ): Promise<void> {
    // Calculate repetition score
    const repetitionScore = this.calculateRepetitionScore(responseContent);

    this.metrics.push({
      ...metrics,
      sessionId: this.sessionId,
      repetitionScore,
    });

    // Store response for future comparison
    this.previousResponses.push(responseContent);

    // Keep only last N responses
    if (this.previousResponses.length > this.maxPreviousResponses) {
      this.previousResponses.shift();
    }
  }

  /**
   * Calculate repetition score using Levenshtein distance
   * Returns a score between 0 (no repetition) and 1 (exact repetition)
   */
  private calculateRepetitionScore(response: string): number {
    if (this.previousResponses.length === 0) {
      return 0;
    }

    let maxSimilarity = 0;

    for (const previousResponse of this.previousResponses) {
      const similarity = this.calculateSimilarity(response, previousResponse);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return maxSimilarity;
  }

  /**
   * Calculate similarity between two strings using Levenshtein distance
   * Returns a score between 0 (completely different) and 1 (identical)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Normalize strings
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - distance / maxLength;
  }

  /**
   * Levenshtein distance algorithm
   * Calculates the minimum number of single-character edits needed to change one string into another
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create a 2D array for dynamic programming
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    // Fill the dp table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1, // Deletion
            dp[i][j - 1] + 1, // Insertion
            dp[i - 1][j - 1] + 1 // Substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Flush metrics to database
   */
  async flush(): Promise<void> {
    if (this.metrics.length === 0) {
      return;
    }

    // In a real implementation, you might batch insert these to the database
    // For now, we're relying on the file-based logging in SessionLogger
    // The metrics-aggregator worker will read from the log files

    console.log(`Flushing ${this.metrics.length} metrics for session ${this.sessionId}`);
  }

  /**
   * Get summary metrics
   */
  getSummary() {
    if (this.metrics.length === 0) {
      return null;
    }

    const successfulMetrics = this.metrics.filter((m) => m.success);
    const failedMetrics = this.metrics.filter((m) => !m.success);

    const totalTokens = this.metrics.reduce(
      (sum, m) => sum + (m.totalTokens || 0),
      0
    );
    const avgResponseTimeMs =
      successfulMetrics.reduce((sum, m) => sum + m.responseTimeMs, 0) /
      successfulMetrics.length;

    const responseTimes = successfulMetrics
      .map((m) => m.responseTimeMs)
      .sort((a, b) => a - b);

    return {
      totalMessages: this.metrics.length,
      successfulMessages: successfulMetrics.length,
      failedMessages: failedMetrics.length,
      totalTokens,
      avgResponseTimeMs: Math.round(avgResponseTimeMs * 100) / 100,
      minResponseTimeMs:
        responseTimes.length > 0 ? responseTimes[0] : 0,
      maxResponseTimeMs:
        responseTimes.length > 0
          ? responseTimes[responseTimes.length - 1]
          : 0,
      p50ResponseTimeMs:
        responseTimes.length > 0
          ? responseTimes[Math.floor(responseTimes.length * 0.5)]
          : 0,
      p95ResponseTimeMs:
        responseTimes.length > 0
          ? responseTimes[Math.floor(responseTimes.length * 0.95)]
          : 0,
      p99ResponseTimeMs:
        responseTimes.length > 0
          ? responseTimes[Math.floor(responseTimes.length * 0.99)]
          : 0,
    };
  }

  /**
   * Get all metrics
   */
  getMetrics(): MessageMetrics[] {
    return this.metrics;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    this.previousResponses = [];
  }
}
