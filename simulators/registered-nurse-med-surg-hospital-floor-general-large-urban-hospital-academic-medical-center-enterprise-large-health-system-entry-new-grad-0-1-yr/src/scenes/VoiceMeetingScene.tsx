import { useEffect, useRef, useState } from 'react'
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
import { GeminiLiveSession, type LiveStatus } from '../services/geminiLive'
import type { ChatMessage, VoiceMeetingNode } from '../types/game'

interface Props { node: VoiceMeetingNode }

function buildSystemPrompt(args: {
  node: VoiceMeetingNode
  npc: { name: string; role: string; persona: string; voice?: string }
  playerName: string
  goalPrompt: string
  meetingContext: string
}) {
  const { node, npc, playerName, goalPrompt, meetingContext } = args
  const initial = (node.initialMessages || [])
    .map((m) => `${m.role === 'user' ? playerName || 'Student' : npc.name}: ${m.content}`)
    .join('\n')

  const setting = node.presentation === 'in_person'
    ? `in an in-person bedside conversation with ${playerName || 'the student'}`
    : `in a live voice meeting with ${playerName || 'the student'}`
  const contextLabel = node.presentation === 'in_person' ? 'CONVERSATION' : 'MEETING'

  return `You are ${npc.name}, ${npc.role}, ${setting}.

PERSONA:
${npc.persona}
${npc.voice ? `\nVOICE: ${npc.voice}` : ''}

${contextLabel} GOAL:
${goalPrompt}

${contextLabel} CONTEXT:
${meetingContext || 'Use the scene context and your persona to make this feel like a realistic workplace conversation.'}

${initial ? `INITIAL CONTEXT MESSAGES:\n${initial}\n` : ''}
RULES:
- Speak naturally, like a real colleague, client, patient, or family member in this setting.
- Keep each turn under 90 words unless the student asks for detail.
- Ask follow-up questions, push back, clarify ambiguity, and react to the student's actual words.
- Do not mention being an AI, a model, or a simulator.
- Do not grade the student during the conversation.
- Stay focused on the conversation goal and the workplace stakes.`
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

function ReferenceBlock({ title, content }: { title: string; content: string }) {
  return (
    <section
      style={{
        background: '#FFF8E8',
        border: '1px solid rgba(0,0,0,0.22)',
        padding: '0.875rem 1rem',
      }}
    >
      <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem', color: '#3A6B5E' }}>
        {title}
      </div>
      <div style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: '#222', whiteSpace: 'pre-wrap' }}>
        {renderContentWithGlossary(content)}
      </div>
    </section>
  )
}

