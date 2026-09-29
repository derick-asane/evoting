# Campus Ballot

A student-union voting platform where every ballot is recorded on a blockchain.

Universities create an account, deploy their own election contract, load their
student roster, and open the polls. Students vote with an ordinary username and
password — no wallet, no crypto, no gas — and get a receipt they can use to
check that their ballot was recorded exactly as they cast it.

## Why a blockchain here

The point is not that ballots live in "a blockchain". The point is which
guarantees stop depending on trusting the people running the website:

| Guarantee | Enforced by |
| --- | --- |
| One student, one vote per post | `Election.castBallot` reverts on a second vote for a position the student already used |
| Only eligible students vote | The on-chain roll is sealed before voting opens; anyone not on it is rejected |
| Nobody sees how you voted | Identity and choice are written as two unlinked records |
| The count is honest | Every ballot is a public event; anyone can recount and compare |
| The committee cannot rewrite history | Past elections live in their own finished contracts |

Each university administers its elections from **its own wallet**, generated at
signup. The platform funds that wallet but is not the contract admin — so
whoever operates this server cannot add a candidate to your ballot, alter your
roll, or close your poll.

## How ballot secrecy works

When a ballot is cast, the contract writes two separate records:

```
hasVoted[voterHash][positionId]     = true          // "this student voted for this post"
ballotChoice[receiptId][positionId] = candidate + 1 // "this ballot chose X for that post"
```

`voterHash` is `keccak256(pepper + universityId + studentId)`. `receiptId` is 32
random bytes generated at the moment of voting, handed to the student, and
**never stored on the server**.

Nothing on-chain links the two. The public log proves turnout and totals; it
names nobody. Only the holder of a receipt can connect a person to a choice —
which is what makes the receipt both useful and worth keeping private.

## Who is actually voting

The chain proves a ballot was counted exactly as cast. It says nothing about
who cast it. That is a separate problem, and it is the harder one.

Four things stand between a ballot and someone who is not entitled to it, in
the order they apply:

**1. An account cannot be opened with a matriculation number.** Numbers are
sequential, printed on cards and read aloud in lecture halls. They identify a
student; they do not authenticate one. Setting a password requires an
activation code the committee issues against a student card — in bulk, from the
console, as a sheet to print and hand out. Before this existed, every account
nobody had logged into yet belonged to whoever typed the number first.

**2. The password is asked for again at the moment of casting.** A session
cookie only proves somebody signed in on this browser within the last four
hours; in a shared lab that is regularly not the person now sitting there. This
is the last point at which anything can still be stopped.

**3. Supervised voting, per election.** With it on, a committee member at a
desk matches the photo on a student card to the person in front of them and
checks them in, which opens a single-use 15-minute window for that student.
`/[locale]/university/check-in` is that desk. Every check-in records which
committee account made it, so a disputed ballot leads back to a named person at
a known minute.

**4. The student is told.** A ballot cast under an account raises an alert on
that account. It prevents nothing — by then the ballot is on the chain — but a
student finding an alert for a vote they never cast is the only way a leaked
credential is ever discovered.

### What this cannot do

**No remote voting system can tell a student from someone the student willingly
gave their password to.** If a candidate offers money for a login, nothing
cryptographic detects it: the ballot is cast by a valid credential doing
precisely what its holder intended. This is the coercion-resistance problem,
and it is why the literature broadly concludes remote e-voting cannot solve it.

Layers 1, 2 and 4 raise the cost of *stealing* a credential and make its use
visible afterwards. Only layer 3 — a human looking at a face — survives a
credential that was *given away*. That is the honest claim: turn supervision on
for an election that matters, and the guarantee becomes "the chain proves the
count, and a person at the desk proves the voter."

Supervision is off by default, because an election with nobody staffing the
desk and supervision on is an election in which nobody can vote.

## Running it

You need Node 20.9+ (developed on Node 24) and two terminals.

**1. Install**

```bash
npm install
npm --prefix blockchain install
```

**2. Compile the contract and export it to the app**

```bash
npm --prefix blockchain run export
```

This writes `lib/contract/election.ts` (ABI + bytecode). Re-run it whenever you
change `blockchain/contracts/Election.sol`.

**3. Start the local chain** — leave this running

```bash
npm --prefix blockchain run node
```

