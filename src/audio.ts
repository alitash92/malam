/**
 * Every sound is synthesised at runtime — no audio files, no licences, and
 * nothing that could accidentally borrow a ceremonial melody (§14 guardrail).
 *
 * MALAM's motif is the thirteen-note telephone bell (§14). The bell is the
 * antagonist's instrument, so it gets the most authored sound in the slice:
 * twelve honest rings and a thirteenth that is pitched wrong on purpose.
 */
export class Audio {
  private ctx: AudioContext
  private master: GainNode
  private noise: AudioBuffer
  private droneGain: GainNode
  private windGain: GainNode
  private heartTimer = 0
  private reducedSudden = false
  private started = false

  constructor() {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctor()

    this.master = this.ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(this.ctx.destination)

    // 2s of white noise, reused for wind, footsteps, whispers and stingers.
    const frames = this.ctx.sampleRate * 2
    this.noise = this.ctx.createBuffer(1, frames, this.ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1

    this.droneGain = this.ctx.createGain()
    this.windGain = this.ctx.createGain()
    this.droneGain.gain.value = 0
    this.windGain.gain.value = 0
    this.droneGain.connect(this.master)
    this.windGain.connect(this.master)
  }

  /** Must be called from a user gesture or the context stays suspended. */
  start() {
    if (this.started) return
    this.started = true
    void this.ctx.resume()

    // Two detuned saws under a wandering lowpass: an unresolved room tone.
    const lowpass = this.ctx.createBiquadFilter()
    lowpass.type = 'lowpass'
    lowpass.frequency.value = 220
    lowpass.Q.value = 4
    lowpass.connect(this.droneGain)

    for (const freq of [55, 55.4, 82.5]) {
      const osc = this.ctx.createOscillator()
      osc.type = 'sawtooth'
      osc.frequency.value = freq
      osc.connect(lowpass)
      osc.start()
    }

    const lfo = this.ctx.createOscillator()
    const lfoDepth = this.ctx.createGain()
    lfo.frequency.value = 0.07
    lfoDepth.gain.value = 90
    lfo.connect(lfoDepth).connect(lowpass.frequency)
    lfo.start()

    // Wind through the corridor: looped noise through a narrow bandpass.
    const wind = this.ctx.createBufferSource()
    wind.buffer = this.noise
    wind.loop = true
    const band = this.ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 340
    band.Q.value = 0.8
    wind.connect(band).connect(this.windGain)
    wind.start()

    this.droneGain.gain.linearRampToValueAtTime(0.10, this.ctx.currentTime + 4)
    this.windGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 4)
  }

  private env(node: GainNode, peak: number, attack: number, decay: number) {
    const t = this.ctx.currentTime
    node.gain.cancelScheduledValues(t)
    node.gain.setValueAtTime(0.0001, t)
    node.gain.exponentialRampToValueAtTime(peak, t + attack)
    node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  }

  private burst(peak: number, attack: number, decay: number, type: BiquadFilterType, freq: number, q = 1) {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.playbackRate.value = 0.8 + Math.random() * 0.4
    const filter = this.ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = q
    const gain = this.ctx.createGain()
    src.connect(filter).connect(gain).connect(this.master)
    this.env(gain, peak, attack, decay)
    src.start(this.ctx.currentTime, Math.random() * 1.5)
    src.stop(this.ctx.currentTime + attack + decay + 0.05)
  }

  footstep(running: boolean) {
    this.burst(running ? 0.16 : 0.09, 0.005, running ? 0.11 : 0.16, 'lowpass', running ? 900 : 620)
  }

  /** Proximity 0..1. Faster and louder as she closes. */
  heartbeat(proximity: number, dt: number) {
    if (proximity <= 0.02) return
    const interval = 1.05 - proximity * 0.6
    this.heartTimer += dt
    if (this.heartTimer < interval) return
    this.heartTimer = 0

    const t = this.ctx.currentTime
    for (const [delay, level] of [
      [0, 0.5],
      [0.16, 0.32],
    ] as const) {
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(72, t + delay)
      osc.frequency.exponentialRampToValueAtTime(38, t + delay + 0.16)
      gain.gain.setValueAtTime(0.0001, t + delay)
      gain.gain.exponentialRampToValueAtTime(level * proximity, t + delay + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.22)
      osc.connect(gain).connect(this.master)
      osc.start(t + delay)
      osc.stop(t + delay + 0.3)
    }
  }

  /** One breath. Called from the loop, rate scaled by how close she is. */
  breath(intensity: number) {
    this.burst(0.05 + intensity * 0.1, 0.22, 0.34, 'bandpass', 620 + intensity * 260, 1.5)
  }

