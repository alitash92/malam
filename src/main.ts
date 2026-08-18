import { Game } from './game'

const canvas = document.getElementById('scene') as HTMLCanvasElement
const game = new Game(canvas)

// ---------------------------------------------------------------- keyboard

const KEYS: Record<string, keyof typeof game.input> = {
  keyw: 'forward', arrowup: 'forward',
  keys: 'back', arrowdown: 'back',
  keya: 'left', arrowleft: 'left',
  keyd: 'right', arrowright: 'right',
  keyc: 'crouch', controlleft: 'crouch',
  keyf: 'crank',
}

window.addEventListener('keydown', (e) => {
  const code = e.code.toLowerCase()
  const action = KEYS[code]
  if (action) { game.input[action] = true as never; e.preventDefault() }
  if (code === 'keye') game.use()
  if (code === 'keyr') { game.resetProgress(); game.start() }
})

window.addEventListener('keyup', (e) => {
  const action = KEYS[e.code.toLowerCase()]
  if (action) game.input[action] = false as never
})

// -------------------------------------------------------------- mouse look

document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) game.look(e.movementX, e.movementY)
})

canvas.addEventListener('click', () => {
  if (game.phase === 'playing' && document.pointerLockElement !== canvas) {
    void canvas.requestPointerLock()
  }
})

// Losing pointer lock must not leave the player walking into her.
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas) {
    game.input.forward = game.input.back = game.input.left = game.input.right = false
  }
})

// ------------------------------------------------------------------- touch

const stick = document.getElementById('stick')!
const knob = stick.querySelector('i') as HTMLElement
let stickId: number | null = null
let stickOrigin = { x: 0, y: 0 }

stick.addEventListener('pointerdown', (e) => {
  stickId = e.pointerId
  const rect = stick.getBoundingClientRect()
  stickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  stick.setPointerCapture(e.pointerId)
})

stick.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stickId) return
  const dx = (e.clientX - stickOrigin.x) / 54
  const dy = (e.clientY - stickOrigin.y) / 54
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  game.input.moveX = clamp(dx)
  game.input.moveZ = clamp(dy)
  knob.style.transform = `translate(${clamp(dx) * 30}px, ${clamp(dy) * 30}px)`
})

const releaseStick = (e: PointerEvent) => {
  if (e.pointerId !== stickId) return
  stickId = null
  game.input.moveX = game.input.moveZ = 0
  knob.style.transform = ''
}
stick.addEventListener('pointerup', releaseStick)
stick.addEventListener('pointercancel', releaseStick)

// Dragging anywhere that is not the stick or a button looks around.
let lookId: number | null = null
let lookLast = { x: 0, y: 0 }

canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return
  lookId = e.pointerId
  lookLast = { x: e.clientX, y: e.clientY }
})

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== lookId) return
  game.look(e.clientX - lookLast.x, e.clientY - lookLast.y, 0.004)
  lookLast = { x: e.clientX, y: e.clientY }
})

canvas.addEventListener('pointerup', (e) => { if (e.pointerId === lookId) lookId = null })

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-touch]')) {
  const action = button.dataset.touch!
  const set = (down: boolean) => {
    if (action === 'interact') { if (down) game.use(); return }
    if (action === 'crank') game.input.crank = down
    if (action === 'crouch' && down) game.input.crouch = !game.input.crouch
  }
  button.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true) })
  button.addEventListener('pointerup', () => set(false))
  button.addEventListener('pointercancel', () => set(false))
}

// ------------------------------------------------------------------ screens

document.getElementById('begin')!.addEventListener('click', () => {
  game.setReducedSudden((document.getElementById('reduced') as HTMLInputElement).checked)
  game.start()
  void canvas.requestPointerLock()
})
document.getElementById('resume')!.addEventListener('click', () => {
  game.resumeAfterCapture()
  void canvas.requestPointerLock()
})
document.getElementById('again')!.addEventListener('click', () => {
  game.resetProgress()
  game.start()
  void canvas.requestPointerLock()
})

window.addEventListener('resize', () => game.resize(window.innerWidth, window.innerHeight))

// -------------------------------------------------------------------- loop

let last = performance.now()
function frame(now: number) {
  // Clamped so a backgrounded tab cannot teleport her across the compound.
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  game.update(dt)
  game.render()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

if (import.meta.env.DEV) {
  Object.assign(window as unknown as Record<string, unknown>, { __malam: game })
}
