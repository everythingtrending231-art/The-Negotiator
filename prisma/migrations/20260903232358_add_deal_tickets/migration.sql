-- CreateTable
CREATE TABLE "DealTicket" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessName" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "finalPriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "includedGoods" TEXT NOT NULL,
    "additionalBenefits" TEXT,
    "conditions" TEXT,
    "paymentTerms" TEXT,
    "deliveryTerms" TEXT,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "DealTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealTicket_caseId_key" ON "DealTicket"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "DealTicket_tokenHash_key" ON "DealTicket"("tokenHash");

-- AddForeignKey
ALTER TABLE "DealTicket" ADD CONSTRAINT "DealTicket_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "NegotiationCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
