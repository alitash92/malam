import * as THREE from 'three'
import { buildCompound, roomAt, type Rect } from './world'
import { Player, emptyInput, type Input } from './player'
import { Penunggu } from './penunggu'
import { Interactions } from './interact'
import { Audio } from './audio'
import { Hud } from './hud'
import { BEATS, CALLS } from './data/calls'

const SAVE_KEY = 'malam:slice:v1'
const SPAWN = { x: 0, z: 12 }
/** Prayer hall, where the game puts you back after a capture. */
const REFUGE = { x: 11.5, z: -6 }

type Phase = 'intro' | 'playing' | 'caught' | 'end'
type Valve = 'air' | 'fuel'

interface Save {
  calls: number[]
  fuse: boolean
  officeKey: boolean
  generator: boolean
}

export class Game {
  readonly input: Input = emptyInput()
  phase: Phase = 'intro'

  private renderer: THREE.WebGLRenderer
  private compound = buildCompound()
  private player: Player
  private penunggu: Penunggu
  private interactions = new Interactions()
  private audio = new Audio()
  private hud = new Hud()

  private walkable: Rect[]
  private calls: number[] = []
  private fuse = false
  private officeKey = false
  private officeUnlocked = false
  private generator = false
  private valves: Valve[] = ['fuel', 'fuel', 'fuel']
  /** P1: the starter only catches while thunder covers the noise. */
  private thunderWindow = 0
  private nextThunder = 9
  private callPlaying: { id: number; line: number; timer: number } | null = null
  private seen = new Set<string>()
  private elapsed = 0
  private breathTimer = 0

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1

    this.walkable = this.compound.walkable
    this.player = new Player(window.innerWidth / window.innerHeight)
    this.compound.scene.add(this.player.camera)
    this.penunggu = new Penunggu(this.compound.scene)

