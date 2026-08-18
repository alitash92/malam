import * as THREE from 'three'

export const DOOR_HEIGHT = 2.05
const WALL_T = 0.16

export interface Rect { x1: number; x2: number; z1: number; z2: number }

export interface Door {
  side: 'n' | 's' | 'e' | 'w'
  at: number
  width: number
  /** Locked openings stay non-walkable until the game unlocks this id. */
  lock?: string
}

export interface RoomDef extends Rect {
  id: string
  height: number
  doors: Door[]
  outdoor?: boolean
  /** Prayer hall: Hunt drains, and the Penunggu cannot cross the threshold (§6). */
  safe?: boolean
}

/**
 * The §19 demo route: Arrival Court → Surau → Caretaker House → generator →
 * Classroom 1. The walkway is the spine, and the map folds back on itself so it
 * gets walked several times — each pass more hostile than the last.
 */
export const ROOMS: RoomDef[] = [
  { id: 'court', x1: -9, x2: 9, z1: 3, z2: 15, height: 4.2, outdoor: true, doors: [] },
  {
    id: 'walkway', x1: -2, x2: 2, z1: -47, z2: 4, height: 3,
    doors: [
      { side: 'e', at: -6, width: 1.5 },
      { side: 'w', at: -21, width: 1.5 },
      { side: 'e', at: -31, width: 1.5 },
      { side: 'w', at: -41, width: 1.5 },
    ],
  },
  {
    id: 'vestibule', x1: 2, x2: 8, z1: -10, z2: -3, height: 3.1,
    doors: [
      { side: 'w', at: -6, width: 1.5 },
      { side: 'e', at: -6.5, width: 1.6 },
      { side: 'n', at: 4.5, width: 1.2, lock: 'office' },
    ],
  },
  { id: 'hall', x1: 8, x2: 16, z1: -12, z2: -2, height: 3.6, safe: true, doors: [{ side: 'w', at: -6.5, width: 1.6 }] },
  { id: 'office', x1: 2, x2: 7, z1: -16, z2: -10, height: 3, doors: [{ side: 's', at: 4.5, width: 1.2, lock: 'office' }] },
  {
    id: 'kitchen', x1: -11, x2: -2, z1: -25, z2: -17, height: 3,
    doors: [{ side: 'e', at: -21, width: 1.5 }, { side: 'n', at: -8, width: 1.3 }],
  },
  { id: 'store', x1: -11, x2: -5, z1: -31, z2: -25, height: 2.8, doors: [{ side: 's', at: -8, width: 1.3 }] },
  { id: 'shed', x1: 2, x2: 9, z1: -35, z2: -28, height: 3.2, doors: [{ side: 'w', at: -31, width: 1.5 }] },
  { id: 'classroom', x1: -10, x2: -2, z1: -46, z2: -38, height: 3.3, doors: [{ side: 'e', at: -41, width: 1.5 }] },
]

export const SAFE_ROOMS = ROOMS.filter((r) => r.safe)

// ---------------------------------------------------------------- textures

