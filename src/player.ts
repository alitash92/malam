import * as THREE from 'three'
import { isWalkable, type Rect } from './world'

const EYE_STAND = 1.65
const EYE_CROUCH = 1.02
const SPEED_WALK = 2.4
const SPEED_CROUCH = 1.15
/** Hand-crank torch: no batteries, so light is bought with noise (§7). */
const TORCH_DECAY = 0.021
const CRANK_GAIN = 0.28

export interface Input {
  forward: boolean; back: boolean; left: boolean; right: boolean
  crouch: boolean; crank: boolean
  /** Analogue stick from touch controls, -1..1. */
  moveX: number; moveZ: number
}

export function emptyInput(): Input {
  return { forward: false, back: false, left: false, right: false, crouch: false, crank: false, moveX: 0, moveZ: 0 }
}

export class Player {
  readonly camera: THREE.PerspectiveCamera
  readonly torch: THREE.SpotLight
  charge = 0.75
  crouching = false
  private yaw = Math.PI / 2   // spawn looking down the compound, into -x/-z
  private pitch = 0
  private bob = 0
  private step = 0
  private crankCooldown = 0

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(74, aspect, 0.05, 120)
    this.camera.position.set(0, EYE_STAND, 12)

    this.torch = new THREE.SpotLight(0xffe2b0, 0, 20, Math.PI / 6.5, 0.5, 1.3)
    this.torch.position.set(0.2, -0.16, 0)
    // Target shares the light's offset so the cone runs parallel to the view.
    this.torch.target.position.set(0.2, -0.2, -1)
    this.camera.add(this.torch)
    this.camera.add(this.torch.target)
    this.applyRotation()
  }

  spawnAt(x: number, z: number, yaw = Math.PI / 2) {
    this.camera.position.set(x, EYE_STAND, z)
    this.yaw = yaw
    this.pitch = 0
    this.applyRotation()
  }

  look(dx: number, dy: number, sensitivity = 0.0022) {
    this.yaw -= dx * sensitivity
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sensitivity, -1.15, 1.15)
    this.applyRotation()
  }

  private applyRotation() {
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'))
  }

  get forwardVector() {
    const v = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion)
    v.y = 0
    return v.normalize()
  }

  /**
   * Returns the frame's audible events. Cranking is loud on purpose: it is the
   * main way a careless player feeds the Hunt meter.
   */
  update(dt: number, input: Input, walkable: Rect[]): { stepped: boolean; cranked: boolean; noise: number } {
    this.crouching = input.crouch

    let cranked = false
    this.crankCooldown -= dt
    if (input.crank && this.charge < 1 && this.crankCooldown <= 0) {
      this.charge = Math.min(1, this.charge + CRANK_GAIN)
      this.crankCooldown = 0.45
      cranked = true
    }
    this.charge = Math.max(0, this.charge - TORCH_DECAY * dt)
    this.torch.intensity = this.charge <= 0.02
      ? 0
      : 22 * (0.3 + this.charge * 0.7) * (this.charge < 0.2 ? 0.5 + Math.random() * 0.5 : 1)

    const forward = this.forwardVector
    const strafe = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).negate()

    const move = new THREE.Vector3()
    if (input.forward) move.add(forward)
    if (input.back) move.sub(forward)
    if (input.right) move.add(strafe)
    if (input.left) move.sub(strafe)
    if (input.moveZ) move.addScaledVector(forward, -input.moveZ)
    if (input.moveX) move.addScaledVector(strafe, input.moveX)

    let stepped = false
    const speed = this.crouching ? SPEED_CROUCH : SPEED_WALK
    if (move.lengthSq() > 0.0001) {
      move.normalize().multiplyScalar(speed * dt)
      // Axis-separated so sliding along a wall works instead of sticking.
      const { x, z } = this.camera.position
      if (isWalkable(walkable, x + move.x, z)) this.camera.position.x = x + move.x
      if (isWalkable(walkable, this.camera.position.x, z + move.z)) this.camera.position.z = z + move.z

      this.step += (this.crouching ? 1.1 : 1.8) * dt
      if (this.step >= 1) { this.step = 0; stepped = true }
      this.bob += dt * (this.crouching ? 5 : 8)
    } else {
      this.step = 0.75
    }

    const eye = this.crouching ? EYE_CROUCH : EYE_STAND
    this.camera.position.y += (eye - this.camera.position.y) * Math.min(1, 9 * dt)
    this.camera.position.y += Math.sin(this.bob) * 0.022

    // Noise budget for the Penunggu's Listening state.
    const noise = (cranked ? 9 : 0) + (stepped && !this.crouching ? 2 : 0)
    return { stepped, cranked, noise }
  }
}
