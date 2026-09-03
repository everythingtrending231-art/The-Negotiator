-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "raisedByType" "ActorType" NOT NULL,
    "raisedById" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByType" "ActorType",
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeNote" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "authorType" "ActorType" NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dispute_caseId_idx" ON "Dispute"("caseId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE INDEX "DisputeNote_disputeId_idx" ON "DisputeNote"("disputeId");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "NegotiationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeNote" ADD CONSTRAINT "DisputeNote_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