function PrepNotesPanel({
  title,
  content,
  emptyText,
  isInPerson,
}: {
  title: string
  content: string
  emptyText?: string
  isInPerson: boolean
}) {
  const trimmed = content.trim()

  return (
    <section
      style={{
        flex: 1,
        minHeight: isInPerson ? 150 : 0,
        maxHeight: isInPerson ? 260 : undefined,
        overflowY: 'auto',
        background: isInPerson ? '#FFF8E8' : 'rgba(255,255,255,0.06)',
        border: isInPerson ? '1px solid rgba(0,0,0,0.22)' : '1px solid rgba(242,235,217,0.18)',
        padding: '0.75rem',
        color: isInPerson ? '#222' : '#F2EBD9',
      }}
    >
      <div style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.5rem', color: isInPerson ? '#3A6B5E' : '#F2EBD9' }}>
        {title}
      </div>
      <div style={{ fontSize: '0.8125rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', opacity: trimmed ? 1 : 0.65 }}>
        {trimmed || emptyText || 'No prep notes yet.'}
      </div>
    </section>
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
  const freeTextResponses = useGameStore((s) => s.freeTextResponses)
  const goNext = useGoNext()

  const [status, setStatus] = useState<LiveStatus>('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [muted, setMuted] = useState(false)
  const [meetingEnded, setMeetingEnded] = useState(false)
  const [npcSpeaking, setNpcSpeaking] = useState(false)
  const [liveUser, setLiveUser] = useState('')
  const [liveNpc, setLiveNpc] = useState('')

  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const pendingUserRef = useRef('')
  const pendingNpcRef = useRef('')
  const lastRoleRef = useRef<'user' | 'npc' | null>(null)
  const initializedRef = useRef(false)

  const goalPrompt = interpolate(node.goalPrompt, { playerName, branchFlags, mcSelections })
  const meetingContext = interpolate(node.meetingContext || node.content || '', { playerName, branchFlags, mcSelections })
  const prepReference = node.prepReferenceContent
    ? interpolate(node.prepReferenceContent, { playerName, branchFlags, mcSelections })
    : ''
  const minTurns = node.minTurns ?? 2
  const maxTurns = node.maxTurns ?? 8
  const userTurns = messages.filter((m) => m.role === 'user').length
  const canSubmit = meetingEnded && userTurns >= minTurns
  const isInPerson = node.presentation === 'in_person'
  const prepNoteKey = node.prepNoteKey
  const prepNoteContent = prepNoteKey ? freeTextResponses[prepNoteKey] || '' : ''
  const hasPrepNotePanel = Boolean(prepNoteKey)

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    if (node.initialMessages?.length && messages.length === 0) {
      node.initialMessages.forEach((m) => appendNpcMessage(conversationKey, m))
    }
  }, [appendNpcMessage, conversationKey, messages.length, node.initialMessages])

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
    if (!npc || sessionRef.current) return
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

  const endMeeting = () => {
    flushPending('user')
    flushPending('npc')
    sessionRef.current?.stop()
    sessionRef.current = null
    setMeetingEnded(true)
    setMuted(false)
  }

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    sessionRef.current?.setMuted(next)
  }

  if (!npc) {
    return (
      <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
        <div style={{ color: '#c0392b' }}>Unknown NPC: <code>{node.npcId}</code>.</div>
      </SceneWrapper>
    )
  }

  const statusLabel =
    status === 'connecting' ? 'Connecting...'
    : status === 'connected' ? (muted ? 'Muted' : npcSpeaking ? `${npc.name} is speaking...` : 'Listening...')
    : status === 'closed' ? (isInPerson ? 'Conversation ended' : 'Meeting ended')
    : status === 'error' ? `Error: ${statusDetail}`
    : 'Ready'

  const inCall = status !== 'idle' && status !== 'closed' && status !== 'error'

  const transcript = (
    <div
      style={{
        flex: hasPrepNotePanel ? 1 : isInPerson ? 'initial' : 1,
        marginTop: hasPrepNotePanel ? 0 : isInPerson ? 0 : '0.875rem',
        background: isInPerson ? '#FFF8E8' : 'rgba(255,255,255,0.06)',
        border: isInPerson ? '1px solid rgba(0,0,0,0.22)' : '1px solid rgba(242,235,217,0.18)',
        padding: '0.75rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        minHeight: isInPerson ? 150 : 0,
        maxHeight: isInPerson ? 260 : undefined,
        color: isInPerson ? '#222' : '#F2EBD9',
      }}
    >
      {messages.length === 0 && !liveUser && !liveNpc && (
        <div style={{ fontSize: '0.8125rem', opacity: 0.65 }}>
          {isInPerson
            ? `Press Speak when you are ready. Your spoken conversation with ${npc.name} will appear here for grading.`
            : 'Join the meeting when you are ready. Your spoken transcript will appear here and feed the final grading.'}
        </div>
      )}
      {messages.map((m, i) => (
        <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
          <div style={{ fontSize: '0.6875rem', opacity: 0.65, marginBottom: 2 }}>
            {m.role === 'user' ? 'You' : npc.name}
          </div>
          <div
            style={{
              background: m.role === 'user' ? '#B87D6B' : isInPerson ? '#F2EBD9' : 'rgba(242,235,217,0.12)',
              color: m.role === 'user' ? '#F2EBD9' : isInPerson ? '#222' : '#F2EBD9',
              border: isInPerson ? '1px solid rgba(0,0,0,0.18)' : '1px solid rgba(242,235,217,0.2)',
              padding: '0.5rem 0.625rem',
              borderRadius: '4px',
              fontSize: '0.8125rem',
              lineHeight: 1.45,
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        </div>
      ))}
      {liveUser && (
        <div style={{ alignSelf: 'flex-end', maxWidth: '88%', opacity: 0.72 }}>
          <div style={{ fontSize: '0.6875rem', marginBottom: 2 }}>You</div>
          <div style={{ border: isInPerson ? '1px dashed rgba(0,0,0,0.4)' : '1px dashed rgba(242,235,217,0.5)', borderRadius: '4px', padding: '0.5rem 0.625rem', fontSize: '0.8125rem' }}>{liveUser}</div>
        </div>
      )}
      {liveNpc && (
        <div style={{ alignSelf: 'flex-start', maxWidth: '88%', opacity: 0.72 }}>
          <div style={{ fontSize: '0.6875rem', marginBottom: 2 }}>{npc.name}</div>
          <div style={{ border: isInPerson ? '1px dashed rgba(0,0,0,0.4)' : '1px dashed rgba(242,235,217,0.5)', borderRadius: '4px', padding: '0.5rem 0.625rem', fontSize: '0.8125rem' }}>{liveNpc}</div>
        </div>
      )}
    </div>
  )

  const conversationPanels = hasPrepNotePanel ? (
    <div
      style={{
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'stretch',
        flex: isInPerson ? 'initial' : 1,
        minHeight: isInPerson ? 170 : 0,
        marginTop: isInPerson ? 0 : '0.875rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1.35 1 20rem', minWidth: '16rem', minHeight: 0, display: 'flex' }}>
        {transcript}
      </div>
      <div style={{ flex: '0.85 1 14rem', minWidth: '13rem', minHeight: 0, display: 'flex' }}>
        <PrepNotesPanel
          title={node.prepNoteTitle || 'Your prep notes'}
          content={prepNoteContent}
          emptyText={node.prepNoteEmptyText}
          isInPerson={isInPerson}
        />
      </div>
    </div>
  ) : transcript

  const controls = (
    <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'center', alignItems: 'center', paddingTop: isInPerson ? 0 : '0.75rem', flexShrink: 0, flexWrap: 'wrap' }}>
      {import.meta.env.DEV && (
        <button
          onClick={() => goNext(node)}
          style={{
            background: isInPerson ? 'transparent' : 'rgba(255,255,255,0.1)',
            color: isInPerson ? '#333' : '#F2EBD9',
            border: isInPerson ? '1px solid rgba(0,0,0,0.24)' : '1px solid rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '0.35rem 0.75rem',
            fontSize: '0.7rem',
            cursor: 'pointer',
          }}
        >
          Skip (dev)
        </button>
      )}
      {!inCall && !meetingEnded && (
        <button
          onClick={startMeeting}
          style={{ background: '#3A6B5E', color: '#fff', border: '1px solid #000', borderRadius: '4px', padding: '0.65rem 1.75rem', fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', boxShadow: '3px 3px 0 #000' }}
        >
          {isInPerson ? 'Speak' : 'Join meeting'}
        </button>
      )}
      {inCall && (
        <>
          <button
            onClick={toggleMuted}
            style={{
              background: muted ? '#B87D6B' : isInPerson ? '#F2EBD9' : 'rgba(255,255,255,0.14)',
              color: muted ? '#fff' : isInPerson ? '#222' : '#fff',
              border: muted ? '1px solid #000' : isInPerson ? '1px solid rgba(0,0,0,0.45)' : '1px solid rgba(255,255,255,0.25)',
              borderRadius: '4px',
              padding: '0.55rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
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
            onClick={endMeeting}
            style={{ background: '#B87D6B', color: '#fff', border: '1px solid #000', borderRadius: '4px', padding: '0.55rem 1rem', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer' }}
          >
            {isInPerson ? 'Finish conversation' : 'End meeting'}
          </button>
        </>
      )}
    </div>
  )

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
            <strong>Your goal: </strong>{interpolate(node.playerGoal, { playerName, branchFlags, mcSelections })}
          </div>
        )}

        {isInPerson ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div
              style={{
                width: 'calc(100% + 6rem)',
                marginLeft: '-3rem',
                aspectRatio: '16 / 9',
                overflow: 'hidden',
                borderTop: '1px solid #000',
                borderBottom: '1px solid #000',
                background: '#E8DCC8',
              }}
            >
              {node.illustration && (
                <img
                  src={node.illustration}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={(e) => { e.currentTarget.style.display = 'none' }}
                />
              )}
            </div>
            {prepReference && (
              <ReferenceBlock title={node.prepReferenceTitle || 'Reference'} content={prepReference} />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{npc.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#555' }}>{npc.role}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: status === 'error' ? '#9b2d20' : '#555' }}>{statusLabel}</div>
            </div>
            {controls}
            {conversationPanels}
          </div>
        ) : (
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
              {conversationPanels}

              {/* In-screen controls */}
              {controls}

            </div>
            </LaptopFrame>
          </DesktopOverlay>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <ActionButton
            text={(node as any).continueLabel || 'Submit & continue'}
            onClick={() => goNext(node)}
            disabled={!canSubmit}
            variant={canSubmit ? 'primary' : 'secondary'}
            fullWidth={false}
          />
          {!canSubmit && (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>
              Speak at least {minTurns} turn{minTurns === 1 ? '' : 's'}, then {isInPerson ? 'finish the conversation' : 'end the meeting'} to continue.
            </span>
          )}
        </div>
      </motion.div>
    </SceneWrapper>
  )
}
