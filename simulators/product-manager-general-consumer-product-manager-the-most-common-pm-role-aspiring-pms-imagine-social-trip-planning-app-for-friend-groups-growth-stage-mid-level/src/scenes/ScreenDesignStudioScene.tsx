import { useMemo } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { ScreenDesignStudioNode } from '../types/game'

interface DesignElement {
  id: string
  kind: string
  label: string
  x: number
  y: number
  w: number
  h: number
}

interface StudioState {
  elements: DesignElement[]
  notes: string
}

const components = [
  { kind: 'top_bar', label: 'Top bar', w: 84, h: 8, x: 8, y: 5 },
  { kind: 'screen_title', label: 'Screen title', w: 76, h: 9, x: 12, y: 15 },
  { kind: 'content_card', label: 'Content card', w: 78, h: 14, x: 11, y: 29 },
  { kind: 'secondary_card', label: 'Secondary card', w: 78, h: 13, x: 11, y: 46 },
  { kind: 'primary_button', label: 'Primary button', w: 72, h: 9, x: 14, y: 73 },
  { kind: 'secondary_button', label: 'Secondary button', w: 72, h: 9, x: 14, y: 83 },
  { kind: 'status_chip', label: 'Status chip', w: 34, h: 7, x: 54, y: 25 },
  { kind: 'tab_bar', label: 'Bottom nav', w: 84, h: 9, x: 8, y: 89 },
]

function parseState(raw: string | undefined): StudioState {
  if (!raw) return { elements: [], notes: '' }
  try {
    const parsed = JSON.parse(raw)
    return {
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
      notes: typeof parsed.notes === 'string' ? parsed.notes : '',
    }
  } catch {
    return { elements: [], notes: '' }
  }
}

function serializeState(state: StudioState) {
  return JSON.stringify(state, null, 2)
}

export default function ScreenDesignStudioScene({ node }: { node: ScreenDesignStudioNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()

  const state = useMemo(() => parseState(responses[node.bindingKey]), [responses, node.bindingKey])
  const minElements = node.minElements ?? 3
  const minNotesChars = node.minNotesChars ?? 20
  const canSubmit = state.elements.length >= minElements && state.notes.trim().length >= minNotesChars

  const save = (next: StudioState) => setFreeTextResponse(node.bindingKey, serializeState(next))
  const addElement = (component: typeof components[number]) => {
    save({
      ...state,
      elements: [
        ...state.elements,
        {
          id: `${component.kind}_${Date.now()}`,
          kind: component.kind,
          label: component.label,
          x: component.x,
          y: component.y,
          w: component.w,
          h: component.h,
        },
      ],
    })
  }
  const removeElement = (id: string) => save({ ...state, elements: state.elements.filter((item) => item.id !== id) })
  const updateNote = (notes: string) => save({ ...state, notes })

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
          node={{ ...node, workSurface: node.workSurface ?? { kind: 'screen_design_studio', device: 'desktop' } }}
          variant="figma"
          title={node.windowTitle ?? 'Screen mockup.fig'}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '190px minmax(0,1fr) 220px', minHeight: 560, background: '#F7F1E3' }}>
            <aside style={{ borderRight: '1px solid #CDBF94', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>Components</div>
              {components.map((component) => (
                <button
                  key={component.kind}
                  onClick={() => addElement(component)}
                  style={{ textAlign: 'left', background: '#FBF7EA', border: '1px solid #CDBF94', borderRadius: 6, padding: '0.5rem', cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, color: '#1E1E1A' }}>{component.label}</span>
                  <span style={{ display: 'block', fontSize: '0.66rem', color: '#6A604B', marginTop: 2 }}>Add to mobile screen</span>
                </button>
              ))}
            </aside>

            <main style={{ padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', overflow: 'auto' }}>
              <div style={{ width: 310, aspectRatio: '9 / 16', background: '#FBF7EA', border: '2px solid #1E1E1A', borderRadius: 24, position: 'relative', boxShadow: '5px 5px 0 #000', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', width: 72, height: 5, borderRadius: 999, background: '#1E1E1A', opacity: 0.85 }} />
                {state.elements.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => removeElement(item.id)}
                    title="Click to remove"
                    style={{
                      position: 'absolute',
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.w}%`,
                      height: `${item.h}%`,
                      background: item.kind.includes('button') ? '#3A6B5E' : '#EFE8D2',
                      color: item.kind.includes('button') ? '#F2EBD9' : '#1E1E1A',
                      border: '1px solid #1E1E1A',
                      borderRadius: item.kind.includes('button') || item.kind.includes('chip') ? 999 : 8,
                      fontSize: '0.62rem',
                      fontWeight: 800,
                      fontFamily: 'Inter, system-ui, sans-serif',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </main>

            <aside style={{ borderLeft: '1px solid #CDBF94', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#EFE8D2' }}>
              {node.referenceContent && (
                <section style={{ background: '#FBF7EA', border: '1px solid #CDBF94', padding: '0.75rem', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    {node.referenceTitle || 'Reference'}
                  </div>
                  <div style={{ fontSize: '0.75rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {renderContentWithGlossary(interpolate(node.referenceContent, { playerName, branchFlags, mcSelections }))}
                  </div>
                </section>
              )}
              <section style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E1E1A' }}>Implementation note</label>
                <textarea
                  value={state.notes}
                  onChange={(e) => updateNote(e.target.value)}
                  placeholder={node.notesPlaceholder ?? 'Explain the screen state, interaction, or handoff note a teammate would need.'}
                  rows={8}
                  style={{ resize: 'vertical', border: '1px solid #CDBF94', background: '#FBF7EA', color: '#1E1E1A', borderRadius: 6, padding: '0.65rem', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.82rem', lineHeight: 1.5 }}
                />
                <div style={{ fontSize: '0.7rem', color: '#6A604B' }}>
                  {state.elements.length}/{minElements} elements · {state.notes.trim().length}/{minNotesChars} note chars
                </div>
              </section>
              <ActionButton text="Submit" onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
              <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
            </aside>
          </div>
        </WorkSurfaceFrame>
      </motion.div>
    </SceneWrapper>
  )
}
