import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { addSessionJob, ExecutionConfig, FlowStep } from "@/lib/jobs/queue";
import { z } from "zod";
import { randomBytes } from "crypto";

const BatchExecuteSchema = z.object({
  scenarioId: z.string().cuid(),
  targetIds: z.array(z.string().cuid()).min(1).max(50),
  executionConfig: z
    .object({
      repetitions: z.number().int().min(1).max(1000).optional(),
      concurrency: z.number().int().min(1).max(10).optional(),
      delayBetweenMs: z.number().int().min(0).max(60000).optional(),
      messageTemplates: z.record(z.unknown()).optional(),
      verbosityLevel: z.enum(["normal", "verbose", "extreme"]).optional(),
    })
    .optional(),
});

/**
 * POST /api/execute/batch
 * Execute a scenario against multiple targets simultaneously.
 * Creates one session per target and queues them all.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = BatchExecuteSchema.parse(body);

    // Validate scenario
    const scenario = await prisma.scenario.findUnique({
      where: { id: data.scenarioId },
    });

    if (!scenario) {
      return NextResponse.json(
        { success: false, error: "Scenario not found" },
        { status: 404 }
      );
    }
    if (!scenario.isActive) {
      return NextResponse.json(
        { success: false, error: "Scenario is not active" },
        { status: 400 }
      );
    }

    // Validate all targets exist and are active
    const targets = await prisma.target.findMany({
      where: { id: { in: data.targetIds }, isActive: true },
      select: { id: true, name: true },
    });

    const foundIds = new Set(targets.map((t) => t.id));
    const missingIds = data.targetIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Targets not found or inactive: ${missingIds.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Generate batch ID
    const batchId = `batch-${randomBytes(8).toString("hex")}`;

    // Build execution config from scenario + overrides
    const executionConfig: ExecutionConfig = {
      flowConfig: (scenario.flowConfig as FlowStep[] | null) ?? undefined,
      repetitions: scenario.repetitions,
      concurrency: scenario.concurrency,
      delayBetweenMs: scenario.delayBetweenMs,
      messageTemplates:
        (scenario.messageTemplates as Record<string, unknown> | undefined) ?? undefined,
      verbosityLevel: scenario.verbosityLevel as ExecutionConfig["verbosityLevel"],
      ...(data.executionConfig || {}),
    };

    // Create sessions and queue jobs for each target
    const sessions = await Promise.all(
      data.targetIds.map(async (targetId) => {
        const session = await prisma.session.create({
          data: {
            targetId,
            scenarioId: data.scenarioId,
            status: "PENDING",
            executionConfig: {
              ...executionConfig,
              batchId,
            } as any,
            startedAt: new Date(),
          },
        });

        await addSessionJob({
          sessionId: session.id,
          targetId,
          scenarioId: data.scenarioId,
          executionConfig,
        });

        await prisma.session.update({
          where: { id: session.id },
          data: { status: "QUEUED" },
        });

        const target = targets.find((t) => t.id === targetId)!;
        return {
          sessionId: session.id,
          targetId,
          targetName: target.name,
          status: "QUEUED",
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          batchId,
          scenarioId: data.scenarioId,
          scenarioName: scenario.name,
          sessions,
          totalTargets: sessions.length,
        },
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("POST /api/execute/batch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to execute batch",
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
