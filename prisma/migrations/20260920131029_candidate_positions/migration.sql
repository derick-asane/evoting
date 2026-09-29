-- Candidates are now scoped to a position within the election, so a profile is
-- identified by (election, position, candidate) rather than (election, candidate).

ALTER TABLE "candidate_profiles"
  ADD COLUMN "positionIndex" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "candidate_profiles_electionId_candidateIndex_key";

CREATE UNIQUE INDEX "candidate_profiles_electionId_positionIndex_candidateIndex_key"
  ON "candidate_profiles" ("electionId", "positionIndex", "candidateIndex");
