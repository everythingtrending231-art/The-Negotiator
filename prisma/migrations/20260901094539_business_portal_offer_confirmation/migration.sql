-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BusinessContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "BusinessContact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BusinessContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_BusinessContact" ("businessId", "createdAt", "email", "id", "isPrimary", "name", "phone", "role") SELECT "businessId", "createdAt", "email", "id", "isPrimary", "name", "phone", "role" FROM "BusinessContact";
DROP TABLE "BusinessContact";
ALTER TABLE "new_BusinessContact" RENAME TO "BusinessContact";
CREATE UNIQUE INDEX "BusinessContact_userId_key" ON "BusinessContact"("userId");
CREATE INDEX "BusinessContact_businessId_idx" ON "BusinessContact"("businessId");
CREATE TABLE "new_Offer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "caseId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "negotiatorId" TEXT NOT NULL,
    "originalValueCents" INTEGER,
    "finalPriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "includedGoods" TEXT NOT NULL,
    "additionalBenefits" TEXT,
    "conditions" TEXT,
    "validUntil" DATETIME,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "customerDecision" TEXT,
    "decidedAt" DATETIME,
    "businessContactId" TEXT,
    "businessConfirmedAt" DATETIME,
    "businessFeedback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Offer_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "NegotiationCase" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Offer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Offer_negotiatorId_fkey" FOREIGN KEY ("negotiatorId") REFERENCES "Negotiator" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Offer_businessContactId_fkey" FOREIGN KEY ("businessContactId") REFERENCES "BusinessContact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Offer" ("additionalBenefits", "businessId", "caseId", "conditions", "createdAt", "currency", "customerDecision", "decidedAt", "deliveryTerms", "finalPriceCents", "id", "includedGoods", "negotiatorId", "originalValueCents", "paymentTerms", "status", "updatedAt", "validUntil") SELECT "additionalBenefits", "businessId", "caseId", "conditions", "createdAt", "currency", "customerDecision", "decidedAt", "deliveryTerms", "finalPriceCents", "id", "includedGoods", "negotiatorId", "originalValueCents", "paymentTerms", "status", "updatedAt", "validUntil" FROM "Offer";
DROP TABLE "Offer";
ALTER TABLE "new_Offer" RENAME TO "Offer";
CREATE INDEX "Offer_caseId_idx" ON "Offer"("caseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
