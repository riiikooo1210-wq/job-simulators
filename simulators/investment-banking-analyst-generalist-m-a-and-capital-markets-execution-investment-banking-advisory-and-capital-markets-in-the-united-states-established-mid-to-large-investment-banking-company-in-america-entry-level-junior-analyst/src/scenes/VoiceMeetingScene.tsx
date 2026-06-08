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
import { showDevControls } from '../lib/devControls'
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

  return `You are ${npc.name}, ${npc.role}, in a live voice meeting with ${playerName || 'the student'}.

PERSONA:
${npc.persona}
${npc.voice ? `\nVOICE: ${npc.voice}` : ''}

MEETING GOAL:
${goalPrompt}

MEETING CONTEXT:
${meetingContext || 'Use the scene context and your persona to make this feel like a realistic workplace conversation.'}

${initial ? `INITIAL CONTEXT MESSAGES:\n${initial}\n` : ''}
RULES:
- Speak naturally, like a real colleague or client on a call.
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

function SupportDoc({ content }: { content: string }) {
  const lines = content.split('\n')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} style={{ height: '0.25rem' }} />
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} style={{ fontSize: '0.875rem', fontWeight: 800, color: '#24483F', margin: '0.35rem 0 0.125rem' }}>
              {renderContentWithGlossary(trimmed.slice(4))}
            </h3>
          )
        }
        if (trimmed.startsWith('- ')) {
          return (
            <div key={idx} style={{ display: 'flex', gap: '0.375rem', fontSize: '0.78rem', lineHeight: 1.55, color: '#333' }}>
              <span style={{ color: '#6B9EA6', fontWeight: 800, flexShrink: 0 }}>-</span>
              <span>{renderContentWithGlossary(trimmed.slice(2))}</span>
            </div>
          )
        }
        return (
          <p key={idx} style={{ fontSize: '0.8rem', lineHeight: 1.55, color: '#333', margin: 0 }}>
            {renderContentWithGlossary(trimmed)}
          </p>
        )
      })}
    </div>
  )
}

function PriorResponseNote({ title, content }: { title: string; content: string }) {
  return (
    <div
      style={{
        border: '1px solid #D6D0BE',
        backgroundColor: '#FFFDF7',
        padding: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#24483F', textTransform: 'uppercase', letterSpacing: 0 }}>
        {title}
      </div>
      <div style={{ fontSize: '0.8rem', lineHeight: 1.55, color: '#333', whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    </div>
  )
}

export default function VoiceMeetingScene({ node }: Props) {
  const npc = npcs[node.npcId]
  const conversationKey = `voice:${node.id}:${node.npcId}`
  const messages = useGameStore((s) => s.npcConversations[conversationKey] || [])
  const appendNpcMessage = useGameStore((s) => s.appendNpcMessage)
  const freeTextResponses = useGameStore((s) => s.freeTextResponses)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
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
  const supportDocContent = node.supportDocContent
    ? interpolate(node.supportDocContent, { playerName, branchFlags, mcSelections })
    : ''
  const supportDocResponse = node.supportDocResponseKey
    ? (freeTextResponses[node.supportDocResponseKey] || node.supportDocResponseFallback || '').trim()
    : ''
  const hasSupportDoc = Boolean(node.supportDocContent || node.supportDocResponseKey)
  const minTurns = node.minTurns ?? 2
  const maxTurns = node.maxTurns ?? 8
  const userTurns = messages.filter((m) => m.role === 'user').length
  const canSubmit = meetingEnded && userTurns >= minTurns

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
    : status === 'closed' ? 'Meeting ended'
    : status === 'error' ? `Error: ${statusDetail}`
    : 'Ready'

  const inCall = status !== 'idle' && status !== 'closed' && status !== 'error'
  const hasApiKeyConfigured = Boolean(
    import.meta.env.VITE_GEMINI_API_KEY &&
    import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here',
  )
  const showMeetingDevSkip = import.meta.env.DEV || showDevControls

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          {showMeetingDevSkip && (
            <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
          )}
        </div>
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

        <DesktopOverlay width="75%" height="82%">
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              height: '100%',
              width: '100%',
              minHeight: 0,
            }}
          >
            {hasSupportDoc && (
              <div style={{ flex: '0.78 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <LaptopFrame variant="doc" title={node.supportDocTitle || 'Support Notes'} fill scrollable>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {node.supportDocResponseKey && (
                      <PriorResponseNote
                        title={node.supportDocResponseTitle || 'Your Prior Note'}
                        content={supportDocResponse || 'No prior response is saved yet. Use the source notes below and go back if you want to revise the Slack update first.'}
                      />
                    )}
                    {supportDocContent && <SupportDoc content={supportDocContent} />}
                  </div>
                </LaptopFrame>
              </div>
            )}
            <div style={{ flex: '1.22 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <LaptopFrame variant="meeting" title={`Live meeting – ${npc.name}`} fill>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#F2EBD9', padding: '0.75rem' }}>

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
                      {m.content}
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
                {!inCall && !meetingEnded && status !== 'error' && (
                  <button
                    onClick={startMeeting}
                    style={{ background: '#3A6B5E', color: '#F7F1E3', border: '1px solid rgba(247,241,227,0.35)', borderRadius: '24px', padding: '0.55rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Join meeting
                  </button>
                )}
                {!inCall && !meetingEnded && status === 'error' && hasApiKeyConfigured && (
                  <button
                    onClick={startMeeting}
                    style={{ background: '#3A6B5E', color: '#F7F1E3', border: '1px solid rgba(247,241,227,0.35)', borderRadius: '24px', padding: '0.55rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Retry connection
                  </button>
                )}
                {inCall && (
                  <>
                    <button
                      onClick={toggleMuted}
                      style={{
                        background: muted ? '#B87D6B' : 'rgba(255,255,255,0.14)',
                        color: '#F7F1E3',
                        border: muted ? '1px solid #D2A39A' : '1px solid rgba(255,255,255,0.25)',
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
                      onClick={endMeeting}
                      style={{ background: '#B87D6B', color: '#F7F1E3', border: '1px solid #D2A39A', borderRadius: '50px', padding: '0.45rem 1rem', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}
                    >
                      End meeting
                    </button>
                  </>
                )}
              </div>

            </div>
              </LaptopFrame>
            </div>
          </div>
        </DesktopOverlay>

        {meetingEnded ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <ActionButton
              text="Continue"
              onClick={() => goNext(node)}
              disabled={!canSubmit}
              variant={canSubmit ? 'primary' : 'secondary'}
              fullWidth={false}
            />
            {!canSubmit && (
              <span style={{ fontSize: '0.75rem', color: '#666' }}>
                Speak at least {minTurns} turn{minTurns === 1 ? '' : 's'} before continuing.
              </span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#666' }}>
            {status === 'error' && !hasApiKeyConfigured
              ? 'Set VITE_GEMINI_API_KEY in .env, restart the dev server, then reload this simulation.'
              : `Join the meeting, speak at least ${minTurns} turn${minTurns === 1 ? '' : 's'}, then end it to continue.`}
          </span>
        )}
      </motion.div>
    </SceneWrapper>
  )
}
