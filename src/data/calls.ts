/**
 * The four demo calls, verbatim from the GDD (§9, table 8). These lines are
 * authored content, not placeholder — the slice exists to prove they land.
 *
 * `speaker` drives the subtitle label, which the acceptance checklist requires
 * to distinguish real / recorded / unknown voices WITHOUT spoiling which voice
 * is the mimic.
 */
export type VoiceKind = 'recorded' | 'live' | 'unknown'

export interface Call {
  id: number
  station: string
  speaker: string
  kind: VoiceKind
  lines: string[]
  /** What recording it unlocks in the player's understanding. */
  functionNote: string
}

export const CALLS: Call[] = [
  {
    id: 1,
    station: 'Arrival payphone',
    speaker: 'AISYAH',
    kind: 'recorded',
    lines: [
      'Faris, if this reaches you, the line still remembers.',
      'Do not answer a voice just because it loves you.',
    ],
    functionNote: 'The rule of the whole night: a voice is not proof of a person.',
  },
  {
    id: 2,
    station: 'Surau office',
    speaker: 'MARIAM',
    kind: 'recorded',
    lines: [
      'Aisyah came bleeding, but she was herself. Write that down.',
      'Whatever walks now is borrowing her.',
    ],
    functionNote: 'Confirms the antagonist is an imitation, not your sister.',
  },
  {
    id: 3,
    station: 'Caretaker kitchen',
    speaker: 'HAKIM',
    kind: 'recorded',
    lines: [
      'Daud asked me for the ledger. I hid it.',
      'Then I lied to everyone.',
    ],
    functionNote: 'First confession. Points at the schoolhouse.',
  },
  {
    id: 4,
    station: 'Classroom 1',
    speaker: 'AISYAH',
    kind: 'recorded',
    lines: [
      'The children made shadow trees. One was upside down.',
      'That is where I hid the cabinet number.',
    ],
    functionNote: 'The projector clue — and the end of the demo.',
  },
]

/** Malay-first, English subtitle, per §14. Kept short for readability at speed. */
export const BEATS = {
  arrive:
    'MALAM. 11:47 p.m. Jambatan di belakang sudah tiada. — The bridge behind you is gone.',
  payphoneAgain:
    'The payphone rings again. You already walked past it once.',
  suraiSafe:
    'Dalam dewan solat, dia tidak boleh masuk. — Inside the prayer hall, it cannot follow.',
  needFuse: 'The generator is dead. Something in the caretaker kitchen holds the fuse.',
  generatorLive:
    'Power. Every telephone in the compound rings at once — then one keeps ringing.',
  whiteCaller:
    'Behind the patterned glass, a woman in white. You open the door. Nothing.',
  hunted: 'Ia sedang mendengar. — It is listening.',
  demoEnd:
    'Call 4 recorded. End of vertical slice — the archive, the cemetery and the thirteenth circuit are not built yet.',
} as const
