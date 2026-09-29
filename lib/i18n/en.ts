/**
 * English is the source of truth: its shape defines the `Dictionary` type, so
 * every other locale is checked against it at build time. A missing French key
 * is a type error, not a silent fallback to English at runtime.
 */
export const en = {
  locale: {
    name: "English",
    switchTo: "Passer en français",
  },

  brand: {
    name: "Campus Ballot",
    tagline:
      "Every ballot is written to that election's own contract. Tallies shown here are read back from the chain, never from a database.",
  },

  nav: {
    universitySignIn: "University sign in",
    createAccount: "Create account",
    results: "Results",
    verify: "Verify a ballot",
    studentSignIn: "Student sign in",
    signOut: "Sign out",
    skipToContent: "Skip to main content",
  },

  footer: {
    oneStudent: "One student",
    oneStudentDetail: "one vote, enforced on-chain",
    secretBallot: "Secret ballot",
    secretBallotDetail: "identity and choice unlinked",
    openCount: "Open count",
    openCountDetail: "anyone can recount the log",
  },

  home: {
    badge: "Secret ballot · Public count",
    titleLead: "Student elections your",
    titleAccent: "campus can verify",
    lead: "Each university runs its election in its own contract, administered from its own wallet. Students vote with an ordinary login — no wallet, no crypto — and walk away with a receipt that proves their ballot was counted exactly as they cast it.",
    createAccount: "Create a university account",
    signIn: "University sign in",
    statInstitutions: "Institutions",
    statBallots: "Ballots on-chain",
    statAlterable: "Ballots we can alter",
    institutionsEyebrow: "Live on the platform",
    institutionsTitle: "Institutions running elections",
    institutionsLead:
      "Open any institution to see its ballot, its running count, and the full record of every vote cast.",
    noUniversities: "No universities have signed up yet.",
    createFirst: "Create the first account",
    createFirstTail: "to run an election.",
    noElection: "No election set up yet.",
    trustEyebrow: "The trust model",
    trustTitle: "What the contract guarantees",
    trustLead:
      "Not promises this website makes. Rules the chain enforces, whatever this website does.",
    guaranteeOneTitle: "One student, one vote",
    guaranteeOneRule: "castVote reverts on a repeat",
    guaranteeOneBody:
      "A second ballot from the same student is refused by the contract, not filtered by our code. There is no version of this we could quietly change on election night.",
    guaranteeSecretTitle: "Your choice stays yours",
    guaranteeSecretRule: "two records, nothing linking them",
    guaranteeSecretBody:
      "Who voted and what they chose are written separately. The roll proves turnout; it never names a preference. Only your receipt connects the two, and only you hold it.",
    guaranteeCountTitle: "Anyone can recount",
    guaranteeCountRule: "every ballot is a public event",
    guaranteeCountBody:
      "The full ballot box is readable by anyone. Add it up yourself — if your total disagrees with the published result, the published result is wrong.",
  },

  phase: {
    setup: "Setting up",
    registration: "Registration open",
    voting: "Voting open",
    ended: "Closed",
    setupDescription:
      "Candidates are being added. The ballot is not final yet.",
    registrationDescription:
      "Eligible students are being added to the roll. Voting has not started.",
    votingDescription: "Registered students can cast their ballot now.",
    endedDescription: "The poll is closed and the result is final.",
  },

  common: {
    candidates: "Candidates",
    onTheRoll: "Students on the roll",
    ballotsCast: "Ballots cast",
    turnout: "Turnout",
    votes: "votes",
    vote: "vote",
    viewResults: "View results",
    castBallot: "Cast your ballot",
    signInToVote: "Sign in to vote",
    working: "Working…",
    electionContract: "Election contract",
    noElectionYet: "has not set up an election yet.",
    of: "of",
  },

  auth: {
    showPassword: "Show password",
    hidePassword: "Hide password",
    secureNotice:
      "Your password never leaves this server, and it is stored only as a salted hash.",
    studentEyebrow: "Student access",
    universityEyebrow: "Electoral committee",
    panelStudentTitle: "Your vote, and proof it counted.",
    panelStudentPoint1:
      "One ballot per student, refused by the contract if you try twice.",
    panelStudentPoint2:
      "Nothing on the chain links your name to your choice.",
    panelStudentPoint3:
      "You leave with a receipt that proves how your ballot was recorded.",
    panelUniversityTitle: "Run an election nobody has to take on trust.",
    panelUniversityPoint1:
      "Your own wallet deploys and administers every election you run.",
    panelUniversityPoint2:
      "Not even the platform operators can alter your ballot or your count.",
    panelUniversityPoint3:
      "Students, press and candidates can recount the result themselves.",
    accountMenu: "Account menu",
    signOutQuestion: "Sign out of this device?",
    signOutBody:
      "Your ballot and your receipt are unaffected. You can sign back in at any time.",
    confirmSignOut: "Yes, sign out",
    cancel: "Cancel",
    signedOutTitle: "You are signed out",
    signedOutBody:
      "Anything you already submitted is on the chain and unaffected. Keep your receipt code somewhere safe.",
    signBackIn: "Sign back in",
    backHome: "Back to the election",
  },

  student: {
    signInTitle: "Student sign in",
    signInLead: "Use the student ID printed on your {university} card.",
    tabSignIn: "Sign in",
    tabActivate: "Activate account",
    studentId: "Student ID",
    password: "Password",
    choosePassword: "Choose a password",
    confirmPassword: "Confirm password",
    activationCode: "Activation code",
    activateHint:
      "The code your electoral committee gave you against your student card.",
    activateNoCode:
      "No code? Ask your electoral committee. Your student ID on its own is not enough to open an account — anyone could read it off your card.",
    passwordHint: "At least 8 characters.",
    activateSubmit: "Activate and continue",
    signedInAs: "Signed in as",
    candidatesFor: "Standing for President this year.",
    noCandidates: "No candidates have been added to the ballot yet.",
  },

  ballot: {
    title: "Your ballot",
    hint: "Choose one candidate for each position. You may leave a position blank.",
    legend: "Candidates for {position}",
    abstain: "Leave blank — no vote for this position",
    submit: "Cast my ballot",
    submitting: "Recording your ballot on the chain…",
    finalWarning:
      "Submitting writes every choice to the election contract in one transaction. This is final.",
    confirmLabel: "Confirm with your password",
    confirmHint:
      "Asked again here because being signed in is not proof that you are the one voting.",
    recordedTitle: "Ballot recorded",
    recordedLead: "Your ballot is on the chain in block {block}.",
    yourChoices: "What you voted for",
    leftBlank: "Left blank: {positions}",
    partiallyVoted:
      "You have already voted for some positions. Only the posts you can still vote for are shown.",
    receiptTitle: "Save your receipt code now",
    receiptBody:
      "This is shown once and is not stored anywhere. It is the only way to check how your ballot was recorded — and the only thing that can link you to your choice, so keep it to yourself.",
    transaction: "Transaction",
    copyReceipt: "Copy code",
    copiedReceipt: "Copied",
    downloadReceipt: "Download",
    verifyMine: "Verify my ballot",
    seeCount: "See the count",
    alreadyVotedTitle: "Your ballot is already in the box",
    alreadyVotedBody:
      "The chain records one ballot against your student ID, so you cannot vote again. If you kept your receipt, you can confirm your choice was recorded exactly as you made it.",
    verifyWithReceipt: "Verify with my receipt",
    seeRunningCount: "See the running count",
    votingClosed: "Voting has closed. The result is final.",
    votingNotOpen:
      "Voting has not opened yet. Come back once your committee opens the polls.",
    checkInNeededTitle: "Check in at the desk first",
    notOnRoll:
      "Your account is active, but your electoral committee has not yet written you to the on-chain roll. This usually happens shortly before voting opens — check back soon.",
    departedTitle: "You are no longer registered as an enrolled student",
    departedBody:
      "Your record shows you as {status}, so you are not on the roll for this election and cannot vote in it. Any ballot you cast while enrolled is still on the chain, still counted, and can still be verified with its receipt.",
    verifyPast: "Verify a past ballot",
  },

  results: {
    liveCount: "Live count",
    finalResult: "Final result",
    lead: "{title} · read directly from the election contract each time this page loads.",
    presidentElect: "President-elect",
    leading: "Leading",
    tied: "Tied",
    byCandidate: "Count by candidate",
    stillOpen: "Voting is still open, so these numbers will keep moving.",
    closed: "The poll is closed. These numbers can no longer change.",
    noCandidates: "No candidates on the ballot yet.",
    ballotBox: "The ballot box",
    ballotBoxHint:
      "Every ballot the contract has accepted, newest first. No entry names a student.",
    reconciles:
      "Recount checks out: {logged} ballots in the log, {tallied} counted across all candidates.",
    mismatch:
      "Mismatch: {logged} ballots in the log but {tallied} counted. Investigate before trusting this result.",
    noBallots: "No ballots cast yet.",
    positionsLabel: "Positions",
    recountTitle: "Recount it yourself",
    recountHint: "Do not take this page on trust. This command reads the contract directly and rebuilds every tally from the raw ballot records, using none of this website code and no access to its database. If it disagrees with the numbers above, the numbers above are wrong.",
    recountRun: "Run this from the project folder:",
    recountChecks: "It confirms the tallies match the ballot log, that every ballot came from a registered voter, and that no ballot record can be traced to the person who cast it.",
    downloadTitle: "Official result sheet",
    downloadHint: "Every figure is read from the contract when you download it. The provisional sheet changes as votes arrive; once the polls close it is final.",
    downloadCsv: "Download spreadsheet (CSV)",
    downloadPdf: "Download result sheet (PDF)",
    provisionalNote: "Voting is still open, so this sheet is marked provisional.",
    position: "Position",
    elected: "Elected",
    reconcilesByPosition:
      "Recount checks out: {lines} ballot lines in the log, and every position tallies to the same number.",
    mismatchByPosition:
      "Mismatch between the logged ballot lines and the counted tallies. Investigate before trusting this result.",
    receipt: "Receipt",
    choice: "Choice",
    block: "Block",
    recorded: "Recorded",
    showingRecent: "Showing the 50 most recent of {total} ballots.",
    source: "Source: {event} events from",
  },

  verify: {
    title: "Verify a ballot",
    lead: "Paste the receipt code you were given after voting to see exactly how your ballot was recorded in {election}.",
    leadAnyElection:
      "Paste the receipt code you were given after voting. It is checked against every election this union has run, so a code from a previous year still works.",
    searchesCount: "Searching {count} elections.",
    foundIn: "Recorded in {election}.",
    receiptCode: "Receipt code",
    submit: "Look up my ballot",
    checking: "Checking the chain…",
    foundTitle: "This ballot is on the chain.",
    foundBody: "It was recorded as a vote for {candidate}.",
    foundWarning:
      "If that is not the choice you made, contact your electoral committee immediately and keep this code.",
  },

  university: {
    signUpTitle: "Create a university account",
    signUpLead:
      "Signing up generates a wallet that belongs to your institution. Your elections are deployed and administered from it, so nobody running this platform can add candidates to your ballot or close your poll.",
    institutionName: "Institution name",
    institutionNameHint:
      "Used for your public election address, e.g. /u/state-university.",
    contactEmail: "Contact email",
    contactEmailHint: "You will sign in with this.",
    adminPassword: "Administrator password",
    adminPasswordHint: "At least 10 characters.",
    confirmPassword: "Confirm password",
    creating: "Creating your wallet on the chain…",
    createAccount: "Create account",
    alreadyRegistered: "Already registered?",
    signIn: "Sign in",
    signInTitle: "University sign in",
    signInLead: "For electoral committee staff.",
    signingIn: "Signing in…",
    noAccount: "No account yet?",
    createOne: "Create one",
  },

  console: {
    title: "Committee console",
    publicPageAt: "public page at",
    leaveConsole: "Sign out",
    startElection: "Start an election",
    startElectionHint:
      "This deploys a new contract, signed by your institution's wallet. It is the election.",
    electionTitle: "Election title",
    electionTitleHint: "For example: Students' Union President 2026",
    deploy: "Deploy election contract",
    deploying: "Deploying the contract…",
    walletTitle: "Account wallet",
    walletHint: "Your institution's wallet on the election chain.",
    walletBody:
      "Elections you create are deployed from this address, which makes it the only account that can administer them.",
    studentsListed: "Students listed",
    onChainRoll: "On-chain roll",
    contract: "Contract",
    administeredBy: "Administered by",
    stage: "Election stage",
    stageHint: "Each step is one-way and is enforced by the contract.",
    stepSetup: "Setup",
    stepRegistration: "Registration",
    stepVoting: "Voting",
    stepClosed: "Closed",
    openRegistration: "Seal ballot, open registration",
    openRegistrationWarning: "No more candidates can be added after this.",
    openVoting: "Seal roll, open voting",
    openVotingWarning: "No more students can be added to the roll after this.",
    openVotingPending:
      "{count} activated students still need writing to the roll. They will be locked out.",
    closePolls: "Close the polls",
    closePollsWarning:
      "Voting stops immediately and the result becomes final.",
    submitting: "Submitting to the chain…",
    finished: "The election is closed. Nothing further can be changed.",
    addPosition: "Add a position",
    addPositionHint: "The posts this election fills — President, Treasurer, and so on. Add them before adding candidates.",
    positionTitle: "Position title",
    positionsStat: "Positions",
    standingFor: "Standing for",
    noCandidatesYet: "No candidates for this position yet.",
    addCandidate: "Add a candidate",
    addCandidateHint: "Only possible while the election is in setup.",
    candidateName: "Full name",
    candidateParty: "Party or slogan",
    candidateManifesto: "Manifesto (one or two lines)",
    add: "Add",
    adding: "Adding…",
    ballot: "Ballot",
    studentsTitle: "Eligible students",
    studentsHint:
      "Eligibility is kept here, off-chain. Only a salted hash of an activated student reaches the contract.",
    pasteRoster: "Paste the roster",
    rosterHint:
      "One per line: STUDENT_ID, Full Name, Programme. Add a fourth field (enrolled / graduated / withdrawn) to set status; the default is enrolled.",
    addToList: "Add to eligibility list",
    endOfYear: "End of year",
    endOfYearBody:
      "Mark students who have left. They keep their account and every ballot they already cast stays valid and verifiable, but they will not be written to any future election roll — so they cannot vote again.",
    updateStatus: "Update status",
    updating: "Updating…",
    notEnrolledCount: "{count} students currently not enrolled",
    activatedSummary:
      "{activated} of {total} enrolled students have activated an account.",
    pendingSummary: "{count} of them are not on the on-chain roll yet.",
    allOnRoll: "All eligible students are on the on-chain roll.",
    writeRoll: "Write activated students to the roll",
    writingRoll: "Writing to the chain…",
    onlyDuringRegistration: "Only possible while registration is open.",
    emptyRollBlock:
      "Write at least one student to the roll first. Opening the polls seals the roll permanently, and an election with an empty roll can never accept a ballot.",
    confirmLockout:
      "I understand that {count} activated students will be locked out of this election for good.",
    colStudentId: "Student ID",
    colName: "Name",
    colStatus: "Status",
    statusOnRoll: "On the roll",
    statusActivated: "Activated",
    statusNotActivated: "Not activated",
  },

  archive: {
    navLabel: "Past elections",
    title: "Elections",
    lead: "Every election this union has run, newest first. Past results stay readable, and past receipts stay verifiable, for as long as the contracts exist.",
    empty: "No elections have been deployed yet.",
    current: "Current",
    deployedOn: "Deployed {date}",
    unreachable: "Chain unreachable",
    seePast: "See past elections",
  },

  union: {
    navLabel: "Union team",
    title: "Your students' union",
    lead: "The people who run the union, from the president down. Have a look before you vote.",
    empty: "The union roster has not been published yet.",
    reportsTo: "Reports to",
    membersCount: "{count} members",
    seeTeam: "Meet the union team",
    manageTitle: "Union team",
    manageHint:
      "Published on your public pages so voters can see who runs the union before they vote. Informational only — nothing here affects eligibility or the count.",
    memberName: "Full name",
    memberRole: "Role",
    memberBio: "Short bio",
    memberParent: "Reports to",
    memberParentNone: "Nobody (top of the tree)",
    memberPhoto: "Photo",
    addMember: "Add member",
    addingMember: "Adding…",
    removeMember: "Remove",
    removeWarning: "Removing someone also removes everyone under them.",
    noMembers: "No union members added yet.",
  },

  security: {
    forgotPassword: "Forgotten your password?",
    resetTitle: "Set a new password",
    resetLead:
      "Ask your electoral committee for a reset code, in person and with your student card. Then enter it here.",
    resetCode: "Reset code",
    resetCodeHint: "Twelve characters, in three groups, e.g. K3MP-7QXR-9TFA.",
    resetSubmit: "Set new password",
    resetDone: "Password updated. Sign in with your new password.",
    issueTitle: "Password resets",
    issueHint:
      "Issue a single-use code for a student who cannot sign in. Check their student card first — this code lets whoever holds it take over the account.",
    issueStudentId: "Student ID",
    issueCode: "Issue reset code",
    issuing: "Issuing…",
    activationTitle: "Activation codes",
    activationHint:
      "A student ID is printed on a card and is not a secret, so it cannot be what opens an account. Every student needs a code from you, handed over against their student card, before they can set a password and vote.",
    activationIssue: "Print codes for everyone not yet activated",
    activationWarning:
      "Shown once. Print or download this sheet now — after you leave this page the codes cannot be recovered, only reissued.",
    activationDownload: "Download sheet (CSV)",
    activationPrint: "Print sheet",
    activationCount: "{count} codes",
    activationColumnStudent: "Student",
    activationColumnId: "ID",
    activationColumnCode: "Code",
    auditTitle: "Activity log",
    auditHint:
      "Every committee action, in order. The chain records what happened to ballots; this records what the committee did.",
    auditEmpty: "No activity recorded yet.",
    auditWhen: "When",
    auditWho: "Who",
    auditWhat: "What",
  },

  photo: {
    label: "Photo",
    hint: "JPEG, PNG or WebP, up to 4 MB. Shown to voters on the ballot.",
    change: "Change photo",
    upload: "Upload",
    uploading: "Uploading…",
    none: "No photo",
    ofCandidate: "Photo of {name}",
  },

  enrolment: {
    enrolled: "Enrolled",
    graduated: "Graduated",
    withdrawn: "Withdrawn",
    reEnrolled: "Re-enrolled",
  },

  checkIn: {
    title: "Check-in desk",
    backToConsole: "Back to the console",
    navLabel: "Check-in desk",
    noElection: "There is no election to check students in for yet.",
    notSupervised:
      "This election is not supervised, so students can vote without being checked in. Turn supervision on in the console for this desk to mean anything.",
    notVoting:
      "The polls are not open. You can still check students in, but their ballots will be refused until voting starts.",
    deskTitle: "Clear a student to vote",
    deskHint:
      "Check the photo on the student card against the person in front of you, then enter their number. This is the only step in the whole system that a stolen or borrowed password cannot get past.",
    studentId: "Student ID",
    checkIn: "Check in",
    checkingIn: "Checking in…",
    cardReminder:
      "Look at the card, not the phone screen. A student who has handed their password to someone else is invisible to every other check here — this is the one that catches it.",
    logTitle: "Today at this desk",
    logHint:
      "Every check-in, and who made it. A disputed ballot leads back to a named committee member at a known minute.",
    logTally: "{issued} checked in · {used} have voted",
    logEmpty: "Nobody has been checked in yet.",
    logWhen: "When",
    logStudent: "Student",
    logBy: "Checked in by",
    logState: "State",
    stateOpen: "Cleared",
    stateVoted: "Voted",
    stateExpired: "Expired",
    consoleTitle: "Supervised voting",
    consoleHint:
      "With this on, a student must be checked in at the desk against their student card before they can cast. It is the only control here that still works when a student has given their password away willingly — which nothing else can detect.",
    consoleOn: "On — a check-in is required to cast",
    consoleOff: "Off — a password is enough to cast",
    consoleEnable: "Require check-in",
    consoleDisable: "Stop requiring check-in",
    consoleOpenDesk: "Open the check-in desk",
  },

  notification: {
    votingOpenTitle: "Voting is open: {election}",
    votingOpenBody:
      "The polls are open and you are on the roll. Sign in to cast your ballot.",
    votingClosedTitle: "Voting has closed: {election}",
    votingClosedBody:
      "The polls are closed and the result is final. You can view the count.",
    ballotCastTitle: "A ballot was cast in your name",
    ballotCastBody:
      "A ballot was submitted for {election} on {when}. If that was not you, tell your electoral committee immediately — someone else has your password.",
    goToBallot: "Go to my ballot",
    viewResult: "View the result",
  },

  errors: {
    enterCredentials: "Enter your student ID and password.",
    confirmWithPassword: "Enter your password to confirm this is you.",
    wrongPasswordToVote:
      "That password is not correct. Your ballot has not been cast.",
    needCheckIn:
      "This election is supervised. Take your student card to the electoral committee desk to be checked in, then come back — your check-in lasts 15 minutes.",
    ballotFailedCheckInAgain:
      "Your ballot could not be recorded and your check-in has been used. Nothing was counted. See the committee desk to be checked in again.",
    checkInUnknown: "No student with that number is on this university's records.",
    checkInNotEnrolled:
      "That student is not currently enrolled and cannot be checked in.",
    checkInNotOnRoll:
      "That student is not on this election's roll. Write them to the roll first, or they will be turned away by the contract.",
    checkInAlreadyOpen:
      "That student already has an open check-in. Wait for it to be used or to expire before issuing another.",
    passwordsDoNotMatch: "The two passwords do not match.",
    unknownUniversity: "Unknown university.",
    badCredentials: "Student ID or password is incorrect.",
    badEmailOrPassword: "Email address or password is incorrect.",
    enterEmailAndPassword: "Enter your email address and password.",
    choosePassword: "Choose an administrator password.",
    sessionExpired: "Your session has expired. Sign in again to vote.",
    noElectionSelected: "No election was selected.",
    wrongUniversity: "That election does not belong to your university.",
    selectCandidate: "Select a candidate before submitting.",
    invalidCandidate: "That is not a valid candidate.",
    votingNotOpenNow: "Voting has not opened yet.",
    votingClosedNow: "Voting has closed for this election.",
    notOnRollYet:
      "You are not on the voter roll yet. Your electoral committee adds activated students to the roll before voting opens.",
    alreadyVoted: "Our records show you have already voted in this election.",
    departed:
      "Your record shows you as {status}, so you cannot vote in this election. Ballots you cast while enrolled remain valid and can still be verified.",
    ballotFailed:
      "The ballot could not be recorded on the chain. Nothing was counted — please try again.",
    badReceipt:
      "That does not look like a receipt code. It is 0x followed by 64 characters.",
    receiptNotFoundAnywhere:
      "No ballot in any of this university's elections carries that receipt. Check for a typo — the code must be copied exactly.",
    receiptNotFound:
      "No ballot in this election carries that receipt. Check for a typo — the code must be copied exactly.",
    unknownElection: "Unknown election.",
    notAuthorised: "Not authorised.",
    candidateNeedsName: "A candidate needs a name.",
    positionNeedsTitle: "A position needs a title, for example President.",
    pickPosition: "Choose which position this candidate is standing for.",
    chooseAtLeastOne: "Choose a candidate for at least one position, or you have not voted.",
    pasteStudents: "Paste at least one student.",
    noUsableLines:
      "No usable lines found. Use: STUDENT_ID, Full Name, Programme",
    listStudentIds: "List at least one student ID.",
    unknownStatus: "Unknown enrolment status.",
    unknownPhase: "Unknown phase.",
    giveTitle: "Give the election a title.",
    photoTooLarge: "That image is larger than 4 MB. Please use a smaller file.",
    photoUnsupported: "That file is not a supported image. Use JPEG, PNG or WebP.",
    photoEmpty: "Choose an image file to upload.",
    memberNeedsName: "A union member needs a full name.",
    memberNeedsRole: "A union member needs a role, for example President.",
    memberBadParent: "That person is not on this union roster.",
    memberNotFound: "That union member no longer exists.",
    tooManyAttempts:
      "Too many failed attempts. For security, try again in {minutes} minutes.",
    enterCodeAndPassword: "Enter your code and choose a password.",
    resetBadCode: "That code is not valid. Check it and try again.",
    resetExpired: "That code has expired. Ask the committee for a new one.",
    resetUsed: "That reset code has already been used.",
    activateCodeUsed:
      "That activation code has already been used. If it was not you who used it, tell your electoral committee now.",
    resetStudentNotFound: "No student with that ID is on this university's records.",
  },

  /**
   * Outcomes the domain layer reports as codes rather than prose, so the
   * message can be translated at the edge instead of baked into the store.
   */
  reasons: {
    activatePasswordShort: "Choose a password of at least 8 characters.",
    signUpNameTooShort: "Enter the full name of the institution.",
    signUpBadSlug: "That name cannot be turned into a web address.",
    signUpBadEmail: "Enter a valid contact email address.",
    signUpPasswordShort:
      "Choose an administrator password of at least 10 characters.",
    signUpNameTaken:
      "An account already exists for an institution with that name.",
    signUpEmailTaken: "That email address is already registered.",
    signUpChainUnreachable:
      "The election chain is unreachable, so the account was not created. Check that the node is running and try again.",
  },

  notices: {
    candidateAdded: "{name} added to the ballot.",
    positionAdded: "Position \"{title}\" added.",
    studentsAdded: "{added} students added to the eligibility list",
    studentsSkipped: ", {skipped} skipped (already listed).",
    rollWritten: "{count} students written to the on-chain roll.",
    allAlreadyOnRoll: "Every activated student is already on the on-chain roll.",
    registrationOpen: "Ballot sealed. Registration is now open.",
    votingOpen: "Roll sealed. Voting is now open.",
    pollsClosed: "Polls closed. The result is final.",
    studentsNotified: "{count} students notified.",
    statusUpdated: "{count} students marked as {status}.",
    notFound: " Not found: {ids}.",
    deployed: '"{title}" deployed at {address}.',
    photoUpdated: "Photo updated.",
    memberAdded: "{name} added to the union team.",
    memberRemoved: "Member removed, along with anyone reporting to them.",
    resetIssued:
      "Reset code for {name}: {code} — valid for 24 hours, single use. Hand it over in person; it is not shown again.",
    activationIssued:
      "{count} activation code(s) issued, valid until {date}. Any codes printed earlier no longer work.",
    activationNoneNeeded:
      "Every enrolled student has already set a password. No codes were issued.",
    supervisionOn:
      "Supervised voting is on. Students must now be checked in at the desk before they can cast.",
    supervisionOff:
      "Supervised voting is off. A student ID and password are now all that is needed to cast.",
    checkedIn: "{name} is cleared to vote for the next {minutes} minutes.",
  },

  chain: {
    notAdmin: "This account's wallet does not administer that election contract.",
    wrongPhase: "The election has already moved past that step.",
    noCandidates: "Add at least one candidate first.",
    alreadyRegistered: "One of those students is already on the roll.",
    emptyValue: "A required value was blank.",
    rejected: "The chain rejected this: {error}.",
    deployFailed:
      "The election contract could not be deployed. Check that the chain is reachable and that the university wallet holds gas.",
  },
} as const;
