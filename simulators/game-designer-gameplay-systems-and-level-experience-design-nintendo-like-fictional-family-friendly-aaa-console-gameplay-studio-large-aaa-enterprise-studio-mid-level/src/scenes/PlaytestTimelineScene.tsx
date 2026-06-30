import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { PlaytestTimelineEvent, PlaytestTimelineNode } from '../types/game'

interface TimelineState {
  viewedEventIds: string[]
}

type ObservationRow = {
  id: string
  tester: string
  conclusion_with_evidence: string
}

const WATCHLIST_LABELS: Record<string, string> = {
  observed_behavior: 'Behavior to watch',
  success_signal: 'Success signal',
  failure_signal: 'Confusion signal',
  ignore_noise: 'Do not over-read',
}

const DEFAULT_MONITOR_SCREEN = {
  leftPct: 13.8,
  topPct: 7.4,
  widthPct: 47.2,
  heightPct: 61,
}

function parseTimelineState(raw: string | undefined): TimelineState {
  if (!raw) return { viewedEventIds: [] }
  try {
    const parsed = JSON.parse(raw)
    return {
      viewedEventIds: Array.isArray(parsed.viewedEventIds) ? parsed.viewedEventIds : [],
    }
  } catch {
    return { viewedEventIds: [] }
  }
}

function parseObservationRows(raw: string | undefined, node: PlaytestTimelineNode): ObservationRow[] {
  const fallback = node.observationItems.map((item) => ({
    id: item.id,
    tester: item.tester,
    conclusion_with_evidence: '',
  }))
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return fallback
    return fallback.map((base) => {
      const match = parsed.find((item) => item && typeof item === 'object' && (item.id === base.id || item.tester === base.tester))
      if (!match || typeof match !== 'object') return base
      const record = match as Record<string, unknown>
      const migratedNote = [
        typeof record.observed_behavior === 'string' ? record.observed_behavior : '',
        typeof record.signal_read === 'string' ? record.signal_read : '',
        typeof record.triage_implication === 'string' ? record.triage_implication : '',
      ].filter((value) => value.trim()).join('\n')
      return {
        ...base,
        conclusion_with_evidence:
          typeof record.conclusion_with_evidence === 'string'
            ? record.conclusion_with_evidence
            : migratedNote,
      }
    })
  } catch {
    return fallback
  }
}

function parseWatchlist(raw: string | undefined) {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((item) => item && typeof item === 'object') as Record<string, string>[]
    if (parsed && typeof parsed === 'object') return [parsed as Record<string, string>]
  } catch {
    return [{ response: raw }]
  }
  return []
}

