-- CreateTable
CREATE TABLE "CaseBusinessInvite" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "respondedByContactId" TEXT,
    "responseNote" TEXT,
    "respondedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CaseBusinessInvite_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "NegotiationCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseBusinessInvite_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CaseBusinessInvite_respondedByContactId_fkey" FOREIGN KEY ("respondedByContactId") REFERENCES "BusinessContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "CaseBusinessInvite_caseId_idx" ON "CaseBusinessInvite"("caseId");

-- CreateIndex
CREATE INDEX "CaseBusinessInvite_businessId_idx" ON "CaseBusinessInvite"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "CaseBusinessInvite_caseId_businessId_key" ON "CaseBusinessInvite"("caseId", "businessId");
