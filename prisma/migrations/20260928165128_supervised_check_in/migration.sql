-- AlterTable
ALTER TABLE "elections" ADD COLUMN     "supervised" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "voting_passes" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "electionId" TEXT NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "voting_passes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voting_passes_studentId_electionId_usedAt_idx" ON "voting_passes"("studentId", "electionId", "usedAt");

-- CreateIndex
CREATE INDEX "voting_passes_electionId_issuedAt_idx" ON "voting_passes"("electionId", "issuedAt");

-- AddForeignKey
ALTER TABLE "voting_passes" ADD CONSTRAINT "voting_passes_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voting_passes" ADD CONSTRAINT "voting_passes_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "elections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
