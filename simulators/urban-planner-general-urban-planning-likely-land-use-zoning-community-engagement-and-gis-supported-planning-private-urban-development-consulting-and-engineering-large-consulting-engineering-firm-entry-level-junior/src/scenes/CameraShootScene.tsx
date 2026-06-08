import { useMemo } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { CameraShootNode } from '../types/game'

type SlateItem = Record<string, string>

interface ShootState {
  selectedBeatIds: string[]
  transcript: string
  caption: string
  selectedSlateIndex: number
}

function parseState(raw: string | undefined): ShootState {
  if (!raw) return { selectedBeatIds: [], transcript: '', caption: '', selectedSlateIndex: 0 }
  try {
    const parsed = JSON.parse(raw)
    return {
      selectedBeatIds: Array.isArray(parsed.selectedBeatIds) ? parsed.selectedBeatIds : [],
      transcript: typeof parsed.transcript === 'string' ? parsed.transcript : typeof parsed.rawTranscript === 'string' ? parsed.rawTranscript : '',
      caption: typeof parsed.caption === 'string' ? parsed.caption : '',
      selectedSlateIndex: typeof parsed.selectedSlateIndex === 'number' ? parsed.selectedSlateIndex : 0,
    }
  } catch {
    return { selectedBeatIds: [], transcript: '', caption: '', selectedSlateIndex: 0 }
  }
}

function parseSlate(raw: string | undefined): SlateItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : []
  } catch {
    return []
  }
}

function serializeState(state: ShootState) {
  return JSON.stringify(state, null, 2)
}

export default function CameraShootScene({ node }: { node: CameraShootNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()

  const state = useMemo(() => parseState(responses[node.bindingKey]), [responses, node.bindingKey])
  const slateItems = useMemo(() => parseSlate(node.sourceBindingKey ? responses[node.sourceBindingKey] : undefined), [responses, node.sourceBindingKey])
  const selectedSlate = slateItems[state.selectedSlateIndex] || slateItems[0]
  const minBeats = node.minSelectedBeats ?? Math.min(3, node.beats.length)
  const canSubmit = state.selectedBeatIds.length >= minBeats && state.transcript.trim().length >= 20 && state.caption.trim().length >= 20

  const save = (next: ShootState) => setFreeTextResponse(node.bindingKey, serializeState(next))
  const toggleBeat = (beatId: string) => {
    const selected = state.selectedBeatIds.includes(beatId)
      ? state.selectedBeatIds.filter((id) => id !== beatId)
      : [...state.selectedBeatIds, beatId]
    save({ ...state, selectedBeatIds: selected })
  }

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

        <WorkSurfaceFrame
          node={{ ...node, workSurface: node.workSurface ?? { kind: 'camera_shoot', device: 'phone' } }}
          title={node.windowTitle ?? 'Creator camera'}
          device="phone"
        >
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', background: '#F7F1E3' }}>
            <div style={{ aspectRatio: '9 / 12', background: '#1E1E1A', color: '#F2EBD9', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 800 }}>
                <span>REC DRAFT</span>
                <span>{node.maxSeconds ?? 120}s max</span>
              </div>
              <div style={{ border: '1px dashed rgba(242,235,217,0.55)', borderRadius: 12, padding: '1rem', textAlign: 'center', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Use your selected beats as the shot list, then write or paste the rough spoken transcript below.
              </div>
              <div style={{ height: 38, borderRadius: 999, border: '1px solid #D2A39A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D2A39A', fontWeight: 900 }}>
                Transcript Capture
              </div>
            </div>

            <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {slateItems.length > 0 && (
                <section style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 8, padding: '0.7rem' }}>
                  <label style={{ display: 'block', fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    Filming reference
                  </label>
                  <select
                    value={state.selectedSlateIndex}
                    onChange={(e) => save({ ...state, selectedSlateIndex: Number(e.target.value) })}
                    style={{ width: '100%', border: '1px solid #CDBF94', background: '#F7F1E3', padding: '0.45rem', borderRadius: 6, fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    {slateItems.map((_item, idx) => (
                      <option key={idx} value={idx}>Content idea #{idx + 1}</option>
                    ))}
                  </select>
                </section>
              )}

              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>
                  Shot beats ({state.selectedBeatIds.length}/{minBeats} required)
                </div>
                {node.beats.map((beat) => {
                  const active = state.selectedBeatIds.includes(beat.id)
                  const sourceText = beat.sourceField && selectedSlate ? selectedSlate[beat.sourceField] : ''
                  return (
                    <button
                      key={beat.id}
                      onClick={() => toggleBeat(beat.id)}
                      style={{ textAlign: 'left', border: active ? '2px solid #3A6B5E' : '1px solid #CDBF94', background: active ? '#EFE8D2' : '#FBF7EA', borderRadius: 8, padding: '0.65rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 900 }}>{beat.label}</span>
                      <span style={{ display: 'block', fontSize: '0.74rem', lineHeight: 1.45, marginTop: 3 }}>{beat.prompt}</span>
                      {sourceText && <span style={{ display: 'block', fontSize: '0.7rem', color: '#6A604B', marginTop: 5 }}>Slate: {sourceText}</span>}
                    </button>
                  )
                })}
              </section>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 800 }}>
                Rough spoken transcript
                <textarea
                  value={state.transcript}
                  onChange={(e) => save({ ...state, transcript: e.target.value })}
                  rows={5}
                  placeholder="Paste or type the rough take transcript..."
                  style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 8, padding: '0.65rem', resize: 'vertical', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', lineHeight: 1.5 }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 800 }}>
                Caption / export note
                <textarea
                  value={state.caption}
                  onChange={(e) => save({ ...state, caption: e.target.value })}
                  rows={4}
                  placeholder={node.captionPrompt}
                  style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 8, padding: '0.65rem', resize: 'vertical', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', lineHeight: 1.5 }}
                />
              </label>
              <ActionButton text="Submit" onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
              {import.meta.env.DEV && <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />}
            </div>
          </div>
        </WorkSurfaceFrame>
      </motion.div>
    </SceneWrapper>
  )
}
