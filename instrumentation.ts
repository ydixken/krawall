export async function register() {
  // Only run on the server, not during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { createSessionWorker } = await import('@/lib/jobs/workers/session-executor');
    const { createMetricsWorker } = await import('@/lib/jobs/workers/metrics-aggregator');

    const sessionWorker = createSessionWorker();
    const metricsWorker = createMetricsWorker();

    console.log('Workers started: session-execution, metrics-aggregation');

    // Graceful shutdown
    const shutdown = async () => {
      await sessionWorker.close();
      await metricsWorker.close();
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
