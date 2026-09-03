/*
  Warnings:

  - You are about to drop the column `fileName` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `fileSize` on the `Attachment` table. All the data in the column will be lost.
  - You are about to drop the column `storageKey` on the `Attachment` table. All the data in the column will be lost.
  - Added the required column `originalName` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `size` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storagePath` to the `Attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storedName` to the `Attachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Attachment" DROP COLUMN "fileName",
DROP COLUMN "fileSize",
DROP COLUMN "storageKey",
ADD COLUMN     "originalName" TEXT NOT NULL,
ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "storagePath" TEXT NOT NULL,
ADD COLUMN     "storedName" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Suggestion_priority_idx" ON "Suggestion"("priority");
