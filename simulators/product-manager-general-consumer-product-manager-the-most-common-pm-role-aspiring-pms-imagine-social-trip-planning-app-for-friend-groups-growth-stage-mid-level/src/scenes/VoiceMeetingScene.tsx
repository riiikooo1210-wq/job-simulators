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
import { devtoolsEnabled } from '../lib/devtools'
import { npcs } from '../data/npcs'
import { npcReply } from '../services/gemini'
import { GeminiLiveSession, type LiveStatus } from '../services/geminiLive'
import { localNinaReply, typedBackupNotice } from '../services/ninaInterviewBackup'
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
    <section className="voice-meeting-reference-section">
      <div className="voice-meeting-reference-label">
        {title}
      </div>
      <div className="voice-meeting-reference-body">
        {renderContentWithGlossary(content)}
      </div>
    </section>
  )
}

function includesDisclosure(text: string, matchAny: string[]) {
  const normalized = text.toLowerCase()
  return matchAny.some((match) => normalized.includes(match.toLowerCase()))
}

function hasConfiguredGeminiKey() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  return Boolean(apiKey && apiKey !== 'your_gemini_api_key_here')
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
  const showDevControls = devtoolsEnabled()

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
  const pendingUserRef = useRef('')
  const pendingNpcRef = useRef('')
  const lastRoleRef = useRef<'user' | 'npc' | null>(null)
  const initializedRef = useRef(false)
  const typedProviderUnavailableRef = useRef(false)

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
  const typedFallback = Boolean(node.typedFallback)
  const reachedTurnLimit = userTurns >= maxTurns
  const remainingTurns = Math.max(0, maxTurns - userTurns)
  const canSubmit = meetingEnded && userTurns >= minTurns
  const inCall = status !== 'idle' && status !== 'closed' && status !== 'error'
  const typedInterviewStarted = typedFallback && userTurns > 0
  const canEndTypedMeeting = typedInterviewStarted && !inCall && !meetingEnded && !typedLoading && userTurns >= minTurns

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
    if (userTurns >= maxTurns && !meetingEnded) {
      endMeeting({ limitReached: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTurns, maxTurns, meetingEnded])

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
      setStatusDetail('Voice connection is unavailable. Use Typed backup to continue.')
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
    const pendingText = [pendingUserRef.current, pendingNpcRef.current, liveUser, liveNpc]
    flushPending('user')
    flushPending('npc')
    appendRequiredDisclosureIfNeeded(pendingText)
    sessionRef.current?.stop()
    sessionRef.current = null
    setMeetingEnded(true)
    setTurnLimitReached(options.limitReached || userTurns >= maxTurns)
    setMuted(false)
    setStatus('closed')
    setStatusDetail('')
  }

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    sessionRef.current?.setMuted(next)
  }

  const submitTypedQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const question = typedInput.trim()
    if (!typedFallback || !npc || !question || typedLoading || meetingEnded || reachedTurnLimit || inCall) return

    setTypedInput('')
    setTypedError(null)
    setTypedLoading(true)

    const userMessage: ChatMessage = { role: 'user', content: question, ts: new Date().toISOString() }
    const historyWithQuestion = [...messages, userMessage]
    const nextUserTurn = userTurns + 1
    appendNpcMessage(conversationKey, userMessage)

    try {
      const reply = hasConfiguredGeminiKey() && !typedProviderUnavailableRef.current
        ? await npcReply({
            npcId: node.npcId,
            history: historyWithQuestion,
            goalPrompt,
            channel: 'chat',
          })
        : localNinaReply(question, nextUserTurn)
      const npcMessage: ChatMessage = { role: 'npc', content: reply, ts: new Date().toISOString() }
      appendNpcMessage(conversationKey, npcMessage)

      if (nextUserTurn >= maxTurns) {
        endMeeting({ limitReached: true })
      }
    } catch {
      typedProviderUnavailableRef.current = true
      const npcMessage: ChatMessage = {
        role: 'npc',
        content: localNinaReply(question, nextUserTurn),
        ts: new Date().toISOString(),
      }
      appendNpcMessage(conversationKey, npcMessage)
      setTypedError(typedBackupNotice)
      if (nextUserTurn >= maxTurns) {
        endMeeting({ limitReached: true })
      }
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

  const isInPerson = (node.meetingMode || node.presentation) === 'in_person'
  const interactionLabel = isInPerson ? 'conversation' : 'meeting'
  const startLabel = isInPerson ? 'Start conversation' : 'Join meeting'
  const endLabel = isInPerson ? 'End conversation' : 'End meeting'
  const meetingTitle = isInPerson ? `In-person conversation - ${npc.name}` : `Live meeting - ${npc.name}`
  const emptyTranscript = isInPerson
    ? 'Start the conversation when you are ready. Your spoken transcript will appear here and feed the final grading.'
    : 'Join the meeting when you are ready. Your spoken transcript will appear here and feed the final grading.'

  const visibleTurnLimitReached = turnLimitReached || reachedTurnLimit
  const statusLabel =
    visibleTurnLimitReached ? `${maxTurns}-question limit reached`
    : status === 'connecting' ? 'Connecting...'
    : status === 'connected' ? (muted ? 'Muted' : npcSpeaking ? `${npc.name} is speaking...` : 'Listening...')
    : status === 'closed' ? `${interactionLabel[0].toUpperCase()}${interactionLabel.slice(1)} ended`
    : status === 'error' ? (statusDetail || 'Voice connection is unavailable. Use Typed backup to continue.')
    : 'Ready'

  const turnCounterLabel = `Question ${Math.min(userTurns, maxTurns)}/${maxTurns}`
  const typedDisabled = !typedFallback || typedLoading || meetingEnded || reachedTurnLimit || inCall
  const typedHelper = inCall
    ? 'Typing is available after you leave the live voice call.'
    : visibleTurnLimitReached
      ? `${maxTurns}-question limit reached. End the ${interactionLabel} to continue.`
      : meetingEnded
        ? `${interactionLabel[0].toUpperCase()}${interactionLabel.slice(1)} ended.`
        : remainingTurns === 1
          ? '1 question left. Keep it focused.'
          : `${remainingTurns} questions left. Ask one clear question at a time.`

  const meetingInner = (
    <div className="voice-meeting-call-shell" data-testid="voice-meeting-shell">
      <div className="voice-meeting-call-topbar">
        <div>
          <div className="voice-meeting-app-name">Roamly Video</div>
          <div className="voice-meeting-room-name">{meetingTitle}</div>
        </div>
        <div className="voice-meeting-topbar-meta">
          <span className="voice-meeting-turn-counter" data-testid="voice-meeting-turn-counter">
            {turnCounterLabel}
          </span>
          <span className={`voice-meeting-status${inCall ? ' is-live' : ''}`}>{statusLabel}</span>
        </div>
      </div>

      <div className="voice-meeting-call-body">
        <div className="voice-meeting-prep-tray" data-testid="voice-meeting-prep-tray" aria-label="Interview plan">
          <div>
            <span>Prepared questions</span>
            <strong>{Math.max(0, maxTurns - userTurns)} left</strong>
          </div>
          <div>
            <span>Listen for</span>
            <strong>Decision friction</strong>
          </div>
          <div>
            <span>Call rule</span>
            <strong>No pitching</strong>
          </div>
        </div>

        <div className={`voice-meeting-video-tile${npcSpeaking ? ' is-speaking' : ''}`}>
          <div className="voice-meeting-avatar">
            {npc.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="voice-meeting-participant">
            <div className="voice-meeting-participant-name">{npc.name}</div>
            <div className="voice-meeting-participant-role">{npc.role}</div>
          </div>
          <div className="voice-meeting-participant-chip">Target customer</div>
        </div>

        <div className="voice-meeting-transcript" aria-label={`${meetingTitle} transcript`}>
          <div className="voice-meeting-transcript-header">
            <span>Live transcript</span>
            <span>{messages.length} saved turns</span>
          </div>
          {messages.length === 0 && !liveUser && !liveNpc && (
            <div className="voice-meeting-empty">
              {emptyTranscript}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`voice-meeting-message ${m.role === 'user' ? 'is-user' : 'is-npc'}`}>
              <div className="voice-meeting-message-label">
                {m.role === 'user' ? 'You' : npc.name}
              </div>
              <div className="voice-meeting-message-bubble">
                {m.content}
              </div>
            </div>
          ))}
          {liveUser && (
            <div className="voice-meeting-message is-user is-live">
              <div className="voice-meeting-message-label">You</div>
              <div className="voice-meeting-message-bubble">{liveUser}</div>
            </div>
          )}
          {liveNpc && (
            <div className="voice-meeting-message is-npc is-live">
              <div className="voice-meeting-message-label">{npc.name}</div>
              <div className="voice-meeting-message-bubble">{liveNpc}</div>
            </div>
          )}
        </div>

        {visibleTurnLimitReached && (
          <div className="voice-meeting-limit-alert">
            <strong>{maxTurns}-question limit reached.</strong> End the {interactionLabel} and continue with what you learned.
          </div>
        )}

        <div className="voice-meeting-call-toolbar" data-testid="voice-meeting-call-toolbar">
          {showDevControls && (
            <button className="voice-meeting-control ghost" onClick={() => goNext(node)}>
              Skip (dev)
            </button>
          )}
          {!canEndTypedMeeting && !inCall && !meetingEnded && !reachedTurnLimit && (
            <button className="voice-meeting-control primary" onClick={startMeeting}>
              {startLabel}
            </button>
          )}
          {canEndTypedMeeting && (
            <button className="voice-meeting-control danger" onClick={() => endMeeting()}>
              {endLabel}
            </button>
          )}
          {inCall && (
            <>
              <button className={`voice-meeting-control ${muted ? 'muted' : 'ghost'}`} onClick={toggleMuted}>
                <MicIcon muted={muted} />
                {muted ? 'Unmute' : 'Mute'}
              </button>
              <button className="voice-meeting-control danger" onClick={() => endMeeting()}>
                {endLabel}
              </button>
            </>
          )}
          <span className="voice-meeting-toolbar-note">Transcript on</span>
        </div>

        {typedFallback && (
          <form className="voice-meeting-typed-fallback" data-testid="voice-meeting-typed-fallback" onSubmit={submitTypedQuestion}>
            <div className="voice-meeting-typed-header">
              <div>
                <strong>Typed backup</strong>
                <span>{typedHelper}</span>
              </div>
              {typedLoading && <span className="voice-meeting-typing-status">Nina is replying...</span>}
            </div>
            <div className="voice-meeting-typed-row">
              <textarea
                value={typedInput}
                onChange={(event) => setTypedInput(event.target.value)}
                placeholder="Type a question to Nina"
                rows={2}
                disabled={typedDisabled}
              />
              <button
                type="submit"
                className="voice-meeting-typed-send"
                disabled={typedDisabled || !typedInput.trim()}
              >
                Send
              </button>
            </div>
            {typedError && <div className="voice-meeting-typed-error">{typedError}</div>}
          </form>
        )}
      </div>
    </div>
  )

  const referenceContent = (
    <div className="voice-meeting-reference-file" data-testid="voice-meeting-reference-file">
      <div className="voice-meeting-reference-file-toolbar">
        <span>Interview guide</span>
        <span>{userTurns}/{maxTurns} questions</span>
      </div>
      <div className="voice-meeting-reference-file-body">
        {prepReference && (
          <ReferenceBlock title={node.prepReferenceTitle || 'Reference'} content={prepReference} />
        )}
        {prepReference && prepNote && (
          <div className="voice-meeting-reference-divider" />
        )}
        {prepNote && (
          <ReferenceBlock title={node.prepNoteTitle || 'Prep note'} content={prepNote} />
        )}
      </div>
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
          <DesktopOverlay className="voice-meeting-desktop-overlay" contentClassName="voice-meeting-desktop-content">
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
              Speak or type at least {minTurns} question{minTurns === 1 ? '' : 's'}, then end the {interactionLabel} to continue.
            </span>
          )}
        </div>
      </motion.div>
    </SceneWrapper>
  )
}
