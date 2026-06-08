import { useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { CampaignStudioNode } from '../types/game'

interface CampaignState {
  backgroundId: string
  headlineId: string
  proofTextId: string
  textColorId: string
  headlineSize: number
  proofSize: number
  stickerIds: string[]
  stickerPlacements: Record<string, { x: number; y: number }>
  stickerSizes: Record<string, number>
  rationale: string
}

const TYPE_SIZE_MIN = 5
const DEFAULT_STICKER_SIZE = 22
const STICKER_SIZE_MIN = 8
const STICKER_SIZE_MAX = 42

const defaultStickerPlacements = [
  { x: 18, y: 78 },
  { x: 78, y: 18 },
  { x: 74, y: 76 },
]

const defaultState: CampaignState = {
  backgroundId: '',
  headlineId: '',
  proofTextId: '',
  textColorId: '',
  headlineSize: 40,
  proofSize: 19,
  stickerIds: [],
  stickerPlacements: {},
  stickerSizes: {},
  rationale: '',
}

function numberOrDefault(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function parseStickerPlacements(value: unknown): Record<string, { x: number; y: number }> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, placement]) => placement && typeof placement === 'object' && !Array.isArray(placement))
      .map(([id, placement]) => {
        const coords = placement as Record<string, unknown>
        return [
          id,
          {
            x: numberOrDefault(coords.x, 50),
            y: numberOrDefault(coords.y, 50),
          },
        ]
      }),
  )
}

function parseStickerSizes(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, size]) => typeof size === 'number' && Number.isFinite(size))
      .map(([id, size]) => [id, size as number]),
  )
}

function parseState(raw: string | undefined): CampaignState {
  if (!raw) return defaultState
  try {
    const parsed = JSON.parse(raw)
    return {
      backgroundId: typeof parsed.backgroundId === 'string' ? parsed.backgroundId : '',
      headlineId: typeof parsed.headlineId === 'string' ? parsed.headlineId : '',
      proofTextId: typeof parsed.proofTextId === 'string' ? parsed.proofTextId : '',
      textColorId: typeof parsed.textColorId === 'string' ? parsed.textColorId : '',
      headlineSize: numberOrDefault(parsed.headlineSize, defaultState.headlineSize),
      proofSize: numberOrDefault(parsed.proofSize, defaultState.proofSize),
      stickerIds: Array.isArray(parsed.stickerIds) ? parsed.stickerIds.filter((id: unknown) => typeof id === 'string') : [],
      stickerPlacements: parseStickerPlacements(parsed.stickerPlacements),
      stickerSizes: parseStickerSizes(parsed.stickerSizes),
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
    }
  } catch {
    return defaultState
  }
}

