# MALAM — The Thirteenth Call

**Dua belas panggilan adalah bukti. Yang ketiga belas jangan sekali dijawab.**
*Twelve calls are evidence. Never answer the thirteenth.*

Repo: **https://github.com/alitash92/malam**

A browser first-person horror **vertical slice** built from the game design
document: Kampung Seri Bayu, Perak, 1998. Faris returns to a flooded village
compound for his missing sister's tapes, and a jinn bound to the telephone
exchange is wearing her voice.

Malaysian Malay folklore — Penunggu, surau, kampung. three.js + TypeScript, no
art or audio assets: every texture is painted on a canvas, every sound is
synthesised at runtime.

## Reference documents

| Document | What it is |
| --- | --- |
| [docs/MALAM_The_Thirteenth_Call_Game_Design_and_Script.docx](docs/MALAM_The_Thirteenth_Call_Game_Design_and_Script.docx) | The full GDD — story, 12 calls, four endings, puzzles P1–P10 with exact solutions, production plan. **The authority: where code and doc disagree, the doc wins.** |
| [docs/SESSION-TRANSCRIPT.md](docs/SESSION-TRANSCRIPT.md) | The build session, 25 turns — every instruction, decision and correction behind this code. Credentials redacted. |
| [HANDOFF.md](HANDOFF.md) | Start here in a new session: what is built, what is not, and the guardrails. |

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

In a Codespace the forwarded port gives a URL that works on a phone — the touch
controls (left pad walks, drag the right side to look, USE / CRANK / CROUCH) are
built in, so mobile testing needs no engine and no store.

`WASD` walk · mouse look · `C` crouch · `E` use · `F` crank the torch · `R` restart.

## The slice

Arrival Court → Surau → Caretaker House → generator → Call 4, per §19 of the GDD.

- **Calls 1–4** with the authored lines from table 8, recorded to the cassette
  deck before they count as evidence.
- **P1 Generator Breath** — valves AIR–FUEL–AIR, starter only catches while
  thunder covers the noise; a wrong pull costs 12 Hunt.
- **The Penunggu** with the Hunt bands from §10. She cannot cross into the prayer
  hall, and a capture never destroys progress.
- **Hand-crank torch** — light is bought with noise, and noise feeds the Hunt meter.
- Set pieces: the payphone that rings again, the White Caller behind patterned
  glass, every telephone ringing when power returns.

Not built: schoolhouse archive, clinic, radio hut, cemetery, exchange hut, calls
5–12, the four endings, the lesser manifestations. §16's "do later" column is the
backlog, in order.

## Guardrails (§2 of the GDD — non-negotiable)

The jinn is the antagonist; Islam, prayer and the surau are never presented as
evil. No Qur'anic verse is a game mechanic. The prayer hall is respected safety,
not a spectacle. No grave is disturbed. A Malaysian Muslim cultural consultant
reviews before asset production, and the KAMLA-similarity check runs before
anything is announced — which is why this repo is private.

## Status

CI typechecks and builds every push. **The slice has never been played** — prop
placement, torch reach and Hunt tuning are unplayed guesses.
