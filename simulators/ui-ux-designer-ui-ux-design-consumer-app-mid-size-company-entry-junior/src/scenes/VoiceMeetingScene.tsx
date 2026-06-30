import { useEffect, useRef, useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { npcs } from '../data/npcs'
import { npcReply } from '../services/gemini'
import { GeminiLiveSession, type LiveStatus } from '../services/geminiLive'
import type { ChatMessage, VoiceMeetingNode } from '../types/game'

interface Props { node: VoiceMeetingNode }

const inPersonWorkspaceHeight = 'clamp(340px, calc(100dvh - 520px), 520px)'

function buildSystemPrompt(args: {
  node: VoiceMeetingNode
  npc: { name: string; role: string; persona: string; voice?: string }
  playerName: string
  goalPrompt: string
  meetingContext: string
}) {
  const { node, npc, playerName, goalPrompt, meetingContext } = args
  const isInPerson = (node.meetingMode || node.presentation) === 'in_person'
  const meetingPhrase = isInPerson ? 'in an in-person workplace conversation' : 'in a live voice meeting'
  const speechStyle = isInPerson
    ? 'Speak naturally, like a real colleague or manager sitting with the student in the same workplace.'
    : 'Speak naturally, like a real colleague or client on a call.'
  const initial = (node.initialMessages || [])
    .map((m) => `${m.role === 'user' ? playerName || 'Student' : npc.name}: ${renderContentWithGlossary(m.content)}`)
    .join('\n')

  return `You are ${npc.name}, ${npc.role}, ${meetingPhrase} with ${playerName || 'the student'}.

PERSONA:
${npc.persona}
${npc.voice ? `\nVOICE: ${npc.voice}` : ''}

MEETING GOAL:
${goalPrompt}

MEETING CONTEXT:
${meetingContext || 'Use the scene context and your persona to make this feel like a realistic workplace conversation.'}

${initial ? `INITIAL CONTEXT MESSAGES:\n${initial}\n` : ''}RULES:
- ${speechStyle}
- Keep each turn under 90 words unless the student asks for detail.
- Ask follow-up questions, push back, clarify ambiguity, and react to the student's actual words.
- Do not mention being an AI, a model, or a simulator.
- Do not grade the student during the meeting.
- Stay focused on the meeting goal and the workplace stakes.`
}

function MicIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      {muted && <line x1="2" y1="2" x2="22" y2="22" strokeWidth={2.5} />}
    </svg>
  )
}