**4. Set up the database**

You need PostgreSQL running. Put the connection string in `.env` — Prisma's CLI
reads that file, and Next.js reads it too:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/campus_ballot?schema=public"
```

Then create the schema. This creates the database too, if it does not exist:

```bash
npx prisma migrate dev
```

`npm run dev` and `npm run build` both run `prisma generate` first, so the
client is always in step with the schema.

**5. Configure the app**

```bash
cp .env.example .env.local
```

Then replace the three `replace-me-...` secrets. Generate each with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The two private keys in `.env.example` are Hardhat's standard local dev
accounts, identical on every machine. They are fine locally and must never be
used on a public network.

**6. Seed a demo election (optional but recommended)**

```bash
npm run seed
```

This drives a full election end to end against the chain, asserts every
guarantee listed above, then graduates two students and runs a second election
to prove they are locked out. It prints logins you can sign in with.

**7. Run the app**

```bash
npm run dev
```

## Accessibility

Two audits run against the app, both as npm scripts:

    npm run audit:a11y       # axe-core over every page, in jsdom
    npm run audit:contrast   # WCAG ratios computed from the design tokens

`audit:a11y` needs the app running and defaults to port 3002. If you have other
Next projects running, point it at the right one:

    npm run audit:a11y -- --base http://127.0.0.1:3210

It checks the page title before auditing anything and refuses if the port
belongs to a different app — otherwise it silently reports another codebase's
violations, or a wall of 404s that look like broken routes.

Contrast is computed rather than eyeballed: the ratio is a formula over sRGB
luminance, so it is exact and repeatable where a screenshot could only say it
"looks fine". All 32 text and control pairs meet WCAG 2.1 AA in both light and
dark.

Form-field borders use a separate --line-control token that clears 3:1, because
a field is identified by its border (WCAG 1.4.11). Card outlines are decorative
— the card already separates itself by surface colour and shadow — so they stay
light and are deliberately not held to that bar.

Every page has a skip link, one focus-visible ring covers all controls, and
wide tables scroll inside their own container rather than pushing the page
sideways on a phone.

**What these audits cannot see:** jsdom has no layout engine and does not run
the page JavaScript, so anything that only exists after hydration — open menus,
the error boundary, focus order in practice — is untested. That needs a real
browser and a human.

## Tests

```bash
npm --prefix blockchain test   # 28 contract tests
npm test                       # 73 application tests
npm run seed                   # full-stack run with assertions
npx tsc --noEmit               # typecheck
```

The contract tests cover the rules the election depends on: double voting,
unregistered voters, wrong-phase ballots, relayer authorisation, receipt
collisions, and that the `BallotCast` event carries no voter identity.

`npm test` covers the layer above the contract, in `tests/`:

| File | What it holds to account |
|---|---|
| `crypto-identity.test.ts` | Wallet-key encryption refuses tampered ciphertext; voter handles are stable per student, differ across universities, and reveal nothing about the student id; 2000 receipt ids with no collision. |
| `throttle.test.ts` | Lockout at the limit and not before, per-scope isolation, window reset, expiry — and that an identifier naming no account is throttled too, so the form cannot be used to enumerate students. |
| `password-reset.test.ts` | A code is single-use, a new code voids the old one, an expired code is refused, and of two simultaneous redemptions exactly one wins. |
| `action-authorisation.test.ts` | Every Server Action re-checks the session and the election's owner; the ballot re-verifies the password before submitting and alerts the student afterwards without carrying a choice; the ballot action never calls `refresh()`; uploads decide the format from the bytes; the locale proxy skips `/api`. |
| `check-in.test.ts` | A pass is single-use even against two racing ballots, expires on its own, is refused for a student not on the roll or no longer enrolled, and cannot be issued twice while one is open. |
| `i18n.test.ts` | French and English hold the same keys with the same placeholders, nothing is blank, and nothing is left in English by accident. |
| `result-sheet.test.ts` | The CSV escapes a candidate name that would otherwise run as a formula in Excel, doubles embedded quotes instead of breaking the row, and reports a tie as a tie. |

The authorisation tests read the source rather than calling the actions,
because a Server Action reads cookies through `next/headers` and needs a live
request context that no test process has. What is being defended there is the
shape of the code — that the guard is present at all — so the shape is what is
checked, and a new action added without one fails the suite.

They need Postgres running. Nothing else: no chain, no dev server. The two
suites that write create their own throwaway rows under a random `test-reset-…`
slug and delete them in an `after` hook, so your real universities are never
read or touched.

## Positions

An election fills as many posts as the committee configures — President,
Treasurer, whatever that union actually elects. Nothing in the contract assumes
a structure.

A student casts **one ballot covering every post**, in a single transaction.
Each position carries its own candidate list and its own one-vote-per-student
rule, so voting for President does not consume a Treasurer vote. Skipping a
position is a valid abstention that leaves that vote unspent and usable later.

The whole ballot is atomic: if any line is invalid, none of it is recorded. A
partly-counted ballot cannot exist, which is verified by a contract test.

Registration cannot open until every position has at least one candidate,
otherwise the sealed ballot would contain a post nobody can be elected to.

## Past elections

A university keeps every election it has run. The archive at
/u/[slug]/elections lists them newest first, and each one has its own page at
/u/[slug]/e/[electionId] rendering the same component as the live results
page — so an archived result cannot drift from how it looked while the polls
were open.

**Receipt verification searches every election**, not just the current one. A
code from a previous year resolves against the contract it was actually cast
in, and the result says which election that was. Without this the README
promise that old receipts stay verifiable was true of the chain but not of the
interface.

An election page is only served under the university that owns it; a link
carrying another institution's slug 404s rather than rendering their result
under the wrong name.

## Recounting it yourself

Without a public block explorer, "anyone can verify the count" needs something
concrete. There is a command for it:

    npm run verify -- <contract address>

The address is printed on every results page. The script connects to the chain,
pulls the raw BallotCast, VoterCheckedIn and VoterRegistered logs, rebuilds
every tally from scratch, and compares its own arithmetic against what the
contract reports.

It uses **none of the application code** — no database, no server modules, no
shared helpers, only viem and the public ABI. That is what makes it worth
anything: verified by running it with a deliberately broken DATABASE_URL, where
it still produces a full correct report. If this script and the website ever
disagree, the website is wrong.

It checks eight things, including that every ballot came from a voter on the
sealed roll, and that no ballot record in the log contains a voter identity —
the secrecy claim, demonstrated rather than asserted.

## Result sheets

Any election can be downloaded from its results page as a spreadsheet (CSV) or
a filed document (PDF). Both are public, because the tallies already are — a
login would protect nothing and would stop a candidate or a student paper
checking the count.

Every figure is read from the contract when the request arrives, so a stale
result cannot be served. A sheet downloaded while voting is open is marked
**provisional**; after the polls close it is marked final.

Two details worth knowing:

- **CSV fields are guarded against formula injection.** A candidate registered
  as `=HYPERLINK("http://evil","click")` would otherwise execute when the
  committee opens the file in Excel. Leading `=`, `+`, `-` and `@` are prefixed
  with an apostrophe, which keeps the value inert text.
- **The PDF says it carries no authority the chain does not already give it,**
  and prints the contract address so anyone can recount the events themselves.
  A tie is reported as a tie, never resolved by list order.

## Running offline

The app needs no internet at runtime. Fonts are downloaded at build time by
next/font/google and served from your own server, photos live in Postgres, and
the only network calls are to your local Postgres and your local chain. The
served HTML references no external host at all.

Internet is needed once, for setup: npm install, the first solc download, and
the first next build (which fetches the fonts).

### Serving it on a LAN

`COOKIE_SECURE` must stay `false` unless you are serving over HTTPS.

A browser will not store a `Secure` cookie that arrived over plain HTTP, with
`localhost` the single exception. Tying the flag to `NODE_ENV` — the usual
recipe — therefore breaks a production build the moment it is served on a LAN
address like `http://192.168.1.20:3000`: the cookie is set, silently dropped,
and nobody can sign in. It works perfectly on the machine you tested it on,
which is what makes it worth a line in the README.