function serializeState(state: CampaignState) {
  return JSON.stringify(state, null, 2)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function CampaignStudioScene({ node }: { node: CampaignStudioNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const postRef = useRef<HTMLDivElement>(null)

  const state = useMemo(() => parseState(responses[node.id]), [responses, node.id])
  const maxStickers = node.maxStickers ?? 3
  const background = node.backgroundOptions.find((item) => item.id === state.backgroundId)
  const headline = node.headlineOptions.find((item) => item.id === state.headlineId)
  const proof = node.proofTextOptions.find((item) => item.id === state.proofTextId)
  const textColor = node.textColorOptions.find((item) => item.id === state.textColorId)
  const selectedStickers = node.stickerOptions.filter((item) => state.stickerIds.includes(item.id))
  const riskyColor = Boolean(textColor?.riskyOn?.includes(state.backgroundId))
  const canSubmit = Boolean(background && headline && proof && textColor && state.rationale.trim().length >= 30 && !riskyColor)
  const save = (next: CampaignState) => setFreeTextResponse(node.id, serializeState(next))
  const toggleSticker = (id: string) => {
    const active = state.stickerIds.includes(id)

    if (active) {
      const stickerIds = state.stickerIds.filter((item) => item !== id)
      const stickerPlacements = Object.fromEntries(Object.entries(state.stickerPlacements).filter(([stickerId]) => stickerId !== id))
      const stickerSizes = Object.fromEntries(Object.entries(state.stickerSizes).filter(([stickerId]) => stickerId !== id))
      save({ ...state, stickerIds, stickerPlacements, stickerSizes })
      return
    }

    if (state.stickerIds.length >= maxStickers) return

    const nextPlacement = defaultStickerPlacements[state.stickerIds.length] ?? { x: 50, y: 50 }
    const stickerPlacements = state.stickerPlacements[id] ? state.stickerPlacements : { ...state.stickerPlacements, [id]: nextPlacement }
    const stickerSizes = typeof state.stickerSizes[id] === 'number' ? state.stickerSizes : { ...state.stickerSizes, [id]: DEFAULT_STICKER_SIZE }
    save({ ...state, stickerIds: [...state.stickerIds, id], stickerPlacements, stickerSizes })
  }

  const placeSticker = (id: string, axis: 'x' | 'y', value: number) => {
    const current = state.stickerPlacements[id] ?? defaultStickerPlacements[state.stickerIds.indexOf(id)] ?? { x: 50, y: 50 }
    save({
      ...state,
      stickerPlacements: {
        ...state.stickerPlacements,
        [id]: { ...current, [axis]: value },
      },
    })
  }

  const resizeSticker = (id: string, value: number) => {
    save({
      ...state,
      stickerSizes: {
        ...state.stickerSizes,
        [id]: value,
      },
    })
  }

  const getStickerSize = (id: string) => clamp(numberOrDefault(state.stickerSizes[id], DEFAULT_STICKER_SIZE), STICKER_SIZE_MIN, STICKER_SIZE_MAX)

  const placeStickerFromPoint = (id: string, clientX: number, clientY: number) => {
    const rect = postRef.current?.getBoundingClientRect()
    if (!rect) return
    save({
      ...state,
      stickerPlacements: {
        ...state.stickerPlacements,
        [id]: {
          x: clamp(((clientX - rect.left) / rect.width) * 100, 4, 96),
          y: clamp(((clientY - rect.top) / rect.height) * 100, 4, 96),
        },
      },
    })
  }

  const startStickerDrag = (id: string, event: ReactPointerEvent<HTMLImageElement | HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    placeStickerFromPoint(id, event.clientX, event.clientY)

    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault()
      placeStickerFromPoint(id, moveEvent.clientX, moveEvent.clientY)
    }
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  const optionButton = (
    active: boolean,
    label: string,
    onClick: () => void,
    media?: { swatch?: string; assetPath?: string; aspect?: string },
  ) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        border: active ? '2px solid #3A6B5E' : '1px solid #CDBF94',
        background: active ? '#EFE8D2' : '#FBF7EA',
        color: '#1E1E1A',
        borderRadius: 7,
        padding: '0.55rem',
        cursor: 'pointer',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {media?.assetPath && (
        <img
          src={media.assetPath}
          alt=""
          style={{
            width: media.aspect === '4 / 5' ? 28 : 30,
            height: media.aspect === '4 / 5' ? 36 : 30,
            objectFit: 'cover',
            border: '1px solid #1E1E1A',
            borderRadius: 4,
            background: '#fff',
            flexShrink: 0,
          }}
        />
      )}
      {!media?.assetPath && media?.swatch && <span style={{ width: 20, height: 20, background: media.swatch, border: '1px solid #1E1E1A', borderRadius: 4, flexShrink: 0 }} />}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 900 }}>{label}</span>
      </span>
    </button>
  )

  const sizeSlider = (label: string, value: number, min: number, max: number, onChange: (value: number) => void, unit = 'px') => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.74rem', fontWeight: 800, color: '#1E1E1A' }}>
      <span style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span>{label}</span>
        <span>{value}{unit}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        style={{ width: '100%', accentColor: '#3A6B5E' }}
      />
    </label>
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
        <div style={{ backgroundColor: '#FBF7EA', border: '1px solid #CDBF94', padding: '0.85rem 1rem', fontSize: '0.875rem', lineHeight: 1.55 }}>
          <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.45rem' }}>
            Guidance
          </div>
          <div style={{ fontWeight: 700 }}>
            {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
          </div>
          {node.referenceContent && (
            <div style={{ marginTop: '0.7rem', display: 'grid', gridTemplateColumns: 'minmax(8rem, 0.24fr) 1fr', gap: '0.75rem', alignItems: 'start', borderTop: '1px solid #CDBF94', paddingTop: '0.7rem' }}>
              <div style={{ fontSize: '0.78rem', color: '#3A6B5E', fontWeight: 900 }}>{node.referenceTitle || 'Reference'}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>
                {renderContentWithGlossary(interpolate(node.referenceContent, { playerName, branchFlags, mcSelections }))}
              </div>
            </div>
          )}
        </div>

        <WorkSurfaceFrame
          node={{ ...node, workSurface: node.workSurface ?? { kind: 'campaign_builder', device: 'desktop' } }}
          variant="figma"
          title={node.windowTitle ?? 'Campaign studio'}
          width="88%"
          height="91%"
          backgroundScale={1.16}
          backgroundOrigin="50% 38%"
          windowOffsetY="1.5%"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '190px minmax(280px, 1fr) 220px', minHeight: 620, height: '100%', background: '#F7F1E3' }}>
            <aside style={{ borderRight: '1px solid #CDBF94', padding: '0.875rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Theme color / background</div>
                {node.backgroundOptions.map((option) => optionButton(state.backgroundId === option.id, option.label, () => save({ ...state, backgroundId: option.id }), { assetPath: option.assetPath, swatch: option.thumbnailColor, aspect: '4 / 5' }))}
                {background?.warning && (
                  <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 6, padding: '0.55rem', fontSize: '0.72rem', lineHeight: 1.45, color: '#1E1E1A' }}>
                    <strong style={{ color: '#3A6B5E' }}>Theme read:</strong> {background.warning}
                  </div>
                )}
              </section>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Text color</div>
                {node.textColorOptions.map((option) => optionButton(state.textColorId === option.id, option.label, () => save({ ...state, textColorId: option.id }), { swatch: option.value }))}
              </section>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: '#FBF7EA', border: '1px solid #CDBF94', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Type size</div>
                {sizeSlider('Headline', state.headlineSize, TYPE_SIZE_MIN, 56, (headlineSize) => save({ ...state, headlineSize }))}
                {sizeSlider('Support', state.proofSize, TYPE_SIZE_MIN, 28, (proofSize) => save({ ...state, proofSize }))}
              </section>
            </aside>

            <main style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto' }}>
              <div ref={postRef} style={{ width: 'min(100%, 340px)', aspectRatio: '4 / 5', boxSizing: 'border-box', background: background?.thumbnailColor || '#EFE8D2', color: textColor?.value || '#1E1E1A', border: '2px solid #1E1E1A', boxShadow: '6px 6px 0 #000', position: 'relative', overflow: 'hidden', padding: '1.25rem', touchAction: 'none' }}>
                {background?.assetPath ? (
                  <img src={background.assetPath} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(145deg, transparent, ${background?.accentColor || '#F7F1E3'}55)`, pointerEvents: 'none' }} />
                )}
                <div style={{ position: 'relative', zIndex: 1, fontSize: state.headlineSize, fontWeight: 900, lineHeight: 1.08, maxWidth: '82%', textShadow: textColor?.id === 'white' || textColor?.id === 'cream' ? '0 1px 2px rgba(0,0,0,0.22)' : 'none' }}>
                  {headline?.text || 'Choose headline'}
                </div>
                <div style={{ position: 'relative', zIndex: 1, marginTop: '0.75rem', fontSize: state.proofSize, lineHeight: 1.35, maxWidth: '76%', textShadow: textColor?.id === 'white' || textColor?.id === 'cream' ? '0 1px 2px rgba(0,0,0,0.22)' : 'none' }}>
                  {proof?.text || 'Choose proof/support text'}
                </div>
                {selectedStickers.map((sticker, idx) => {
                  const placement = state.stickerPlacements[sticker.id] ?? defaultStickerPlacements[idx] ?? { x: 50, y: 50 }
                  const stickerSize = getStickerSize(sticker.id)
                  return sticker.assetPath ? (
                    <img
                      key={sticker.id}
                      src={sticker.assetPath}
                      alt=""
                      draggable={false}
                      onPointerDown={(event) => startStickerDrag(sticker.id, event)}
                      style={{
                        position: 'absolute',
                        left: `${placement.x}%`,
                        top: `${placement.y}%`,
                        width: `${stickerSize}%`,
                        transform: 'translate(-50%, -50%)',
                        objectFit: 'contain',
                        cursor: 'grab',
                        touchAction: 'none',
                        userSelect: 'none',
                        zIndex: 2,
                      }}
                    />
                  ) : (
                    <div
                      key={sticker.id}
                      onPointerDown={(event) => startStickerDrag(sticker.id, event)}
                      style={{
                        position: 'absolute',
                        left: `${placement.x}%`,
                        top: `${placement.y}%`,
                        transform: `translate(-50%, -50%) scale(${stickerSize / DEFAULT_STICKER_SIZE})`,
                        background: sticker.relevance === 'aligned' ? '#F7F1E3' : '#D2A39A',
                        color: '#1E1E1A',
                        border: '1px solid #1E1E1A',
                        borderRadius: 999,
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        cursor: 'grab',
                        touchAction: 'none',
                        userSelect: 'none',
                        zIndex: 2,
                      }}
                    >
                      {sticker.label}
                    </div>
                  )
                })}
              </div>
            </main>

            <aside style={{ borderLeft: '1px solid #CDBF94', padding: '0.875rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#EFE8D2' }}>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Headline</div>
                {node.headlineOptions.map((option) => optionButton(state.headlineId === option.id, option.label, () => save({ ...state, headlineId: option.id })))}
              </section>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Support text</div>
                {node.proofTextOptions.map((option) => optionButton(state.proofTextId === option.id, option.label, () => save({ ...state, proofTextId: option.id })))}
              </section>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Stickers ({state.stickerIds.length}/{maxStickers})</div>
                {node.stickerOptions.map((option) => optionButton(state.stickerIds.includes(option.id), option.label, () => toggleSticker(option.id), { assetPath: option.assetPath }))}
              </section>
              {selectedStickers.length > 0 && (
                <section style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: '#FBF7EA', border: '1px solid #CDBF94', borderRadius: 8, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Sticker placement</div>
                  {selectedStickers.map((sticker, idx) => {
                    const placement = state.stickerPlacements[sticker.id] ?? defaultStickerPlacements[idx] ?? { x: 50, y: 50 }
                    const stickerSize = getStickerSize(sticker.id)
                    return (
                      <div key={sticker.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ fontSize: '0.74rem', fontWeight: 800 }}>{sticker.label}</div>
                        {sizeSlider('X', Math.round(placement.x), 12, 88, (x) => placeSticker(sticker.id, 'x', x), '%')}
                        {sizeSlider('Y', Math.round(placement.y), 12, 88, (y) => placeSticker(sticker.id, 'y', y), '%')}
                        {sizeSlider('Size', Math.round(stickerSize), STICKER_SIZE_MIN, STICKER_SIZE_MAX, (size) => resizeSticker(sticker.id, size), '%')}
                      </div>
                    )
                  })}
                </section>
              )}
              {riskyColor && <div style={{ border: '1px solid #B87D6B', background: '#F3DDD6', padding: '0.6rem', borderRadius: 6, fontSize: '0.74rem', color: '#1E1E1A' }}>Text color is risky on the selected background. Pick a more readable pairing.</div>}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 800 }}>
                Rationale
                <textarea
                  value={state.rationale}
                  onChange={(e) => save({ ...state, rationale: e.target.value })}
                  placeholder={node.rationalePlaceholder ?? node.rationalePrompt ?? 'Explain why this concept matches the strategy.'}
                  rows={4}
                  style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 7, padding: '0.6rem', resize: 'vertical', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.8rem', lineHeight: 1.45 }}
                />
              </label>
              <ActionButton text="Submit" onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
              {import.meta.env.DEV && <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />}
            </aside>
          </div>
        </WorkSurfaceFrame>
      </motion.div>
    </SceneWrapper>
  )
}
