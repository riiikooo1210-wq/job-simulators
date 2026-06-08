import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { AppAuditNode, AppAuditObservation, AppAuditScreen, AppAuditScreenSection } from '../types/game'

interface Props {
  node: AppAuditNode
}

type AuditNotes = Record<string, string>

const statusStyles = {
  complete: { bg: '#DCE6D2', fg: '#315D50', label: 'Complete' },
  pending: { bg: '#EFE8D2', fg: '#6A604B', label: 'Pending' },
  quiet: { bg: '#F2EBD9', fg: '#6A604B', label: 'No response' },
  warning: { bg: '#E8D0C7', fg: '#7B3D32', label: 'Needs attention' },
}

function parseNotes(raw: string | undefined): AuditNotes {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function toneStyle(tone: AppAuditScreenSection['tone']) {
  if (tone === 'warning') return { border: '#B87D6B', bg: '#F4E2D9' }
  if (tone === 'success') return { border: '#8EA977', bg: '#E5EBD7' }
  return { border: '#CDBF94', bg: '#FBF7EA' }
}

function PhonePreview({ appName, screen }: { appName: string; screen: AppAuditScreen }) {
  return (
    <div
      style={{
        width: 'min(100%, 330px)',
        minHeight: 610,
        background: '#1E1E1A',
        border: '2px solid #000',
        borderRadius: 30,
        padding: '0.7rem',
        boxShadow: '6px 6px 0 #000',
      }}
    >
      <div
        style={{
          minHeight: 586,
          background: '#F7F1E3',
          border: '1px solid #CDBF94',
          borderRadius: 23,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #CDBF94',
            background: '#EFE8D2',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
              {appName}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#1E1E1A' }}>{screen.title}</div>
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6A604B', textAlign: 'right' }}>
            {screen.stepLabel}
          </div>
        </div>

        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
          {screen.subtitle && (
            <div style={{ fontSize: '0.85rem', lineHeight: 1.5, color: '#4B4538' }}>{screen.subtitle}</div>
          )}

          {screen.progressLabel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
                {screen.progressLabel}
              </div>
              <div style={{ height: 8, background: '#EFE8D2', border: '1px solid #CDBF94', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: '38%', height: '100%', background: '#6B9EA6' }} />
              </div>
            </div>
          )}

          {screen.chips && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {screen.chips.map((chip) => (
                <span
                  key={chip}
                  style={{
                    border: '1px solid #CDBF94',
                    background: '#FBF7EA',
                    borderRadius: 999,
                    padding: '0.3rem 0.45rem',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: '#3A6B5E',
                  }}
                >
                  {chip}
                </span>
              ))}
            </div>
          )}

          {screen.sections?.map((section) => {
            const style = toneStyle(section.tone)
            return (
              <section
                key={`${screen.id}-${section.label}`}
                style={{
                  border: `1px solid ${style.border}`,
                  background: style.bg,
                  borderRadius: 8,
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
                  {section.label}
                </div>
                <div style={{ fontSize: '0.82rem', lineHeight: 1.45, color: '#1E1E1A' }}>{section.body}</div>
              </section>
            )
          })}

          {screen.listItems && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {screen.listItems.map((item) => {
                const style = statusStyles[item.status ?? 'pending']
                return (
                  <div
                    key={`${screen.id}-${item.label}`}
                    style={{
                      border: '1px solid #CDBF94',
                      background: '#FBF7EA',
                      borderRadius: 8,
                      padding: '0.65rem',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: '0.5rem',
                      alignItems: 'start',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1E1E1A' }}>{item.label}</div>
                      {item.detail && <div style={{ fontSize: '0.72rem', color: '#6A604B', marginTop: 2 }}>{item.detail}</div>}
                    </div>
                    <span
                      style={{
                        background: style.bg,
                        color: style.fg,
                        border: '1px solid #CDBF94',
                        borderRadius: 999,
                        padding: '0.18rem 0.4rem',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {style.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {screen.emptyStateTitle && (
            <div
              style={{
                marginTop: 'auto',
                border: '1px dashed #CDBF94',
                background: '#FBF7EA',
                borderRadius: 10,
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.35rem', marginBottom: '0.3rem' }}>+</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#1E1E1A' }}>{screen.emptyStateTitle}</div>
              {screen.emptyStateBody && (
                <div style={{ fontSize: '0.76rem', color: '#6A604B', lineHeight: 1.45, marginTop: '0.35rem' }}>
                  {screen.emptyStateBody}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {screen.primaryAction && (
              <button
                type="button"
                style={{
                  border: '1px solid #000',
                  background: '#3A6B5E',
                  color: '#F2EBD9',
                  borderRadius: 6,
                  padding: '0.72rem',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {screen.primaryAction}
              </button>
            )}
            {screen.secondaryAction && (
              <button
                type="button"
                style={{
                  border: '1px solid #CDBF94',
                  background: '#FBF7EA',
                  color: '#1E1E1A',
                  borderRadius: 6,
                  padding: '0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {screen.secondaryAction}
              </button>
            )}
            {screen.footerNote && <div style={{ fontSize: '0.68rem', color: '#6A604B', lineHeight: 1.35 }}>{screen.footerNote}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function ObservationCard({
  item,
  value,
  active,
  hintOpen,
  onFocus,
  onHint,
  onChange,
}: {
  item: AppAuditObservation
  value: string
  active: boolean
  hintOpen: boolean
  onFocus: () => void
  onHint: () => void
  onChange: (value: string) => void
}) {
  return (
    <section
      style={{
        border: `1px solid ${active ? '#000' : '#CDBF94'}`,
        boxShadow: active ? '3px 3px 0 #000' : 'none',
        background: '#FBF7EA',
        borderRadius: 8,
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1E1E1A' }}>{item.label}</div>
          {item.metricLink && (
            <div style={{ fontSize: '0.68rem', color: '#3A6B5E', fontWeight: 800, marginTop: 2 }}>{item.metricLink}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onFocus}
          style={{
            border: '1px solid #CDBF94',
            background: '#EFE8D2',
            borderRadius: 999,
            padding: '0.25rem 0.45rem',
            fontSize: '0.65rem',
            fontWeight: 900,
            color: '#3A6B5E',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          View screen
        </button>
      </div>
      <div style={{ fontSize: '0.75rem', lineHeight: 1.45, color: '#4B4538' }}>{item.prompt}</div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={item.placeholder}
        rows={3}
        style={{
          resize: 'vertical',
          border: '1px solid #CDBF94',
          background: '#F7F1E3',
          color: '#1E1E1A',
          borderRadius: 6,
          padding: '0.55rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.78rem',
          lineHeight: 1.45,
        }}
      />
      <button
        type="button"
        onClick={onHint}
        style={{
          alignSelf: 'flex-start',
          border: '1px solid #000',
          background: hintOpen ? '#E8DCC8' : '#F2EBD9',
          color: '#1E1E1A',
          borderRadius: 4,
          padding: '0.35rem 0.55rem',
          fontSize: '0.72rem',
          fontWeight: 900,
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {hintOpen ? 'Hide hint' : 'Show hint'}
      </button>
      {hintOpen && (
        <div
          style={{
            border: '1px solid #CDBF94',
            background: '#EFE8D2',
            borderRadius: 6,
            padding: '0.55rem',
            fontSize: '0.74rem',
            lineHeight: 1.45,
            color: '#1E1E1A',
          }}
        >
          {item.hint}
        </div>
      )}
    </section>
  )
}

export default function AppAuditScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const setSceneCompleted = useGameStore((s) => s.setSceneCompleted)
  const goNext = useGoNext()

  const [activeScreenId, setActiveScreenId] = useState(node.screens[0]?.id ?? '')
  const [openHints, setOpenHints] = useState<Record<string, boolean>>({})
  const notes = useMemo(() => parseNotes(responses[node.bindingKey]), [responses, node.bindingKey])
  const activeScreen = node.screens.find((screen) => screen.id === activeScreenId) ?? node.screens[0]
  const completedCount = node.observations.filter((item) => (notes[item.id] || '').trim().length > 0).length
  const requiredCount = node.minCompleted ?? node.observations.length
  const canContinue = completedCount >= requiredCount

  const saveNote = (id: string, value: string) => {
    setFreeTextResponse(node.bindingKey, JSON.stringify({ ...notes, [id]: value }, null, 2))
  }

  return (
    <SceneWrapper illustration={undefined} hideIllustration showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: '#555' }}>Section {node.section}</span>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, marginTop: '0.2rem' }}>{node.title}</h1>
        </div>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
        <div style={{ backgroundColor: '#FBF7EA', border: '1px solid #CDBF94', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 700 }}>
          {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: '1rem',
            alignItems: 'start',
          }}
        >
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {node.screens.map((screen) => {
                const active = screen.id === activeScreen.id
                return (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => setActiveScreenId(screen.id)}
                    style={{
                      textAlign: 'left',
                      border: `1px solid ${active ? '#000' : '#CDBF94'}`,
                      background: active ? '#EFE8D2' : '#FBF7EA',
                      boxShadow: active ? '3px 3px 0 #000' : 'none',
                      borderRadius: 7,
                      padding: '0.65rem',
                      cursor: 'pointer',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    <span style={{ display: 'block', fontSize: '0.66rem', color: '#3A6B5E', fontWeight: 900 }}>
                      {screen.stepLabel}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.78rem', lineHeight: 1.25, color: '#1E1E1A', fontWeight: 900, marginTop: 2 }}>
                      {screen.title}
                    </span>
                  </button>
                )
              })}
            </div>

            <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', marginTop: 0 }}>
              Audit notes {completedCount}/{requiredCount}
            </div>
            {node.observations.map((item) => (
              <ObservationCard
                key={item.id}
                item={item}
                value={notes[item.id] || ''}
                active={item.screenId === activeScreen.id}
                hintOpen={Boolean(openHints[item.id])}
                onFocus={() => setActiveScreenId(item.screenId)}
                onHint={() => setOpenHints((cur) => ({ ...cur, [item.id]: !cur[item.id] }))}
                onChange={(value) => saveNote(item.id, value)}
              />
            ))}
            <ActionButton
              text="Save audit notes"
              onClick={() => {
                setSceneCompleted(node.id)
                goNext(node)
              }}
              disabled={!canContinue}
              variant={canContinue ? 'primary' : 'secondary'}
            />
            {import.meta.env.DEV && (
              <ActionButton
                text="Skip (dev)"
                onClick={() => {
                  setSceneCompleted(node.id)
                  goNext(node)
                }}
                variant="secondary"
                fullWidth={false}
              />
            )}
          </aside>

          <main style={{ display: 'flex', justifyContent: 'center' }}>
            <PhonePreview appName={node.appName || 'Roamly'} screen={activeScreen} />
          </main>
        </div>
      </motion.div>
    </SceneWrapper>
  )
}