### When the chain restarts

A Hardhat node keeps its state in memory and has no persistence flag, so
stopping it destroys every deployed contract while Postgres still holds the
accounts, rosters, union team and photos.

    npm --prefix blockchain run node   # start the fresh chain
    npm run chain:rebuild              # put the elections back

The rebuild re-funds each university wallet, redeploys every missing contract
from a ballot snapshot kept in Postgres, restores the voter roll, and returns
each election to the phase it was in. Pass --dry-run to see what it would do.

**Votes do not come back.** They existed only on the chain that was restarted.
A rebuilt election has its full ballot and roll but an empty tally, and the
script says so rather than quietly presenting a result nobody cast.

The snapshot is written by the contract-write functions themselves, so it stays
current whoever makes the change — a Server Action, a seed script, or a one-off
repair. The contract remains the authority for everything displayed; the
snapshot is only ever read by the rebuild.

## The lifecycle

```
Setup  ──▶  Registration  ──▶  Voting  ──▶  Ended
  │             │                │            │
  positions +   write roll       ballots      final,
  candidates    to chain         accepted     immutable
```

Each step is one-way and enforced by the contract. Candidates cannot be added
after registration opens; the roll cannot change after voting opens; nothing
changes after the polls close.

## Students who leave

Students are `enrolled`, `graduated` or `withdrawn`. Only enrolled students can
activate an account or be written to a roll.

