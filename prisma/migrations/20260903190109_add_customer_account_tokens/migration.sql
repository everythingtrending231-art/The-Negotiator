-- CreateTable
CREATE TABLE "CustomerAccountToken" (
    "id" TEXT NOT NULL,
    "customerAccountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CustomerAccountToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerAccountToken_tokenHash_key" ON "CustomerAccountToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CustomerAccountToken_customerAccountId_idx" ON "CustomerAccountToken"("customerAccountId");

-- AddForeignKey
ALTER TABLE "CustomerAccountToken" ADD CONSTRAINT "CustomerAccountToken_customerAccountId_fkey" FOREIGN KEY ("customerAccountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
