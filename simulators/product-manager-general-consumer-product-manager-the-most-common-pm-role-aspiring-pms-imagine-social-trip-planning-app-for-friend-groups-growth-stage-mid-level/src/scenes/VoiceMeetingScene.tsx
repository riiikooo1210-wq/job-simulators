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
  const isInPerson = (node.meetingMode || node.presentation) === 'in_person'
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
- When appropriate for this scene and role, ask follow-up questions, push back, clarify ambiguity, and react to the student's actual words.
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

function includesDisclosure(text: string, matchAny: string[]) {
  const normalized = text.toLowerCase()
  return matchAny.some((match) => normalized.includes(match.toLowerCase()))
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
  const playerGoal = node.playerGoal ? interpolate(node.playerGoal, { playerName, branchFlags, mcSelections }) : ''
  const endpoint = node.endpoint ? interpolate(node.endpoint, { playerName, branchFlags, mcSelections }) : ''
  const successCriteria = node.successCriteria ? interpolate(node.successCriteria, { playerName, branchFlags, mcSelections }) : ''
  const prepReference = node.prepReferenceContent
    ? interpolate(node.prepReferenceContent, { playerName, branchFlags, mcSelections })
    : ''
  const prepNote = node.prepNoteKey ? freeTextResponses[node.prepNoteKey]?.trim() : ''
  const minTurns = node.minTurns ?? 2
  const maxTurns = node.maxTurns ?? 8
  const userTurns = messages.filter((m) => m.role === 'user').length
  const canSubmit = meetingEnded && userTurns >= minTurns

  const appendRequiredDisclosureIfNeeded = (pendingText: string[]) => {
    if (!node.requiredDisclosure?.items.length) return
    const transcript = [
      ...messages.map((m) => m.content),
      ...pendingText,
    ].join('\n')
    const missing = node.requiredDisclosure.items.filter((item) => !includesDisclosure(transcript, item.matchAny))
    if (!missing.length) return

    const intro = node.requiredDisclosure.intro || 'One thing I should make sure I say:'
    const content = `${intro} ${missing.map((item) => item.text).join(' ')}`
    appendNpcMessage(conversationKey, {
      role: 'npc',
      content,
      ts: new Date().toISOString(),
    })
  }

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
    const pendingText = [pendingUserRef.current, pendingNpcRef.current, liveUser, liveNpc]
    flushPending('user')
    flushPending('npc')
    appendRequiredDisclosureIfNeeded(pendingText)
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

  const isInPerson = (node.meetingMode || node.presentation) === 'in_person'
  const interactionLabel = isInPerson ? 'conversation' : 'meeting'
  const startLabel = isInPerson ? 'Start conversation' : 'Join meeting'
  const endLabel = isInPerson ? 'End conversation' : 'End meeting'
  const meetingTitle = isInPerson ? `In-person conversation - ${npc.name}` : `Live meeting - ${npc.name}`
  const emptyTranscript = isInPerson
    ? 'Start the conversation when you are ready. Your spoken transcript will appear here and feed the final grading.'
    : 'Join the meeting when you are ready. Your spoken transcript will appear here and feed the final grading.'

  const statusLabel =
    status === 'connecting' ? 'Connecting...'
    : status === 'connected' ? (muted ? 'Muted' : npcSpeaking ? `${npc.name} is speaking...` : 'Listening...')
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
          <button
            onClick={() => goNext(node)}
            style={{ background: '#F7F1E3', color: '#1E1E1A', border: '1px solid #CDBF94', borderRadius: '20px', padding: '0.35rem 0.75rem', fontSize: '0.7rem', cursor: 'pointer' }}
          >
            Skip (dev)
          </button>
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
    </div>
  )

  const referencePanel = (prepReference || prepNote) ? (
    <div className={isInPerson ? 'voice-meeting-inperson-reference' : 'voice-meeting-reference'}>
      {isInPerson ? (
        <div className="voice-meeting-reference-card">
          {referenceContent}
        </div>
      ) : (
        <LaptopFrame variant="notion" title="Reference notes" fill scrollable>
          {referenceContent}
        </LaptopFrame>
      )}
    </div>
  ) : null

  const meetingPanel = (
    <div className={isInPerson ? 'voice-meeting-inperson-card' : 'voice-meeting-window'}>
      {isInPerson ? (
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

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={isInPerson}>
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

        {isInPerson ? (
          <>
            {inPersonSceneImage}
            <div className={`voice-meeting-inperson-layout${(prepReference || prepNote) ? '' : ' voice-meeting-inperson-layout--solo'}`}>
              {meetingPanel}
              {referencePanel}
            </div>
          </>
        ) : (
          <DesktopOverlay>
            <div className={`voice-meeting-workspace${(prepReference || prepNote) ? '' : ' voice-meeting-workspace--solo'}`}>
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