    this.registerInteractions()
    this.load()
    this.hud.setEvidence(this.calls, CALLS)
  }

  // ------------------------------------------------------------------ save

  private load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      const save = JSON.parse(raw) as Partial<Save>
      this.calls = save.calls ?? []
      this.fuse = save.fuse ?? false
      this.officeKey = save.officeKey ?? false
      this.generator = save.generator ?? false
      if (this.officeKey) this.unlockOffice()
      if (this.generator) this.compound.setPowered(true)
    } catch {
      // A corrupt save must never block a run.
    }
  }

  private save() {
    const save: Save = { calls: this.calls, fuse: this.fuse, officeKey: this.officeKey, generator: this.generator }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)) } catch { /* private mode */ }
  }

  private unlockOffice() {
    if (this.officeUnlocked) return
    this.officeUnlocked = true
    for (const gap of this.compound.lockedGaps) {
      if (gap.lock === 'office') this.walkable.push(gap.rect)
    }
  }

  // --------------------------------------------------------- interactables

  private registerInteractions() {
    const p = this.compound.props
    const phone = (id: string, callId: number, node: THREE.Object3D) =>
      this.interactions.add({
        id,
        position: node.position,
        label: () => (this.calls.includes(callId) ? `Replay call ${callId}` : `Answer · call ${callId}`),
        enabled: () => !this.callPlaying,
        action: () => this.startCall(callId),
      })

    phone('payphone', 1, p.payphone)
    phone('officePhone', 2, p.officePhone)
    phone('kitchenPhone', 3, p.kitchenPhone)
    phone('classPhone', 4, p.classPhone)

    this.interactions.add({
      id: 'riceTin',
      position: p.riceTin.position,
      label: () => 'Take the fuse',
      enabled: () => !this.fuse,
      action: () => {
        this.fuse = true
        this.hud.say(null, 'A ceramic fuse, wrapped in a receipt. The generator can breathe.')
        this.audio.tape(true)
        this.save()
      },
    })

    this.interactions.add({
      id: 'mapHook',
      position: p.mapHook.position,
      label: () => 'Take the surau office key',
      enabled: () => !this.officeKey,
      action: () => {
        this.officeKey = true
        this.unlockOffice()
        this.hud.say(null, 'Brass key on a hook behind the map. The surau office will open.')
        this.save()
      },
    })

    this.interactions.add({
      id: 'diagram',
      position: p.diagram.position,
      label: () => 'Read the wall diagram',
      enabled: () => true,
      action: () =>
        this.hud.say(
          null,
          'Faded valve chart: AIR — FUEL — AIR. Underneath, in pencil: "pull only when it thunders."',
          6000,
        ),
    })

    const valveNodes = [p.valve1, p.valve2, p.valve3]
    valveNodes.forEach((node, i) => {
      this.interactions.add({
        id: `valve${i}`,
        position: node.position,
        label: () => `Valve ${i + 1}: ${this.valves[i].toUpperCase()}`,
        enabled: () => !this.generator,
        action: () => {
          this.valves[i] = this.valves[i] === 'air' ? 'fuel' : 'air'
          this.audio.creak()
          node.rotation.z = this.valves[i] === 'air' ? Math.PI / 4 : 0
          this.hud.say(null, `Valve ${i + 1} → ${this.valves[i].toUpperCase()}`, 1600)
        },
      })
    })

    this.interactions.add({
      id: 'starter',
      position: p.starter.position,
      label: () => 'Pull the starter',
      enabled: () => !this.generator,
      action: () => this.pullStarter(),
    })

    this.interactions.add({
      id: 'projector',
      position: p.projector.position,
      label: () => 'Inspect the projector',
      enabled: () => true,
      action: () =>
        this.hud.say(
          null,
          'Three cardboard silhouettes: child, tree, woman. One is upside down. The shadow puzzle is not built in this slice.',
          6000,
        ),
    })
  }

  // -------------------------------------------------------------- the calls

  private startCall(id: number) {
    const call = CALLS.find((c) => c.id === id)
    if (!call) return
    this.callPlaying = { id, line: 0, timer: 0 }
    this.audio.bell(1)
    this.hud.say(call.speaker, call.lines[0], 4000)
    this.hud.setObjective(`Recording call ${id} — hold still`)
  }

  private advanceCall(dt: number) {
    const playing = this.callPlaying
    if (!playing) return
    const call = CALLS.find((c) => c.id === playing.id)!
    playing.timer += dt
    this.audio.tape(true)

    if (playing.timer >= 4) {
      playing.timer = 0
      playing.line += 1
      if (playing.line < call.lines.length) {
        this.hud.say(call.speaker, call.lines[playing.line], 4000)
        return
      }
      // Recorded: the call only becomes evidence once it is on Faris's deck (§5).
      this.callPlaying = null
      if (!this.calls.includes(call.id)) {
        this.calls.push(call.id)
        this.hud.setEvidence(this.calls, CALLS)
        this.hud.say(null, call.functionNote, 5200)
        this.penunggu.addHunt(6)
        this.save()
      }
      if (call.id === 4) {
        this.phase = 'end'
        this.hud.show('end')
        this.audio.mute(true)
        document.exitPointerLock()
        return
      }
      this.updateObjective()
    }
  }

  // ----------------------------------------------------------------- P1

  private pullStarter() {
    const correct = this.valves[0] === 'air' && this.valves[1] === 'fuel' && this.valves[2] === 'air'
    if (!correct || this.thunderWindow <= 0) {
      // §8: a wrong pull costs 12 Hunt and leaves footprints around the shed.
      this.penunggu.addHunt(12)
      this.audio.generator(false)
      this.hud.say(
        null,
        correct ? 'The pull echoes across the compound. Too quiet out there.' : 'It coughs and dies. The valves are wrong.',
      )
      return
    }
    this.generator = true
    this.compound.setPowered(true)
    this.hud.flashPower()
    this.audio.generator(true)
    this.audio.bell(6)
    this.hud.say(null, BEATS.generatorLive, 6000)
    // §11, 18 min: the world wakes, and she starts behind you.
    this.penunggu.activate(new THREE.Vector3(this.player.camera.position.x, 1.15, this.player.camera.position.z + 14))
    this.save()
    this.updateObjective()
  }

  // -------------------------------------------------------------- lifecycle

  start() {
    this.phase = 'playing'
    this.audio.start()
    this.audio.mute(false)
    this.audio.setRain(1)
    this.player.spawnAt(SPAWN.x, SPAWN.z)
    this.hud.show('game')
    this.hud.say(null, BEATS.arrive, 6000)
    this.updateObjective()
  }

  resumeAfterCapture() {
    this.phase = 'playing'
    this.player.spawnAt(REFUGE.x, REFUGE.z, -Math.PI / 2)
    // §10: surviving resets the meter to 55 rather than to zero.
    this.penunggu.hunt = 55
    this.penunggu.mesh.position.set(2, 1.15, -20)
    this.hud.show('game')
    this.hud.say(null, BEATS.suraiSafe, 5000)
  }

  private capture() {
    this.phase = 'caught'
    this.audio.stinger()
    // Nothing required is ever lost on capture (§7) — only time and composure.
    this.hud.show('caught')
    document.exitPointerLock()
  }

  private updateObjective() {
    if (!this.calls.includes(1)) return this.hud.setObjective('Answer the payphone in the arrival court')
    if (!this.officeKey) return this.hud.setObjective('Find the office key in the caretaker house')
    if (!this.calls.includes(3)) return this.hud.setObjective('Answer the kitchen telephone')
    if (!this.calls.includes(2)) return this.hud.setObjective('Open the surau office — call 2')
    if (!this.fuse) return this.hud.setObjective('Find the generator fuse — caretaker kitchen')
    if (!this.generator) return this.hud.setObjective('Generator shed: AIR–FUEL–AIR, pull on thunder')
    return this.hud.setObjective('Classroom 1 — record call 4')
  }

  /** Story beats that fire once, keyed by where the player is (§11). */
  private checkSetPieces() {
    const pos = this.player.camera.position
    const room = roomAt(pos.x, pos.z)

    if (room?.id === 'walkway' && pos.z < 0 && !this.seen.has('payphone-again') && this.calls.includes(1)) {
      this.seen.add('payphone-again')
      this.audio.bell(2)
      this.hud.say(null, BEATS.payphoneAgain, 5000)
    }

    if (room?.id === 'vestibule' && !this.seen.has('white-caller')) {
      this.seen.add('white-caller')
      // She is behind the patterned glass, and gone when you open the door.
      this.penunggu.mesh.visible = true
      this.penunggu.mesh.position.set(9.2, 1.15, -9.4)
      this.hud.say(null, BEATS.whiteCaller, 5200)
      this.audio.whisper()
      window.setTimeout(() => {
        if (this.penunggu.state === 'dormant') this.penunggu.mesh.visible = false
      }, 2600)
    }
  }

  private weather(dt: number) {
    this.thunderWindow = Math.max(0, this.thunderWindow - dt)
    this.nextThunder -= dt
    if (this.nextThunder <= 0) {
      this.nextThunder = 11 + Math.random() * 12
      this.thunderWindow = 2.8
      this.audio.thunder()
    }
  }

  // ------------------------------------------------------------------ frame

  update(dt: number) {
    if (this.phase !== 'playing') return
    this.elapsed += dt

    const moved = this.player.update(dt, this.input, this.walkable)
    if (moved.stepped) this.audio.footstep(false)
    if (moved.cranked) this.audio.crank()
    this.hud.setTorch(this.player.charge)

    this.weather(dt)
    this.checkSetPieces()
    this.advanceCall(dt)

    const room = roomAt(this.player.camera.position.x, this.player.camera.position.z)
    const safe = !!room?.safe
    const state = this.penunggu.update(dt, this.player.camera.position, this.walkable, {
      playerSafe: safe,
      noise: moved.noise,
    })

    this.audio.setTension(state.proximity)
    this.audio.heartbeat(state.proximity, dt)
    this.breathTimer -= dt
    if (this.breathTimer <= 0 && state.proximity > 0.25) {
      this.audio.breath(state.proximity)
      this.breathTimer = 2.4 - state.proximity
    }

    this.hud.setHunt(this.penunggu.hunt, safe ? 'safe · draining' : state.state)
    const target = this.interactions.find(this.player.camera)
    this.hud.setPrompt(target ? `[E] ${target.label()}` : null)

    if (state.caught) this.capture()
  }

  use() {
    if (this.phase !== 'playing') return
    const target = this.interactions.find(this.player.camera)
    if (target) target.action()
  }

  look(dx: number, dy: number, sensitivity?: number) {
    if (this.phase === 'playing') this.player.look(dx, dy, sensitivity)
  }

  render() {
    this.renderer.render(this.compound.scene, this.player.camera)
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height)
    this.player.camera.aspect = width / height
    this.player.camera.updateProjectionMatrix()
  }

  setReducedSudden(on: boolean) {
    this.audio.setReducedSudden(on)
  }

  /** Wipe the slice's progress — used by the intro's restart. */
  resetProgress() {
    localStorage.removeItem(SAVE_KEY)
    this.calls = []
    this.fuse = false
    this.officeKey = false
    this.generator = false
    this.valves = ['fuel', 'fuel', 'fuel']
    this.seen.clear()
    this.compound.setPowered(false)
    this.penunggu.sleep()
    this.penunggu.hunt = 0
    this.hud.setEvidence(this.calls, CALLS)
  }
}
