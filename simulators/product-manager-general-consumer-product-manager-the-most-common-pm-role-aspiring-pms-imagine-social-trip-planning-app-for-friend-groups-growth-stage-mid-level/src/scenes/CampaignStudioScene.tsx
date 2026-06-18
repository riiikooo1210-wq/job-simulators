import { useMemo } from 'react'
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
  stickerIds: string[]
  rationale: string
}

function parseState(raw: string | undefined): CampaignState {
  if (!raw) return { backgroundId: '', headlineId: '', proofTextId: '', textColorId: '', stickerIds: [], rationale: '' }
  try {
    const parsed = JSON.parse(raw)
    return {
      backgroundId: typeof parsed.backgroundId === 'string' ? parsed.backgroundId : '',
      headlineId: typeof parsed.headlineId === 'string' ? parsed.headlineId : '',
      proofTextId: typeof parsed.proofTextId === 'string' ? parsed.proofTextId : '',
      textColorId: typeof parsed.textColorId === 'string' ? parsed.textColorId : '',
      stickerIds: Array.isArray(parsed.stickerIds) ? parsed.stickerIds.filter((id: unknown) => typeof id === 'string') : [],
      rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
    }
  } catch {
    return { backgroundId: '', headlineId: '', proofTextId: '', textColorId: '', stickerIds: [], rationale: '' }
  }
}

function serializeState(state: CampaignState) {
  return JSON.stringify(state, null, 2)
}

export default function CampaignStudioScene({ node }: { node: CampaignStudioNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()

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
    const stickerIds = active
      ? state.stickerIds.filter((item) => item !== id)
      : state.stickerIds.length < maxStickers
        ? [...state.stickerIds, id]
        : state.stickerIds
    save({ ...state, stickerIds })
  }

  const optionButton = (
    active: boolean,
    label: string,
    onClick: () => void,
    warning?: string,
    swatch?: string,
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
        alignItems: 'flex-start',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {swatch && <span style={{ width: 20, height: 20, background: swatch, border: '1px solid #1E1E1A', borderRadius: 4, flexShrink: 0 }} />}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 900 }}>{label}</span>
        {warning && <span style={{ display: 'block', fontSize: '0.66rem', color: '#B87D6B', lineHeight: 1.35, marginTop: 2 }}>{warning}</span>}
      </span>
    </button>
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
        <div style={{ backgroundColor: '#FBF7EA', border: '1px solid #CDBF94', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
          {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
        </div>

        <WorkSurfaceFrame
          node={{ ...node, workSurface: node.workSurface ?? { kind: 'campaign_builder', device: 'desktop' } }}
          variant="figma"
          title={node.windowTitle ?? 'Campaign studio'}
          width="86%"
          height="80%"
        >
          <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0,1fr) 260px', minHeight: 620, background: '#F7F1E3' }}>
            <aside style={{ borderRight: '1px solid #CDBF94', padding: '0.875rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {node.referenceContent && (
                <section style={{ background: '#FBF7EA', border: '1px solid #CDBF94', borderRadius: 8, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    {node.referenceTitle || 'Reference'}
                  </div>
                  <div style={{ fontSize: '0.74rem', lineHeight: 1.48, whiteSpace: 'pre-wrap' }}>
                    {renderContentWithGlossary(interpolate(node.referenceContent, { playerName, branchFlags, mcSelections }))}
                  </div>
                </section>
              )}
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Background</div>
                {node.backgroundOptions.map((option) => optionButton(state.backgroundId === option.id, option.label, () => save({ ...state, backgroundId: option.id }), option.warning, option.thumbnailColor))}
              </section>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Text color</div>
                {node.textColorOptions.map((option) => optionButton(state.textColorId === option.id, option.label, () => save({ ...state, textColorId: option.id }), option.riskyOn?.includes(state.backgroundId) ? 'Risky on selected background' : undefined, option.value))}
              </section>
            </aside>

            <main style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto' }}>
              <div style={{ width: 'min(100%, 390px)', aspectRatio: '4 / 5', background: background?.thumbnailColor || '#EFE8D2', color: textColor?.value || '#1E1E1A', border: '2px solid #1E1E1A', boxShadow: '6px 6px 0 #000', position: 'relative', overflow: 'hidden', padding: '1.25rem' }}>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(145deg, transparent, ${background?.accentColor || '#F7F1E3'}55)`, pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1, fontSize: '1.65rem', fontWeight: 900, lineHeight: 1.08, maxWidth: '82%' }}>
                  {headline?.text || 'Choose headline'}
                </div>
                <div style={{ position: 'relative', zIndex: 1, marginTop: '0.75rem', fontSize: '0.9rem', lineHeight: 1.35, maxWidth: '76%' }}>
                  {proof?.text || 'Choose proof/support text'}
                </div>
                {selectedStickers.map((sticker, idx) => (
                  <div
                    key={sticker.id}
                    style={{
                      position: 'absolute',
                      right: `${12 + (idx % 2) * 22}%`,
                      bottom: `${14 + idx * 12}%`,
                      background: sticker.relevance === 'aligned' ? '#F7F1E3' : '#D2A39A',
                      color: '#1E1E1A',
                      border: '1px solid #1E1E1A',
                      borderRadius: 999,
                      padding: '0.35rem 0.55rem',
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      zIndex: 2,
                    }}
                  >
                    {sticker.label}
                  </div>
                ))}
              </div>
            </main>

            <aside style={{ borderLeft: '1px solid #CDBF94', padding: '0.875rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#EFE8D2' }}>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Headline</div>
                {node.headlineOptions.map((option) => optionButton(state.headlineId === option.id, option.label, () => save({ ...state, headlineId: option.id }), option.warning))}
              </section>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Support text</div>
                {node.proofTextOptions.map((option) => optionButton(state.proofTextId === option.id, option.label, () => save({ ...state, proofTextId: option.id }), option.warning))}
              </section>
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Stickers ({state.stickerIds.length}/{maxStickers})</div>
                {node.stickerOptions.map((option) => optionButton(state.stickerIds.includes(option.id), option.label, () => toggleSticker(option.id), option.warning))}
              </section>
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
              <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
            </aside>
          </div>
        </WorkSurfaceFrame>
      </motion.div>
    </SceneWrapper>
  )
}