export default function VoiceMeetingScene({ node }: Props) {
  const npc = npcs[node.npcId]
  const conversationKey = `voice:${node.id}:${node.npcId}`
  const messages = useGameStore((s) => s.npcConversations[conversationKey] || [])
  const appendNpcMessage = useGameStore((s) => s.appendNpcMessage)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const previousDesignNotes = useGameStore((s) => s.freeTextResponses.scene_02_ideation || '')
  const goNext = useGoNext()

  const [status, setStatus] = useState<LiveStatus>('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [muted, setMuted] = useState(false)
  const [meetingEnded, setMeetingEnded] = useState(false)
  const [npcSpeaking, setNpcSpeaking] = useState(false)
  const [liveUser, setLiveUser] = useState('')
  const [liveNpc, setLiveNpc] = useState('')
  const [typedInput, setTypedInput] = useState('')
  const [typedLoading, setTypedLoading] = useState(false)
  const [typedError, setTypedError] = useState<string | null>(null)
  const [turnLimitReached, setTurnLimitReached] = useState(false)

  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const pendingUserRef = useRef('')
  const pendingNpcRef = useRef('')
  const lastRoleRef = useRef<'user' | 'npc' | null>(null)
  const initializedRef = useRef(false)

  const goalPrompt = interpolate(node.goalPrompt, { playerName, branchFlags, mcSelections })
  const meetingContext = interpolate(node.meetingContext || node.content || '', { playerName, branchFlags, mcSelections })
  const minTurns = node.minTurns ?? 2
  const maxTurns = node.maxTurns ?? 8
  const userTurns = messages.filter((m) => m.role === 'user').length
  const typedFallback = Boolean(node.typedFallback)
  const reachedTurnLimit = userTurns >= maxTurns
  const canSubmit = meetingEnded && userTurns >= minTurns
  const isInPerson = (node.meetingMode || node.presentation) === 'in_person'
  const showPreviousDesignNotes = node.id === 'scene_03_checkin'
  const designNotesText = previousDesignNotes.trim()
  const designNoteBlocks = designNotesText
    ? designNotesText.split(/\n{2,}/).map((block) => {
      const lines = block.split('\n')
      const heading = lines[0]?.trim()
      const body = lines.slice(1).join('\n').trim()
      return body && heading
        ? { heading, body }
        : { heading: 'Design notes', body: block.trim() }
    })
    : []

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    if (node.initialMessages?.length && messages.length === 0) {
      node.initialMessages.forEach((m) => appendNpcMessage(conversationKey, m))
    }
  }, [appendNpcMessage, conversationKey, messages.length, node.initialMessages])

  useEffect(() => {
    const transcriptEl = transcriptRef.current
    if (!transcriptEl) return
    transcriptEl.scrollTop = transcriptEl.scrollHeight
  }, [messages.length, liveUser, liveNpc])

  useEffect(() => {
    return () => {
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [])

  useEffect(() => {
    if (userTurns >= maxTurns && status === 'connected' && !meetingEnded) {
      endMeeting()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTurns, maxTurns, status, meetingEnded])

  const flushPending = (role: 'user' | 'npc') => {
    const pending = role === 'user' ? pendingUserRef.current : pendingNpcRef.current
    const trimmed = pending.trim()
    if (!trimmed) return
    const msg: ChatMessage = { role, content: trimmed, ts: new Date().toISOString() }
    appendNpcMessage(conversationKey, msg)
    if (role === 'user') {
      pendingUserRef.current = ''
      setLiveUser('')
    } else {
      pendingNpcRef.current = ''
      setLiveNpc('')
    }
  }

  const startMeeting = async () => {
    if (!npc || sessionRef.current || reachedTurnLimit || meetingEnded) return
    setTypedError(null)
    setTurnLimitReached(false)
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      setStatus('error')
      setStatusDetail('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env.')
      return
    }

    const session = new GeminiLiveSession({
      onStatus: (s, detail) => {
        setStatus(s)
        if (detail) setStatusDetail(detail)
      },
      onUserTranscript: (text) => {
        if (lastRoleRef.current === 'npc') flushPending('npc')
        lastRoleRef.current = 'user'
        pendingUserRef.current += text
        setLiveUser(pendingUserRef.current)
      },
      onNpcTranscript: (text) => {
        if (lastRoleRef.current === 'user') flushPending('user')
        lastRoleRef.current = 'npc'
        pendingNpcRef.current += text
        setLiveNpc(pendingNpcRef.current)
      },
      onNpcSpeakingChange: (speaking) => {
        setNpcSpeaking(speaking)
        if (!speaking) {
          flushPending('npc')
          lastRoleRef.current = null
        }
      },
    })

    sessionRef.current = session
    await session.start({
      apiKey,
      voiceName: node.voiceName,
      systemPrompt: buildSystemPrompt({ node, npc, playerName, goalPrompt, meetingContext }),
    })
  }

  const endMeeting = (options: { limitReached?: boolean } = {}) => {
    flushPending('user')
    flushPending('npc')
    sessionRef.current?.stop()
    sessionRef.current = null
    setMeetingEnded(true)
    setTurnLimitReached(Boolean(options.limitReached) || userTurns >= maxTurns)
    setMuted(false)
    setStatus('closed')
    setStatusDetail('')
  }

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    sessionRef.current?.setMuted(next)
  }

  const submitTypedMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const question = typedInput.trim()
    if (!typedFallback || !npc || !question || typedLoading || meetingEnded || reachedTurnLimit || inCall) return

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      const detail = 'Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env.'
      setStatus('error')
      setStatusDetail(detail)
      setTypedError(detail)
      return
    }

    setTypedInput('')
    setTypedError(null)
    setTypedLoading(true)
    setStatus('connecting')
    setStatusDetail('')

    const userMessage: ChatMessage = { role: 'user', content: question, ts: new Date().toISOString() }
    const historyWithQuestion = [...messages, userMessage]

    try {
      const reply = await npcReply({
        npcId: node.npcId,
        history: historyWithQuestion,
        goalPrompt: [
          goalPrompt,
          meetingContext ? `Meeting context:\n${meetingContext}` : '',
          designNotesText ? `Learner's earlier design notes:\n${designNotesText}` : '',
          'Typed fallback rules: respond as the same Maya check-in, keep the reply under 90 words, ask one focused follow-up, and do not give a script or final answer.',
        ].filter(Boolean).join('\n\n'),
        channel: 'chat',
      })
      appendNpcMessage(conversationKey, userMessage)
      appendNpcMessage(conversationKey, { role: 'npc', content: reply, ts: new Date().toISOString() })
      setStatus('idle')
      if (userTurns + 1 >= maxTurns) {
        endMeeting({ limitReached: true })
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : `Could not reach ${npc.name} right now.`
      setTypedInput(question)
      setStatus('error')
      setStatusDetail(detail)
      setTypedError(detail)
    } finally {
      setTypedLoading(false)
    }
  }

  if (!npc) {
    return (
      <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
        <div style={{ color: '#c0392b' }}>Unknown NPC: <code>{node.npcId}</code>.</div>
      </SceneWrapper>
    )
  }

  const typedStarted = typedFallback && userTurns > 0
  const inCall = status !== 'idle' && status !== 'closed' && status !== 'error' && !typedLoading
  const canEndTypedMeeting = typedStarted && !inCall && !meetingEnded && !typedLoading && userTurns >= minTurns
  const remainingTurns = Math.max(0, maxTurns - userTurns)
  const visibleTurnLimitReached = turnLimitReached || reachedTurnLimit
  const statusLabel =
    visibleTurnLimitReached ? `${maxTurns}-turn limit reached`
    : typedLoading ? `${npc.name} is replying...`
    : status === 'connecting' ? 'Connecting...'
    : status === 'connected' ? (muted ? 'Muted' : npcSpeaking ? `${npc.name} is speaking...` : 'Listening...')
    : status === 'closed' ? (isInPerson ? 'Conversation ended' : 'Meeting ended')
    : status === 'error' ? (statusDetail ? 'Gemini error' : 'Error')
    : 'Ready'

  const npcInitials = npc.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const typedDisabled = !typedFallback || typedLoading || meetingEnded || visibleTurnLimitReached || inCall
  const typedHelper =
    inCall ? 'Typing is available after you finish the voice conversation.'
    : visibleTurnLimitReached ? `${maxTurns}-turn limit reached. Finish the conversation to continue.`
    : meetingEnded ? 'Conversation ended.'
    : remainingTurns === 1 ? '1 turn left. Keep it focused.'
    : `${remainingTurns} turns left. Type one clear reply or question at a time.`

  const typedComposer = typedFallback ? (
    <form
      onSubmit={submitTypedMessage}
      data-testid="maya-typed-fallback"
      style={{
        borderTop: '1px solid #E0D3AE',
        background: '#FBF7EA',
        padding: '0.75rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.76rem', color: '#4B4538', lineHeight: 1.4 }}>
          <strong>Typed backup</strong>
          <span style={{ marginLeft: 6 }}>{typedHelper}</span>
        </div>
        {typedLoading && <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 800 }}>{npc.name} is replying...</div>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.5rem', alignItems: 'end' }}>
        <textarea
          value={typedInput}
          onChange={(event) => setTypedInput(event.target.value)}
          placeholder={`Type to ${npc.name}`}
          rows={2}
          disabled={typedDisabled}
          style={{
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            border: '1px solid #CDBF94',
            borderRadius: 6,
            padding: '0.58rem 0.65rem',
            fontSize: '0.82rem',
            lineHeight: 1.45,
            resize: 'vertical',
            color: '#1E1E1A',
            background: typedDisabled ? '#F2EBD9' : '#FFFFFF',
          }}
        />
        <button
          type="submit"
          disabled={typedDisabled || !typedInput.trim()}
          style={{
            background: typedDisabled || !typedInput.trim() ? '#D9CAA3' : '#3A6B5E',
            color: typedDisabled || !typedInput.trim() ? '#6A604B' : '#F2EBD9',
            border: '1px solid #000',
            borderRadius: 6,
            padding: '0.58rem 0.82rem',
            fontSize: '0.8rem',
            fontWeight: 800,
            cursor: typedDisabled || !typedInput.trim() ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Send
        </button>
      </div>
      {typedError && (
        <div style={{ border: '1px solid #B87D6B', background: '#F4E2D9', color: '#7B3D32', borderRadius: 6, padding: '0.48rem 0.6rem', fontSize: '0.76rem', lineHeight: 1.4 }}>
          {typedError}
        </div>
      )}
    </form>
  ) : null

  if (isInPerson) {
    return (
      <SceneWrapper illustration={node.illustration} hideIllustration showBack backLabel="Back">
        <style>{`
          .maya-meeting-hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 220px;
            gap: 1rem;
            align-items: stretch;
          }
          .maya-meeting-toolbar {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            align-items: center;
            flex-wrap: wrap;
          }
          .maya-meeting-workspace {
            display: grid;
            grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.85fr);
            gap: 0.875rem;
            align-items: stretch;
            min-height: ${inPersonWorkspaceHeight};
          }
          .maya-workspace-panel {
            min-height: ${inPersonWorkspaceHeight};
            max-height: ${inPersonWorkspaceHeight};
            overflow-y: auto;
          }
          .maya-meeting-workspace-single {
            grid-template-columns: 1fr;
          }
          @media (max-width: 920px) {
            .maya-meeting-hero {
              grid-template-columns: 1fr;
            }
            .maya-context-thumbnail {
              max-width: 260px;
            }
            .maya-meeting-workspace {
              grid-template-columns: 1fr;
              min-height: 0;
            }
            .maya-workspace-panel {
              min-height: 300px;
              max-height: 430px;
            }
            .maya-design-notes-panel {
              min-height: 260px;
            }
          }
          @media (max-width: 640px) {
            .maya-context-thumbnail {
              max-width: none;
            }
            .maya-meeting-toolbar {
              align-items: stretch;
            }
            .maya-meeting-actions {
              width: 100%;
              justify-content: flex-start;
            }
          }
        `}</style>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
        >
          <section className="maya-meeting-hero">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: 800, lineHeight: 1.25, color: '#1E1E1A' }}>{node.title}</h1>
              {node.content && (
                <div style={{ fontSize: '0.9rem', lineHeight: 1.65, color: '#333', whiteSpace: 'pre-wrap', maxWidth: 980 }}>
                  {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
                </div>
              )}

              {node.playerGoal && (
                <div
                  style={{
                    backgroundColor: '#FFF8E8',
                    border: '1px solid #CDBF94',
                    borderRadius: 8,
                    padding: '0.75rem 0.875rem',
                    fontSize: '0.8125rem',
                    lineHeight: 1.55,
                    color: '#3B3427',
                  }}
                >
                  <strong>Your goal: </strong>{renderContentWithGlossary(interpolate(node.playerGoal, { playerName, branchFlags, mcSelections }))}
                </div>
              )}
            </div>

            {node.illustration && (
              <figure
                className="maya-context-thumbnail"
                style={{
                  margin: 0,
                  border: '1px solid rgba(0,0,0,0.22)',
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#E8DCC8',
                  minHeight: 132,
                  boxShadow: '2px 2px 0 rgba(0,0,0,0.28)',
                }}
              >
                <img
                  src={node.illustration}
                  alt=""
                  style={{ width: '100%', height: '100%', minHeight: 132, objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              </figure>
            )}
          </section>

          <section
            className="maya-meeting-toolbar"
            style={{
              background: '#F7F1E3',
              border: '1px solid rgba(0,0,0,0.22)',
              borderRadius: 8,
              padding: '0.75rem',
              color: '#1E1E1A',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <div
                aria-hidden="true"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  border: '1px solid #000',
                  background: '#3A6B5E',
                  color: '#F2EBD9',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 900,
                  boxShadow: npcSpeaking ? '0 0 0 5px rgba(58,107,94,0.22)' : 'none',
                  flexShrink: 0,
                }}
              >
                {npcInitials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 800 }}>{npc.name}</div>
                <div style={{ fontSize: '0.74rem', color: '#615844' }}>{npc.role}</div>
              </div>
              <div
                style={{
                  border: status === 'error' ? '1px solid #B87D6B' : '1px solid #CDBF94',
                  background: status === 'error' ? '#F4E2D9' : '#FFF8E8',
                  color: status === 'error' ? '#7B3D32' : '#4B4538',
                  borderRadius: 999,
                  padding: '0.28rem 0.55rem',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                {statusLabel}
              </div>
            </div>

            <div className="maya-meeting-actions" style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {import.meta.env.DEV && (
                <button
                  onClick={() => goNext(node)}
                  style={{ background: '#FFF8E8', color: '#1E1E1A', border: '1px solid #CDBF94', borderRadius: 999, padding: '0.45rem 0.7rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 800 }}
                >
                  Skip (dev)
                </button>
              )}
              {!typedStarted && !inCall && !meetingEnded && !visibleTurnLimitReached && (
                <button
                  onClick={startMeeting}
                  style={{ background: '#3A6B5E', color: '#F2EBD9', border: '1px solid #000000', borderRadius: 6, padding: '0.62rem 1.2rem', fontSize: '0.875rem', fontWeight: 800, cursor: 'pointer', boxShadow: '2px 2px 0 #000' }}
                >
                  Speak
                </button>
              )}
              {canEndTypedMeeting && (
                <button
                  onClick={() => endMeeting()}
                  style={{ background: '#D2A39A', color: '#1E1E1A', border: '1px solid #B87D6B', borderRadius: 6, padding: '0.55rem 0.85rem', fontSize: '0.8125rem', fontWeight: 800, cursor: 'pointer' }}
                >
                  Finish conversation
                </button>
              )}
              {inCall && (
                <>
                  <button
                    onClick={toggleMuted}
                    style={{
                      background: muted ? '#D2A39A' : '#FFF8E8',
                      color: '#1E1E1A',
                      border: muted ? '1px solid #B87D6B' : '1px solid #CDBF94',
                      borderRadius: 6,
                      padding: '0.55rem 0.85rem',
                      fontSize: '0.8125rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <MicIcon muted={muted} />
                    {muted ? 'Unmute' : 'Mute'}
                  </button>
                  <button
                    onClick={() => endMeeting()}
                    style={{ background: '#D2A39A', color: '#1E1E1A', border: '1px solid #B87D6B', borderRadius: 6, padding: '0.55rem 0.85rem', fontSize: '0.8125rem', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Finish conversation
                  </button>
                </>
              )}
            </div>
          </section>

          <section className={showPreviousDesignNotes ? 'maya-meeting-workspace' : 'maya-meeting-workspace maya-meeting-workspace-single'}>
            <div
              className="maya-workspace-panel maya-conversation-panel"
              ref={transcriptRef}
              style={{
                background: '#FFF8E8',
                border: '1px solid rgba(0,0,0,0.22)',
                borderRadius: 8,
                display: 'flex',
                flexDirection: 'column',
                color: '#1E1E1A',
              }}
            >
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                  background: '#FFF8E8',
                  borderBottom: '1px solid #E0D3AE',
                  padding: '0.75rem 0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>Live conversation</div>
                  <div style={{ fontSize: '0.72rem', color: '#6A604B', marginTop: 2 }}>Transcript appears here while you talk.</div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6A604B', whiteSpace: 'nowrap' }}>
                  {userTurns}/{minTurns} turns
                </div>
              </div>

              <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {messages.length === 0 && !liveUser && !liveNpc && (
                  <div style={{ border: '1px dashed #CDBF94', background: '#FBF7EA', borderRadius: 8, padding: '0.85rem', fontSize: '0.8125rem', lineHeight: 1.55, color: '#6A604B' }}>
                    Use Speak or type to {npc.name} when you are ready. The conversation will appear here for grading.
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                    <div style={{ fontSize: '0.7rem', color: '#6A604B', marginBottom: 3, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                      {m.role === 'user' ? 'You' : npc.name}
                    </div>
                    <div
                      style={{
                        background: m.role === 'user' ? '#B87D6B' : '#F2EBD9',
                        color: m.role === 'user' ? '#FFF8E8' : '#1E1E1A',
                        border: '1px solid rgba(0,0,0,0.16)',
                        padding: '0.62rem 0.72rem',
                        borderRadius: 8,
                        fontSize: '0.84rem',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-wrap',
                        boxShadow: '1px 1px 0 rgba(0,0,0,0.12)',
                      }}
                    >
                      {renderContentWithGlossary(m.content)}
                    </div>
                  </div>
                ))}
                {liveUser && (
                  <div style={{ alignSelf: 'flex-end', maxWidth: '82%', opacity: 0.82 }}>
                    <div style={{ fontSize: '0.7rem', color: '#6A604B', marginBottom: 3, textAlign: 'right' }}>You</div>
                    <div style={{ border: '1px dashed #B87D6B', background: '#FFFDF5', borderRadius: 8, padding: '0.62rem 0.72rem', fontSize: '0.84rem', lineHeight: 1.5 }}>{liveUser}</div>
                  </div>
                )}
                {liveNpc && (
                  <div style={{ alignSelf: 'flex-start', maxWidth: '82%', opacity: 0.82 }}>
                    <div style={{ fontSize: '0.7rem', color: '#6A604B', marginBottom: 3 }}>{npc.name}</div>
                    <div style={{ border: '1px dashed #CDBF94', background: '#FFFDF5', borderRadius: 8, padding: '0.62rem 0.72rem', fontSize: '0.84rem', lineHeight: 1.5 }}>{liveNpc}</div>
                  </div>
                )}
              </div>
              {typedComposer}
            </div>

            {showPreviousDesignNotes && (
              <aside
                className="maya-workspace-panel maya-design-notes-panel"
                aria-label="Earlier design notes"
                style={{
                  background: '#F7F1E3',
                  border: '1px solid rgba(0,0,0,0.22)',
                  borderRadius: 8,
                  color: '#1E1E1A',
                }}
              >
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    background: '#F7F1E3',
                    borderBottom: '1px solid #D9CAA3',
                    padding: '0.75rem 0.85rem',
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
                    Earlier design notes
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6A604B', marginTop: 2 }}>
                    Saved from your ideation task.
                  </div>
                </div>

                <div style={{ padding: '0.85rem 0.85rem 3.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {designNoteBlocks.length ? designNoteBlocks.map((block, index) => (
                    <section
                      key={`${block.heading}-${index}`}
                      style={{
                        border: '1px solid #D9CAA3',
                        background: '#FFF8E8',
                        borderRadius: 8,
                        padding: '0.7rem 0.75rem',
                      }}
                    >
                      <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#3A6B5E', marginBottom: '0.45rem' }}>
                        {block.heading}
                      </div>
                      <div style={{ fontSize: '0.82rem', lineHeight: 1.58, whiteSpace: 'pre-wrap', color: '#2F2A20' }}>
                        {block.body}
                      </div>
                    </section>
                  )) : (
                    <div style={{ border: '1px dashed #CDBF94', background: '#FFF8E8', borderRadius: 8, padding: '0.85rem', fontSize: '0.8125rem', lineHeight: 1.55, color: '#6A604B' }}>
                      No design notes saved yet.
                    </div>
                  )}
                </div>
              </aside>
            )}
          </section>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <ActionButton
              text="Submit & continue"
              onClick={() => goNext(node)}
              disabled={!canSubmit}
              variant={canSubmit ? 'primary' : 'secondary'}
              fullWidth={false}
            />
            {!canSubmit && (
              <span style={{ fontSize: '0.75rem', color: '#666' }}>
                Speak or type at least {minTurns} turn{minTurns === 1 ? '' : 's'}, then finish the conversation to continue.
              </span>
            )}
          </div>
        </motion.div>
      </SceneWrapper>
    )
  }

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 }}>{node.title}</h1>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}

        {node.playerGoal && (
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #000',
              padding: '0.75rem 1rem',
              fontSize: '0.8125rem',
              color: '#444',
            }}
          >
            <strong>Your goal: </strong>{renderContentWithGlossary(interpolate(node.playerGoal, { playerName, branchFlags, mcSelections }))}
          </div>
        )}

        <DesktopOverlay>
          <LaptopFrame variant="meeting" title={`Live meeting – ${npc.name}`} fill>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#F2EBD9', padding: '0.875rem' }}>

              {/* NPC header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: '50%',
                      background: '#B87D6B',
                      color: '#F2EBD9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      border: '1px solid rgba(242,235,217,0.4)',
                      boxShadow: npcSpeaking ? '0 0 0 5px rgba(184,125,107,0.45)' : 'none',
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    {npc.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{npc.name}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.68 }}>{npc.role}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.72 }}>{statusLabel}</div>
              </div>

              {/* Transcript */}
              <div
                ref={transcriptRef}
                style={{
                  flex: 1,
                  marginTop: '0.875rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(242,235,217,0.18)',
                  padding: '0.75rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  minHeight: 0,
                }}
              >
                {messages.length === 0 && !liveUser && !liveNpc && (
                  <div style={{ fontSize: '0.8125rem', opacity: 0.65 }}>
                    Join the meeting when you are ready. Your spoken transcript will appear here and feed the final grading.
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
                    <div style={{ fontSize: '0.6875rem', opacity: 0.65, marginBottom: 2 }}>
                      {m.role === 'user' ? 'You' : npc.name}
                    </div>
                    <div
                      style={{
                        background: m.role === 'user' ? '#B87D6B' : 'rgba(242,235,217,0.12)',
                        color: '#F2EBD9',
                        border: '1px solid rgba(242,235,217,0.2)',
                        padding: '0.5rem 0.625rem',
                        borderRadius: '4px',
                        fontSize: '0.8125rem',
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {renderContentWithGlossary(m.content)}
                    </div>
                  </div>
                ))}
                {liveUser && (
                  <div style={{ alignSelf: 'flex-end', maxWidth: '88%', opacity: 0.72 }}>
                    <div style={{ fontSize: '0.6875rem', marginBottom: 2 }}>You</div>
                    <div style={{ border: '1px dashed rgba(242,235,217,0.5)', borderRadius: '4px', padding: '0.5rem 0.625rem', fontSize: '0.8125rem' }}>{liveUser}</div>
                  </div>
                )}
                {liveNpc && (
                  <div style={{ alignSelf: 'flex-start', maxWidth: '88%', opacity: 0.72 }}>
                    <div style={{ fontSize: '0.6875rem', marginBottom: 2 }}>{npc.name}</div>
                    <div style={{ border: '1px dashed rgba(242,235,217,0.5)', borderRadius: '4px', padding: '0.5rem 0.625rem', fontSize: '0.8125rem' }}>{liveNpc}</div>
                  </div>
                )}
              </div>

              {/* In-screen controls */}
              <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', alignItems: 'center', paddingTop: '0.75rem', flexShrink: 0 }}>
                {import.meta.env.DEV && (
                  <button
                    onClick={() => goNext(node)}
                    style={{ background: '#F7F1E3', color: '#1E1E1A', border: '1px solid #CDBF94', borderRadius: '20px', padding: '0.35rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer' }}
                  >
                    Skip (dev)
                  </button>
                )}
                {!inCall && !meetingEnded && (
                  <button
                    onClick={startMeeting}
                    style={{ background: '#B87D6B', color: '#F2EBD9', border: '1px solid #000000', borderRadius: '24px', padding: '0.55rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Join meeting
                  </button>
                )}
                {inCall && (
                  <>
                    <button
                      onClick={toggleMuted}
                      style={{
                        background: muted ? '#D2A39A' : '#F7F1E3',
                        color: '#1E1E1A',
                        border: muted ? '1px solid #B87D6B' : '1px solid #CDBF94',
                        borderRadius: '50px',
                        padding: '0.45rem 1rem',
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <MicIcon muted={muted} />
                      {muted ? 'Unmute' : 'Mute'}
                    </button>
                    <button
                      onClick={() => endMeeting()}
                      style={{ background: '#D2A39A', color: '#1E1E1A', border: '1px solid #B87D6B', borderRadius: '50px', padding: '0.45rem 1rem', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}
                    >
                      End meeting
                    </button>
                  </>
                )}
              </div>

            </div>
          </LaptopFrame>
        </DesktopOverlay>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <ActionButton
            text="Submit & continue"
            onClick={() => goNext(node)}
            disabled={!canSubmit}
            variant={canSubmit ? 'primary' : 'secondary'}
            fullWidth={false}
          />
          {!canSubmit && (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>
              Speak at least {minTurns} turn{minTurns === 1 ? '' : 's'}, then end the meeting to continue.
            </span>
          )}
        </div>
      </motion.div>
    </SceneWrapper>
  )
}
