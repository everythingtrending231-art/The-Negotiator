-- AlterTable
ALTER TABLE "NegotiationCase" ADD COLUMN     "customerPreferredBusinessId" TEXT;

-- AddForeignKey
ALTER TABLE "NegotiationCase" ADD CONSTRAINT "NegotiationCase_customerPreferredBusinessId_fkey" FOREIGN KEY ("customerPreferredBusinessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
