/*
  Warnings:

  - You are about to drop the column `isPublic` on the `Scenario` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Scenario` table. All the data in the column will be lost.
  - You are about to drop the column `avgResponseTimeMs` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `errorCount` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `messageCount` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `totalTokens` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the `ScenarioTarget` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `category` on table `Scenario` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ScenarioTarget" DROP CONSTRAINT "ScenarioTarget_scenarioId_fkey";

-- DropForeignKey
ALTER TABLE "ScenarioTarget" DROP CONSTRAINT "ScenarioTarget_targetId_fkey";

-- DropIndex
DROP INDEX "Scenario_isPublic_idx";

-- AlterTable
ALTER TABLE "Scenario" DROP COLUMN "isPublic",
DROP COLUMN "tags",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "targetId" TEXT,
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "category" SET DEFAULT 'custom',
ALTER COLUMN "verbosityLevel" SET DEFAULT 'normal',
ALTER COLUMN "verbosityLevel" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "avgResponseTimeMs",
DROP COLUMN "errorCount",
DROP COLUMN "messageCount",
DROP COLUMN "totalTokens",
ADD COLUMN     "summaryMetrics" JSONB;

-- DropTable
DROP TABLE "ScenarioTarget";

-- CreateIndex
CREATE INDEX "Scenario_isActive_idx" ON "Scenario"("isActive");

-- CreateIndex
CREATE INDEX "Scenario_targetId_idx" ON "Scenario"("targetId");

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Target"("id") ON DELETE SET NULL ON UPDATE CASCADE;
