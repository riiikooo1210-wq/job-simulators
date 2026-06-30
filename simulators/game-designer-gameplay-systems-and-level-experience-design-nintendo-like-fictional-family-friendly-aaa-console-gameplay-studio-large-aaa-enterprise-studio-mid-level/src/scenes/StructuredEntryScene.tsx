import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame, {
  hasWorkSurfaceVisual,
  mergeWorkSurfaceTabs,
  resolveWorkSurfaceVariant,
} from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import MetricsTable from '../components/ui/MetricsTable'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type {
  StructuredEntryNode,
  StructuredEntryFieldOption,
  StructuredEntryPreviousResponseReference,
  StructuredEntryVisualBoard,
  StructuredEntryVisualHotspot,
} from '../types/game'

interface Props { node: StructuredEntryNode }

type Item = Record<string, string>

function parseItems(raw: string, fields: { key: string }[], initialCount: number): Item[] {
  if (!raw) return Array.from({ length: initialCount }, () =>
    Object.fromEntries(fields.map((f) => [f.key, ''])) as Item
  )
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore parse error
  }
  return Array.from({ length: initialCount }, () =>
    Object.fromEntries(fields.map((f) => [f.key, ''])) as Item
  )
}

function parseReferenceItems(raw: string): Item[] {
  const normalizeObject = (value: unknown): Item | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
        key,
        entryValue == null ? '' : String(entryValue),
      ])
    ) as Item
  }

  if (!raw.trim()) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.map(normalizeObject).filter((item): item is Item => item !== null)
    const item = normalizeObject(parsed)
    if (item) return [item]
    if (typeof parsed === 'string' && parsed.trim()) return [{ response: parsed }]
  } catch {
    return [{ response: raw }]
  }
  return []
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getOptionValue(option: StructuredEntryFieldOption) {
  return typeof option === 'string' ? option : option.value
}

function getOptionLabel(option: StructuredEntryFieldOption) {
  return typeof option === 'string' ? option : option.label
}

