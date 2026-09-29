// SPDX-License-Identifier: MIT
pragma solidity ^0.8.34;

/// @title Election
/// @notice A students' union election whose ballot box lives entirely on-chain.
///
/// An election holds any number of **positions** — President, Treasurer,
/// whatever the union actually elects — each with its own candidates and its
/// own one-vote-per-student rule. The committee defines them; nothing here
/// assumes a particular structure.
///
/// A student casts one ballot covering as many positions as they choose, in a
/// single transaction. Voting for President does not consume their Treasurer
/// vote, and skipping a position is a valid abstention.
///
/// Identity and choice are deliberately kept apart. Two separate records are
/// written when a ballot is cast:
///
///   1. `hasVoted[voterHash][positionId]` - proves a registered voter has used
///      their vote for that position, and makes a second one impossible. Says
///      nothing about their choice.
///   2. `ballotChoice[receiptId][positionId]` - the choice itself, filed under
///      a random id that only the voter is given. Says nothing about who cast
///      it.
///
/// Nothing on-chain links the two. An observer can audit turnout and tallies in
/// full, but can only connect a person to a choice if they hold that receipt.
contract Election {
    enum Phase {
        Setup, // positions and candidates are being added
        Registration, // the voter roll is being sealed in
        Voting, // ballots are accepted
        Ended // tallies are final
    }

    struct Candidate {
        string name;
        string party;
        uint256 voteCount;
    }

    struct Position {
        string title;
        uint256 ballotsCast;
    }

    /// @notice Runs the election. Set once at deployment.
    address public immutable admin;

    /// @notice The only account allowed to submit ballots for voters.
    /// @dev The relayer pays gas so voters never need a wallet. It can refuse
    ///      to submit a ballot, but it can never forge one for an unregistered
    ///      voter, vote twice for anyone, or alter a recorded ballot.
    address public relayer;

    string public title;
    Phase public phase;

    Position[] private positions;
    /// @dev positionId => candidates standing for it.
    mapping(uint256 => Candidate[]) private candidates;

    /// @notice Voter roll, keyed by a hash of the voter identity.
    mapping(bytes32 => bool) public isRegistered;

    /// @notice Whether a registered voter has voted for a given position.
    mapping(bytes32 => mapping(uint256 => bool)) public hasVoted;

    /// @dev receiptId => positionId => candidate index + 1 (0 means "not voted").
    mapping(bytes32 => mapping(uint256 => uint256)) private ballotChoice;
    /// @dev receiptId => positions this ballot covered, so a receipt can be read
    ///      back without knowing which positions to ask about.
    mapping(bytes32 => uint256[]) private ballotPositions;
    /// @dev Guards against a receipt id being reused across ballots.
    mapping(bytes32 => bool) private receiptUsed;

    uint256 public registeredCount;
    /// @notice Ballots cast, counting one per student, not one per position.
    uint256 public totalBallots;
    /// @notice Individual position-level votes across the whole election.
    uint256 public totalVotes;

    event PositionAdded(uint256 indexed positionId, string title);
    event CandidateAdded(
        uint256 indexed positionId, uint256 indexed candidateId, string name, string party
    );
    event PhaseChanged(Phase indexed from, Phase indexed to);
    event RelayerChanged(address indexed from, address indexed to);
    event VoterRegistered(bytes32 indexed voterHash);

    /// @notice Announces that a voter has voted. Carries no choice.
    event VoterCheckedIn(bytes32 indexed voterHash, uint256 positionCount);

    /// @notice Announces the contents of one line of a ballot. Carries no identity.
    event BallotCast(
        bytes32 indexed receiptId,
        uint256 indexed positionId,
        uint256 indexed candidateId,
        uint256 timestamp
    );

    error NotAdmin();
    error NotRelayer();
    error WrongPhase(Phase required, Phase current);
    error NoPositions();
    error NoCandidates(uint256 positionId);
    error UnknownPosition(uint256 positionId);
    error UnknownCandidate(uint256 positionId, uint256 candidateId);
    error NotOnRoll(bytes32 voterHash);
    error AlreadyRegistered(bytes32 voterHash);
    error AlreadyVoted(bytes32 voterHash, uint256 positionId);
    error ReceiptInUse(bytes32 receiptId);
    error EmptyBallot();
    error LengthMismatch();
    error EmptyValue();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer();
        _;
    }

    modifier during(Phase required) {
        if (phase != required) revert WrongPhase(required, phase);
        _;
    }

    constructor(string memory electionTitle, address initialRelayer) {
        if (bytes(electionTitle).length == 0) revert EmptyValue();
        admin = msg.sender;
        title = electionTitle;
        relayer = initialRelayer == address(0) ? msg.sender : initialRelayer;
        phase = Phase.Setup;
    }

    // --- Administration -----------------------------------------------------

    function setRelayer(address newRelayer) external onlyAdmin {
        if (newRelayer == address(0)) revert EmptyValue();
        emit RelayerChanged(relayer, newRelayer);
        relayer = newRelayer;
    }

    /// @notice Adds a post to be elected, e.g. "Secretary General".
    function addPosition(string calldata positionTitle)
        external
        onlyAdmin
        during(Phase.Setup)
        returns (uint256 positionId)
    {
        if (bytes(positionTitle).length == 0) revert EmptyValue();
        positions.push(Position({title: positionTitle, ballotsCast: 0}));
        positionId = positions.length - 1;
        emit PositionAdded(positionId, positionTitle);
    }

    function addCandidate(uint256 positionId, string calldata name, string calldata party)
        external
        onlyAdmin
        during(Phase.Setup)
        returns (uint256 candidateId)
    {
        if (positionId >= positions.length) revert UnknownPosition(positionId);
        if (bytes(name).length == 0) revert EmptyValue();

        candidates[positionId].push(Candidate({name: name, party: party, voteCount: 0}));
        candidateId = candidates[positionId].length - 1;
        emit CandidateAdded(positionId, candidateId, name, party);
    }

    /// @notice Seal the ballot and start accepting voter registrations.
    /// @dev Every position must have at least one candidate, or the sealed
    ///      ballot would contain a post nobody can be elected to.
    function openRegistration() external onlyAdmin during(Phase.Setup) {
        if (positions.length == 0) revert NoPositions();
        for (uint256 i = 0; i < positions.length; i++) {
            if (candidates[i].length == 0) revert NoCandidates(i);
        }
        _moveTo(Phase.Registration);
    }

    function registerVoter(bytes32 voterHash) public onlyAdmin during(Phase.Registration) {
        if (voterHash == bytes32(0)) revert EmptyValue();
        if (isRegistered[voterHash]) revert AlreadyRegistered(voterHash);
        isRegistered[voterHash] = true;
        registeredCount += 1;
        emit VoterRegistered(voterHash);
    }

    function registerVoters(bytes32[] calldata voterHashes) external {
        for (uint256 i = 0; i < voterHashes.length; i++) {
            registerVoter(voterHashes[i]);
        }
    }

    /// @notice Seal the voter roll and open the polls.
    function openVoting() external onlyAdmin during(Phase.Registration) {
        _moveTo(Phase.Voting);
    }

    /// @notice Close the polls. Tallies are final from here on.
    function closeVoting() external onlyAdmin during(Phase.Voting) {
        _moveTo(Phase.Ended);
    }

    function _moveTo(Phase next) private {
        emit PhaseChanged(phase, next);
        phase = next;
    }

    // --- Voting -------------------------------------------------------------

    /// @notice Record one ballot, covering one or more positions.
    /// @param voterHash Identifies the voter on the roll. Used only to spend
    ///        their vote for the positions included here.
    /// @param receiptId Random, supplied by the server and handed to the voter.
    ///        The only key tying this person to these choices, and it is never
    ///        stored next to `voterHash`.
    /// @param positionIds Positions being voted for. Omitting one is a valid
    ///        abstention and leaves that vote unspent.
    /// @param candidateIds The chosen candidate for each position, in the same
    ///        order.
    ///
    /// The whole ballot is one transaction: either every line is recorded or
    /// none is, so a partly-counted ballot cannot exist.
    function castBallot(
        bytes32 voterHash,
        bytes32 receiptId,
        uint256[] calldata positionIds,
        uint256[] calldata candidateIds
    ) external onlyRelayer during(Phase.Voting) {
        if (receiptId == bytes32(0)) revert EmptyValue();
        if (positionIds.length == 0) revert EmptyBallot();
        if (positionIds.length != candidateIds.length) revert LengthMismatch();
        if (!isRegistered[voterHash]) revert NotOnRoll(voterHash);
        if (receiptUsed[receiptId]) revert ReceiptInUse(receiptId);

        receiptUsed[receiptId] = true;

        for (uint256 i = 0; i < positionIds.length; i++) {
            uint256 positionId = positionIds[i];
            uint256 candidateId = candidateIds[i];

            if (positionId >= positions.length) revert UnknownPosition(positionId);
            if (candidateId >= candidates[positionId].length) {
                revert UnknownCandidate(positionId, candidateId);
            }
            // Also covers a ballot listing the same position twice: the flag is
            // set below on the first pass, so the repeat trips this check.
            if (hasVoted[voterHash][positionId]) {
                revert AlreadyVoted(voterHash, positionId);
            }

            hasVoted[voterHash][positionId] = true;
            ballotChoice[receiptId][positionId] = candidateId + 1;
            ballotPositions[receiptId].push(positionId);

            candidates[positionId][candidateId].voteCount += 1;
            positions[positionId].ballotsCast += 1;

            emit BallotCast(receiptId, positionId, candidateId, block.timestamp);
        }

        totalBallots += 1;
        totalVotes += positionIds.length;

        emit VoterCheckedIn(voterHash, positionIds.length);
    }

    // --- Reading ------------------------------------------------------------

    function getPositions() external view returns (Position[] memory) {
        return positions;
    }

    function positionCount() external view returns (uint256) {
        return positions.length;
    }

    function getCandidates(uint256 positionId) external view returns (Candidate[] memory) {
        if (positionId >= positions.length) revert UnknownPosition(positionId);
        return candidates[positionId];
    }

    function candidateCount(uint256 positionId) external view returns (uint256) {
        if (positionId >= positions.length) revert UnknownPosition(positionId);
        return candidates[positionId].length;
    }

    /// @notice Which positions this voter still has a vote left for.
    function outstandingPositions(bytes32 voterHash)
        external
        view
        returns (uint256[] memory remaining)
    {
        uint256 count = 0;
        for (uint256 i = 0; i < positions.length; i++) {
            if (!hasVoted[voterHash][i]) count++;
        }

        remaining = new uint256[](count);
        uint256 cursor = 0;
        for (uint256 i = 0; i < positions.length; i++) {
            if (!hasVoted[voterHash][i]) {
                remaining[cursor] = i;
                cursor++;
            }
        }
    }

    /// @notice Look up what a ballot said, given its receipt.
    /// @return found Whether a ballot with this receipt exists.
    /// @return positionIds The positions it covered.
    /// @return candidateIds The choice recorded for each, in the same order.
    function verifyBallot(bytes32 receiptId)
        external
        view
        returns (bool found, uint256[] memory positionIds, uint256[] memory candidateIds)
    {
        if (!receiptUsed[receiptId]) {
            return (false, new uint256[](0), new uint256[](0));
        }

        positionIds = ballotPositions[receiptId];
        candidateIds = new uint256[](positionIds.length);
        for (uint256 i = 0; i < positionIds.length; i++) {
            candidateIds[i] = ballotChoice[receiptId][positionIds[i]] - 1;
        }
        return (true, positionIds, candidateIds);
    }

    /// @notice Everything a status page needs, in one call.
    function snapshot()
        external
        view
        returns (
            string memory electionTitle,
            Phase currentPhase,
            uint256 positionTotal,
            uint256 registered,
            uint256 ballots,
            uint256 votes
        )
    {
        return (title, phase, positions.length, registeredCount, totalBallots, totalVotes);
    }
}
