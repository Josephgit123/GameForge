-- DropIndex
DROP INDEX "WebhookEvent_eventType_surfboardReferenceId_key";

-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "coverImageUrl" TEXT;
