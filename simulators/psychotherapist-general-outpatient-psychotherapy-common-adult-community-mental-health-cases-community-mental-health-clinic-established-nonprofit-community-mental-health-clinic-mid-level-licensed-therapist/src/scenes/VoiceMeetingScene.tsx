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
  const mode = node.meetingMode || node.presentation
  const isInPerson = mode === 'in_person'
  const isVoicemail = mode === 'voicemail'
  if (isVoicemail) {
    return `You are the silent voicemail recording system for ${npc.name}'s phone.

The student is leaving one voicemail message from the clinic. Your job is only to help transcribe the student's speech.

VOICEMAIL CONTEXT:
${meetingContext || 'The caller is leaving a privacy-safe callback message.'}

MESSAGE GOAL:
${goalPrompt}

RULES:
- Do not speak, greet, ask questions, answer, or simulate the client.
- Do not mention being an AI, a model, or a simulator.
- If the student pauses, remain silent.
- The only usable content from this task is the student's spoken voicemail transcript.`
  }
  const meetingPhrase = isInPerson ? 'in an in-person workplace conversation' : 'in a live voice meeting'
  const speechStyle = isInPerson
    ? 'Speak naturally, like a real colleague or client sitting or standing with the student in the same workplace.'
    : 'Speak naturally, like a real colleague or client on a call.'
  const initial = (node.initialMessages || [])
    .map((m) => `${m.role === 'user' ? playerName || 'Student' : npc.name}: ${m.content}`)
    .join('\n')

  return `You are ${npc.name}, ${npc.role}, ${meetingPhrase} with ${playerName || 'the student'}.

PERSONA:
${npc.persona}
${npc.voice ? `\nVOICE: ${npc.voice}` : ''}

MEETING GOAL:
${goalPrompt}

MEETING CONTEXT:
${meetingContext || 'Use the scene context and your persona to make this feel like a realistic workplace conversation.'}

${initial ? `INITIAL CONTEXT MESSAGES:\n${initial}\n` : ''}
RULES:
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

function PhoneIcon({ hangup = false }: { hangup?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.72 19.72 0 0 1-8.59-3.05 19.31 19.31 0 0 1-6-6A19.72 19.72 0 0 1 2.18 4.18 2 2 0 0 1 4.16 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.62a2 2 0 0 1-.45 2.11L8.05 9.73a16 16 0 0 0 6.22 6.22l1.28-1.28a2 2 0 0 1 2.11-.45c.84.29 1.72.5 2.62.62A2 2 0 0 1 22 16.92z" />
      {hangup && <line x1="4" y1="20" x2="20" y2="4" strokeWidth={2.4} />}
    </svg>
  )
}

function ReferenceBlock({ title, content }: { title: string; content: string }) {
  return (
    <section style={{ minWidth: 0 }}>
      <div style={{ fontSize: '0.6875rem', opacity: 0.72, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.35rem' }}>
        {title}
      </div>
      <div
        style={{
          fontSize: '0.75rem',
          lineHeight: 1.5,
          whiteSpace: 'pre-wrap',
          color: '#1E1E1A',
        }}
      >
        {renderContentWithGlossary(content)}
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
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
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

  const mode = node.meetingMode || node.presentation
  const isInPerson = mode === 'in_person'
  const isVoicemail = mode === 'voicemail'
  const goalPrompt = interpolate(node.goalPrompt, { playerName, branchFlags, mcSelections })
  const meetingContext = interpolate(node.meetingContext || node.content || '', { playerName, branchFlags, mcSelections })
  const playerGoal = node.playerGoal ? interpolate(node.playerGoal, { playerName, branchFlags, mcSelections }) : ''
  const endpoint = node.endpoint ? interpolate(node.endpoint, { playerName, branchFlags, mcSelections }) : ''
  const successCriteria = node.successCriteria ? interpolate(node.successCriteria, { playerName, branchFlags, mcSelections }) : ''
  const prepReference = node.prepReferenceContent
    ? interpolate(node.prepReferenceContent, { playerName, branchFlags, mcSelections })
    : ''
  const prepNote = node.prepNoteKey ? freeTextResponses[node.prepNoteKey]?.trim() : ''
  const sessionNotesKey = node.sessionNotesKey || ''
  const sessionNotes = sessionNotesKey ? freeTextResponses[sessionNotesKey] || '' : ''
  const hasSessionNotes = Boolean(sessionNotesKey)
  const sessionNotesPlacement = node.sessionNotesPlacement || 'reference'
  const showSessionNotesInReference = hasSessionNotes && sessionNotesPlacement !== 'below_image'
  const showSessionNotesBelowImage = isInPerson && hasSessionNotes && sessionNotesPlacement === 'below_image'
  const voicemailDraftKey = isVoicemail ? (node.voicemailDraftKey || `${node.id}_draft`) : ''
  const voicemailDraft = voicemailDraftKey ? freeTextResponses[voicemailDraftKey] || '' : ''
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
    if (isVoicemail && role === 'npc') {
      pendingNpcRef.current = ''
      setLiveNpc('')
      return
    }
    const msg: ChatMessage = { role, content: trimmed, ts: new Date().toISOString() }
    appendNpcMessage(conversationKey, msg)
    if (isVoicemail && role === 'user') {
      const existing = useGameStore.getState().freeTextResponses[node.id]?.trim()
      setFreeTextResponse(node.id, existing ? `${existing}\n${trimmed}` : trimmed)
    }
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
        if (isVoicemail) return
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

  const interactionLabel = node.interactionLabel || (isVoicemail ? 'voicemail' : isInPerson ? 'conversation' : 'meeting')
  const startLabel = node.startLabel || (isVoicemail ? 'Start recording' : isInPerson ? 'Start conversation' : 'Join meeting')
  const endLabel = node.endLabel || (isVoicemail ? 'End voicemail' : isInPerson ? 'End conversation' : 'End meeting')
  const meetingTitle = node.meetingTitle || (isVoicemail ? `Voicemail - ${npc.name}` : isInPerson ? `In-person conversation - ${npc.name}` : `Live meeting - ${npc.name}`)
  const emptyTranscript = isVoicemail
    ? 'Start recording, then say the voicemail out loud. Your spoken message transcript will feed the final grading.'
    : isInPerson
    ? `Start the ${interactionLabel} when you are ready. Your spoken transcript will appear here and feed the final grading.`
    : 'Join the meeting when you are ready. Your spoken transcript will appear here and feed the final grading.'

  const statusLabel =
    status === 'connecting' ? 'Connecting...'
    : status === 'connected' ? (muted ? 'Muted' : isVoicemail ? 'Recording...' : npcSpeaking ? `${npc.name} is speaking...` : 'Listening...')
    : status === 'closed' ? `${interactionLabel[0].toUpperCase()}${interactionLabel.slice(1)} ended`
    : status === 'error' ? `Error: ${statusDetail}`
    : 'Ready'

  const inCall = status !== 'idle' && status !== 'closed' && status !== 'error'

  const meetingInner = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: isInPerson ? 360 : undefined, color: '#1E1E1A', padding: '0.875rem' }}>

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
          background: '#FBF7EA',
          border: '1px solid #CDBF94',
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
            {emptyTranscript}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%' }}>
            <div style={{ fontSize: '0.6875rem', opacity: 0.65, marginBottom: 2 }}>
              {m.role === 'user' ? 'You' : npc.name}
            </div>
            <div
              style={{
                background: m.role === 'user' ? '#B87D6B' : '#F7F1E3',
                color: m.role === 'user' ? '#F2EBD9' : '#1E1E1A',
                border: m.role === 'user' ? '1px solid #B87D6B' : '1px solid #CDBF94',
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
            <div style={{ border: '1px dashed #CDBF94', borderRadius: '4px', padding: '0.5rem 0.625rem', fontSize: '0.8125rem', color: '#1E1E1A' }}>{liveUser}</div>
          </div>
        )}
        {liveNpc && (
          <div style={{ alignSelf: 'flex-start', maxWidth: '88%', opacity: 0.72 }}>
            <div style={{ fontSize: '0.6875rem', marginBottom: 2 }}>{npc.name}</div>
            <div style={{ border: '1px dashed #CDBF94', borderRadius: '4px', padding: '0.5rem 0.625rem', fontSize: '0.8125rem', color: '#1E1E1A' }}>{liveNpc}</div>
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
            {startLabel}
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
              onClick={endMeeting}
              style={{ background: '#D2A39A', color: '#1E1E1A', border: '1px solid #B87D6B', borderRadius: '50px', padding: '0.45rem 1rem', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}
            >
              {endLabel}
            </button>
          </>
        )}
      </div>
    </div>
  )

  const voicemailInner = (
    <div className="voicemail-phone" aria-label={meetingTitle}>
      <div className="voicemail-screen">
        <div className="voicemail-statusbar">
          <span>11:15</span>
          <span>{status === 'connected' ? 'REC' : status === 'closed' || meetingEnded ? 'SAVED' : 'READY'}</span>
        </div>

        <div className="voicemail-contact">
          <div className="voicemail-avatar">{npc.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</div>
          <div>
            <div className="voicemail-contact-name">{npc.name}</div>
            <div className="voicemail-contact-meta">{node.voicemailNumber || 'registered mobile'} - voicemail</div>
          </div>
        </div>

        <div className="voicemail-greeting">
          {node.voicemailGreeting || 'The call went to voicemail. Leave a message after the tone.'}
        </div>

        <div className="voicemail-transcript" aria-live="polite">
          <div className="voicemail-transcript-title">Voicemail transcript</div>
          {messages.length === 0 && !liveUser && (
            <div className="voicemail-empty">{emptyTranscript}</div>
          )}
          {messages.filter((m) => m.role === 'user').map((m, i) => (
            <div key={i} className="voicemail-message">
              {m.content}
            </div>
          ))}
          {liveUser && (
            <div className="voicemail-message voicemail-message--live">
              {liveUser}
            </div>
          )}
        </div>

        <div className="voicemail-controls">
          {import.meta.env.DEV && (
            <button className="voicemail-mini-button" onClick={() => goNext(node)}>
              Skip (dev)
            </button>
          )}
          {!inCall && !meetingEnded && (
            <button className="voicemail-control-button voicemail-control-button--start" onClick={startMeeting} aria-label={startLabel}>
              <PhoneIcon />
              <span>Record</span>
            </button>
          )}
          {inCall && (
            <>
              <button
                className={`voicemail-control-button ${muted ? 'voicemail-control-button--muted' : ''}`}
                onClick={toggleMuted}
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
              >
                <MicIcon muted={muted} />
                <span>{muted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button className="voicemail-control-button voicemail-control-button--end" onClick={endMeeting} aria-label={endLabel}>
                <PhoneIcon hangup />
                <span>End</span>
              </button>
            </>
          )}
        </div>

        {status === 'error' && (
          <div className="voicemail-error">{statusDetail}</div>
        )}
      </div>
    </div>
  )

  const voicemailDraftSection = isVoicemail && voicemailDraftKey ? (
    <section
      style={{
        minWidth: 0,
        border: '1px solid #CDBF94',
        background: '#FFFDF7',
        padding: '0.85rem 1rem',
      }}
    >
      <label
        htmlFor={`${node.id}-voicemail-draft`}
        style={{ display: 'block', fontSize: '0.6875rem', opacity: 0.72, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.35rem' }}
      >
        {node.voicemailDraftTitle || 'Optional draft'}
      </label>
      {node.voicemailDraftPrompt && (
        <div style={{ fontSize: '0.75rem', lineHeight: 1.45, color: '#1E1E1A', marginBottom: '0.5rem' }}>
          {renderContentWithGlossary(interpolate(node.voicemailDraftPrompt, { playerName, branchFlags, mcSelections }))}
        </div>
      )}
      <textarea
        id={`${node.id}-voicemail-draft`}
        value={voicemailDraft}
        onChange={(e) => setFreeTextResponse(voicemailDraftKey, e.target.value)}
        placeholder={node.voicemailDraftPlaceholder ?? 'Optional: jot the exact message before you say it.'}
        style={{
          width: '100%',
          minHeight: 96,
          resize: 'vertical',
          border: '1px solid #CDBF94',
          background: '#FBF7EA',
          color: '#1E1E1A',
          padding: '0.6rem',
          fontFamily: 'inherit',
          fontSize: '0.75rem',
          lineHeight: 1.45,
          outline: 'none',
        }}
      />
    </section>
  ) : null

  const sessionNotesSection = hasSessionNotes ? (
    <section className={showSessionNotesBelowImage ? 'voice-meeting-inperson-note-box' : undefined} style={{ minWidth: 0 }}>
      <label
        htmlFor={`${node.id}-session-notes`}
        style={{ display: 'block', fontSize: '0.6875rem', opacity: 0.72, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.35rem' }}
      >
        {node.sessionNotesTitle || 'Session notes'}
      </label>
      {node.sessionNotesPrompt && (
        <div style={{ fontSize: '0.75rem', lineHeight: 1.45, color: '#1E1E1A', marginBottom: '0.5rem' }}>
          {renderContentWithGlossary(interpolate(node.sessionNotesPrompt, { playerName, branchFlags, mcSelections, freeTextResponses }))}
        </div>
      )}
      <textarea
        id={`${node.id}-session-notes`}
        className={showSessionNotesBelowImage ? 'voice-meeting-inperson-note-textarea' : undefined}
        value={sessionNotes}
        onChange={(e) => setFreeTextResponse(sessionNotesKey, e.target.value)}
        placeholder={node.sessionNotesPlaceholder || 'Jot brief facts you will need later.'}
        style={{
          width: '100%',
          minHeight: showSessionNotesBelowImage ? 104 : 132,
          resize: 'vertical',
          border: '1px solid #CDBF94',
          background: '#FBF7EA',
          color: '#1E1E1A',
          padding: '0.6rem',
          fontFamily: 'inherit',
          fontSize: '0.75rem',
          lineHeight: 1.45,
          outline: 'none',
        }}
      />
    </section>
  ) : null

  const referenceContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {prepReference && (
        <ReferenceBlock title={node.prepReferenceTitle || 'Reference'} content={prepReference} />
      )}
      {prepReference && prepNote && (
        <div style={{ height: 1, background: '#CDBF94', opacity: 0.8 }} />
      )}
      {prepNote && (
        <ReferenceBlock title={node.prepNoteTitle || 'Prep note'} content={prepNote} />
      )}
      {showSessionNotesInReference && (prepReference || prepNote) && (
        <div style={{ height: 1, background: '#CDBF94', opacity: 0.8 }} />
      )}
      {showSessionNotesInReference && sessionNotesSection}
    </div>
  )

  const hasReferencePanel = Boolean(prepReference || prepNote || showSessionNotesInReference)

  const referencePanel = hasReferencePanel ? (
    <div className={isInPerson ? 'voice-meeting-inperson-reference' : 'voice-meeting-reference'}>
      {isInPerson ? (
        <div className="voice-meeting-reference-card">
          {referenceContent}
        </div>
      ) : (
        <LaptopFrame variant="notion" title={isVoicemail ? (node.prepReferenceTitle || 'Jordan contact snapshot') : 'Reference notes'} fill scrollable>
          {referenceContent}
        </LaptopFrame>
      )}
    </div>
  ) : null

  const meetingPanel = (
    <div className={isVoicemail ? 'voicemail-panel' : isInPerson ? 'voice-meeting-inperson-card' : 'voice-meeting-window'}>
      {isVoicemail ? (
        voicemailInner
      ) : isInPerson ? (
        <div className="voice-meeting-inperson-shell" aria-label={meetingTitle}>
          <div className="voice-meeting-inperson-title">{meetingTitle}</div>
          {meetingInner}
        </div>
      ) : (
        <LaptopFrame variant="meeting" title={meetingTitle} fill>
          {meetingInner}
        </LaptopFrame>
      )}
    </div>
  )

  const inPersonSceneImage = isInPerson && node.illustration ? (
    <div className="voice-meeting-inperson-scene-image">
      <img
        src={node.illustration}
        alt=""
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    </div>
  ) : null
  const shouldPlaceInPersonImageInline = Boolean(inPersonSceneImage && node.inPersonImagePlacement === 'inline')
  const meetingNotesPanel = showSessionNotesBelowImage ? (
    <div className="voice-meeting-inperson-meeting-notes">
      {sessionNotesSection}
    </div>
  ) : null

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration>
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

        {(playerGoal || endpoint || successCriteria) && (
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #000',
              padding: '0.75rem 1rem',
              fontSize: '0.8125rem',
              color: '#444',
            }}
          >
            {playerGoal && <div><strong>Your goal: </strong>{playerGoal}</div>}
            {endpoint && <div style={{ marginTop: playerGoal ? '0.375rem' : 0 }}><strong>Endpoint: </strong>{endpoint}</div>}
            {successCriteria && <div style={{ marginTop: (playerGoal || endpoint) ? '0.375rem' : 0 }}><strong>Success looks like: </strong>{successCriteria}</div>}
          </div>
        )}

        {voicemailDraftSection}

        {isInPerson ? (
          <>
            {!shouldPlaceInPersonImageInline && inPersonSceneImage}
            <div className={`voice-meeting-inperson-layout${hasReferencePanel ? '' : ' voice-meeting-inperson-layout--solo'}${shouldPlaceInPersonImageInline ? ' voice-meeting-inperson-layout--with-image' : ''}${showSessionNotesBelowImage ? ' voice-meeting-inperson-layout--with-notes' : ''}`}>
              {shouldPlaceInPersonImageInline && inPersonSceneImage}
              {meetingNotesPanel}
              {meetingPanel}
              {referencePanel}
            </div>
          </>
        ) : isVoicemail ? (
          <div className={`voicemail-direct-layout${hasReferencePanel ? '' : ' voicemail-direct-layout--solo'}`}>
            {meetingPanel}
            {referencePanel}
          </div>
        ) : (
          <DesktopOverlay>
            <div className={`voice-meeting-workspace${hasReferencePanel ? '' : ' voice-meeting-workspace--solo'}`}>
              {meetingPanel}
              {referencePanel}
            </div>
          </DesktopOverlay>
        )}

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
              Speak at least {minTurns} turn{minTurns === 1 ? '' : 's'}, then end the {interactionLabel} to continue.
            </span>
          )}
        </div>
      </motion.div>
    </SceneWrapper>
  )
}