  whisper() {
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const band = this.ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 1500 + Math.random() * 900
    band.Q.value = 9
    const gain = this.ctx.createGain()
    const pan = this.ctx.createStereoPanner()
    pan.pan.value = Math.random() * 2 - 1
    src.connect(band).connect(gain).connect(pan).connect(this.master)

    // Syllable-ish wobble so it reads as speech, not hiss.
    const t = this.ctx.currentTime
    gain.gain.setValueAtTime(0.0001, t)
    for (let i = 0; i < 7; i++) {
      gain.gain.exponentialRampToValueAtTime(0.02 + Math.random() * 0.05, t + 0.1 + i * 0.13)
      gain.gain.exponentialRampToValueAtTime(0.004, t + 0.16 + i * 0.13)
    }
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.4)
    src.start()
    src.stop(t + 1.5)
  }

  /** The jump scare. Noise slam plus a hard downward sweep. */
  stinger() {
    if (this.reducedSudden) {
      // Same event, no spike: a swell the player can still read as "caught".
      this.burst(0.3, 0.5, 1.6, 'lowpass', 500)
      return
    }
    this.burst(0.85, 0.004, 1.1, 'highpass', 900)
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(1200, t)
    osc.frequency.exponentialRampToValueAtTime(42, t + 0.9)
    gain.gain.setValueAtTime(0.5, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.3)
    osc.connect(gain).connect(this.master)
    osc.start(t)
    osc.stop(t + 1.4)
  }

  /** Door hinge: a creak is a slow pitch bend on a filtered saw. */
  creak() {
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const filter = this.ctx.createBiquadFilter()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160 + Math.random() * 60, t)
    osc.frequency.linearRampToValueAtTime(300 + Math.random() * 120, t + 1.1)
    filter.type = 'bandpass'
    filter.frequency.value = 1100
    filter.Q.value = 12
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.3)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    osc.connect(filter).connect(gain).connect(this.master)
    osc.start(t)
    osc.stop(t + 1.3)
  }

  /** Tension bed rises with proximity so the room itself feels closer. */
  setTension(proximity: number) {
    this.droneGain.gain.setTargetAtTime(0.10 + proximity * 0.22, this.ctx.currentTime, 0.7)
    this.windGain.gain.setTargetAtTime(0.05 + proximity * 0.1, this.ctx.currentTime, 0.7)
  }


  /**
   * The compound's telephone bell. `count` rings; pass 13 and the final ring
   * comes back detuned and late — the audible tell that the circuit is not one
   * of the twelve. This is the game's signature sound.
   */
  bell(count = 2, thirteenth = false) {
    const t0 = this.ctx.currentTime
    for (let i = 0; i < count; i++) {
      const wrong = thirteenth && i === count - 1
      const at = t0 + i * (wrong ? 0.92 : 0.62)
      for (const partial of [1, 2.76]) {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.value = (wrong ? 1046 : 1318) * partial
        gain.gain.setValueAtTime(0.0001, at)
        gain.gain.exponentialRampToValueAtTime(wrong ? 0.16 : 0.12, at + 0.008)
        gain.gain.exponentialRampToValueAtTime(0.0001, at + (wrong ? 0.72 : 0.42))
        osc.connect(gain).connect(this.master)
        osc.start(at)
        osc.stop(at + 0.8)
      }
    }
  }

  /** Rain on a corrugated roof: the bed the whole night sits on. */
  setRain(level: number) {
    this.windGain.gain.setTargetAtTime(level * 0.14, this.ctx.currentTime, 1.2)
  }

  /** Cassette transport noise while a call plays — wow, flutter, hiss. */
  tape(on: boolean) {
    if (!on || !this.started) return
    this.burst(0.045, 0.05, 0.9, 'bandpass', 2400, 0.9)
  }

  /** Hand-crank torch. Loud on purpose: light costs you noise (§7 item table). */
  crank() {
    this.burst(0.13, 0.01, 0.09, 'bandpass', 1750, 4)
  }

  /** Distant thunder — also the window for the generator starter pull (P1). */
  thunder() {
    const t = this.ctx.currentTime
    const src = this.ctx.createBufferSource()
    src.buffer = this.noise
    src.loop = true
    const low = this.ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 170
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.35)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.4)
    src.connect(low).connect(gain).connect(this.master)
    src.start()
    src.stop(t + 3.6)
  }

  /** Generator catching, then holding. */
  generator(started: boolean) {
    if (!started) {
      this.burst(0.2, 0.02, 0.5, 'lowpass', 300)
      return
    }
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(38, t)
    osc.frequency.linearRampToValueAtTime(52, t + 1.6)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.09, t + 1.2)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 9)
    const low = this.ctx.createBiquadFilter()
    low.type = 'lowpass'
    low.frequency.value = 400
    osc.connect(low).connect(gain).connect(this.master)
    osc.start(t)
    osc.stop(t + 9.5)
  }

  /**
   * Accessibility: "reduced sudden audio" from the acceptance checklist. When
   * on, the stinger is replaced by a soft swell so the scare still reads.
   */
  setReducedSudden(on: boolean) {
    this.reducedSudden = on
  }

  mute(on: boolean) {
    this.master.gain.setTargetAtTime(on ? 0 : 0.9, this.ctx.currentTime, 0.08)
  }
}
