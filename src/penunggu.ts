import * as THREE from 'three'
import { figureTexture, isWalkable, roomAt, type Rect } from './world'

export type HunterState = 'dormant' | 'listening' | 'searching' | 'hunting'

const CATCH_DISTANCE = 1.25
const SPEED = { listening: 0, searching: 1.25, hunting: 2.15, dormant: 0 } as const

/**
 * The Penunggu. Per §10 it never gets an unavoidable instant kill: the Hunt
 * meter drives escalation, the prayer hall is a hard boundary it cannot cross,
 * and being caught costs progress and composure rather than the run.
 */
export class Penunggu {
  readonly mesh: THREE.Mesh
  state: HunterState = 'dormant'
  /** 0-100, the meter from §10. */
  hunt = 0
  private stateTimer = 0
  private target = new THREE.Vector3()

  constructor(scene: THREE.Scene) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.15, 2.3),
      new THREE.MeshStandardMaterial({
        map: figureTexture(), transparent: true, side: THREE.DoubleSide, roughness: 1,
      }),
    )
    this.mesh.position.set(0, 1.15, -44)
    this.mesh.visible = false
    scene.add(this.mesh)
  }

  /** Called when the generator starts: the compound wakes up (§11, 18 min). */
  activate(at: THREE.Vector3) {
    if (this.state !== 'dormant') return
    this.mesh.position.set(at.x, 1.15, at.z)
    this.mesh.visible = true
    this.state = 'listening'
    this.hunt = Math.max(this.hunt, 18)
  }

  sleep() {
    this.state = 'dormant'
    this.mesh.visible = false
  }

  addHunt(amount: number) {
    this.hunt = THREE.MathUtils.clamp(this.hunt + amount, 0, 100)
  }

  /** §6: the prayer hall drains Hunt, which is why lingering there is a choice. */
  private drainInSafeRoom(dt: number, playerSafe: boolean) {
    if (playerSafe) this.addHunt(-6 * dt)
  }

  update(
    dt: number,
    player: THREE.Vector3,
    walkable: Rect[],
    opts: { playerSafe: boolean; noise: number },
  ): { caught: boolean; state: HunterState; proximity: number } {
    this.drainInSafeRoom(dt, opts.playerSafe)
    if (opts.noise > 0) this.addHunt(opts.noise * dt * 2.5)

    if (this.state === 'dormant') {
      return { caught: false, state: this.state, proximity: 0 }
    }

    this.mesh.lookAt(player.x, this.mesh.position.y, player.z)
    const distance = this.mesh.position.distanceTo(player)
    this.stateTimer -= dt

    // Band behaviour straight from the meter table.
    if (opts.playerSafe) {
      this.state = 'listening'
    } else if (this.hunt >= 75) {
      this.state = 'hunting'
      this.stateTimer = Math.max(this.stateTimer, 8)
    } else if (this.hunt >= 50) {
      if (this.stateTimer <= 0) {
        this.state = this.state === 'searching' ? 'hunting' : 'searching'
        this.stateTimer = this.state === 'hunting' ? 6 : 9
      }
    } else if (this.hunt >= 25) {
      if (this.stateTimer <= 0) { this.state = 'searching'; this.stateTimer = 7 }
    } else {
      this.state = 'listening'
    }

    // Idle Hunt creep whenever the player is outside safety, so standing still
    // is never the optimal play.
    if (!opts.playerSafe) this.addHunt(0.7 * dt)

    const speed = SPEED[this.state]
    if (speed > 0) {
      this.target.set(player.x, this.mesh.position.y, player.z)
      const step = new THREE.Vector3().subVectors(this.target, this.mesh.position)
      step.y = 0
      if (step.length() > 0.05) {
        step.normalize().multiplyScalar(speed * dt)
        const { x, z } = this.mesh.position
        const nextX = x + step.x
        const nextZ = z + step.z
        // She obeys the same geometry as the player, and cannot enter a safe room.
        const okX = isWalkable(walkable, nextX, z) && !roomAt(nextX, z)?.safe
        const okZ = isWalkable(walkable, this.mesh.position.x, nextZ) && !roomAt(this.mesh.position.x, nextZ)?.safe
        if (okX) this.mesh.position.x = nextX
        if (okZ) this.mesh.position.z = nextZ
      }
    }

    const proximity = THREE.MathUtils.clamp(1 - (distance - CATCH_DISTANCE) / 18, 0, 1)
    return {
      caught: distance <= CATCH_DISTANCE && !opts.playerSafe,
      state: this.state,
      proximity,
    }
  }
}
