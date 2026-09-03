-- AlterTable
ALTER TABLE "NegotiationCase" ADD COLUMN     "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
