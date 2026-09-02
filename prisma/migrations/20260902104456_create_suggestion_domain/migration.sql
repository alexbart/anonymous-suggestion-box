-- CreateEnum
CREATE TYPE "SuggestionCategory" AS ENUM ('PATIENT_CARE', 'STAFFING', 'EQUIPMENT', 'WORKPLACE_SAFETY', 'STAFF_WELFARE', 'MANAGEMENT', 'COMMUNICATION', 'OTHER');

-- CreateEnum
CREATE TYPE "SuggestionPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'PENDING', 'ACTIONED', 'CLOSED');

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "category" "SuggestionCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "SuggestionPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "SuggestionStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SuggestionNote" (
    "id" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuggestionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Suggestion_referenceCode_key" ON "Suggestion"("referenceCode");

-- CreateIndex
CREATE INDEX "Suggestion_status_idx" ON "Suggestion"("status");

-- CreateIndex
CREATE INDEX "Suggestion_category_idx" ON "Suggestion"("category");

-- CreateIndex
CREATE INDEX "Suggestion_createdAt_idx" ON "Suggestion"("createdAt");

-- CreateIndex
CREATE INDEX "Attachment_suggestionId_idx" ON "Attachment"("suggestionId");

-- CreateIndex
CREATE INDEX "SuggestionNote_suggestionId_idx" ON "SuggestionNote"("suggestionId");

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuggestionNote" ADD CONSTRAINT "SuggestionNote_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
