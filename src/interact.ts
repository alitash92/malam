import * as THREE from 'three'

export interface Interactable {
  id: string
  position: THREE.Vector3
  /** Verb shown in the prompt: "Answer", "Take", "Read", "Turn". */
  label: () => string
  enabled: () => boolean
  action: () => void
  radius?: number
}

/**
 * Proximity-and-aim rather than mesh raycasting: in a greybox the props are
 * boxes, and "nearest thing I am looking at" is both cheaper and less fiddly
 * for a player on a phone.
 */
export class Interactions {
  private items: Interactable[] = []

  add(item: Interactable) {
    this.items.push(item)
  }

  find(camera: THREE.Camera): Interactable | null {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    let best: Interactable | null = null
    let bestScore = -Infinity

    for (const item of this.items) {
      if (!item.enabled()) continue
      const to = new THREE.Vector3().subVectors(item.position, camera.position)
      const distance = to.length()
      if (distance > (item.radius ?? 2.6)) continue
      to.normalize()
      const aim = forward.dot(to)
      if (aim < 0.55) continue
      const score = aim * 2 - distance * 0.25
      if (score > bestScore) { bestScore = score; best = item }
    }
    return best
  }
}
