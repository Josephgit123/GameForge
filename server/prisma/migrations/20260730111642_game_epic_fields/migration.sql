-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "genre" TEXT,
ADD COLUMN     "platform" TEXT,
ADD COLUMN     "screenshotUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "systemRequirements" TEXT;