function paint(
  size: number,
  fn: (ctx: CanvasRenderingContext2D, s: number) => void,
  repeat: [number, number] = [1, 1],
): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  fn(canvas.getContext('2d')!, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat[0], repeat[1])
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** Painted render, monsoon damp, hairline cracks: late-90s civic compound (§14). */
function render(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#8d8474'
  ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${50 + Math.random() * 40},${52 + Math.random() * 36},${40 + Math.random() * 30},${0.04 + Math.random() * 0.1})`
    ctx.beginPath()
    ctx.arc(Math.random() * s, Math.random() * s, 8 + Math.random() * 70, 0, Math.PI * 2)
    ctx.fill()
  }
  const damp = ctx.createLinearGradient(0, s, 0, s * 0.5)
  damp.addColorStop(0, 'rgba(24,34,24,0.8)')
  damp.addColorStop(1, 'rgba(24,34,24,0)')
  ctx.fillStyle = damp
  ctx.fillRect(0, s * 0.5, s, s * 0.5)
  ctx.strokeStyle = 'rgba(30,26,20,0.4)'
  for (let i = 0; i < 10; i++) {
    ctx.lineWidth = 0.7
    ctx.beginPath()
    let x = Math.random() * s
    ctx.moveTo(x, 0)
    for (let y = 0; y < s; y += 40) {
      x += (Math.random() - 0.5) * 40
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

function terrazzo(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#4a4842'
  ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 2400; i++) {
    const g = 70 + Math.random() * 90
    ctx.fillStyle = `rgba(${g},${g - 6},${g - 14},${0.35 + Math.random() * 0.4})`
    ctx.beginPath()
    ctx.arc(Math.random() * s, Math.random() * s, 0.7 + Math.random() * 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.strokeStyle = 'rgba(18,18,16,0.55)'
  ctx.lineWidth = 2
  for (let i = 0; i <= 2; i++) {
    ctx.beginPath()
    ctx.moveTo((i * s) / 2, 0); ctx.lineTo((i * s) / 2, s)
    ctx.moveTo(0, (i * s) / 2); ctx.lineTo(s, (i * s) / 2)
    ctx.stroke()
  }
}

function apron(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#33352f'
  ctx.fillRect(0, 0, s, s)
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.5})`
    ctx.fillRect(Math.random() * s, Math.random() * s, 3, 2)
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(120,140,140,0.05)'
    ctx.beginPath()
    ctx.ellipse(Math.random() * s, Math.random() * s, 20 + Math.random() * 60, 8 + Math.random() * 20, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** The patterned glass the White Caller stands behind at the 11-minute beat. */
function patterned(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = '#7f8a76'
  ctx.fillRect(0, 0, s, s)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 3
  for (let i = -s; i < s * 2; i += 26) {
    ctx.beginPath()
    ctx.moveTo(i, 0); ctx.lineTo(i + s, s)
    ctx.moveTo(i + s, 0); ctx.lineTo(i, s)
    ctx.stroke()
  }
}

/**
 * The White Caller: a pontianak-like MASK the jinn wears, explicitly not
 * Aisyah's soul (§4). Faceless, white cloth, hair to the waist — drawn in code
 * so the slice needs no character art.
 */
export function figureTexture(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 512
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = 'rgba(206,202,192,0.96)'
  ctx.beginPath()
  ctx.moveTo(92, 150); ctx.lineTo(164, 150); ctx.lineTo(196, 250)
  ctx.lineTo(190, 486); ctx.lineTo(66, 486); ctx.lineTo(60, 250)
  ctx.closePath(); ctx.fill()

  ctx.strokeStyle = 'rgba(186,182,172,0.96)'
  ctx.lineWidth = 20
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(84, 172); ctx.lineTo(62, 320)
  ctx.moveTo(172, 172); ctx.lineTo(194, 320)
  ctx.stroke()

  const grime = ctx.createLinearGradient(0, 486, 0, 300)
  grime.addColorStop(0, 'rgba(34,24,18,0.92)')
  grime.addColorStop(1, 'rgba(34,24,18,0)')
  ctx.fillStyle = grime
  ctx.fillRect(60, 300, 136, 186)

  ctx.fillStyle = '#6d6155'
  ctx.fillRect(116, 120, 24, 40)
  ctx.beginPath(); ctx.ellipse(128, 96, 31, 39, 0, 0, Math.PI * 2); ctx.fill()

  // Hair mid-grey, never pure black: black vanishes in an unlit corridor and
  // she stops reading as a person.
  ctx.fillStyle = '#38302b'
  ctx.beginPath(); ctx.ellipse(128, 84, 38, 44, 0, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath()
  ctx.moveTo(90, 84); ctx.quadraticCurveTo(72, 250, 100, 286)
  ctx.lineTo(156, 286); ctx.quadraticCurveTo(184, 250, 166, 84)
  ctx.fill()

  ctx.fillStyle = 'rgba(12,10,9,0.9)'
  ctx.beginPath(); ctx.ellipse(128, 104, 20, 26, 0, 0, Math.PI * 2); ctx.fill()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// ------------------------------------------------------------------ geometry

export interface Prop {
  id: string
  position: THREE.Vector3
  mesh: THREE.Object3D
}

export interface Compound {
  scene: THREE.Scene
  walkable: Rect[]
  lockedGaps: { lock: string; rect: Rect }[]
  props: Record<string, THREE.Object3D>
  glass: THREE.Mesh
  setPowered(on: boolean): void
}

function wallRun(
  scene: THREE.Scene, mat: THREE.Material, along: 'x' | 'z', fixed: number,
  from: number, to: number, height: number, openings: { at: number; width: number }[],
) {
  const cuts = [...openings].sort((a, b) => a.at - b.at)
  let cursor = from
  const segments: [number, number][] = []
  for (const cut of cuts) {
    const start = cut.at - cut.width / 2
    if (start > cursor) segments.push([cursor, start])
    cursor = Math.max(cursor, cut.at + cut.width / 2)
  }
  if (cursor < to) segments.push([cursor, to])

  for (const [a, b] of segments) {
    const len = b - a
    if (len <= 0.02) continue
    const geo = along === 'x'
      ? new THREE.BoxGeometry(len, height, WALL_T)
      : new THREE.BoxGeometry(WALL_T, height, len)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(along === 'x' ? a + len / 2 : fixed, height / 2, along === 'x' ? fixed : a + len / 2)
    scene.add(mesh)
  }

  for (const cut of cuts) {
    const h = height - DOOR_HEIGHT
    if (h <= 0.02) continue
    const geo = along === 'x'
      ? new THREE.BoxGeometry(cut.width, h, WALL_T)
      : new THREE.BoxGeometry(WALL_T, h, cut.width)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(along === 'x' ? cut.at : fixed, DOOR_HEIGHT + h / 2, along === 'x' ? fixed : cut.at)
    scene.add(mesh)
  }
}

/** Small greybox prop: enough silhouette to be findable by torchlight. */
function box(
  scene: THREE.Scene, x: number, y: number, z: number,
  w: number, h: number, d: number, color: number, emissive = 0x000000,
): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive }),
  )
  mesh.position.set(x, y, z)
  scene.add(mesh)
  return mesh
}