function PlaytestMomentStage({ event, children }: { event: PlaytestTimelineEvent; children?: ReactNode }) {
  const [imageFailed, setImageFailed] = useState(false)
  const showImage = Boolean(event.image && !imageFailed)
  const playerX = event.focusX ?? 28
  const playerY = event.focusY ?? 58
  const layers = event.layers || []

  useEffect(() => {
    setImageFailed(false)
  }, [event.image])

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        background: '#1E1E1A',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '4%',
          border: '10px solid #111',
          background: 'linear-gradient(180deg, #BFD8C2 0%, #DCE6D2 58%, #5F7F62 58%, #3F605C 100%)',
          boxShadow: '0 0 0 1px #000, inset 0 0 0 2px rgba(255,255,255,0.18)',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', left: '8%', top: '60%', width: '25%', height: '8%', border: '2px solid #1E1E1A', background: '#CDBF94' }} />
        <div style={{ position: 'absolute', left: '69%', top: '47%', width: '22%', height: '8%', border: '2px solid #1E1E1A', background: '#CDBF94' }} />
        <div style={{ position: 'absolute', left: '34%', top: '62%', width: '35%', height: '12%', background: '#6B9EA6', borderTop: '2px solid #1E1E1A' }} />
        <div style={{ position: 'absolute', left: '39%', top: '42%', width: '9%', height: '11%', borderRadius: '999px', border: '2px solid #1E1E1A', background: '#C75448' }} />
        <div style={{ position: 'absolute', left: '43%', top: '46%', width: '26%', height: '14%', border: '2px solid #3F605C', background: 'rgba(95,127,98,0.24)', borderRadius: '50% 20% 20% 50%' }} />
        {['76%', '82%', '88%'].map((left, index) => (
          <div
            key={left}
            style={{
              position: 'absolute',
              left,
              top: `${33 + index * 4}%`,
              width: '1.1rem',
              height: '1.1rem',
              borderRadius: '999px',
              border: '2px solid #1E1E1A',
              background: '#F2EBD9',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: `${playerX}%`,
            top: `${playerY}%`,
            transform: 'translate(-50%, -50%)',
            width: 34,
            height: 46,
            border: '2px solid #1E1E1A',
            borderRadius: '50% 50% 35% 35%',
            background: '#F2EBD9',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.28)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '1rem',
            bottom: '1rem',
            maxWidth: '50%',
            border: '1px solid #1E1E1A',
            background: 'rgba(247,241,227,0.92)',
            padding: '0.4rem 0.55rem',
            fontSize: '0.72rem',
            fontWeight: 900,
            color: '#1E1E1A',
          }}
        >
          {event.fallbackLabel || event.headline}
        </div>
      </div>

      {showImage && (
        <img
          src={event.image}
          alt=""
          onError={() => setImageFailed(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', zIndex: 1 }}
        />
      )}

      {showImage && layers.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${DEFAULT_MONITOR_SCREEN.leftPct}%`,
            top: `${DEFAULT_MONITOR_SCREEN.topPct}%`,
            width: `${DEFAULT_MONITOR_SCREEN.widthPct}%`,
            height: `${DEFAULT_MONITOR_SCREEN.heightPct}%`,
            overflow: 'hidden',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {layers.map((layer) => {
            const translateY = layer.anchor === 'bottom' ? '-100%' : '-50%'
            return (
              <img
                key={layer.id}
                src={layer.image}
                alt=""
                style={{
                  position: 'absolute',
                  left: `${layer.xPct}%`,
                  top: `${layer.yPct}%`,
                  width: `${layer.wPct}%`,
                  height: 'auto',
                  opacity: layer.opacity ?? 1,
                  zIndex: layer.zIndex ?? 1,
                  transform: `translate(-50%, ${translateY})${layer.flipX ? ' scaleX(-1)' : ''}${layer.rotateDeg ? ` rotate(${layer.rotateDeg}deg)` : ''}`,
                  transformOrigin: layer.anchor === 'bottom' ? '50% 100%' : '50% 50%',
                  display: 'block',
                }}
              />
            )
          })}
        </div>
      )}

      <div
        style={{
          position: 'absolute',
          left: '1rem',
          top: '1rem',
          zIndex: 3,
          background: '#1E1E1A',
          color: '#F2EBD9',
          border: '1px solid #F2EBD9',
          padding: '0.45rem 0.625rem',
          fontSize: '0.78rem',
          fontWeight: 900,
        }}
      >
        {event.testerLabel} · {event.stepLabel}
      </div>
      {children}
    </div>
  )
}

export default function PlaytestTimelineScene({ node }: { node: PlaytestTimelineNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const context = { playerName, branchFlags, mcSelections }
  const stateKey = node.stateBindingKey || `${node.id}_state`
  const testerGroups = useMemo(() => {
    const groups: { id: string; label: string; events: PlaytestTimelineEvent[] }[] = []
    node.events.forEach((event) => {
      let group = groups.find((candidate) => candidate.id === event.testerId)
      if (!group) {
        group = { id: event.testerId, label: event.testerLabel, events: [] }
        groups.push(group)
      }
      group.events.push(event)
    })
    return groups
  }, [node.events])
  const [activeTesterId, setActiveTesterId] = useState(testerGroups[0]?.id || '')
  const [activeEventIndexByTester, setActiveEventIndexByTester] = useState<Record<string, number>>({})

  const timelineState = useMemo(() => parseTimelineState(responses[stateKey]), [responses, stateKey])
  const observationRows = useMemo(() => parseObservationRows(responses[node.bindingKey], node), [responses, node])
  const priorityKey = node.priorityBindingKey || `${node.bindingKey}_priority`
  const priorityResponse = responses[priorityKey] || ''
  const watchlistItems = useMemo(() => parseWatchlist(node.previousWatchlistKey ? responses[node.previousWatchlistKey] : undefined), [node.previousWatchlistKey, responses])
  const viewedSet = useMemo(() => new Set(timelineState.viewedEventIds), [timelineState.viewedEventIds])
  const activeTester = testerGroups.find((group) => group.id === activeTesterId) || testerGroups[0]
  const testerEvents = activeTester?.events || []
  const firstUnviewedIndex = testerEvents.findIndex((event) => !viewedSet.has(event.id))
  const storedIndex = activeTester ? activeEventIndexByTester[activeTester.id] : undefined
  const fallbackIndex = firstUnviewedIndex === -1 ? 0 : firstUnviewedIndex
  const currentIndex = Math.min(
    Math.max(storedIndex ?? fallbackIndex, 0),
    Math.max(testerEvents.length - 1, 0)
  )
  const currentEvent = testerEvents[currentIndex] || node.events[0]
  const currentTesterViewed = testerEvents.filter((event) => viewedSet.has(event.id)).length
  const currentEventViewed = currentEvent ? viewedSet.has(currentEvent.id) : false
  const atFirstMoment = currentIndex <= 0
  const atLastMoment = currentIndex >= testerEvents.length - 1
  const allViewed = timelineState.viewedEventIds.length >= node.events.length
  const allRowsComplete = observationRows.every((row) => row.conclusion_with_evidence.trim())
  const priorityComplete = !node.priorityPrompt || Boolean(priorityResponse.trim())
  const canSubmit = allViewed && allRowsComplete && priorityComplete
  const showInlineDevSkip = import.meta.env.DEV && new URLSearchParams(window.location.search).get('devtools') === '1'

  const saveTimelineState = (next: TimelineState) => {
    setFreeTextResponse(stateKey, JSON.stringify(next, null, 2))
  }

  const saveObservationRows = (rows: ObservationRow[]) => {
    setFreeTextResponse(node.bindingKey, JSON.stringify(rows, null, 2))
  }

  const setActiveTesterMoment = (testerId: string, index: number) => {
    setActiveEventIndexByTester((prev) => ({ ...prev, [testerId]: index }))
  }

  const previousMoment = () => {
    if (!activeTester || atFirstMoment) return
    setActiveTesterMoment(activeTester.id, currentIndex - 1)
  }

  const watchNext = () => {
    if (!currentEvent || !activeTester) return
    if (!currentEventViewed) {
      saveTimelineState({
        viewedEventIds: Array.from(new Set([...timelineState.viewedEventIds, currentEvent.id])),
      })
    }
    if (!atLastMoment) {
      setActiveTesterMoment(activeTester.id, currentIndex + 1)
    }
  }

  const updateObservation = (id: string, value: string) => {
    saveObservationRows(observationRows.map((row) => row.id === id ? { ...row, conclusion_with_evidence: value } : row))
  }

  const updatePriorityResponse = (value: string) => {
    setFreeTextResponse(priorityKey, value)
  }

  return (
    <SceneWrapper hideIllustration showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.25, margin: 0 }}>{node.title}</h1>
          {node.content && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
              {renderContentWithGlossary(interpolate(node.content, context))}
            </div>
          )}
        </div>

        {node.previousWatchlistKey && (
          <section
            style={{
              border: '1px solid #000',
              boxShadow: '3px 3px 0 #000',
              background: '#F7F1E3',
              padding: '0.875rem',
              fontSize: '0.8125rem',
              lineHeight: 1.55,
              color: '#1E1E1A',
            }}
          >
            <strong style={{ display: 'block', fontSize: '0.72rem', color: '#3A6B5E', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
              {node.previousWatchlistTitle || 'Your watchlist'}
            </strong>
            {watchlistItems.length ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.625rem' }}>
                {watchlistItems.map((item, index) => (
                  <div key={index} style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.625rem' }}>
                    {Object.entries(WATCHLIST_LABELS).map(([key, label]) => item[key]?.trim() ? (
                      <div key={key} style={{ marginTop: key === 'observed_behavior' ? 0 : '0.4rem' }}>
                        <div style={{ fontSize: '0.66rem', fontWeight: 900, color: '#6f6758', textTransform: 'uppercase' }}>{label}</div>
                        <div style={{ marginTop: '0.14rem', whiteSpace: 'pre-wrap' }}>{item[key]}</div>
                      </div>
                    ) : null)}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: '#6f6758' }}>{node.emptyWatchlistText || 'Submit the watchlist first to see it here.'}</span>
            )}
          </section>
        )}

        <section
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {testerGroups.map((group) => {
            const active = group.id === activeTester?.id
            const viewed = group.events.filter((event) => viewedSet.has(event.id)).length
            const complete = viewed >= group.events.length
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveTesterId(group.id)}
                style={{
                  border: active ? '2px solid #000' : '1px solid #000',
                  background: active ? '#3A6B5E' : complete ? '#E8DCC8' : '#F7F1E3',
                  color: active ? '#F2EBD9' : '#1E1E1A',
                  boxShadow: active ? '3px 3px 0 #000' : '2px 2px 0 #000',
                  padding: '0.5rem 0.7rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.78rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                }}
              >
                {group.label} · {viewed}/{group.events.length}
              </button>
            )
          })}
        </section>

        <section
          style={{
            width: 'calc(100% + 6rem)',
            marginLeft: '-3rem',
            marginRight: '-3rem',
            borderTop: '1px solid #000',
            borderBottom: '1px solid #000',
            background: '#1E1E1A',
          }}
        >
          <PlaytestMomentStage event={currentEvent}>
            <section
              className="playtest-moment-dialogue"
              style={{
                position: 'absolute',
                left: 'clamp(0.75rem, 3vw, 2rem)',
                right: 'clamp(0.75rem, 3vw, 2rem)',
                bottom: 'clamp(0.75rem, 2vw, 1.25rem)',
                zIndex: 4,
                border: '1px solid #000',
                boxShadow: '0 12px 28px rgba(0,0,0,0.38), 4px 4px 0 #000',
                background: 'rgba(247,241,227,0.96)',
                padding: 'clamp(0.7rem, 1.7vw, 1rem)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                maxHeight: '46%',
                overflowY: 'auto',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
                {currentEvent.testerLabel} · {Math.min(currentIndex + 1, testerEvents.length)} of {testerEvents.length}
              </div>
              <h2 style={{ margin: 0, fontSize: 'clamp(0.9rem, 1.5vw, 1.08rem)', lineHeight: 1.25 }}>{currentEvent.headline}</h2>
              <div style={{ fontSize: 'clamp(0.78rem, 1.2vw, 0.875rem)', lineHeight: 1.48, color: '#1E1E1A' }}>
                {currentEvent.description}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                <ActionButton
                  text="Previous moment"
                  onClick={previousMoment}
                  disabled={atFirstMoment}
                  variant="secondary"
                  fullWidth={false}
                />
                <ActionButton
                  text={
                    currentEventViewed
                      ? atLastMoment ? `${currentEvent.testerLabel} complete` : 'Next moment'
                      : atLastMoment ? `Mark ${currentEvent.testerLabel} complete` : 'Watch next moment'
                  }
                  onClick={watchNext}
                  disabled={currentEventViewed && atLastMoment}
                  variant={currentEventViewed && atLastMoment ? 'secondary' : 'primary'}
                  fullWidth={false}
                />
                <span style={{ fontSize: '0.75rem', color: '#555' }}>
                  {currentTesterViewed}/{testerEvents.length} watched for {currentEvent.testerLabel}
                  {allViewed ? ' · all tester runs watched' : ''}
                </span>
              </div>
            </section>
          </PlaytestMomentStage>
        </section>

        <section
          style={{
            border: '1px solid #000',
            boxShadow: '4px 4px 0 #000',
            background: '#F7F1E3',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.3 }}>{node.prompt}</h2>
            <p style={{ marginTop: '0.35rem', fontSize: '0.8rem', lineHeight: 1.55, color: '#555' }}>
              You can write while observing. For each tester, make one note that names the conclusion, the evidence you saw, and the design implication.
            </p>
          </div>

          {observationRows.map((row) => (
              <div key={row.id} style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.82rem' }}>{row.tester}</strong>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 800, color: '#1E1E1A' }}>
                  Conclusion with evidence
                  <textarea
                    aria-label={`${row.tester} conclusion with evidence`}
                    value={row.conclusion_with_evidence}
                    onChange={(event) => updateObservation(row.id, event.currentTarget.value)}
                    placeholder=""
                    rows={4}
                    style={{
                      width: '100%',
                      border: '1px solid #CDBF94',
                      background: '#fff',
                      color: '#1E1E1A',
                      padding: '0.55rem',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      fontSize: '0.82rem',
                      fontWeight: 400,
                      lineHeight: 1.45,
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                </label>
              </div>
          ))}

          {node.priorityPrompt && (
            <label style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.75rem', fontWeight: 800, color: '#1E1E1A' }}>
              {node.priorityPrompt}
              <textarea
                aria-label="Fix priority ranking with justification"
                value={priorityResponse}
                onChange={(event) => updatePriorityResponse(event.currentTarget.value)}
                rows={5}
                style={{
                  width: '100%',
                  border: '1px solid #CDBF94',
                  background: '#fff',
                  color: '#1E1E1A',
                  padding: '0.55rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.82rem',
                  fontWeight: 400,
                  lineHeight: 1.45,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </label>
          )}

          {!canSubmit && (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>
              Watch every moment, write one observation note for each tester, and rank the fix priorities before continuing.
            </span>
          )}
          <ActionButton text="Submit observation log" onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
          {showInlineDevSkip && <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />}
        </section>
      </motion.div>
    </SceneWrapper>
  )
}
