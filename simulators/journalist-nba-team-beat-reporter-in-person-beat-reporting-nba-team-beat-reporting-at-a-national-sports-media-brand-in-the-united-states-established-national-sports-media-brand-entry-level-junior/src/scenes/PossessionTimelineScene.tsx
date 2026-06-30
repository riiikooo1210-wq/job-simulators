import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { PossessionTimelineNode } from '../types/game'

interface TimelineNote {
  categoryId?: string
  note: string
}

interface TimelineState {
  viewedEventIds: string[]
  notes: Record<string, TimelineNote>
  summary: string
  reedQuestions: string[]
}

interface QuestionReference {
  title: string
  lines: string[]
}

function blankState(questionCount: number): TimelineState {
  return { viewedEventIds: [], notes: {}, summary: '', reedQuestions: Array.from({ length: questionCount }, () => '') }
}

function normalizeQuestions(value: unknown, questionCount: number) {
  const items = Array.isArray(value) ? value : []
  return Array.from({ length: questionCount }, (_unused, index) => (typeof items[index] === 'string' ? items[index] : ''))
}

function parseState(raw: string | undefined, questionCount: number): TimelineState {
  if (!raw) return blankState(questionCount)
  try {
    const parsed = JSON.parse(raw)
    return {
      viewedEventIds: Array.isArray(parsed.viewedEventIds) ? parsed.viewedEventIds : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      reedQuestions: normalizeQuestions(parsed.reedQuestions, questionCount),
    }
  } catch {
    return blankState(questionCount)
  }
}

function readPlanText(item: Record<string, unknown>, key: string) {
  const value = item[key]
  return typeof value === 'string' ? value.trim() : ''
}