Because each election is a separate contract with a separate roll, a graduate is
excluded from every future election automatically — the committee marks them
graduated, and the next election's roll simply never includes them. Ballots they
cast while enrolled stay on the chain, stay counted, and stay verifiable with
their receipt forever.

## Notifications

When the committee opens voting, every student on the roll is notified, and the
alert appears on their university's pages. Closing the polls notifies them
again. Notifications are raised only after the chain has accepted the phase
change, so an alert can never announce a poll that failed to open.

Delivery is currently **in-app only**. `deliverExternally` in
`lib/notifications.ts` is the seam where email or SMS would hook in; it is left
as a logging stub deliberately, because a half-configured sender fails quietly
and election day is the wrong time to discover that.

## Data

PostgreSQL via Prisma, and **only off-chain records**. Ballots, tallies and the
voter roll live in each election's contract; the database holds the private
institutional records — who is enrolled, who has an account, which wallet an
institution administers from.

Two modelling decisions carry real weight:

- **`RollEntry` is a join table, not a flag on the student.** Being on a roll is
  per-election, which is exactly what keeps a graduate off next year's roll
  while leaving last year's record intact.
- **Notifications carry `@@unique([studentId, electionId, kind])`.**
  De-duplication is the database's job, so re-running a phase change cannot
  send anyone a second copy.

Roster imports use `createMany({ skipDuplicates: true })` against the
`(universityId, studentId)` unique index, so a re-pasted roster loses nobody.
Activation uses a conditional `updateMany` so two concurrent requests cannot
both claim one account.

`lib/db.ts` caches the client on `globalThis` to survive hot reloads, keyed on
the connection string — editing `DATABASE_URL` otherwise leaves a cached client
holding dead credentials, which surfaces as an authentication error that looks
nothing like its cause.

Pinned to Prisma **7.10.0**: the `latest` tag currently points at an `8.0.0-rc`.
Prisma 7 requires a driver adapter, hence `@prisma/adapter-pg`.

## Languages

English and French, with every route under a locale segment (`/en/...`,
`/fr/...`) so a French link stays French when it is shared.

`proxy.ts` picks the locale for a request with no prefix: a locale the visitor
chose here before, then their browser's `Accept-Language`, then English. The
switcher in the header swaps the segment in place, so it keeps you on the page
you were reading.

Translations live in `lib/i18n/en.ts` and `lib/i18n/fr.ts`. **English defines
the `Dictionary` type and French is checked against it**, so a missing French
key is a build error rather than a page that quietly falls back to English.

To add a locale: add its file, add it to `LOCALES` and `dictionaries` in
`lib/i18n/index.ts`, and TypeScript will list every string still missing.

Two things to know when editing:

- Strings interpolate with `{placeholders}` via `t()` rather than string
  concatenation, so a translator can move a value to wherever their grammar
  needs it.
- `next/root-params` works only in Server Components. `lib/i18n/server.ts`
  holds those helpers; Server Actions and the proxy import from
  `lib/i18n/index.ts` and take the locale explicitly, which is why localised
  forms post a hidden `locale` field. The domain layer returns failure *codes*
  (`{ ok: false, code: "notEnrolled" }`) rather than English prose, so messages
  are translated at the edge.

