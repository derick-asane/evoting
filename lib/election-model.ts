/**
 * Shapes and labels shared by server and client code.
 *
 * Deliberately free of any server-only import: client components need the
 * Phase enum, and pulling it from lib/election.ts would drag the chain clients
 * and their private keys into the browser bundle.
 */

/** Mirrors the Phase enum in Election.sol. */
export enum Phase {
  Setup = 0,
  Registration = 1,
  Voting = 2,
  Ended = 3,
}

/**
 * Maps a phase to its dictionary key, so callers read labels out of the
 * translation for the current locale rather than a hardcoded English table.
 */
export type PhaseKey = "setup" | "registration" | "voting" | "ended";

export const PHASE_KEY: Record<Phase, PhaseKey> = {
  [Phase.Setup]: "setup",
  [Phase.Registration]: "registration",
  [Phase.Voting]: "voting",
  [Phase.Ended]: "ended",
};

export const PHASE_DESCRIPTION_KEY: Record<Phase, `${PhaseKey}Description`> = {
  [Phase.Setup]: "setupDescription",
  [Phase.Registration]: "registrationDescription",
  [Phase.Voting]: "votingDescription",
  [Phase.Ended]: "endedDescription",
};

export type Candidate = {
  id: number;
  name: string;
  party: string;
  voteCount: number;
};

/** One post being elected, with everyone standing for it. */
export type Position = {
  id: number;
  title: string;
  /** Ballots that included a choice for this post. */
  ballotsCast: number;
  candidates: Candidate[];
};

export type ElectionState = {
  title: string;
  phase: Phase;
  positionCount: number;
  registered: number;
  /** One per student who voted, however many posts they covered. */
  totalBallots: number;
  /** Individual position-level votes across the election. */
  totalVotes: number;
};

/** One line of a cast ballot: a post and the candidate chosen for it. */
export type BallotLine = {
  positionId: number;
  candidateId: number;
};