function parseQuestionReference(raw: string | undefined, rowTitle: string, title: string): QuestionReference | null {
  if (!raw) return null
  try {
    const items = JSON.parse(raw)
    if (!Array.isArray(items)) return null
    const row = items.find((item) => item && typeof item === 'object' && readPlanText(item, 'rowTitle') === rowTitle) as Record<string, unknown> | undefined
    if (!row) return null
    const lines = [
      readPlanText(row, 'need') ? `Topic: ${readPlanText(row, 'need')}` : '',
      readPlanText(row, 'question') ? `Pregame question: ${readPlanText(row, 'question')}` : '',
      readPlanText(row, 'risk') ? `Why it mattered: ${readPlanText(row, 'risk')}` : '',
    ].filter(Boolean)
    return lines.length ? { title, lines } : null
  } catch {
    return null
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function buildQuestionSummary(reedQuestions: string[]) {
  return reedQuestions
    .map((question, index) => question.trim() ? `${index + 1}) ${question.trim()}` : '')
    .filter(Boolean)
    .join('\n')
}

function noteHasRequiredParts(note: TimelineNote | undefined) {
  return Boolean(note?.categoryId && note.note.trim())
}

export default function PossessionTimelineScene({ node }: { node: PossessionTimelineNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const context = { playerName, branchFlags, mcSelections }

  const questionCount = node.questionCount ?? node.questionPrompts?.length ?? 3
  const questionIndexes = useMemo(() => Array.from({ length: questionCount }, (_unused, index) => index), [questionCount])
  const state = useMemo(() => parseState(responses[node.bindingKey], questionCount), [responses, node.bindingKey, questionCount])
  const questionReference = useMemo(() => {
    if (!node.questionReference) return null
    return parseQuestionReference(
      responses[node.questionReference.bindingKey],
      node.questionReference.rowTitle,
      node.questionReference.title || 'Pregame Reed question'
    )
  }, [node.questionReference, responses])
  const viewedSet = useMemo(() => new Set(state.viewedEventIds), [state.viewedEventIds])
  const nextUnviewedIndex = node.events.findIndex((event) => !viewedSet.has(event.id))
  const defaultIndex = nextUnviewedIndex === -1 ? Math.max(0, node.events.length - 1) : nextUnviewedIndex
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex)
  useEffect(() => {
    setSelectedIndex((index) => Math.min(Math.max(index, 0), Math.max(0, node.events.length - 1)))
  }, [node.events.length])
  const currentIndex = Math.min(Math.max(selectedIndex, 0), Math.max(0, node.events.length - 1))
  const currentEvent = node.events[currentIndex]
  const currentNote = state.notes[currentEvent.id] || { categoryId: '', note: '' }
  const currentViewed = viewedSet.has(currentEvent.id)
  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < node.events.length - 1
  const completedNotes = node.events.filter((event) => {
    const note = state.notes[event.id]
    return noteHasRequiredParts(note)
  }).length
  const minNotes = node.minNotes ?? 3
  const allViewed = node.events.every((event) => viewedSet.has(event.id))
  const questionsReady = state.reedQuestions.every((question) => question.trim().length > 0)
  const canSubmit = allViewed && completedNotes >= minNotes && questionsReady
  const nextButtonText = canGoNext ? 'Next possession' : currentViewed ? 'All watched' : 'Mark final board watched'
  const missingNotes = Math.max(minNotes - completedNotes, 0)
  const missingNotesText = missingNotes > 0 ? ` You still need ${missingNotes} more completed note${missingNotes === 1 ? '' : 's'}.` : ''
  const progressText = `Possession ${currentIndex + 1} of ${node.events.length} - ${viewedSet.size} watched - ${completedNotes}/${minNotes} completed notes saved (label + text)`
  const gateText = `To continue: watch all ${node.events.length} moments, save at least ${minNotes} completed notes (each needs one label plus note text), and write both Reed questions.${missingNotesText}`
  const labelById = (categoryId?: string) => node.categories.find((category) => category.id === categoryId)?.label || ''
  const questionPrompts = questionIndexes.map((index) => node.questionPrompts?.[index] || `Reed question ${index + 1}`)
  const questionPlaceholders = questionIndexes.map((index) => node.questionPlaceholders?.[index] || 'Write a short, specific question for Reed.')

  const save = (next: TimelineState) => {
    setFreeTextResponse(node.bindingKey, JSON.stringify(next, null, 2))
  }

  const updateCurrentNote = (patch: Partial<TimelineNote>) => {
    save({
      ...state,
      notes: {
        ...state.notes,
        [currentEvent.id]: {
          ...currentNote,
          ...patch,
        },
      },
    })
  }

  const updateQuestionPlan = (reedQuestions: string[]) => {
    const normalizedQuestions = reedQuestions.slice(0, questionCount)
    const summary = buildQuestionSummary(normalizedQuestions)
    save({ ...state, reedQuestions: normalizedQuestions, summary })
    if (node.summaryBindingKey) setFreeTextResponse(node.summaryBindingKey, summary)
  }

  const updateReedQuestion = (index: number, value: string) => {
    const reedQuestions = [...state.reedQuestions.slice(0, questionCount)]
    reedQuestions[index] = value
    updateQuestionPlan(reedQuestions)
  }

  const markCurrentViewed = () => {
    save({
      ...state,
      viewedEventIds: unique([...state.viewedEventIds, currentEvent.id]),
    })
  }

  const goToPreviousEvent = () => {
    if (canGoPrevious) setSelectedIndex(currentIndex - 1)
  }

  const goToNextEvent = () => {
    if (!currentViewed) markCurrentViewed()
    if (canGoNext) setSelectedIndex(currentIndex + 1)
  }

  const focusX = currentEvent.focusX ?? 50
  const focusY = currentEvent.focusY ?? 50
  const eventImage = currentEvent.image

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

        {node.referenceContent && (
          <section
            style={{
              border: '1px solid #000',
              boxShadow: '3px 3px 0 #000',
              background: '#F7F1E3',
              padding: '0.875rem',
              fontSize: '0.8125rem',
              lineHeight: 1.55,
              color: '#1E1E1A',
              whiteSpace: 'pre-wrap',
            }}
          >
            <strong style={{ display: 'block', fontSize: '0.72rem', color: '#3A6B5E', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              {node.referenceTitle || 'Reporter setup'}
            </strong>
            {renderContentWithGlossary(interpolate(node.referenceContent, context))}
          </section>
        )}

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
          <div
            style={{
              position: 'relative',
              aspectRatio: '16 / 9',
              overflow: 'hidden',
              background: 'linear-gradient(90deg, #D8A35D 0%, #E9BD76 50%, #D8A35D 100%)',
            }}
          >
            <div style={{ position: 'absolute', inset: '10% 8%', border: '3px solid rgba(255,255,255,0.85)' }} />
            <div style={{ position: 'absolute', left: '50%', top: '10%', width: 3, height: '80%', background: 'rgba(255,255,255,0.78)' }} />
            <div style={{ position: 'absolute', left: '42%', top: '36%', width: '16%', aspectRatio: '1 / 1', border: '3px solid rgba(255,255,255,0.78)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', left: '8%', top: '28%', width: '18%', height: '44%', border: '3px solid rgba(255,255,255,0.78)' }} />
            <div style={{ position: 'absolute', right: '8%', top: '28%', width: '18%', height: '44%', border: '3px solid rgba(255,255,255,0.78)' }} />
            {eventImage && (
              <img
                src={eventImage}
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 1,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
                onError={(event) => { event.currentTarget.style.display = 'none' }}
              />
            )}
            {!eventImage && (
              <div
                style={{
                  position: 'absolute',
                  left: `${focusX}%`,
                  top: `${focusY}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  border: '3px solid #B87D6B',
                  background: 'rgba(242, 235, 217, 0.85)',
                  boxShadow: '0 0 0 8px rgba(184, 125, 107, 0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: '0.64rem',
                  fontWeight: 900,
                  color: '#1E1E1A',
                  padding: '0.35rem',
                }}
              >
                {currentEvent.courtFocus}
              </div>
            )}
            <div
              style={{
                position: 'absolute',
                left: '1rem',
                top: '1rem',
                zIndex: 2,
                background: '#1E1E1A',
                color: '#F2EBD9',
                border: '1px solid #F2EBD9',
                padding: '0.45rem 0.625rem',
                fontSize: '0.78rem',
                fontWeight: 800,
              }}
            >
              {currentEvent.clock} · {currentEvent.score}
            </div>
            <div
              style={{
                position: 'absolute',
                left: '1rem',
                right: '1rem',
                bottom: '1rem',
                zIndex: 2,
                background: 'rgba(247, 241, 227, 0.94)',
                border: '1px solid #000',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.7)',
                padding: '0.75rem',
              }}
            >
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
                {currentEvent.possession}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#000', marginTop: '0.2rem' }}>
                {currentEvent.headline}
              </div>
              <div style={{ fontSize: '0.8125rem', lineHeight: 1.55, color: '#1E1E1A', marginTop: '0.25rem' }}>
                {currentEvent.description}
              </div>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.625rem', borderTop: '1px solid #CDBF94', display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={goToPreviousEvent}
                  disabled={!canGoPrevious}
                  style={{
                    border: '1px solid #000',
                    background: canGoPrevious ? '#EFE8D2' : '#D8D0B9',
                    color: canGoPrevious ? '#1E1E1A' : '#777',
                    boxShadow: canGoPrevious ? '2px 2px 0 #000' : 'none',
                    borderRadius: 2,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: canGoPrevious ? 'pointer' : 'not-allowed',
                  }}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={goToNextEvent}
                  disabled={!canGoNext && currentViewed}
                  style={{
                    border: '1px solid #000',
                    background: canGoNext || !currentViewed ? '#3A6B5E' : '#D8D0B9',
                    color: canGoNext || !currentViewed ? '#F2EBD9' : '#777',
                    boxShadow: canGoNext || !currentViewed ? '2px 2px 0 #000' : 'none',
                    borderRadius: 2,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: canGoNext || !currentViewed ? 'pointer' : 'not-allowed',
                  }}
                >
                  {nextButtonText}
                </button>
                <span style={{ fontSize: '0.75rem', color: '#555' }}>
                  {progressText}
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="possession-workspace-grid">
          <div className="possession-workspace-primary">
            <section
              style={{
                border: '1px solid #000',
                boxShadow: '4px 4px 0 #000',
                background: '#F7F1E3',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
                    Reporter notebook
                  </div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.8125rem', fontWeight: 900, color: '#1E1E1A', lineHeight: 1.35 }}>
                    Notebook: {currentEvent.clock} · {currentEvent.possession}
                  </div>
                  <div style={{ marginTop: '0.15rem', fontSize: '0.8125rem', fontWeight: 700, color: '#5B5546', lineHeight: 1.35 }}>
                    {currentEvent.headline}
                  </div>
                </div>
                <div style={{ fontSize: '0.875rem', lineHeight: 1.55, marginTop: '0.3rem' }}>
                  {currentEvent.notebookPrompt}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.4rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
                  Pick one note label
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {node.categories.map((category) => {
                    const selected = currentNote.categoryId === category.id
                    return (
                      <button
                        key={category.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => updateCurrentNote({ categoryId: category.id })}
                        title={category.description}
                        style={{
                          background: selected ? '#3A6B5E' : '#EFE8D2',
                          color: selected ? '#F2EBD9' : '#1E1E1A',
                          border: '1px solid #000',
                          boxShadow: selected ? 'none' : '2px 2px 0 #000',
                          borderRadius: 2,
                          padding: '0.45rem 0.6rem',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          lineHeight: 1.2,
                          cursor: 'pointer',
                        }}
                      >
                        {category.label}
                      </button>
                    )
                  })}
                </div>
                <div style={{ fontSize: '0.75rem', color: currentNote.categoryId ? '#3A6B5E' : '#6F4F46', fontWeight: 700 }}>
                  {currentNote.categoryId ? `${labelById(currentNote.categoryId)} selected.` : 'Pick a label so this note counts.'}
                </div>
              </div>

              <textarea
                value={currentNote.note}
                onChange={(event) => updateCurrentNote({ note: event.currentTarget.value })}
                placeholder="Write the note you would keep for postgame. Keep what you saw, what is confirmed, and what still needs checking separate."
                rows={4}
                style={{
                  width: '100%',
                  border: '1px solid #000',
                  background: '#fff',
                  color: '#000',
                  padding: '0.625rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.875rem',
                  lineHeight: 1.45,
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </section>

            <section
              style={{
                border: '1px solid #000',
                background: '#F7F1E3',
                boxShadow: '4px 4px 0 #000',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.625rem',
              }}
            >
              <label style={{ fontSize: '0.875rem', fontWeight: 800 }}>
                {node.summaryPrompt}
              </label>
              {questionReference && (
                <div
                  style={{
                    border: '1px solid #CDBF94',
                    background: '#FBF7EA',
                    padding: '0.75rem',
                    fontSize: '0.8125rem',
                    lineHeight: 1.5,
                    color: '#1E1E1A',
                  }}
                >
                  <strong style={{ display: 'block', color: '#3A6B5E', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    {questionReference.title}
                  </strong>
                  <div style={{ display: 'grid', gap: '0.25rem' }}>
                    {questionReference.lines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </div>
                  {node.questionReference?.helper && (
                    <div style={{ marginTop: '0.45rem', color: '#5B5546', fontWeight: 700 }}>
                      {node.questionReference.helper}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'grid', gap: '0.625rem' }}>
                {questionIndexes.map((index) => (
                  <label key={index} style={{ display: 'grid', gap: '0.3rem', fontSize: '0.8125rem', fontWeight: 800, color: '#1E1E1A' }}>
                    {questionPrompts[index]}
                    <textarea
                      value={state.reedQuestions[index] || ''}
                      onChange={(event) => updateReedQuestion(index, event.currentTarget.value)}
                      placeholder={questionPlaceholders[index]}
                      rows={2}
                      style={{
                        width: '100%',
                        border: '1px solid #000',
                        background: '#fff',
                        color: '#000',
                        padding: '0.625rem',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '0.875rem',
                        lineHeight: 1.45,
                        resize: 'vertical',
                        outline: 'none',
                        fontWeight: 400,
                      }}
                    />
                  </label>
                ))}
              </div>
              {!canSubmit && (
                <span style={{ fontSize: '0.75rem', color: '#666' }}>
                  {gateText}
                </span>
              )}
              <ActionButton text="Submit" onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
              {import.meta.env.DEV && (
                <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
              )}
            </section>
          </div>

          <section
            style={{
              border: '1px solid #000',
              background: '#EFE8D2',
              padding: '0.875rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
              minWidth: 0,
            }}
          >
            <strong style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: '#3A6B5E' }}>
              Running notes
            </strong>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {node.events.map((event, index) => {
                const note = state.notes[event.id]
                const viewed = viewedSet.has(event.id)
                const active = event.id === currentEvent.id
                return (
                  <div
                    key={event.id}
                    style={{
                      border: `1px solid ${active ? '#B87D6B' : '#CDBF94'}`,
                      background: active ? '#FBF7EA' : '#F7F1E3',
                      padding: '0.55rem',
                      fontSize: '0.72rem',
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontWeight: 900 }}>
                      <span>{index + 1}. {event.clock}</span>
                      <span>{viewed ? 'watched' : active ? 'live' : 'queued'}</span>
                    </div>
                    <div style={{ marginTop: '0.25rem', color: '#1E1E1A' }}>{event.headline}</div>
                    {note?.note.trim() && (
                      <div style={{ marginTop: '0.35rem', color: '#3A6B5E', fontWeight: 700 }}>
                        {note.categoryId ? `${labelById(note.categoryId)}: ${note.note}` : `Needs label: ${note.note}`}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {node.questionGuidance && (
              <div
                style={{
                  border: '1px solid #CDBF94',
                  background: '#FBF7EA',
                  padding: '0.75rem',
                  fontSize: '0.78rem',
                  lineHeight: 1.5,
                  color: '#1E1E1A',
                }}
              >
                <strong style={{ display: 'block', color: '#3A6B5E', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  {node.questionGuidanceTitle || 'Reed question advice'}
                </strong>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {renderContentWithGlossary(interpolate(node.questionGuidance, context))}
                </div>
              </div>
            )}
          </section>
        </div>
      </motion.div>
    </SceneWrapper>
  )
}
