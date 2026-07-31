-- CreateTable
CREATE TABLE "RawgGame" (
    "id" TEXT NOT NULL,
    "rawgId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "backgroundImage" TEXT,
    "released" TEXT,
    "rating" DOUBLE PRECISION,
    "metacritic" INTEGER,
    "esrbRating" TEXT,
    "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "platforms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RawgGame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RawgGame_rawgId_key" ON "RawgGame"("rawgId");