## Design

Tokens live at the top of `app/globals.css`. Light and dark are both selected
rather than one being an automatic inversion of the other.

Candidate colours come from a **validated categorical palette** — the eight
`--series-*` tokens. They are assigned by ballot position and never cycled, so
a candidate keeps their colour when the ranking moves. The palette passes
colourblind-separation and lightness checks in both modes; three of the light
steps fall below 3:1 against white, which is why every bar on the results page
carries its count and share as text rather than relying on colour alone.

### The icon

`app/icon.svg` is the mark, and the only file to edit. It is the header
`BrandMark` stripped down until it survives a 16px browser tab: the lid, the
outline strokes and the folded slot rim are all below about 1.5px at that size
and dissolve into grey, so what is left is three solid masses — the brand tile,
a white ballot box with its slot, and the gold check above it.

```bash
npm run icons
```

regenerates `app/favicon.ico` (16, 32 and 48px, PNG-in-ICO) and
`app/apple-icon.png` (180px) from it. Next adds the `<link>` tags itself; there
is nothing to register in `layout.tsx`.

Each size is rasterised from the SVG at its own resolution rather than
downscaled from one large bitmap, so the 16px version gets its own clean edges.
The script then prints that 16px render as text, one character per pixel
coloured by which ink it landed nearest:

```
      ########################          # brand tile
    ##################oo########        o gold check
  ##################oooo##########      · white
  ################oooooo##########
  ########oooo##oooooo############
  ##########oooooooo##############
  ############oooo################
  ################################
  ####                        ####
  ####                        ####
  ####      ############      ####
  ####                        ####
  ####                        ####
  ####                        ####
    ############################
      ########################
```

That preview is the whole check. There is no browser here to look at a tab in,
and a favicon either survives the reduction or it does not — if the slot or the
check has dissolved, the shapes are too thin and the SVG needs heavier ones.
The first draft failed exactly there: the box was 5px tall with a 2px slot
through it, which read as an empty frame rather than a ballot box.

The generated files are committed, so an ordinary build never runs this. It
leans on `sharp` arriving as one of Next's own dependencies rather than one we
declare, which is fine for a tool run by hand and would not be for a build step.

## Layout

```
blockchain/            Isolated Hardhat 3 project
  contracts/           Election.sol
  test/                Contract tests
  scripts/             export-artifact.ts → lib/contract/election.ts
lib/                   Server-side core (all server-only)
  i18n/                en.ts (source of truth), fr.ts, server.ts
  chain.ts             viem clients, deployment, funding
  election.ts          Typed contract reads and writes
  election-model.ts    Shapes shared with client components
  universities.ts      Accounts and their wallets
  elections.ts         One deployed contract per election
  students.ts          Roster, enrolment status, activation
  notifications.ts     Alerts + external delivery seam
  identity.ts          voterHash and receipt generation
  crypto.ts            Wallet-key encryption, password hashing
  db.ts                Prisma client (cache keyed on DATABASE_URL)
app/
  actions/             Server Actions (each re-checks authorisation)
  components/          UI primitives, icon set, hero illustration
  [locale]/            Every route, under /en or /fr
    u/[slug]/          Public + student pages per university
    university/        Signup, login, committee console
proxy.ts               Locale detection and redirect
scripts/seed-demo.mts  Full-stack end-to-end run
prisma/                schema.prisma + migrations
```

## Known limits

Worth being straight about, especially if this is going in front of an examiner:

- **The relayer can censor.** It submits ballots so students need no wallet. It
  cannot forge, alter or double-cast a vote — the contract blocks all three —
  but it could refuse to submit one. Making that impossible means having each
  student sign their own ballot, which means giving every student a wallet.
- **The server sees the receipt as it is created.** It is never stored, but a
  compromised server could log the receipt-to-student mapping at that instant.
  Blind signatures or a commit–reveal scheme would close this.
- **Eligibility is off-chain and trusted.** The university decides who is a
  student. The chain enforces that only the sealed roll votes; it cannot know
  whether that roll was honest.
- **Local chain by default.** Deploying to a public testnet needs `RPC_URL`,
  `CHAIN_ID`, and funded keys in `.env.local` — no code changes.