function PreviousResponseReferenceCard({
  reference,
  rawResponse,
}: {
  reference: StructuredEntryPreviousResponseReference
  rawResponse: string
}) {
  const referenceItems = useMemo(() => parseReferenceItems(rawResponse), [rawResponse])
  const hasContent = referenceItems.some((item) => Object.values(item).some((value) => value.trim().length > 0))

  return (
    <section
      style={{
        border: '1px solid #CDBF94',
        backgroundColor: '#FBF7EA',
        padding: '0.875rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}
    >
      <div style={{ fontSize: '0.6875rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
        {reference.title}
      </div>

      {!hasContent ? (
        <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.55, color: '#6f6758' }}>
          {reference.emptyText || 'No previous response yet.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {referenceItems.map((item, idx) => {
            const entries = Object.entries(item).filter(([, value]) => value.trim().length > 0)
            if (entries.length === 0) return null
            return (
              <div
                key={idx}
                style={{
                  border: '1px solid #E4D8B9',
                  backgroundColor: '#F7F1E3',
                  padding: '0.7rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.55rem',
                }}
              >
                {referenceItems.length > 1 && (
                  <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
                    Entry {idx + 1}
                  </div>
                )}
                {entries.map(([key, value]) => (
                  <div key={key}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6f6758', textTransform: 'uppercase', letterSpacing: 0 }}>
                      {reference.fieldLabels?.[key] || humanizeKey(key)}
                    </div>
                    <div style={{ marginTop: '0.18rem', fontSize: '0.8125rem', lineHeight: 1.55, color: '#1E1E1A', whiteSpace: 'pre-wrap' }}>
                      {reference.valueLabels?.[value] || value}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function MiniLevelFallback() {
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: '#DCE6D2' }} />
      <div style={{ position: 'absolute', left: '0%', right: '0%', bottom: '0%', height: '28%', backgroundColor: '#5F7F62', borderTop: '2px solid #1E1E1A' }} />
      <div style={{ position: 'absolute', left: '8%', top: '60%', width: '26%', height: '10%', backgroundColor: '#CDBF94', border: '2px solid #1E1E1A', boxShadow: '0 0.45rem 0 #3F605C' }} />
      <div style={{ position: 'absolute', left: '70%', top: '47%', width: '22%', height: '10%', backgroundColor: '#CDBF94', border: '2px solid #1E1E1A', boxShadow: '0 0.45rem 0 #3F605C' }} />
      <div style={{ position: 'absolute', left: '35%', top: '61%', width: '34%', height: '16%', backgroundColor: '#6B9EA6', borderTop: '2px solid #1E1E1A' }} />
      <div style={{ position: 'absolute', left: '41%', top: '44%', width: '3%', height: '19%', backgroundColor: '#3F605C', border: '1px solid #1E1E1A' }} />
      <div style={{ position: 'absolute', left: '37.5%', top: '37%', width: '10%', height: '10%', borderRadius: '999px', backgroundColor: '#C75448', border: '2px solid #1E1E1A' }} />
      <div style={{ position: 'absolute', left: '45%', top: '39%', width: '28%', height: '17%', border: '2px solid #3F605C', backgroundColor: 'rgba(95, 127, 98, 0.28)', borderRadius: '50% 18% 18% 50%' }} />
      <div style={{ position: 'absolute', left: '50%', top: '42%', color: '#3F605C', fontSize: '1.25rem', fontWeight: 900, letterSpacing: 0 }}>
        &gt;&gt;&gt;
      </div>
      {['74%', '79%', '84%'].map((left, i) => (
        <div
          key={left}
          style={{
            position: 'absolute',
            left,
            top: `${35 + i * 3}%`,
            width: '1.15rem',
            height: '1.15rem',
            borderRadius: '999px',
            backgroundColor: '#E8DCC8',
            border: '2px solid #1E1E1A',
          }}
        />
      ))}
      <div style={{ position: 'absolute', left: '12%', top: '51%', fontSize: '0.72rem', fontWeight: 900, color: '#1E1E1A', backgroundColor: 'rgba(247, 241, 227, 0.86)', border: '1px solid #1E1E1A', padding: '0.18rem 0.3rem' }}>
        safe start
      </div>
      <div style={{ position: 'absolute', left: '72%', top: '39%', fontSize: '0.72rem', fontWeight: 900, color: '#1E1E1A', backgroundColor: 'rgba(247, 241, 227, 0.86)', border: '1px solid #1E1E1A', padding: '0.18rem 0.3rem' }}>
        landing
      </div>
    </>
  )
}

const PLAYABLE_ROOM_WIDTH = 1672
const PLAYABLE_ROOM_HEIGHT = 941
const PLAYER_WIDTH = 42
const PLAYER_HEIGHT = 72
const GRAVITY = 2300
const MOVE_SPEED = 430
const JUMP_SPEED = -850
const WIND_DURATION_MS = 5200
const GAME_MESSAGE_VISIBLE_MS = 3000

type PlayablePlatformId = 'start' | 'bud' | 'landing' | 'right'

interface PlayablePlatform {
  id: PlayablePlatformId
  x: number
  y: number
  w: number
  h: number
}

interface PlayableCoin {
  id: string
  x: number
  y: number
  collected: boolean
}

interface PlayableRoomState {
  x: number
  y: number
  vx: number
  vy: number
  onGround: boolean
  platformId: PlayablePlatformId | null
  timeMs: number
  tries: number
  falls: number
  budHit: boolean
  windUntilMs: number
  gameMessageShown: boolean
  gameMessageVisibleUntilMs: number
  nearBudMessageShown: boolean
  reachedLanding: boolean
  coins: PlayableCoin[]
  coinsBeforeLanding: number
  lastEvent: string
}

const playablePlatforms: PlayablePlatform[] = [
  { id: 'start', x: 0, y: 455, w: 318, h: 320 },
  { id: 'bud', x: 405, y: 635, w: 160, h: 140 },
  { id: 'landing', x: 970, y: 545, w: 545, h: 230 },
  { id: 'right', x: 1505, y: 455, w: 167, h: 320 },
]

const initialCoins: PlayableCoin[] = [
  { id: 'coin_1', x: 1358, y: 386, collected: false },
  { id: 'coin_2', x: 1470, y: 340, collected: false },
  { id: 'coin_3', x: 1585, y: 300, collected: false },
]

function createPlayableRoomState(): PlayableRoomState {
  return {
    x: 142,
    y: 455 - PLAYER_HEIGHT,
    vx: 0,
    vy: 0,
    onGround: true,
    platformId: 'start',
    timeMs: 0,
    tries: 1,
    falls: 0,
    budHit: false,
    windUntilMs: 0,
    gameMessageShown: false,
    gameMessageVisibleUntilMs: 0,
    nearBudMessageShown: false,
    reachedLanding: false,
    coins: initialCoins.map((coin) => ({ ...coin })),
    coinsBeforeLanding: 0,
    lastEvent: 'started on the left platform',
  }
}

function isNearWindBud(state: PlayableRoomState) {
  const playerCenterX = state.x + PLAYER_WIDTH / 2
  const playerCenterY = state.y + PLAYER_HEIGHT / 2
  return Math.hypot(playerCenterX - 500, playerCenterY - 585) < 125
}

function resetPlayerAfterFall(state: PlayableRoomState) {
  state.x = 142
  state.y = 455 - PLAYER_HEIGHT
  state.vx = 0
  state.vy = 0
  state.onGround = true
  state.platformId = 'start'
  state.falls += 1
  state.tries += 1
  state.gameMessageVisibleUntilMs = 0
  state.windUntilMs = 0
  state.lastEvent = 'fell and restarted'
}

function showGameMessageFor(state: PlayableRoomState, durationMs: number) {
  state.gameMessageShown = true
  state.gameMessageVisibleUntilMs = state.timeMs + durationMs
}

function activateWindBud(state: PlayableRoomState) {
  if (!isNearWindBud(state)) return false
  state.budHit = true
  state.windUntilMs = state.timeMs + WIND_DURATION_MS
  state.gameMessageVisibleUntilMs = 0
  state.lastEvent = 'hit the Wind Bud'
  return true
}

function updatePlayableRoomState(state: PlayableRoomState, keys: Record<string, boolean>, dt: number) {
  state.timeMs += dt * 1000

  if (keys.e || keys.E || keys.hit) {
    activateWindBud(state)
    keys.e = false
    keys.E = false
    keys.hit = false
  }

  const wantsLeft = keys.ArrowLeft || keys.a || keys.A || keys.left
  const wantsRight = keys.ArrowRight || keys.d || keys.D || keys.right
  const wantsJump = keys.ArrowUp || keys.w || keys.W || keys[' '] || keys.jump
  const windActive = state.windUntilMs > state.timeMs
  const inWind =
    windActive &&
    state.x + PLAYER_WIDTH > 535 &&
    state.x < 1030 &&
    state.y + PLAYER_HEIGHT > 390 &&
    state.y < 680

  if (wantsLeft && !wantsRight) state.vx = -MOVE_SPEED
  else if (wantsRight && !wantsLeft) state.vx = MOVE_SPEED
  else state.vx *= state.onGround ? 0.7 : 0.94

  if (wantsJump && state.onGround) {
    state.vy = JUMP_SPEED
    state.onGround = false
    state.platformId = null
    state.lastEvent = 'jumped'
  }

  if (inWind) {
    state.vx += wantsLeft ? 120 * dt : 980 * dt
    state.vy -= 1180 * dt
    state.vy = Math.max(state.vy, -410)
    state.lastEvent = wantsLeft ? 'moved away from the wind' : 'wind is carrying the player'
  } else {
    state.vy += GRAVITY * dt
  }

  state.vx = Math.max(Math.min(state.vx, 720), -520)
  state.vy = Math.max(Math.min(state.vy, 1100), -900)

  const previousBottom = state.y + PLAYER_HEIGHT
  state.x += state.vx * dt
  state.y += state.vy * dt
  state.x = Math.max(0, Math.min(state.x, PLAYABLE_ROOM_WIDTH - PLAYER_WIDTH))

  state.onGround = false
  state.platformId = null
  if (state.vy >= 0) {
    for (const platform of playablePlatforms) {
      const overlapsX = state.x + PLAYER_WIDTH > platform.x && state.x < platform.x + platform.w
      const crossedTop = previousBottom <= platform.y + 16 && state.y + PLAYER_HEIGHT >= platform.y
      if (overlapsX && crossedTop) {
        state.y = platform.y - PLAYER_HEIGHT
        state.vy = 0
        state.onGround = true
        state.platformId = platform.id
        if ((platform.id === 'landing' || platform.id === 'right') && !state.reachedLanding) {
          state.reachedLanding = true
          state.lastEvent = 'reached the next platform'
        }
        break
      }
    }
  }

  if (!state.budHit && isNearWindBud(state) && !state.nearBudMessageShown) {
    state.nearBudMessageShown = true
    showGameMessageFor(state, GAME_MESSAGE_VISIBLE_MS)
  }

  for (const coin of state.coins) {
    if (coin.collected) continue
    const playerCenterX = state.x + PLAYER_WIDTH / 2
    const playerCenterY = state.y + PLAYER_HEIGHT / 2
    if (Math.hypot(playerCenterX - coin.x, playerCenterY - coin.y) < 58) {
      coin.collected = true
      if (!state.reachedLanding) state.coinsBeforeLanding += 1
      state.lastEvent = state.reachedLanding ? 'collected a coin' : 'went for coins before crossing'
    }
  }

  if (state.y > PLAYABLE_ROOM_HEIGHT + 80) resetPlayerAfterFall(state)
}

function getPlayableRunNote(state: PlayableRoomState) {
  if (state.falls > 0 && state.lastEvent === 'fell and restarted') return 'Fell before crossing.'
  if (!state.budHit && state.gameMessageShown) return 'Message appeared.'
  if (!state.budHit && state.x > 350) return 'Flower was easy to pass.'
  if (state.coinsBeforeLanding > 0 && !state.reachedLanding) return 'Coins pulled attention.'
  if (state.windUntilMs > state.timeMs && !state.reachedLanding) return 'Wind on. Cross right.'
  if (state.reachedLanding && state.coins.some((coin) => coin.collected)) return 'Crossed and got coins.'
  if (state.reachedLanding) return 'Reached right platform.'
  if (state.budHit) return 'Flower made wind.'
  return 'Watch what feels unclear.'
}

function renderPlayableRoom(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement | null,
  state: PlayableRoomState,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, PLAYABLE_ROOM_WIDTH, PLAYABLE_ROOM_HEIGHT)
  if (image?.complete) {
    ctx.drawImage(image, 0, 0, PLAYABLE_ROOM_WIDTH, PLAYABLE_ROOM_HEIGHT)
  } else {
    ctx.fillStyle = '#F7F1E3'
    ctx.fillRect(0, 0, PLAYABLE_ROOM_WIDTH, PLAYABLE_ROOM_HEIGHT)
  }

  const windActive = state.windUntilMs > state.timeMs
  if (windActive) {
    ctx.save()
    ctx.globalAlpha = 0.42
    ctx.fillStyle = '#7FC6D5'
    ctx.beginPath()
    ctx.moveTo(540, 585)
    ctx.bezierCurveTo(710, 480, 875, 470, 1045, 545)
    ctx.lineTo(1035, 650)
    ctx.bezierCurveTo(850, 615, 690, 615, 540, 610)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  if (state.gameMessageVisibleUntilMs > state.timeMs) {
    const messageW = 590
    const messageH = 132
    const messageX = (PLAYABLE_ROOM_WIDTH - messageW) / 2
    const messageY = 330
    ctx.fillStyle = 'rgba(251, 247, 234, 0.94)'
    ctx.strokeStyle = '#1E1E1A'
    ctx.lineWidth = 3
    ctx.fillRect(messageX, messageY, messageW, messageH)
    ctx.strokeRect(messageX, messageY, messageW, messageH)
    ctx.fillStyle = '#1E1E1A'
    ctx.font = '800 44px Inter, system-ui, sans-serif'
    ctx.fillText('Game message', messageX + 34, messageY + 52)
    ctx.font = '600 36px Inter, system-ui, sans-serif'
    ctx.fillText('Try hitting the Wind Bud.', messageX + 34, messageY + 98)
  }

  for (const coin of state.coins) {
    if (coin.collected) continue
    ctx.save()
    ctx.globalAlpha = 0.72
    ctx.strokeStyle = '#F2C14E'
    ctx.lineWidth = 7
    ctx.beginPath()
    ctx.arc(coin.x, coin.y, 35, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  const nearBud = isNearWindBud(state)
  if (nearBud && !state.budHit) {
    ctx.save()
    ctx.globalAlpha = 0.9
    ctx.strokeStyle = '#F2C14E'
    ctx.lineWidth = 6
    ctx.beginPath()
    ctx.arc(500, 585, 82, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  ctx.save()
  ctx.translate(state.x, state.y)
  ctx.fillStyle = '#F7D7A9'
  ctx.strokeStyle = '#1E1E1A'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(PLAYER_WIDTH / 2, 17, 16, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = '#5A8DB8'
  ctx.beginPath()
  ctx.roundRect(5, 34, PLAYER_WIDTH - 10, 34, 8)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

function renderPlayableRoomText(state: PlayableRoomState, keys: Record<string, boolean>) {
  return JSON.stringify({
    mode: 'wind_bud_playable_room',
    coordinateSystem: 'pixels in the room image, origin at top left, x right, y down',
    player: {
      x: Math.round(state.x),
      y: Math.round(state.y),
      vx: Math.round(state.vx),
      vy: Math.round(state.vy),
      onGround: state.onGround,
      platformId: state.platformId,
      nearWindBud: isNearWindBud(state),
    },
    controlsHeld: Object.entries(keys).filter(([, active]) => active).map(([key]) => key),
    run: {
      tries: state.tries,
      falls: state.falls,
      budHit: state.budHit,
      windActive: state.windUntilMs > state.timeMs,
      gameMessageShown: state.gameMessageShown,
      gameMessageVisible: state.gameMessageVisibleUntilMs > state.timeMs,
      reachedLanding: state.reachedLanding,
      coinsCollected: state.coins.filter((coin) => coin.collected).length,
      coinsBeforeLanding: state.coinsBeforeLanding,
      lastEvent: state.lastEvent,
      runNote: getPlayableRunNote(state),
    },
  })
}

function WindBudPlayableRoom({
  imagePath,
  resetLabel,
  backLabel,
  onExit,
}: {
  imagePath?: string
  resetLabel: string
  backLabel: string
  onExit: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const stateRef = useRef<PlayableRoomState>(createPlayableRoomState())
  const keysRef = useRef<Record<string, boolean>>({})
  const lastTickRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const [snapshot, setSnapshot] = useState(() => createPlayableRoomState())

  const publishSnapshot = () => {
    setSnapshot({
      ...stateRef.current,
      coins: stateRef.current.coins.map((coin) => ({ ...coin })),
    })
  }

  const resetRoom = () => {
    stateRef.current = createPlayableRoomState()
    keysRef.current = {}
    publishSnapshot()
    if (canvasRef.current) renderPlayableRoom(canvasRef.current, imageRef.current, stateRef.current)
  }

  useEffect(() => {
    canvasRef.current?.focus()
  }, [])

  useEffect(() => {
    const image = new Image()
    image.src = imagePath || '/scenes/wind_bud_tutorial_level_slice.png'
    image.onload = () => {
      imageRef.current = image
      if (canvasRef.current) renderPlayableRoom(canvasRef.current, image, stateRef.current)
    }
    imageRef.current = image
  }, [imagePath])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'a', 'A', 'd', 'D', 'w', 'W', 'e', 'E', 'r', 'R'].includes(event.key)) {
        event.preventDefault()
        if (event.key === 'r' || event.key === 'R') {
          resetRoom()
          return
        }
        keysRef.current[event.key] = true
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current[event.key] = false
    }
    const handleBlur = () => {
      keysRef.current = {}
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useEffect(() => {
    const step = (dt: number) => {
      updatePlayableRoomState(stateRef.current, keysRef.current, dt)
      if (canvasRef.current) renderPlayableRoom(canvasRef.current, imageRef.current, stateRef.current)
    }

    lastTickRef.current = null
    const tick = (timestamp: number) => {
      if (lastTickRef.current === null) lastTickRef.current = timestamp
      const deltaMs = Math.min(timestamp - lastTickRef.current, 48)
      lastTickRef.current = timestamp
      step(deltaMs / 1000)
      publishSnapshot()
      animationFrameRef.current = window.requestAnimationFrame(tick)
    }

    animationFrameRef.current = window.requestAnimationFrame(tick)
    return () => {
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current)
    }
  }, [])

  useEffect(() => {
    const testWindow = window as Window & {
      render_game_to_text?: () => string
      advanceTime?: (ms: number) => void
    }
    const previousRender = testWindow.render_game_to_text
    const previousAdvance = testWindow.advanceTime

    const renderGameToText = () => renderPlayableRoomText(stateRef.current, keysRef.current)

    testWindow.render_game_to_text = renderGameToText
    testWindow.advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)))
      for (let i = 0; i < steps; i += 1) updatePlayableRoomState(stateRef.current, keysRef.current, 1 / 60)
      if (canvasRef.current) renderPlayableRoom(canvasRef.current, imageRef.current, stateRef.current)
      publishSnapshot()
    }

    return () => {
      if (testWindow.render_game_to_text === renderGameToText) testWindow.render_game_to_text = previousRender
      if (testWindow.advanceTime) testWindow.advanceTime = previousAdvance
    }
  }, [])

  const collectedCoins = snapshot.coins.filter((coin) => coin.collected).length
  const runNote = getPlayableRunNote(snapshot)
  const windActive = snapshot.windUntilMs > snapshot.timeMs
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 6, background: '#F7F1E3' }}>
      <canvas
        ref={canvasRef}
        width={PLAYABLE_ROOM_WIDTH}
        height={PLAYABLE_ROOM_HEIGHT}
        aria-label="Playable Wind Bud room"
        tabIndex={0}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', outline: 'none' }}
      />
      <div
        style={{
          position: 'absolute',
          top: '0.45rem',
          right: '0.45rem',
          display: 'flex',
          gap: '0.35rem',
          zIndex: 8,
        }}
      >
        <button type="button" onClick={resetRoom} style={playableButtonStyle}>
          {resetLabel}
        </button>
        <button type="button" onClick={onExit} style={playableButtonStyle}>
          {backLabel}
        </button>
      </div>
      <div
        style={{
          position: 'absolute',
          left: '0.45rem',
          top: '0.45rem',
          maxWidth: 'min(18rem, 52%)',
          background: 'rgba(251, 247, 234, 0.94)',
          border: '1px solid #000',
          boxShadow: '2px 2px 0 #000',
          padding: '0.45rem 0.55rem',
          color: '#1E1E1A',
          fontSize: '0.68rem',
          lineHeight: 1.35,
          fontWeight: 750,
        }}
      >
        <div>Goal: reach the platform on the right.</div>
        <div>Coins are optional. Try the room like a new player.</div>
        <div>A/D or arrows move. Space jumps. E hits the Bud.</div>
      </div>

      <div
        style={{
          position: 'absolute',
          right: '0.3rem',
          bottom: '0.3rem',
          background: 'rgba(251, 247, 234, 0.82)',
          border: '1px solid #000',
          boxShadow: '1px 1px 0 #000',
          padding: '0.22rem 0.3rem',
          minWidth: '5.8rem',
          maxWidth: '7.8rem',
          color: '#1E1E1A',
          fontSize: '0.48rem',
          lineHeight: 1.15,
          fontWeight: 800,
        }}
        aria-live="polite"
      >
        <div style={{ color: '#2F6B5F', textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.1rem' }}>Run notes</div>
        <div>Tries {snapshot.tries} · Falls {snapshot.falls}</div>
        <div>Wind {windActive ? 'on' : 'off'} · Coins {collectedCoins}/3</div>
        <div style={{ borderTop: '1px solid rgba(0, 0, 0, 0.18)', marginTop: '0.12rem', paddingTop: '0.12rem' }}>
          {runNote}
        </div>
      </div>
    </div>
  )
}

const playableButtonStyle: React.CSSProperties = {
  border: '1px solid #000000',
  boxShadow: '2px 2px 0 #000000',
  background: '#FBF7EA',
  color: '#1E1E1A',
  cursor: 'pointer',
  padding: '0.35rem 0.5rem',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '0.7rem',
  fontWeight: 900,
}

function TutorialLevelStage({
  board,
  selectedHotspotId,
  selectedHotspotIds,
  playableActive,
  onPlayableActiveChange,
  onSelect,
}: {
  board: StructuredEntryVisualBoard
  selectedHotspotId: string
  selectedHotspotIds: Set<string>
  playableActive: boolean
  onPlayableActiveChange: (active: boolean) => void
  onSelect: (id: string) => void
}) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(board.imagePath && !imageFailed)
  const showDemo = board.demo?.type === 'wind_bud_playable_room'

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        width: '100%',
        overflow: 'hidden',
        border: '1px solid #000',
        backgroundColor: '#E8DCC8',
      }}
      aria-label={board.stageTitle || 'Tutorial level slice'}
    >
      {!showImage && <MiniLevelFallback />}
      {showImage && (
        <img
          src={board.imagePath}
          alt={board.imageAlt || ''}
          onError={() => setImageFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
      {showDemo && !playableActive && (
        <button
          type="button"
          onClick={() => onPlayableActiveChange(true)}
          aria-label="Play room"
          style={{
            position: 'absolute',
            top: '0.45rem',
            right: '0.45rem',
            zIndex: 5,
            border: '1px solid #000000',
            boxShadow: '2px 2px 0 #000000',
            background: '#FBF7EA',
            color: '#1E1E1A',
            cursor: 'pointer',
            padding: '0.35rem 0.55rem',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '0.72rem',
            fontWeight: 900,
          }}
        >
          {board.demo?.playLabel || 'Play'}
        </button>
      )}
      {playableActive && showDemo && (
        <WindBudPlayableRoom
          imagePath={board.imagePath}
          resetLabel={board.demo?.resetLabel || 'Reset'}
          backLabel={board.demo?.backLabel || 'Back to labels'}
          onExit={() => onPlayableActiveChange(false)}
        />
      )}
      {!playableActive && board.hotspots.map((hotspot) => {
        const selectedForBeat = selectedHotspotId === hotspot.id
        const usedElsewhere = !selectedForBeat && selectedHotspotIds.has(hotspot.id)
        return (
          <button
            key={hotspot.id}
            type="button"
            onClick={() => onSelect(hotspot.id)}
            title={hotspot.description || hotspot.label}
            aria-pressed={selectedForBeat}
            style={{
              position: 'absolute',
              left: `${hotspot.xPct}%`,
              top: `${hotspot.yPct}%`,
              width: `${hotspot.wPct}%`,
              height: `${hotspot.hPct}%`,
              border: selectedForBeat ? '2px solid #C75448' : '1.5px dashed rgba(30, 30, 26, 0.78)',
              backgroundColor: selectedForBeat ? 'rgba(199, 84, 72, 0.18)' : usedElsewhere ? 'rgba(95, 127, 98, 0.18)' : 'rgba(247, 241, 227, 0.08)',
              color: '#1E1E1A',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.2rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.68rem',
              fontWeight: 900,
              lineHeight: 1.1,
              textAlign: 'center',
              boxShadow: selectedForBeat ? '3px 3px 0 #1E1E1A' : 'none',
            }}
          >
            <span style={{ backgroundColor: 'rgba(247, 241, 227, 0.9)', border: '1px solid rgba(30, 30, 26, 0.7)', padding: '0.12rem 0.22rem' }}>
              {hotspot.shortLabel || hotspot.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function StructuredEntryScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const [activeBeatIndex, setActiveBeatIndex] = useState(0)
  const [activeAppTab, setActiveAppTab] = useState('editor')
  const [playableRoomActive, setPlayableRoomActive] = useState(false)
  const interpolationContext = { playerName, branchFlags, mcSelections, freeTextResponses: responses }

  const def = node.definition
  const initialCount = def.initialCount ?? def.minItems ?? 3
  const items = useMemo(() => {
    return parseItems(responses[def.bindingKey] || '', def.fields, initialCount)
  }, [responses, def.bindingKey, def.fields, initialCount])

  const updateItem = (idx: number, key: string, value: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it))
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const addItem = () => {
    if (def.maxItems && items.length >= def.maxItems) return
    const next = [...items, Object.fromEntries(def.fields.map((f) => [f.key, ''])) as Item]
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const removeItem = (idx: number) => {
    if (def.minItems && items.length <= def.minItems) return
    const next = items.filter((_, i) => i !== idx)
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const allFilled = items.every((it) => def.fields.every((f) => (it[f.key] || '').trim().length > 0))
  const appWindow = (def.presentation === 'google_doc' ? 'google-docs' : resolveWorkSurfaceVariant(node, 'notion')) as LaptopFrameVariant
  const appTabs = mergeWorkSurfaceTabs(node)
  const titleTabs = appTabs.length > 0
    ? [{ id: 'editor', label: node.workSurface?.title || node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined
  const presentation = def.presentation
    ?? (node.workSurface?.kind === 'spreadsheet_workbook' ? 'spreadsheet'
      : node.workSurface?.kind === 'ats_screening' ? 'screening_sheet'
      : node.workSurface?.kind === 'comment_queue' ? 'comment_queue'
      : node.appWindow === 'spreadsheet' ? 'spreadsheet'
      : 'cards')
  const tableLike = ['table', 'spreadsheet', 'screening_sheet', 'issue_list', 'comment_queue'].includes(presentation)
  const visualBoard = def.visualBoard
  const tutorialBoard = presentation === 'tutorial_beat_board' ? visualBoard : undefined
  const activeItemIndex = Math.min(activeBeatIndex, Math.max(items.length - 1, 0))
  const activeItem = items[activeItemIndex] || {}
  const hotspotById = useMemo(() => {
    return new Map((visualBoard?.hotspots || []).map((hotspot) => [hotspot.id, hotspot]))
  }, [visualBoard])
  const selectedHotspotIds = useMemo(() => {
    return new Set(items.map((item) => item.stage_focus).filter(Boolean))
  }, [items])
  const activeHotspotId = activeItem.stage_focus || ''
  const activeHotspot = hotspotById.get(activeHotspotId)
  const previousResponseReference = def.previousResponseReference
  const hasReferenceDrawer = Boolean(briefing || previousResponseReference)
  const showReferenceButton = hasReferenceDrawer && !['mechanic_hook_sheet', 'playtest_watchlist'].includes(node.id)
  const showInlineDevSkip = import.meta.env.DEV && new URLSearchParams(window.location.search).get('devtools') === '1'

  const renderControl = (idx: number, field: typeof def.fields[number], compact = false) => {
    const commonStyle = {
      width: '100%',
      padding: compact ? '0.42rem 0.5rem' : '0.5rem 0.625rem',
      fontSize: compact ? '0.78rem' : '0.875rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      border: '1px solid #CDBF94',
      backgroundColor: '#FBF7EA',
      color: '#1E1E1A',
      outline: 'none',
      borderRadius: '4px',
    }
    const options = field.options || []
    if ((field.inputType === 'select' || options.length > 0) && options.length > 0) {
      return (
        <select
          aria-label={field.label}
          value={items[idx]?.[field.key] || ''}
          onChange={(e) => updateItem(idx, field.key, e.target.value)}
          style={commonStyle}
        >
          <option value="" disabled>{field.placeholder || `Select ${field.label}`}</option>
          {options.map((option) => {
            const value = getOptionValue(option)
            return (
              <option key={value} value={value}>
                {getOptionLabel(option)}
              </option>
            )
          })}
        </select>
      )
    }
    if (field.multiline) {
      return (
        <textarea
          value={items[idx]?.[field.key] || ''}
          onChange={(e) => updateItem(idx, field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={compact ? 2 : field.rows ?? 3}
          style={{ ...commonStyle, resize: 'vertical' }}
        />
      )
    }
    return (
      <input
        type="text"
        value={items[idx]?.[field.key] || ''}
        onChange={(e) => updateItem(idx, field.key, e.target.value)}
        placeholder={field.placeholder}
        style={commonStyle}
      />
    )
  }

  const selectHotspotForActiveBeat = (hotspotId: string) => {
    updateItem(activeItemIndex, 'stage_focus', hotspotId)
  }

  const renderTutorialField = (field: typeof def.fields[number]) => {
    if (field.key === 'stage_focus' && field.inputType === 'select') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {renderControl(activeItemIndex, field)}
          {activeHotspot?.description && (
            <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.45, color: '#555' }}>
              {activeHotspot.description}
            </p>
          )}
        </div>
      )
    }
    if (field.key === 'stage_focus') {
      return (
        <div
          style={{
            border: '1px solid #CDBF94',
            backgroundColor: '#FBF7EA',
            padding: '0.55rem 0.65rem',
            fontSize: '0.82rem',
            lineHeight: 1.5,
            minHeight: '2.45rem',
          }}
        >
          {activeHotspot ? (
            <>
              <strong>{activeHotspot.label}</strong>
              {activeHotspot.description && <span style={{ color: '#555' }}> - {activeHotspot.description}</span>}
            </>
          ) : (
            <span style={{ color: '#6f6758' }}>Choose a place on the level map.</span>
          )}
        </div>
      )
    }
    return renderControl(activeItemIndex, field)
  }

  const renderTutorialBeatBoard = (board: StructuredEntryVisualBoard) => {
    const beatMeta = board.beats?.[activeItemIndex]
    const editableFields = def.fields
    const singleNote = items.length === 1 && def.maxItems === 1

    return (
      <div className="tutorial-beat-board" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>
        <div
          className="tutorial-beat-board-grid"
          style={{
            display: 'grid',
            gap: '0.75rem',
            alignItems: 'start',
          }}
        >
          <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
                {board.stageTitle || 'Mini level'}
              </div>
              {board.subtitle && (
                <p style={{ marginTop: '0.28rem', fontSize: '0.82rem', lineHeight: 1.55, color: '#333' }}>
                  {board.subtitle}
                </p>
              )}
            </div>

            <TutorialLevelStage
              board={board}
              selectedHotspotId={activeHotspotId}
              selectedHotspotIds={selectedHotspotIds}
              playableActive={playableRoomActive}
              onPlayableActiveChange={setPlayableRoomActive}
              onSelect={selectHotspotForActiveBeat}
            />

            {!playableRoomActive && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 10rem), 1fr))', gap: '0.5rem' }}>
                {board.hotspots.map((hotspot: StructuredEntryVisualHotspot) => {
                  const selectedForBeat = activeHotspotId === hotspot.id
                  return (
                    <button
                      key={hotspot.id}
                      type="button"
                      onClick={() => selectHotspotForActiveBeat(hotspot.id)}
                      style={{
                        border: selectedForBeat ? '2px solid #C75448' : '1px solid #CDBF94',
                        backgroundColor: selectedForBeat ? '#F2EBD9' : '#FBF7EA',
                        color: '#1E1E1A',
                        cursor: 'pointer',
                        padding: '0.55rem',
                        textAlign: 'left',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      <strong style={{ display: 'block', fontSize: '0.76rem', lineHeight: 1.25 }}>{hotspot.label}</strong>
                      {hotspot.description && (
                        <span style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.68rem', lineHeight: 1.35, color: '#555' }}>
                          {hotspot.description}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className="tutorial-beat-board-note" style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {!singleNote && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 9rem), 1fr))', gap: '0.5rem' }}>
                {items.map((item, idx) => {
                  const beat = board.beats?.[idx]
                  const selected = idx === activeItemIndex
                  const complete = def.fields.every((field) => (item[field.key] || '').trim().length > 0)
                  const focus = hotspotById.get(item.stage_focus || '')
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveBeatIndex(idx)}
                      style={{
                        border: selected ? '2px solid #1E1E1A' : '1px solid #CDBF94',
                        backgroundColor: selected ? '#E8DCC8' : '#FBF7EA',
                        color: '#1E1E1A',
                        boxShadow: selected ? '3px 3px 0 #1E1E1A' : 'none',
                        cursor: 'pointer',
                        padding: '0.6rem',
                        minHeight: '5.25rem',
                        textAlign: 'left',
                        fontFamily: 'Inter, system-ui, sans-serif',
                      }}
                    >
                      <span style={{ display: 'block', fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
                        Entry {idx + 1}{complete ? ' - done' : ''}
                      </span>
                      <strong style={{ display: 'block', marginTop: '0.2rem', fontSize: '0.86rem', lineHeight: 1.25 }}>
                        {beat?.label || `${def.itemLabel} ${idx + 1}`}
                      </strong>
                      <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.7rem', lineHeight: 1.3, color: '#555' }}>
                        {focus ? focus.label : 'Pick a level area'}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <div
              style={{
                border: '1px solid #000',
                backgroundColor: '#F7F1E3',
                padding: '0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
                  {singleNote ? 'Design note' : `Editing entry ${activeItemIndex + 1}`}
                </div>
                {!singleNote && (
                  <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem', lineHeight: 1.3 }}>
                    {beatMeta?.label || `${def.itemLabel} ${activeItemIndex + 1}`}
                  </h3>
                )}
                {beatMeta?.helper && (
                  <p style={{ marginTop: '0.3rem', fontSize: '0.78rem', lineHeight: 1.5, color: '#555' }}>
                    {beatMeta.helper}
                  </p>
                )}
              </div>

              {editableFields.map((field) => (
                <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E1E1A' }}>{field.label}</label>
                  {renderTutorialField(field)}
                </div>
              ))}
            </div>
          </section>
        </div>

        {board.helperText && (
          <div style={{ border: '1px solid #CDBF94', backgroundColor: '#FBF7EA', padding: '0.75rem', fontSize: '0.8rem', lineHeight: 1.55, color: '#333' }}>
            {board.helperText}
          </div>
        )}

        <ActionButton
          text="Submit"
          onClick={() => goNext(node)}
          disabled={!allFilled}
          variant={allFilled ? 'primary' : 'secondary'}
        />
          {showInlineDevSkip && <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />}
      </div>
    )
  }

  const renderGoogleDocReference = () => {
    if (!previousResponseReference) return null
    const referenceItems = parseReferenceItems(responses[previousResponseReference.bindingKey] || '')
    const hasContent = referenceItems.some((item) => Object.values(item).some((value) => value.trim().length > 0))

    return (
      <section
        style={{
          border: '1px solid #dadce0',
          borderRadius: '3px',
          backgroundColor: '#fff',
          margin: '0.8rem 0 1.15rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            backgroundColor: '#f8fafd',
            borderBottom: '1px solid #dadce0',
            padding: '0.36rem 0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3c4043' }}>
            Source: {previousResponseReference.title}
          </span>
          <span style={{ fontSize: '0.64rem', color: '#5f6368' }}>linked from previous doc</span>
        </div>
        {!hasContent ? (
          <p style={{ margin: 0, color: '#5f6368', fontSize: '0.8rem', lineHeight: 1.55, padding: '0.65rem' }}>
            {previousResponseReference.emptyText || 'No previous response yet.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.48rem', padding: '0.65rem' }}>
            {referenceItems.map((item, idx) => {
              const entries = Object.entries(item).filter(([, value]) => value.trim().length > 0)
              if (entries.length === 0) return null
              return (
                <div key={idx} style={{ display: 'grid', gap: '0.35rem' }}>
                  {entries.map(([key, value]) => (
                    <div key={key}>
                      <div style={{ color: '#5f6368', fontSize: '0.68rem', fontWeight: 700 }}>
                        {previousResponseReference.fieldLabels?.[key] || humanizeKey(key)}
                      </div>
                      <div style={{ color: '#202124', fontSize: '0.78rem', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                        {previousResponseReference.valueLabels?.[value] || value}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  const renderGoogleDocControl = (idx: number, field: typeof def.fields[number]) => {
    const commonStyle = {
      width: '100%',
      border: '0',
      backgroundColor: 'transparent',
      color: '#202124',
      fontFamily: 'Arial, sans-serif',
      fontSize: '0.84rem',
      lineHeight: 1.45,
      outline: 'none',
      padding: '0.35rem 0.4rem',
    }
    const options = field.options || []
    if ((field.inputType === 'select' || options.length > 0) && options.length > 0) {
      return (
        <select
          aria-label={field.label}
          value={items[idx]?.[field.key] || ''}
          onChange={(e) => updateItem(idx, field.key, e.target.value)}
          style={commonStyle}
        >
          <option value="" disabled>{field.placeholder || `Select ${field.label}`}</option>
          {options.map((option) => {
            const value = getOptionValue(option)
            return (
              <option key={value} value={value}>
                {getOptionLabel(option)}
              </option>
            )
          })}
        </select>
      )
    }
    if (field.multiline) {
      return (
        <textarea
          value={items[idx]?.[field.key] || ''}
          onChange={(e) => updateItem(idx, field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          style={{ ...commonStyle, resize: 'vertical', minHeight: `${Math.max(field.rows ?? 3, 2) * 1.55}rem` }}
        />
      )
    }
    return (
      <input
        type="text"
        value={items[idx]?.[field.key] || ''}
        onChange={(e) => updateItem(idx, field.key, e.target.value)}
        placeholder={field.placeholder}
        style={commonStyle}
      />
    )
  }

  const renderGoogleDocForm = () => (
    <div
      style={{
        backgroundColor: '#f8fafd',
        minHeight: '720px',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          borderBottom: '1px solid #dadce0',
          backgroundColor: '#f8fafd',
          padding: '0.55rem 0.8rem 0.42rem',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.58rem', minWidth: 0 }}>
          <div
            aria-hidden="true"
            style={{
              width: '1.72rem',
              height: '2.1rem',
              borderRadius: '3px',
              backgroundColor: '#4285f4',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1rem',
              fontWeight: 800,
              flex: '0 0 auto',
              boxShadow: 'inset -0.35rem 0 #2f6fda',
            }}
          >
            D
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: '#202124',
                fontSize: '1rem',
                lineHeight: 1.2,
                fontWeight: 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {node.windowTitle || node.title}
            </div>
            <div
              style={{
                marginTop: '0.3rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.55rem',
                color: '#3c4043',
                fontSize: '0.72rem',
              }}
            >
              {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help'].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flex: '0 0 auto' }}>
          <button
            type="button"
            aria-label="Open comments"
            style={{
              border: '0',
              backgroundColor: 'transparent',
              color: '#5f6368',
              width: '2rem',
              height: '2rem',
              borderRadius: '999px',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1rem',
              cursor: 'default',
            }}
          >
            C
          </button>
          <button
            type="button"
            style={{
              border: '0',
              backgroundColor: '#c2e7ff',
              color: '#001d35',
              borderRadius: '18px',
              padding: '0.45rem 0.82rem',
              fontSize: '0.76rem',
              fontWeight: 700,
              fontFamily: 'Arial, sans-serif',
              cursor: 'default',
            }}
          >
            Share
          </button>
          <div
            aria-hidden="true"
            style={{
              width: '1.82rem',
              height: '1.82rem',
              borderRadius: '999px',
              backgroundColor: '#0b8043',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            S
          </div>
        </div>
      </div>

      <div
        aria-hidden="true"
        style={{
          borderBottom: '1px solid #dadce0',
          backgroundColor: '#fff',
          padding: '0.34rem 0.85rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.36rem',
          alignItems: 'center',
          color: '#3c4043',
          fontSize: '0.72rem',
        }}
      >
        <span style={{ color: '#5f6368', marginRight: '0.28rem' }}>Last edit was seconds ago</span>
        {['Undo', 'Redo', 'Print', '100%', 'Normal text', 'Arial', '11', 'B', 'I', 'U', 'A', 'Align', 'Checklist'].map((tool) => (
          <span
            key={tool}
            style={{
              minHeight: '1.45rem',
              border: ['100%', 'Normal text', 'Arial', '11'].includes(tool) ? '1px solid #dadce0' : '1px solid transparent',
              backgroundColor: ['100%', 'Normal text', 'Arial', '11'].includes(tool) ? '#fff' : 'transparent',
              borderRadius: '4px',
              padding: tool.length <= 2 ? '0.22rem 0.42rem' : '0.22rem 0.55rem',
              fontWeight: tool === 'B' ? 700 : 400,
              fontStyle: tool === 'I' ? 'italic' : 'normal',
              textDecoration: tool === 'U' ? 'underline' : 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {tool}
          </span>
        ))}
      </div>

      <div
        aria-hidden="true"
        style={{
          height: '1.18rem',
          backgroundColor: '#fff',
          borderBottom: '1px solid #dadce0',
          display: 'flex',
          alignItems: 'end',
          paddingLeft: 'clamp(1rem, 8vw, 5.6rem)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '720px',
            maxWidth: 'calc(100% - 1rem)',
            height: '100%',
            backgroundImage: 'repeating-linear-gradient(to right, #dadce0 0, #dadce0 1px, transparent 1px, transparent 48px)',
            color: '#5f6368',
            fontSize: '0.56rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 0.25rem',
          }}
        >
          <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span>
        </div>
      </div>

      <div
        style={{
          backgroundColor: '#f1f3f4',
          padding: '1.25rem clamp(0.55rem, 3vw, 2rem) 1.4rem',
        }}
      >
        <article
          style={{
            width: 'min(100%, 760px)',
            minHeight: '860px',
            margin: '0 auto',
            backgroundColor: '#fff',
            color: '#202124',
            border: '1px solid #dadce0',
            boxShadow: '0 1px 2px rgba(60, 64, 67, 0.18)',
            padding: 'clamp(1.05rem, 4vw, 2.7rem) clamp(0.9rem, 5vw, 3.35rem)',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#5f6368', marginBottom: '0.65rem' }}>
            Starling Grove Studios / Playtest Docs
          </div>
          <h2 style={{ margin: 0, color: '#202124', fontSize: '1.42rem', lineHeight: 1.28, fontWeight: 400 }}>
            {node.windowTitle || node.title}
          </h2>
          <p style={{ margin: '0.55rem 0 0', color: '#3c4043', fontSize: '0.86rem', lineHeight: 1.55 }}>
            One clear item for the 4 PM playtest. Write only things a tester can see while watching the player.
          </p>

          {renderGoogleDocReference()}

          {items.map((_item, idx) => (
            <section key={idx} style={{ marginTop: '1rem' }}>
              <div
                style={{
                  color: '#202124',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  marginBottom: '0.45rem',
                }}
              >
                {def.itemLabel} #{idx + 1}
              </div>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  tableLayout: 'fixed',
                  fontSize: '0.82rem',
                }}
              >
                <tbody>
                  {def.fields.map((field) => (
                    <tr key={field.key}>
                      <th
                        scope="row"
                        style={{
                          width: '34%',
                          border: '1px solid #dadce0',
                          backgroundColor: '#f8fafd',
                          color: '#202124',
                          textAlign: 'left',
                          verticalAlign: 'top',
                          padding: '0.55rem 0.6rem',
                          fontWeight: 700,
                          lineHeight: 1.35,
                        }}
                      >
                        {renderContentWithGlossary(field.label)}
                      </th>
                      <td
                        style={{
                          border: '1px solid #dadce0',
                          backgroundColor: '#fff',
                          verticalAlign: 'top',
                          padding: '0',
                        }}
                      >
                        {renderGoogleDocControl(idx, field)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </article>

        <div style={{ width: 'min(100%, 760px)', margin: '0.85rem auto 0', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <ActionButton
            text="Submit"
            onClick={() => goNext(node)}
            disabled={!allFilled}
            variant={allFilled ? 'primary' : 'secondary'}
          />
          {showInlineDevSkip && <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />}
        </div>
      </div>
    </div>
  )

  const formContent = tutorialBoard ? renderTutorialBeatBoard(tutorialBoard) : presentation === 'google_doc' ? renderGoogleDocForm() : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      {tableLike ? (
        <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: Math.max(620, def.fields.length * 180) }}>
            <thead>
              <tr>
                <th style={{ width: 96, textAlign: 'left', padding: '0.55rem', borderBottom: '1px solid #CDBF94', background: '#EFE8D2', fontSize: '0.7rem', color: '#3A6B5E', textTransform: 'uppercase' }}>
                  {def.itemLabel}
                </th>
                {def.fields.map((field) => (
                  <th key={field.key} style={{ textAlign: 'left', padding: '0.55rem', borderBottom: '1px solid #CDBF94', background: '#EFE8D2', fontSize: '0.7rem', color: '#3A6B5E', textTransform: 'uppercase' }}>
                    {field.label}
                  </th>
                ))}
                <th style={{ width: 72, borderBottom: '1px solid #CDBF94', background: '#EFE8D2' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((_item, idx) => (
                <tr key={idx}>
                  <td style={{ padding: '0.5rem', borderTop: idx ? '1px solid #E4D8B9' : 0, fontSize: '0.78rem', fontWeight: 800, color: '#1E1E1A' }}>
                    #{idx + 1}
                  </td>
                  {def.fields.map((field) => (
                    <td key={field.key} style={{ padding: '0.5rem', borderTop: idx ? '1px solid #E4D8B9' : 0, verticalAlign: 'top' }}>
                      {renderControl(idx, field, true)}
                    </td>
                  ))}
                  <td style={{ padding: '0.5rem', borderTop: idx ? '1px solid #E4D8B9' : 0, textAlign: 'right' }}>
                    {(!def.minItems || items.length > def.minItems) && (
                      <button
                        onClick={() => removeItem(idx)}
                        style={{ background: 'transparent', border: 'none', color: '#B87D6B', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 800 }}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        items.map((_item, idx) => (
          <div
            key={idx}
            style={{
              border: '1px solid #000',
              boxShadow: '4px 4px 0 #000',
              backgroundColor: '#F2EBD9',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <strong style={{ fontSize: '0.8125rem' }}>
                {def.itemLabel} #{idx + 1}
              </strong>
              {(!def.minItems || items.length > def.minItems) && (
                <button
                  onClick={() => removeItem(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#B87D6B', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Remove
                </button>
              )}
            </div>
            {def.fields.map((field) => (
              <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#444' }}>{renderContentWithGlossary(field.label)}</label>
                {renderControl(idx, field)}
              </div>
            ))}
          </div>
        ))
      )}

      {(!def.maxItems || items.length < def.maxItems) && (
        <button
          onClick={addItem}
          style={{
            background: '#E8DCC8',
            border: '1px dashed #000',
            padding: '0.625rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          + Add another {def.itemLabel.toLowerCase()}
        </button>
      )}

      <ActionButton
        text="Submit"
        onClick={() => goNext(node)}
        disabled={!allFilled}
        variant={allFilled ? 'primary' : 'secondary'}
      />
        {showInlineDevSkip && <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />}
    </div>
  )

  const tabbedWindowContent = activeAppTab === 'editor' ? (
    formContent
  ) : (
    appTabs.map((tab) => (
      activeAppTab === tab.id && (
        <div
          key={tab.id}
          style={{
            background: '#F7F1E3',
            border: '1px solid #CDBF94',
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: '#1E1E1A',
            whiteSpace: 'pre-wrap',
            minHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {renderContentWithGlossary(interpolate(tab.content, interpolationContext))}
          {tab.metrics && tab.metrics.length > 0 && <MetricsTable metrics={tab.metrics} />}
        </div>
      )
    ))
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={hasWorkSurfaceVisual(node)}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          {showReferenceButton && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #000',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
        </div>

        <WorkSurfaceFrame
          node={node}
          variant={appWindow}
          title={node.workSurface?.title || node.windowTitle}
          titleTabs={titleTabs}
          activeTitleTabId={activeAppTab}
          onTitleTabChange={setActiveAppTab}
        >
          {appTabs.length > 0 ? tabbedWindowContent : formContent}
        </WorkSurfaceFrame>
      </motion.div>
      {hasReferenceDrawer && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing?.title || 'Reference Info'}>
          {briefing && <BriefingDrawerContent node={briefing} />}
          {previousResponseReference && (
            <PreviousResponseReferenceCard
              reference={previousResponseReference}
              rawResponse={responses[previousResponseReference.bindingKey] || ''}
            />
          )}
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
