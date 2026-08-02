-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "beta" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "earlyAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "gameForgePlusExclusive" BOOLEAN NOT NULL DEFAULT false;