export function buildCompound(): Compound {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x05070a)
  scene.fog = new THREE.FogExp2(0x05070a, 0.055)

  scene.add(new THREE.AmbientLight(0x28303c, 0.5))
  const moon = new THREE.DirectionalLight(0x5d7492, 0.3)
  moon.position.set(-8, 14, 6)
  scene.add(moon)

  const wall = new THREE.MeshStandardMaterial({ map: paint(512, render, [3, 1]), roughness: 0.94 })
  const floorMat = new THREE.MeshStandardMaterial({ map: paint(512, terrazzo, [4, 4]), roughness: 0.7 })
  const outdoorMat = new THREE.MeshStandardMaterial({ map: paint(512, apron, [6, 6]), roughness: 0.55 })
  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x24211c, roughness: 1 })

  const walkable: Rect[] = []
  const lockedGaps: { lock: string; rect: Rect }[] = []
  const lamps: THREE.PointLight[] = []

  for (const room of ROOMS) {
    const w = room.x2 - room.x1
    const d = room.z2 - room.z1

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), room.outdoor ? outdoorMat : floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.set(room.x1 + w / 2, 0, room.z1 + d / 2)
    scene.add(floor)

    if (!room.outdoor) {
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), ceilMat)
      ceiling.rotation.x = Math.PI / 2
      ceiling.position.set(room.x1 + w / 2, room.height, room.z1 + d / 2)
      scene.add(ceiling)

      const lamp = new THREE.PointLight(0xbfd8ff, 0, 12, 2)
      lamp.position.set(room.x1 + w / 2, room.height - 0.3, room.z1 + d / 2)
      scene.add(lamp)
      lamps.push(lamp)
    }

    const side = (s: Door['side']) => room.doors.filter((door) => door.side === s)
    wallRun(scene, wall, 'x', room.z1, room.x1, room.x2, room.height, side('n'))
    wallRun(scene, wall, 'x', room.z2, room.x1, room.x2, room.height, side('s'))
    wallRun(scene, wall, 'z', room.x1, room.z1, room.z2, room.height, side('w'))
    wallRun(scene, wall, 'z', room.x2, room.z1, room.z2, room.height, side('e'))

    const inset = 0.34
    walkable.push({ x1: room.x1 + inset, x2: room.x2 - inset, z1: room.z1 + inset, z2: room.z2 - inset })

    for (const door of room.doors) {
      const pad = 0.5
      const rect: Rect = door.side === 'n' || door.side === 's'
        ? {
            x1: door.at - door.width / 2 + 0.08, x2: door.at + door.width / 2 - 0.08,
            z1: (door.side === 'n' ? room.z1 : room.z2) - pad,
            z2: (door.side === 'n' ? room.z1 : room.z2) + pad,
          }
        : {
            x1: (door.side === 'w' ? room.x1 : room.x2) - pad,
            x2: (door.side === 'w' ? room.x1 : room.x2) + pad,
            z1: door.at - door.width / 2 + 0.08, z2: door.at + door.width / 2 - 0.08,
          }
      if (door.lock) lockedGaps.push({ lock: door.lock, rect })
      else walkable.push(rect)
    }
  }

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 1.9),
    new THREE.MeshStandardMaterial({ map: paint(256, patterned), transparent: true, opacity: 0.72, roughness: 0.6 }),
  )
  glass.position.set(7.98, 1.5, -9.4)
  glass.rotation.y = -Math.PI / 2
  scene.add(glass)

  // Prayer mats: the safe room must read as cared for, never as a spectacle (§2).
  const matMat = new THREE.MeshStandardMaterial({ color: 0x2f4436, roughness: 0.95 })
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2), matMat)
    mat.rotation.x = -Math.PI / 2
    mat.position.set(9.8 + (i % 3) * 1.3, 0.012, -4 - Math.floor(i / 3) * 2.3)
    scene.add(mat)
  }

  const props: Record<string, THREE.Object3D> = {
    // Zone A: the payphone that rings once, then again after you walk past it.
    payphone: box(scene, -6.5, 1.2, 11, 0.34, 0.62, 0.24, 0x1d2a33, 0x030608),
    // Zone B: office desk holds the directory; the call station is the handset.
    officePhone: box(scene, 4.4, 0.95, -14.6, 0.3, 0.2, 0.24, 0x22262b),
    directory: box(scene, 5.4, 0.92, -14.4, 0.3, 0.06, 0.22, 0x6b5a3a),
    // Zone C: rice tin hides the fuse; the map hook holds the office key.
    kitchenPhone: box(scene, -10.4, 1.1, -20.5, 0.28, 0.2, 0.22, 0x22262b),
    riceTin: box(scene, -4.2, 0.45, -23.6, 0.4, 0.5, 0.4, 0x8a7a52),
    mapHook: box(scene, -6.5, 1.7, -24.85, 0.9, 0.7, 0.06, 0x4a4436),
    // Generator shed: diagram, three valves, the starter lever.
    diagram: box(scene, 8.9, 1.7, -31, 0.05, 0.7, 1.1, 0x585040, 0x0a0a08),
    valve1: box(scene, 4.6, 1.05, -33.4, 0.22, 0.22, 0.22, 0x7d5b32),
    valve2: box(scene, 5.4, 1.05, -33.4, 0.22, 0.22, 0.22, 0x7d5b32),
    valve3: box(scene, 6.2, 1.05, -33.4, 0.22, 0.22, 0.22, 0x7d5b32),
    starter: box(scene, 7.4, 1.0, -32.6, 0.14, 0.5, 0.14, 0x9a2f2f),
    generator: box(scene, 5.6, 0.6, -32.2, 2.4, 1.2, 1.2, 0x3b3b38),
    // Classroom 1: the projector and the last call of the demo.
    projector: box(scene, -6, 0.9, -42, 0.5, 0.3, 0.7, 0x2b2b2e),
    classPhone: box(scene, -9.4, 1.1, -41, 0.28, 0.2, 0.22, 0x22262b),
  }

  const setPowered = (on: boolean) => {
    for (const lamp of lamps) lamp.intensity = on ? 5.5 : 0
    scene.fog = new THREE.FogExp2(0x05070a, on ? 0.042 : 0.055)
  }
  setPowered(false)

  return { scene, walkable, lockedGaps, props, glass, setPowered }
}

/** Inside any walkable rect? Cheap, and impossible to tunnel through a wall. */
export function isWalkable(rects: Rect[], x: number, z: number): boolean {
  for (const r of rects) if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) return true
  return false
}

export function roomAt(x: number, z: number): RoomDef | null {
  for (const r of ROOMS) if (x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2) return r
  return null
}
