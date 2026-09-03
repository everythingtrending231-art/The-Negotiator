-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "negotiatorId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "savedMoney" BOOLEAN,
    "improvedDeal" BOOLEAN,
    "negotiatorRating" INTEGER,
    "wouldUseAgain" BOOLEAN,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_caseId_key" ON "Feedback"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_tokenHash_key" ON "Feedback"("tokenHash");

-- CreateIndex
CREATE INDEX "Feedback_negotiatorId_idx" ON "Feedback"("negotiatorId");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "NegotiationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_negotiatorId_fkey" FOREIGN KEY ("negotiatorId") REFERENCES "Negotiator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
