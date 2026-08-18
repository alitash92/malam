import type { Call } from './data/calls'

const $ = (id: string) => document.getElementById(id)!

/**
 * All UI is DOM over the canvas. Subtitles carry a speaker label and a voice
 * tag (RECORDED / LIVE / UNKNOWN) because the acceptance checklist requires the
 * player to tell those apart WITHOUT the label spoiling which voice is a mimic.
 */
export class Hud {
  private subtitleTimer: number | null = null

  setObjective(text: string) { $('objective').textContent = text }

  setHunt(value: number, state: string) {
    const bar = $('hunt-fill')
    bar.style.width = `${value}%`
    bar.dataset.band = value >= 75 ? 'high' : value >= 50 ? 'mid' : value >= 25 ? 'low' : 'calm'
    $('hunt-state').textContent = state
  }

  setTorch(charge: number) {
    const fill = $('torch-fill')
    fill.style.width = `${Math.round(charge * 100)}%`
    fill.dataset.low = String(charge < 0.2)
  }

  setPrompt(text: string | null) {
    const el = $('prompt')
    el.textContent = text ?? ''
    el.hidden = !text
  }

  say(speaker: string | null, text: string, ms = 4200) {
    $('sub-speaker').textContent = speaker ?? ''
    $('sub-text').textContent = text
    $('subtitle').classList.add('show')
    if (this.subtitleTimer) window.clearTimeout(this.subtitleTimer)
    this.subtitleTimer = window.setTimeout(() => $('subtitle').classList.remove('show'), ms)
  }

  /** The evidence board from §7 — four slots for the demo's four calls. */
  setEvidence(recorded: number[], calls: Call[]) {
    $('evidence').innerHTML = calls
      .map((call) => {
        const has = recorded.includes(call.id)
        return `<li data-has="${has}"><b>${call.id}</b> ${has ? call.station : '— — —'}</li>`
      })
      .join('')
  }

  flashPower() {
    document.body.classList.add('power')
    window.setTimeout(() => document.body.classList.remove('power'), 900)
  }

  show(screen: 'intro' | 'game' | 'caught' | 'end') {
    for (const id of ['intro', 'caught', 'end']) $(id).hidden = screen !== id
    $('hud').hidden = screen !== 'game'
  }
}
