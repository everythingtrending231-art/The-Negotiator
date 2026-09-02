-- CreateEnum
CREATE TYPE "ContentBlockType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO');

-- CreateTable
CREATE TABLE "ContentBlock" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "adminLabel" TEXT,
    "type" "ContentBlockType" NOT NULL,
    "textValue" TEXT,
    "mediaUrl" TEXT,
    "mediaMimeType" TEXT,
    "mediaSizeBytes" INTEGER,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentBlock_page_idx" ON "ContentBlock"("page");

-- CreateIndex
CREATE UNIQUE INDEX "ContentBlock_page_key_key" ON "ContentBlock"("page", "key");

-- AddForeignKey
ALTER TABLE "ContentBlock" ADD CONSTRAINT "ContentBlock_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
