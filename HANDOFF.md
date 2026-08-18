# MALAM — handoff

Read this first if you are picking this up in a **cloud session** (Claude Code web,
or a Codespace). Everything needed is in this repo.

## What this is

The vertical slice from `docs/MALAM_The_Thirteenth_Call_Game_Design_and_Script.docx`
§19: **Arrival Court → Surau → Caretaker House → generator → Call 4.** Browser
first-person horror, three.js + TypeScript, no art or audio assets — textures are
painted on a canvas and every sound is synthesised.

The GDD is the authority. Where this code and the doc disagree, the doc wins.

## Run it

```bash
npm install
npm run dev          # Codespaces forwards 5173 and opens a preview URL
```

In a Codespace the forwarded URL works on a phone, which is the point: the touch
controls (left pad walks, drag right side to look, USE / CRANK / CROUCH) are built
in, so mobile testing needs no build step and no store.

## What is implemented

- **Compound**: 9 zones with real walls, doorways, lintels, locked office, fog,
  fluorescents that are dead until the generator runs.
- **Player**: walk, crouch, hand-crank torch — light costs noise, and noise feeds Hunt.
- **Penunggu**: the Hunt meter bands from §10 (listening → searching → hunting),
  cannot cross into the prayer hall, and capture never destroys progress.
- **Calls 1–4**: the authored lines from table 8, recorded to the cassette deck,
  shown on the evidence board. Call 4 ends the slice.
- **P1 Generator Breath**: valves AIR–FUEL–AIR, and the starter only catches while
  thunder covers the noise. A wrong pull costs 12 Hunt, per §8.
- **Set pieces**: the payphone that rings again, the White Caller behind patterned
  glass, and every telephone ringing at once when power returns.
- **Accessibility**: reduced-sudden-audio option replaces the stinger with a swell.

## What is NOT built

Schoolhouse archive, clinic, radio hut, cemetery boundary, exchange hut, calls 5–12,
the four endings, the Small Borrower and Flying Shadow, save slots beyond one, and
any real voice acting. §16's "do later" column is the backlog, in order.

## Guardrails — do not quietly drop these

From §2 of the GDD, and they are the reason this is publishable at all:

- The jinn is the antagonist. Islam, prayer and the surau are never presented as evil.
- No Qur'anic verse is a game mechanic or a weapon.
- The prayer hall is respected safety, not a haunted spectacle.
- No grave is opened, climbed on or robbed — the cemetery puzzle uses a boundary marker.
- A Malaysian Muslim cultural consultant reviews before asset production.
- Run the KAMLA-similarity check across title, story, setting, pursuer, ritual, items,
  UI and marketing **before** anything is announced. This repo stays private until then.

## Verified vs assumed

CI (`.github/workflows/build.yml`) typechecks and builds on every push, so "it
compiles" is verified in the cloud. **Nobody has played this build yet** — the
slice has never been run in a browser. First cloud session should do that, and
expect greybox jank: prop placement, torch reach and Hunt tuning are unplayed guesses.
