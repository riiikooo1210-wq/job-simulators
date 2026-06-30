import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { SupportConsoleCall } from '../components/ui/SupportConsole'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { npcs } from '../data/npcs'
import { GeminiLiveSession, type LiveStatus } from '../services/geminiLive'
import type { ChatMessage, VoiceMeetingNode } from '../types/game'

interface Props { node: VoiceMeetingNode }

function textForPrompt(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function buildSystemPrompt(args: {
  node: VoiceMeetingNode
  npc: { name: string; role: string; persona: string; voice?: string }
  playerName: string
  goalPrompt: string
  meetingContext: string
  prepReference: string
}) {
  const { node, npc, playerName, goalPrompt, meetingContext, prepReference } = args
  const isInPerson = (node.meetingMode || node.presentation) === 'in_person'
  const meetingPhrase = isInPerson ? 'in an in-person workplace conversation' : 'in a live customer meeting'
  const speechStyle = isInPerson
    ? 'Speak naturally, like a real colleague or client sitting or standing with the student in the same workplace.'
    : 'Speak naturally, like a real colleague or client on a call.'
  const initial = (node.initialMessages || [])
    .map((m) => `${m.role === 'user' ? playerName || 'Student' : npc.name}: ${textForPrompt(m.content)}`)
    .join('\n')

  return `You are ${npc.name}, ${npc.role}, ${meetingPhrase} with ${playerName || 'the student'}.

PERSONA:
${npc.persona}
${npc.voice ? `\nVOICE: ${npc.voice}` : ''}

MEETING GOAL:
${goalPrompt}

MEETING CONTEXT:
${meetingContext || 'Use the scene context and your persona to make this feel like a realistic workplace conversation.'}

VISIBLE STUDENT REFERENCE:
${prepReference || 'No separate student reference is visible for this meeting.'}

${initial ? `INITIAL CONTEXT MESSAGES:\n${initial}\n` : ''}
RULES:
- ${speechStyle}
- Keep each turn under 90 words unless the student asks for detail.
- The student may speak or type. Treat typed messages exactly like live call dialogue, and answer as the customer in the same conversation.
- When appropriate for this scene and role, ask follow-up questions, push back, clarify ambiguity, and react to the student's actual words.
- Do not introduce customer questions, objections, facts, policy topics, product details, account details, or edge cases that are not included in the meeting goal, meeting context, initial context messages, or visible student reference.
- For customer-support calls, any question or pushback you raise must be answerable from the visible student reference plus the case facts you reveal after verification or lookup.
- For customer-support calls, do not volunteer full identity details, order number, product name, CRM lookup facts, or account facts early. Share full identity/order details only after the student asks to confirm identity or asks for identifying order details. Share CRM lookup facts only after the student has verified the caller and says they are checking, searching, or opening the CRM/order record.
- For customer-support calls with CRM lookup instructions, when the student has verified the caller and says they are checking, searching, or opening the CRM/order record, briefly provide the requested "CRM lookup result" as a neutral simulation aside visible to the student, then resume the customer role.
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

function splitActionLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean)
}

function InstructionText({ text }: { text: string }) {
  const lines = splitActionLines(text)

  if (lines.length <= 1) {
    return <span>{renderContentWithGlossary(text)}</span>
  }

  return (
    <ul className="call-instruction-list">
      {lines.map((line, index) => (
        <li key={`${line}-${index}`}>{renderContentWithGlossary(line)}</li>
      ))}
    </ul>
  )
}

function formatReferenceTitle(title: string): string {
  return title.replace(/\s+\+\s+/g, ' and ').toLowerCase()
}

function buildUseText(node: VoiceMeetingNode, prepReference: string, prepNote: string): string | undefined {
  if (!prepReference && !prepNote) return undefined
  const material = node.prepReferenceTitle ? formatReferenceTitle(node.prepReferenceTitle) : 'reference notes'
  const mentionsCrm = /CRM/i.test(`${node.content || ''} ${prepReference} ${prepNote}`)
  return `Use the ${material}${mentionsCrm ? ' and CRM lookup' : ''}.`
}

function CallInstructionPanel({
  playerGoal,
  useText,
  endpoint,
  successCriteria,
}: {
  playerGoal: string
  useText?: string
  endpoint: string
  successCriteria: string
}) {
  const rows = [
    { label: 'What to do', text: playerGoal },
    { label: 'Use', text: useText },
    { label: 'Finish when', text: endpoint },
    { label: 'Good call', text: successCriteria },
  ].filter((row): row is { label: string; text: string } => Boolean(row.text))

  return (
    <section className="call-instruction-card" aria-label="Call checklist">
      <div className="call-instruction-card__header">
        <span>Call checklist</span>
        <span>Follow this during the live call</span>
      </div>
      <div className="call-instruction-grid">
        {rows.map((row) => (
          <div key={row.label} className="call-instruction-row">
            <div className="call-instruction-row__label">{row.label}</div>
            <div className="call-instruction-row__body">
              <InstructionText text={row.text} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function renderReferenceContent(content: string): ReactNode {
  const blocks: ReactNode[] = []
  let bulletItems: ReactNode[] = []

  const flushBullets = () => {
    if (bulletItems.length === 0) return
    blocks.push(
      <ul key={`bullets-${blocks.length}`} className="voice-reference-list">
        {bulletItems}
      </ul>
    )
    bulletItems = []
  }

  content.split('\n').forEach((rawLine, index) => {
    const line = rawLine.trim()

    if (!line) {
      flushBullets()
      blocks.push(<div key={`space-${index}`} className="voice-reference-spacer" />)
      return
    }

    if (line.endsWith(':')) {
      flushBullets()
      blocks.push(
        <h3 key={`heading-${index}`} className="voice-reference-heading">
          {renderContentWithGlossary(line.slice(0, -1))}
        </h3>
      )
      return
    }

    if (line.startsWith('- ')) {
      bulletItems.push(
        <li key={`item-${index}`}>
          {renderContentWithGlossary(line.slice(2))}
        </li>
      )
      return
    }

    flushBullets()
    blocks.push(
      <p key={`paragraph-${index}`} className="voice-reference-paragraph">
        {renderContentWithGlossary(line)}
      </p>
    )
  })

  flushBullets()
  return blocks
}

function ReferenceBlock({ title, content }: { title: string; content: string }) {
  return (
    <section className="voice-reference-section">
      <div className="voice-reference-section-title">
        {title}
      </div>
      <div className="voice-reference-content">
        {renderReferenceContent(content)}
      </div>
    </section>
  )
}

function includesDisclosure(text: string, matchAny: string[]) {
  const normalized = text.toLowerCase()
  return matchAny.some((match) => normalized.includes(match.toLowerCase()))
}

function normalizeTranscriptText(text: string) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
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
  const [textDraft, setTextDraft] = useState('')
  const [textSending, setTextSending] = useState(false)
  const [textError, setTextError] = useState('')
  const [voiceEnabled, setVoiceEnabled] = useState(false)

  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const transcriptRef = useRef<HTMLDivElement | null>(null)
  const pendingUserRef = useRef('')
  const pendingNpcRef = useRef('')
  const lastRoleRef = useRef<'user' | 'npc' | null>(null)
  const initializedRef = useRef(false)
  const suppressedUserTranscriptRef = useRef<string[]>([])

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

  const shouldSuppressUserTranscript = (text: string) => {
    const normalized = normalizeTranscriptText(text)
    const index = suppressedUserTranscriptRef.current.findIndex((candidate) => candidate === normalized)
    if (index < 0) return false
    suppressedUserTranscriptRef.current.splice(index, 1)
    return true
  }

  const setConnectionError = (message: string) => {
    setStatus('error')
    setStatusDetail(message)
  }

  const createLiveSession = (micEnabled: boolean) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env.')
    }

    const session = new GeminiLiveSession({
      onStatus: (s, detail) => {
        setStatus(s)
        if (detail) setStatusDetail(detail)
        if (s === 'closed' || s === 'error') setVoiceEnabled(false)
      },
      onUserTranscript: (text) => {
        if (shouldSuppressUserTranscript(text)) return
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
    void session.start({
      apiKey,
      voiceName: node.voiceName,
      systemPrompt: buildSystemPrompt({ node, npc, playerName, goalPrompt, meetingContext, prepReference }),
      micEnabled,
    })
    return session
  }

  const ensureLiveSession = async (micEnabled: boolean) => {
    if (!npc) throw new Error('Customer is not configured for this call.')

    const existing = sessionRef.current
    if (existing) {
      existing.primeAudioOutput()
      if (micEnabled) {
        await existing.enableMic()
        setVoiceEnabled(true)
        setMuted(false)
      }
      return existing
    }

    const session = createLiveSession(micEnabled)
    session.primeAudioOutput()
    if (micEnabled) {
      setVoiceEnabled(true)
      setMuted(false)
    }
    return session
  }

  const startMeeting = async () => {
    try {
      setTextError('')
      await ensureLiveSession(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Meeting failed to start.'
      setConnectionError(message)
      setTextError(message)
    }
  }

  const sendTypedMessage = async () => {
    const trimmed = textDraft.trim()
    if (!trimmed || textSending || meetingEnded || userTurns >= maxTurns) return

    setTextSending(true)
    setTextError('')
    try {
      const session = await ensureLiveSession(false)
      flushPending('user')
      flushPending('npc')
      lastRoleRef.current = null
      suppressedUserTranscriptRef.current.push(normalizeTranscriptText(trimmed))
      appendNpcMessage(conversationKey, {
        role: 'user',
        content: trimmed,
        ts: new Date().toISOString(),
      })
      setTextDraft('')
      await session.sendText(trimmed)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Message failed to send.'
      setConnectionError(message)
      setTextError(message)
    } finally {
      setTextSending(false)
    }
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
    setVoiceEnabled(false)
  }

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    sessionRef.current?.setMuted(next)
  }

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    void sendTypedMessage()
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
  const participantInitials = npc.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const emptyTranscript = isInPerson
    ? 'Start when you are ready. Speak or type; the transcript feeds final grading.'
    : 'Start when you are ready. Speak or type; the transcript feeds final grading.'

  const statusLabel =
    status === 'connecting' ? 'Connecting...'
    : status === 'connected' ? (npcSpeaking ? `${npc.name} is speaking...` : voiceEnabled ? (muted ? 'Muted' : 'Listening...') : 'Text active')
    : status === 'closed' ? `${interactionLabel[0].toUpperCase()}${interactionLabel.slice(1)} ended`
    : status === 'error' ? `Error: ${statusDetail}`
    : 'Ready'

  const inCall = status !== 'idle' && status !== 'closed' && status !== 'error'
  const useText = buildUseText(node, prepReference, prepNote)
  const textLimitReached = userTurns >= maxTurns
  const textSendDisabled = meetingEnded || textSending || textLimitReached || !textDraft.trim()

  const meetingInner = (
    <div className={`voice-call-ui${isInPerson ? ' voice-call-ui--inperson' : ''}`}>
      <div className="voice-call-topbar">
        <div>
          <div className="voice-call-kicker">{isInPerson ? 'Live conversation' : 'Mercury Voice'}</div>
          <div className="voice-call-title">{meetingTitle}</div>
        </div>
        <div className={`voice-call-status voice-call-status--${status}`}>
          {statusLabel}
        </div>
      </div>

      <div className="voice-call-participant">
        <div className={`voice-call-avatar${npcSpeaking ? ' voice-call-avatar--speaking' : ''}`}>
          {participantInitials}
        </div>
        <div className="voice-call-participant__text">
          <div className="voice-call-participant__name">{npc.name}</div>
          <div className="voice-call-participant__role">{npc.role}</div>
        </div>
        <div className="voice-call-audio-pill">
          {npcSpeaking ? 'Speaking' : inCall ? (voiceEnabled ? (muted ? 'You are muted' : 'Live audio') : 'Text + audio reply') : 'Ready'}
        </div>
      </div>

      <div
        ref={transcriptRef}
        className="voice-call-transcript"
      >
        {messages.length === 0 && !liveUser && !liveNpc && (
          <div className="voice-call-empty">
            {emptyTranscript}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`voice-call-message voice-call-message--${m.role === 'user' ? 'user' : 'npc'}`}>
            <div className="voice-call-message__speaker">
              {m.role === 'user' ? 'You' : npc.name}
            </div>
            <div className="voice-call-message__bubble">
              {renderContentWithGlossary(m.content)}
            </div>
          </div>
        ))}
        {liveUser && (
          <div className="voice-call-message voice-call-message--user voice-call-message--live">
            <div className="voice-call-message__speaker">You</div>
            <div className="voice-call-message__bubble">{liveUser}</div>
          </div>
        )}
        {liveNpc && (
          <div className="voice-call-message voice-call-message--npc voice-call-message--live">
            <div className="voice-call-message__speaker">{npc.name}</div>
            <div className="voice-call-message__bubble">{liveNpc}</div>
          </div>
        )}
      </div>

      <div className="voice-call-composer">
        <textarea
          value={textDraft}
          onChange={(event) => setTextDraft(event.currentTarget.value)}
          onKeyDown={handleComposerKeyDown}
          className="voice-call-composer__input"
          aria-label={`Message ${npc.name}`}
          placeholder="Type what you would say to the customer..."
          disabled={meetingEnded || textSending || textLimitReached}
          rows={2}
        />
        <button
          type="button"
          onClick={() => void sendTypedMessage()}
          className="voice-call-button voice-call-button--send"
          disabled={textSendDisabled}
        >
          {textSending ? 'Sending...' : 'Send'}
        </button>
      </div>
      {(textError || textLimitReached) && (
        <div className={`voice-call-composer-note${textError ? ' voice-call-composer-note--error' : ''}`}>
          {textError || `You reached the ${maxTurns}-turn limit. End the ${interactionLabel} to continue.`}
        </div>
      )}

      <div className="voice-call-controls">
        {import.meta.env.DEV && (
          <button
            onClick={() => goNext(node)}
            className="voice-call-button voice-call-button--ghost"
          >
            Skip (dev)
          </button>
        )}
        {(!voiceEnabled && !meetingEnded) && (
          <button
            onClick={startMeeting}
            className="voice-call-button voice-call-button--join"
          >
            {inCall ? 'Join voice' : startLabel}
          </button>
        )}
        {voiceEnabled && inCall && (
          <>
            <button
              onClick={toggleMuted}
              className={`voice-call-button voice-call-button--control${muted ? ' voice-call-button--muted' : ''}`}
            >
              <MicIcon muted={muted} />
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </>
        )}
        {inCall && (
          <button
            onClick={endMeeting}
            className="voice-call-button voice-call-button--end"
          >
            {endLabel}
          </button>
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
        <div className="voice-reference-divider" />
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
        <div className="voice-reference-window" aria-label="Reference notes">
          <div className="voice-reference-titlebar">
            <span className="voice-reference-titlebar__icon" aria-hidden="true" />
            <span>Reference notes</span>
          </div>
          <div className="voice-reference-body">
            {referenceContent}
          </div>
        </div>
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

  const crmUnlocked = messages.some((message) => /CRM lookup result/i.test(message.content))
    || /CRM lookup result/i.test(liveNpc)

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
          <CallInstructionPanel
            playerGoal={playerGoal}
            useText={useText}
            endpoint={endpoint}
            successCriteria={successCriteria}
          />
        )}

        {isInPerson ? (
          <>
            {inPersonSceneImage}
            <div className={`voice-meeting-inperson-layout${(prepReference || prepNote) ? '' : ' voice-meeting-inperson-layout--solo'}`}>
              {meetingPanel}
              {referencePanel}
            </div>
          </>
        ) : node.supportConsole ? (
          <DesktopOverlay width="98%" height="94%">
            <SupportConsoleCall
              scenarioId={node.supportConsole.scenarioId}
              crmUnlocked={crmUnlocked}
              callPanel={meetingInner}
            />
          </DesktopOverlay>
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
              Send or speak at least {minTurns} turn{minTurns === 1 ? '' : 's'}, then end the {interactionLabel} to continue.
            </span>
          )}
        </div>
      </motion.div>
    </SceneWrapper>
  )
}
