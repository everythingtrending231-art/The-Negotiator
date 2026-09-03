-- CreateEnum
CREATE TYPE "RiskFlagStatus" AS ENUM ('OPEN', 'CLEARED');

-- CreateTable
CREATE TABLE "RiskFlag" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "customerEmail" TEXT,
    "status" "RiskFlagStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "raisedByType" "ActorType" NOT NULL,
    "raisedById" TEXT,
    "clearedNote" TEXT,
    "clearedAt" TIMESTAMP(3),
    "clearedByType" "ActorType",
    "clearedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RiskFlag_caseId_idx" ON "RiskFlag"("caseId");

-- CreateIndex
CREATE INDEX "RiskFlag_customerEmail_idx" ON "RiskFlag"("customerEmail");

-- CreateIndex
CREATE INDEX "RiskFlag_status_idx" ON "RiskFlag"("status");

-- AddForeignKey
ALTER TABLE "RiskFlag" ADD CONSTRAINT "RiskFlag_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "NegotiationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
