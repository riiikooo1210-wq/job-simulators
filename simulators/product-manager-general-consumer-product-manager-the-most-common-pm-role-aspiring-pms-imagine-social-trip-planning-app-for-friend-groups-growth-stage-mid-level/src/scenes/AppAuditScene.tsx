import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import AppAuditCompanionPanel from '../components/ui/AppAuditCompanionPanel'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { storyline } from '../data/storyline'
import type { AppAuditAction, AppAuditNode, AppAuditObservation, AppAuditScreen, AppAuditScreenSection, SourceWorkspaceApp } from '../types/game'

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

function ActionResultCard({ action }: { action: AppAuditAction }) {
  return (
    <section
      style={{
        border: '1px solid #000',
        background: '#EFE8D2',
        borderRadius: 8,
        padding: '0.65rem',
        boxShadow: '2px 2px 0 #000',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>
        {action.resultTitle}
      </div>
      <div style={{ fontSize: '0.78rem', lineHeight: 1.45, color: '#1E1E1A' }}>{action.resultBody}</div>
      {action.resultItems && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {action.resultItems.map((item) => {
            const style = statusStyles[item.status ?? 'pending']
            return (
              <div
                key={`${action.id}-${item.label}`}
                style={{
                  border: '1px solid #CDBF94',
                  background: '#FBF7EA',
                  borderRadius: 6,
                  padding: '0.45rem',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: '0.35rem',
                  alignItems: 'start',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#1E1E1A' }}>{item.label}</div>
                  {item.detail && <div style={{ fontSize: '0.68rem', color: '#6A604B', marginTop: 1 }}>{item.detail}</div>}
                </div>
                <span
                  style={{
                    background: style.bg,
                    color: style.fg,
                    border: '1px solid #CDBF94',
                    borderRadius: 999,
                    padding: '0.12rem 0.35rem',
                    fontSize: '0.56rem',
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
    </section>
  )
}

function PhonePreview({
  appName,
  screen,
  activeAction,
  onAction,
}: {
  appName: string
  screen: AppAuditScreen
  activeAction?: AppAuditAction
  onAction: (action: AppAuditAction) => void
}) {
  return (
    <div
      style={{
        width: 'min(100%, 300px)',
        height: '100%',
        maxHeight: 590,
        minHeight: 0,
        background: '#1E1E1A',
        border: '2px solid #000',
        borderRadius: 26,
        padding: '0.55rem',
        boxShadow: 'none',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          background: '#F7F1E3',
          border: '1px solid #CDBF94',
          borderRadius: 20,
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

        <div
          style={{
            padding: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
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

          {screen.textBoxPlaceholder && (
            <div
              style={{
                border: '1px solid #CDBF94',
                background: '#FBF7EA',
                borderRadius: 8,
                minHeight: 118,
                padding: '0.7rem',
                color: '#8A8069',
                fontSize: '0.78rem',
                lineHeight: 1.45,
                boxSizing: 'border-box',
              }}
            >
              {screen.textBoxPlaceholder}
            </div>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {screen.primaryAction && !screen.actions?.length && (
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
            {screen.actions?.map((action) => {
              const selected = activeAction?.id === action.id
              return (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => onAction(action)}
                  style={{
                    border: '2px solid #000',
                    background: selected ? '#DCE6D2' : '#3A6B5E',
                    color: selected ? '#1E1E1A' : '#F2EBD9',
                    borderRadius: 6,
                    padding: '0.72rem',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    cursor: 'pointer',
                    boxShadow: '2px 2px 0 #000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.55rem',
                  }}
                >
                  <span>{action.label}</span>
                  <span
                    style={{
                      background: selected ? '#F7F1E3' : '#F2EBD9',
                      color: '#1E1E1A',
                      border: '1px solid #000',
                      borderRadius: 999,
                      padding: '0.1rem 0.35rem',
                      fontSize: '0.56rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                    }}
                  >
                    Try
                  </span>
                </button>
              )
            })}
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
            {activeAction && <ActionResultCard action={activeAction} />}
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
  onFocus,
  onChange,
}: {
  item: AppAuditObservation
  value: string
  active: boolean
  onFocus: () => void
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
    </section>
  )
}

function formatAnalyticsColumnLabel(column: string) {
  return column.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatAnalyticsCell(value: string | undefined) {
  return value ? value.replace(/_/g, ' ') : ''
}

function findKickoffAnalyticsApp(): SourceWorkspaceApp | undefined {
  const kickoff = storyline.nodes.briefing_kickoff
  if (!kickoff || kickoff.type !== 'briefing') return undefined
  return kickoff.sourceWorkspace?.apps.find((app) => app.id === 'analytics' || app.title === 'Trip planning funnel')
}

function AnalyticsDisclosure({ app }: { app?: SourceWorkspaceApp }) {
  if (!app) return null
  const rows = app.rows || []
  const columns = app.columns || (rows[0] ? Object.keys(rows[0]).filter(Boolean) : [])
  if (!rows.length || !columns.length) return null

  return (
    <details
      data-testid="app-audit-analytics-reference"
      style={{
        border: '1px solid #000',
        background: '#FBF7EA',
        borderRadius: 8,
        boxShadow: '2px 2px 0 #000',
        overflow: 'hidden',
      }}
    >
      <summary
        role="button"
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          padding: '0.55rem 0.7rem',
          background: '#DCE6D2',
          color: '#1E1E1A',
          fontSize: '0.72rem',
          fontWeight: 900,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        View Analytics
      </summary>
      <div style={{ padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        <div>
          <div style={{ fontSize: '0.62rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>
            {app.label || app.kind}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#1E1E1A', marginTop: 2 }}>
            {app.title || 'Trip planning funnel'}
          </div>
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#E8DCC8' }}>
                {columns.map((column) => (
                  <th
                    key={column}
                    style={{
                      borderBottom: '1px solid #000',
                      borderRight: '1px solid #CDBF94',
                      padding: '0.35rem 0.4rem',
                      textAlign: 'left',
                      color: '#315D50',
                      fontWeight: 900,
                    }}
                  >
                    {formatAnalyticsColumnLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} style={{ background: index % 2 === 0 ? '#F7F1E3' : '#F2EBD9' }}>
                  {columns.map((column) => {
                    const isStatus = column.toLowerCase() === 'status'
                    return (
                      <td
                        key={column}
                        style={{
                          borderTop: '1px solid #E4D8B9',
                          borderRight: '1px solid #E4D8B9',
                          padding: '0.35rem 0.4rem',
                          color: isStatus ? '#3A6B5E' : '#1E1E1A',
                          fontWeight: isStatus ? 900 : 500,
                          lineHeight: 1.25,
                        }}
                      >
                        {formatAnalyticsCell(row[column])}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
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
  const [actionByScreen, setActionByScreen] = useState<Record<string, string>>({})
  const notes = useMemo(() => parseNotes(responses[node.bindingKey]), [responses, node.bindingKey])
  const activeScreen = node.screens.find((screen) => screen.id === activeScreenId) ?? node.screens[0]
  const activeAction = activeScreen?.actions?.find((action) => action.id === actionByScreen[activeScreen.id])
  const activeObservation = node.observations.find((item) => item.screenId === activeScreen?.id)
  const completedCount = node.observations.filter((item) => (notes[item.id] || '').trim().length > 0).length
  const requiredCount = node.minCompleted ?? node.observations.length
  const canContinue = completedCount >= requiredCount
  const analyticsApp = useMemo(() => findKickoffAnalyticsApp(), [])

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

        <DesktopOverlay width="86%" height="84%">
          <div
            data-testid="app-audit-laptop"
            style={{
              height: '100%',
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 0.82fr) minmax(210px, 0.8fr) minmax(170px, 0.64fr)',
              gap: '0.35rem',
              alignItems: 'stretch',
            }}
          >
            <div
              data-testid="app-audit-work-window"
              data-scrollable="true"
              style={{ minHeight: 0, display: 'flex', transform: 'translateX(3.25rem)' }}
            >
              <LaptopFrame variant="notion" title="Roamly current-flow audit" fill scrollable>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <AnalyticsDisclosure app={analyticsApp} />
                  <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
                      Current flow steps
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))', gap: '0.45rem' }}>
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
                              boxShadow: active ? '2px 2px 0 #000' : 'none',
                              borderRadius: 7,
                              padding: '0.5rem',
                              cursor: 'pointer',
                              fontFamily: 'Inter, system-ui, sans-serif',
                              minHeight: 76,
                            }}
                          >
                            <span style={{ display: 'block', fontSize: '0.62rem', color: '#3A6B5E', fontWeight: 900 }}>
                              {screen.stepLabel}
                            </span>
                            <span style={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.25, color: '#1E1E1A', fontWeight: 900, marginTop: 2 }}>
                              {screen.title}
                            </span>
                            {screen.actions?.[0] && (
                              <span style={{ display: 'block', fontSize: '0.6rem', lineHeight: 1.2, color: '#7B3D32', fontWeight: 900, marginTop: 5 }}>
                                Try: {screen.actions[0].label}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  <section style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
                      Audit notes {completedCount}/{requiredCount}
                    </div>
                    {node.observations.map((item) => (
                      <ObservationCard
                        key={item.id}
                        item={item}
                        value={notes[item.id] || ''}
                        active={item.screenId === activeScreen.id}
                        onFocus={() => setActiveScreenId(item.screenId)}
                        onChange={(value) => saveNote(item.id, value)}
                      />
                    ))}
                  </section>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
                    <ActionButton
                      text="Save audit notes"
                      onClick={() => {
                        setSceneCompleted(node.id)
                        goNext(node)
                      }}
                      disabled={!canContinue}
                      variant={canContinue ? 'primary' : 'secondary'}
                    />
                    <ActionButton
                      text="Skip (dev)"
                      onClick={() => {
                        setSceneCompleted(node.id)
                        goNext(node)
                      }}
                      variant="secondary"
                      fullWidth={false}
                    />
                  </div>
                </div>
              </LaptopFrame>
            </div>

            <main
              data-testid="app-audit-phone-window"
              style={{
                minHeight: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                transform: 'translateX(0.125rem)',
              }}
            >
              <PhonePreview
                appName={node.appName || 'Roamly'}
                screen={activeScreen}
                activeAction={activeAction}
                onAction={(action) => setActionByScreen((cur) => ({ ...cur, [activeScreen.id]: action.id }))}
              />
            </main>
            {node.companion && (
              <div data-testid="app-audit-companion-window" style={{ minHeight: 0, display: 'flex', transform: 'translateX(-3.25rem)' }}>
                <AppAuditCompanionPanel
                  node={node}
                  companion={node.companion}
                  screen={activeScreen}
                  action={activeAction}
                  observation={activeObservation}
                  note={activeObservation ? notes[activeObservation.id] || '' : ''}
                />
              </div>
            )}
          </div>
        </DesktopOverlay>
      </motion.div>
    </SceneWrapper>
  )
}
