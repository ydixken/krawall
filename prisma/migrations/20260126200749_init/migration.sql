-- CreateEnum
CREATE TYPE "ConnectorType" AS ENUM ('HTTP_REST', 'WEBSOCKET', 'GRPC', 'SSE');

-- CreateEnum
CREATE TYPE "AuthType" AS ENUM ('NONE', 'BEARER_TOKEN', 'API_KEY', 'BASIC_AUTH', 'CUSTOM_HEADER', 'OAUTH2');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Target" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "connectorType" "ConnectorType" NOT NULL,
    "endpoint" TEXT NOT NULL,
    "authType" "AuthType" NOT NULL,
    "authConfig" JSONB NOT NULL,
    "requestTemplate" JSONB NOT NULL,
    "responseTemplate" JSONB NOT NULL,
    "protocolConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Target_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "flowConfig" JSONB NOT NULL,
    "repetitions" INTEGER NOT NULL DEFAULT 1,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "delayBetweenMs" INTEGER NOT NULL DEFAULT 0,
    "verbosityLevel" INTEGER NOT NULL DEFAULT 1,
    "messageTemplates" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioTarget" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "configOverrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "scenarioId" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executionConfig" JSONB NOT NULL,
    "logPath" TEXT,
    "messageCount" INTEGER,
    "totalTokens" INTEGER,
    "avgResponseTimeMs" DOUBLE PRECISION,
    "errorCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionMetric" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messageIndex" INTEGER NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "requestSentAt" TIMESTAMP(3) NOT NULL,
    "responseReceivedAt" TIMESTAMP(3) NOT NULL,
    "responseTimeMs" DOUBLE PRECISION NOT NULL,
    "success" BOOLEAN NOT NULL,
    "errorType" TEXT,
    "errorMessage" TEXT,
    "repetitionScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledJob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "cronExpression" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Target_connectorType_idx" ON "Target"("connectorType");

-- CreateIndex
CREATE INDEX "Target_isActive_idx" ON "Target"("isActive");

-- CreateIndex
CREATE INDEX "Scenario_category_idx" ON "Scenario"("category");

-- CreateIndex
CREATE INDEX "Scenario_isPublic_idx" ON "Scenario"("isPublic");

-- CreateIndex
CREATE INDEX "ScenarioTarget_scenarioId_idx" ON "ScenarioTarget"("scenarioId");

-- CreateIndex
CREATE INDEX "ScenarioTarget_targetId_idx" ON "ScenarioTarget"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "ScenarioTarget_scenarioId_targetId_key" ON "ScenarioTarget"("scenarioId", "targetId");

-- CreateIndex
CREATE INDEX "Session_targetId_idx" ON "Session"("targetId");

-- CreateIndex
CREATE INDEX "Session_scenarioId_idx" ON "Session"("scenarioId");

-- CreateIndex
CREATE INDEX "Session_status_idx" ON "Session"("status");

-- CreateIndex
CREATE INDEX "Session_startedAt_idx" ON "Session"("startedAt");

-- CreateIndex
CREATE INDEX "SessionMetric_sessionId_idx" ON "SessionMetric"("sessionId");

-- CreateIndex
CREATE INDEX "SessionMetric_messageIndex_idx" ON "SessionMetric"("messageIndex");

-- CreateIndex
CREATE INDEX "ScheduledJob_isEnabled_idx" ON "ScheduledJob"("isEnabled");

-- CreateIndex
CREATE INDEX "ScheduledJob_nextRunAt_idx" ON "ScheduledJob"("nextRunAt");

-- AddForeignKey
ALTER TABLE "ScenarioTarget" ADD CONSTRAINT "ScenarioTarget_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioTarget" ADD CONSTRAINT "ScenarioTarget_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionMetric" ADD CONSTRAINT "SessionMetric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledJob" ADD CONSTRAINT "ScheduledJob_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
