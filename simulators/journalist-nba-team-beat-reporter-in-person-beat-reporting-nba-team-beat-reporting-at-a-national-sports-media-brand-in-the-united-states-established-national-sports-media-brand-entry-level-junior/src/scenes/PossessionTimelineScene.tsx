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
  categoryId: string
  note: string
}

interface TimelineState {
  viewedEventIds: string[]
  notes: Record<string, TimelineNote>
  summary: string
  reedQuestions: string[]
  followUp: string
}

function blankState(): TimelineState {
  return { viewedEventIds: [], notes: {}, summary: '', reedQuestions: ['', '', ''], followUp: '' }
}

function normalizeQuestions(value: unknown) {
  const items = Array.isArray(value) ? value : []
  return [0, 1, 2].map((index) => (typeof items[index] === 'string' ? items[index] : ''))
}

function parseState(raw: string | undefined): TimelineState {
  if (!raw) return blankState()
  try {
    const parsed = JSON.parse(raw)
    return {
      viewedEventIds: Array.isArray(parsed.viewedEventIds) ? parsed.viewedEventIds : [],
      notes: parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      reedQuestions: normalizeQuestions(parsed.reedQuestions),
      followUp: typeof parsed.followUp === 'string' ? parsed.followUp : '',
    }
  } catch {
    return blankState()
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function buildQuestionSummary(reedQuestions: string[], followUp: string) {
  const questionLines = reedQuestions
    .map((question, index) => question.trim() ? `${index + 1}) ${question.trim()}` : '')
    .filter(Boolean)
  const followUpLine = followUp.trim() ? `Follow-up / verification: ${followUp.trim()}` : ''
  return [...questionLines, followUpLine].filter(Boolean).join('\n')
}

export default function PossessionTimelineScene({ node }: { node: PossessionTimelineNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const context = { playerName, branchFlags, mcSelections }

  const state = useMemo(() => parseState(responses[node.bindingKey]), [responses, node.bindingKey])
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
    return note?.categoryId && note.note.trim().length > 0
  }).length
  const minNotes = node.minNotes ?? 3
  const allViewed = node.events.every((event) => viewedSet.has(event.id))
  const questionsReady = state.reedQuestions.every((question) => question.trim().length > 0)
  const canSubmit = allViewed && completedNotes >= minNotes && questionsReady
  const questionPrompts = [0, 1, 2].map((index) => node.questionPrompts?.[index] || `Reed question ${index + 1}`)
  const questionPlaceholders = [0, 1, 2].map((index) => node.questionPlaceholders?.[index] || 'Write a concise, specific question for Reed.')

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

  const updateQuestionPlan = (reedQuestions: string[], followUp: string) => {
    const summary = buildQuestionSummary(reedQuestions, followUp)
    save({ ...state, reedQuestions, followUp, summary })
    if (node.summaryBindingKey) setFreeTextResponse(node.summaryBindingKey, summary)
  }

  const updateReedQuestion = (index: number, value: string) => {
    const reedQuestions = [...state.reedQuestions]
    reedQuestions[index] = value
    updateQuestionPlan(reedQuestions, state.followUp)
  }

  const updateFollowUp = (followUp: string) => {
    updateQuestionPlan(state.reedQuestions, followUp)
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

  const categoryLabel = (categoryId: string) => node.categories.find((category) => category.id === categoryId)?.label || 'Unsorted'
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
            </div>
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem' }}>
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
              </div>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.55, marginTop: '0.3rem' }}>
                {currentEvent.notebookPrompt}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
                Select a note label
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {node.categories.map((category) => {
                  const selected = currentNote.categoryId === category.id
                  return (
                    <button
                      key={category.id}
                      type="button"
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
                        cursor: 'pointer',
                      }}
                    >
                      {category.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <textarea
              value={currentNote.note}
              onChange={(event) => updateCurrentNote({ note: event.currentTarget.value })}
              placeholder="Write the note you would keep for postgame access. Keep facts, observation, and uncertainty separate."
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

            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                Next
              </button>
              <span style={{ fontSize: '0.75rem', color: '#555' }}>
                {currentIndex + 1} of {node.events.length} possessions · {viewedSet.size}/{node.events.length} watched · {completedNotes}/{minNotes} notes ready
              </span>
            </div>
          </section>

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
                        {categoryLabel(note.categoryId)}: {note.note}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        </div>

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
          <div style={{ display: 'grid', gap: '0.625rem' }}>
            {[0, 1, 2].map((index) => (
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
          <label style={{ display: 'grid', gap: '0.3rem', fontSize: '0.8125rem', fontWeight: 800, color: '#1E1E1A' }}>
            {node.followUpPrompt || 'Follow-up / verification item (optional)'}
            <textarea
              value={state.followUp}
              onChange={(event) => updateFollowUp(event.currentTarget.value)}
              placeholder={node.followUpPlaceholder || 'If a note still needs Harris, PR, or another source, put that verification item here instead of making it a Reed question.'}
              rows={3}
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
          {!canSubmit && (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>
              Watch all possessions, save at least {minNotes} useful notes, and write something in each Reed question box. Follow-up is optional.
            </span>
          )}
          <ActionButton text="Submit" onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
          {import.meta.env.DEV && (
            <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
          )}
        </section>
      </motion.div>
    </SceneWrapper>
  )
}
