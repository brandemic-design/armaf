-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "consentComms" BOOLEAN NOT NULL DEFAULT false,
    "ageVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "timeBonus" INTEGER NOT NULL DEFAULT 0,
    "rank" TEXT,
    "puzzleState" JSONB,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomResult" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "tokensEarned" INTEGER NOT NULL DEFAULT 0,
    "timeSpentSec" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "rank" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaderboardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_country_idx" ON "LeaderboardEntry"("country");

-- CreateIndex
CREATE INDEX "LeaderboardEntry_totalTokens_idx" ON "LeaderboardEntry"("totalTokens" DESC);

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomResult" ADD CONSTRAINT "RoomResult_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
