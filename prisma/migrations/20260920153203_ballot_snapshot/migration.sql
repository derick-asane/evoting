-- Lets a restarted local chain be rebuilt without retyping the ballot.
-- The contract stays the authority for anything displayed.

ALTER TABLE "elections" ADD COLUMN "ballotSnapshot" JSONB;
