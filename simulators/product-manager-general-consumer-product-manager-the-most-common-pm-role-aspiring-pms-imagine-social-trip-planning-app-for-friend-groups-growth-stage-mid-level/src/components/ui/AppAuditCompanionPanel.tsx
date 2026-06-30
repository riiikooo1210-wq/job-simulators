import { useEffect, useMemo, useRef, useState } from 'react'
import LaptopFrame from './LaptopFrame'
import { useGameStore } from '../../store/gameStore'
import { npcs } from '../../data/npcs'
import { npcReply } from '../../services/gemini'
import { GeminiLiveSession, type LiveStatus } from '../../services/geminiLive'
import type {
  AppAuditAction,
  AppAuditCompanionConfig,
  AppAuditNode,
  AppAuditObservation,
  AppAuditScreen,
  ChatMessage,
} from '../../types/game'

interface Props {
  node: AppAuditNode
  companion: AppAuditCompanionConfig
  screen: AppAuditScreen
  action?: AppAuditAction
  observation?: AppAuditObservation
  note: string
  chrome?: 'window' | 'plain'
}

function screenContext(screen: AppAuditScreen, action?: AppAuditAction, observation?: AppAuditObservation, note?: string) {
  const parts: string[] = []
  parts.push(`ACTIVE SCREEN: ${screen.stepLabel || ''} ${screen.title}`)
  if (screen.subtitle) parts.push(`SCREEN SUMMARY: ${screen.subtitle}`)
  if (screen.chips?.length) parts.push(`CHIPS: ${screen.chips.join(', ')}`)
  if (screen.sections?.length) {
    parts.push('SCREEN SECTIONS:')
    screen.sections.forEach((section) => parts.push(`- ${section.label}: ${section.body}`))
  }
  if (screen.listItems?.length) {
    parts.push('VISIBLE ROWS:')
    screen.listItems.forEach((item) => parts.push(`- ${item.label}: ${item.detail || item.status || ''}`))
  }
  if (screen.emptyStateTitle || screen.emptyStateBody) {
    parts.push(`EMPTY STATE: ${screen.emptyStateTitle || ''} ${screen.emptyStateBody || ''}`)
  }
  if (screen.primaryAction || screen.secondaryAction) {
    parts.push(`VISIBLE ACTIONS: ${[screen.primaryAction, screen.secondaryAction].filter(Boolean).join(', ')}`)
  }
  if (action) {
    parts.push(`TRIED ACTION: ${action.label}`)
    parts.push(`ACTION RESULT: ${action.resultTitle}: ${action.resultBody}`)
    action.resultItems?.forEach((item) => parts.push(`- ${item.label}: ${item.detail || item.status || ''}`))
  }
  if (observation) {
    parts.push(`CURRENT AUDIT QUESTION: ${observation.prompt}`)
    if (observation.companionNudges?.length) {
      parts.push('SAFE NUDGES:')
      observation.companionNudges.forEach((nudge) => parts.push(`- ${nudge}`))
    }
  }
  parts.push(`STUDENT DRAFT NOTE: ${note?.trim() || '(blank)'}`)
  return parts.join('\n')
}

function buildGoalPrompt(args: {
  companion: AppAuditCompanionConfig
  screen: AppAuditScreen
  action?: AppAuditAction
  observation?: AppAuditObservation
  note: string
}) {
  return `You are a peer PM helping with one Roamly app-audit screen.

${args.companion.systemGuidance || ''}

CURRENT CONTEXT:
${screenContext(args.screen, args.action, args.observation, args.note)}

RULES:
- Speak as a teammate looking at the same screen, not as a teacher or answer key.
- Do not write or dictate the student's final audit note.
- Do not reveal a polished answer, rubric, or grading language.
- If the student asks what to write, redirect to what evidence on the screen they should compare.
- Use only the current screen, tried action result, current audit question, and student draft note above.
- Keep replies under 75 words unless the student asks for clarification.
- Prefer one concrete observation question or one next thing to inspect.`
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

export default function AppAuditCompanionPanel({ node, companion, screen, action, observation, note, chrome = 'window' }: Props) {
  const npc = npcs[companion.npcId]
  const conversationKey = `companion:${node.id}:${companion.npcId}`
  const messages = useGameStore((s) => s.npcConversations[conversationKey] || [])
  const appendNpcMessage = useGameStore((s) => s.appendNpcMessage)

  const [status, setStatus] = useState<LiveStatus>('idle')
  const [statusDetail, setStatusDetail] = useState('')
  const [muted, setMuted] = useState(true)
  const [npcSpeaking, setNpcSpeaking] = useState(false)
  const [liveUser, setLiveUser] = useState('')
  const [liveNpc, setLiveNpc] = useState('')
  const [typedInput, setTypedInput] = useState('')
  const [typedLoading, setTypedLoading] = useState(false)
  const [typedError, setTypedError] = useState<string | null>(null)

  const sessionRef = useRef<GeminiLiveSession | null>(null)
  const pendingUserRef = useRef('')
  const pendingNpcRef = useRef('')
  const lastRoleRef = useRef<'user' | 'npc' | null>(null)
  const liveContextRef = useRef('')

  const goalPrompt = useMemo(
    () => buildGoalPrompt({ companion, screen, action, observation, note }),
    [companion, screen, action, observation, note],
  )
  const contextSignature = useMemo(
    () => JSON.stringify({ screenId: screen.id, actionId: action?.id || '', observationId: observation?.id || '', note }),
    [screen.id, action?.id, observation?.id, note],
  )
  const contextChanged = Boolean(sessionRef.current && liveContextRef.current && liveContextRef.current !== contextSignature)

  useEffect(() => {
    return () => {
      sessionRef.current?.stop()
      sessionRef.current = null
    }
  }, [])

  const flushPending = (role: 'user' | 'npc') => {
    const pending = role === 'user' ? pendingUserRef.current : pendingNpcRef.current
    const trimmed = pending.trim()
    if (!trimmed) return
    appendNpcMessage(conversationKey, { role, content: trimmed, ts: new Date().toISOString() })
    if (role === 'user') {
      pendingUserRef.current = ''
      setLiveUser('')
    } else {
      pendingNpcRef.current = ''
      setLiveNpc('')
    }
  }

  const startVoice = async () => {
    if (!npc || sessionRef.current) return
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      setStatus('error')
      setStatusDetail('Voice unavailable. Type to Jordan instead.')
      return
    }

    const session = new GeminiLiveSession({
      onStatus: (next, detail) => {
        setStatus(next)
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

    session.setMuted(true)
    setMuted(true)
    sessionRef.current = session
    liveContextRef.current = contextSignature
    await session.start({
      apiKey,
      voiceName: companion.voiceName,
      systemPrompt: `You are ${npc.name}, ${npc.role}.\n\nPERSONA:\n${npc.persona}\n${npc.voice ? `\nVOICE:\n${npc.voice}\n` : ''}\n${goalPrompt}`,
    })
  }

  const stopVoice = () => {
    flushPending('user')
    flushPending('npc')
    sessionRef.current?.stop()
    sessionRef.current = null
    liveContextRef.current = ''
    setMuted(true)
    setNpcSpeaking(false)
  }

  const toggleMuted = () => {
    const next = !muted
    setMuted(next)
    sessionRef.current?.setMuted(next)
  }

  const submitTyped = async () => {
    const trimmed = typedInput.trim()
    if (!trimmed || typedLoading || !npc) return
    setTypedError(null)
    setTypedInput('')
    appendNpcMessage(conversationKey, { role: 'user', content: trimmed, ts: new Date().toISOString() })
    setTypedLoading(true)
    try {
      const history: ChatMessage[] = [...messages, { role: 'user', content: trimmed, ts: new Date().toISOString() }]
      const reply = await npcReply({ npcId: companion.npcId, history, goalPrompt, channel: 'chat' })
      appendNpcMessage(conversationKey, { role: 'npc', content: reply, ts: new Date().toISOString() })
    } catch {
      setTypedError('Jordan could not answer live. Use the visible screen, related number, and your note prompt to keep going.')
    } finally {
      setTypedLoading(false)
    }
  }

  if (!npc) {
    return (
      <aside data-testid="app-audit-companion" style={{ minHeight: 0, color: '#c0392b' }}>
        Unknown companion NPC: <code>{companion.npcId}</code>
      </aside>
    )
  }

  const inVoice = status === 'connecting' || status === 'connected'
  const statusLabel =
    status === 'connecting' ? 'Connecting...'
    : status === 'connected' ? (muted ? 'Muted' : npcSpeaking ? `${npc.name} is talking...` : 'Listening...')
    : status === 'error' ? `Voice unavailable`
    : 'Ready'

  const body = (
    <div data-testid="app-audit-companion-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', minHeight: 0, padding: '0.75rem', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', gap: '0.55rem', alignItems: 'center' }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                border: '1px solid #000',
                background: '#B87D6B',
                color: '#F2EBD9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                fontWeight: 900,
                boxShadow: npcSpeaking ? '0 0 0 4px rgba(184,125,107,0.35)' : 'none',
              }}
            >
              JL
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#1E1E1A' }}>{npc.name}</div>
              <div style={{ fontSize: '0.68rem', lineHeight: 1.25, color: '#6A604B' }}>{npc.role}</div>
            </div>
          </div>

          <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 7, padding: '0.55rem', fontSize: '0.72rem', lineHeight: 1.45, color: '#4B4538' }}>
            Looking at: <strong>{screen.title}</strong>{action ? ` after "${action.label}"` : ''}. Jordan can help you read the screen, but will not write the note for you.
          </div>

          {contextChanged && (
            <div style={{ border: '1px solid #B87D6B', background: '#F4E2D9', borderRadius: 7, padding: '0.5rem', fontSize: '0.7rem', lineHeight: 1.4, color: '#7B3D32' }}>
              Screen context changed. Stop and restart voice so Jordan sees the latest screen.
            </div>
          )}

          <div
            style={{
              border: '1px solid #CDBF94',
              background: '#F7F1E3',
              borderRadius: 7,
              padding: '0.55rem',
              minHeight: 120,
              maxHeight: 180,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
            }}
          >
            {messages.length === 0 && !liveUser && !liveNpc && (
              <div style={{ fontSize: '0.72rem', color: '#6A604B', lineHeight: 1.45 }}>
                Start voice, then unmute when you want to ask Jordan what to inspect.
              </div>
            )}
            {messages.map((message, index) => (
              <div key={index} style={{ alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '92%' }}>
                <div style={{ fontSize: '0.62rem', color: '#6A604B', marginBottom: 2 }}>
                  {message.role === 'user' ? 'You' : npc.name}
                </div>
                <div
                  style={{
                    border: '1px solid #CDBF94',
                    background: message.role === 'user' ? '#B87D6B' : '#FBF7EA',
                    color: message.role === 'user' ? '#F2EBD9' : '#1E1E1A',
                    borderRadius: 5,
                    padding: '0.45rem 0.5rem',
                    fontSize: '0.72rem',
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {liveUser && <div style={{ alignSelf: 'flex-end', fontSize: '0.72rem', color: '#6A604B', border: '1px dashed #CDBF94', borderRadius: 5, padding: '0.4rem' }}>{liveUser}</div>}
            {liveNpc && <div style={{ alignSelf: 'flex-start', fontSize: '0.72rem', color: '#6A604B', border: '1px dashed #CDBF94', borderRadius: 5, padding: '0.4rem' }}>{liveNpc}</div>}
          </div>

          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {!inVoice ? (
              <button
                type="button"
                onClick={startVoice}
                style={{ border: '1px solid #000', background: '#3A6B5E', color: '#F2EBD9', borderRadius: 6, padding: '0.45rem 0.65rem', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                Start voice
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={toggleMuted}
                  style={{ border: '1px solid #000', background: muted ? '#F2EBD9' : '#DCE6D2', color: '#1E1E1A', borderRadius: 6, padding: '0.45rem 0.65rem', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', gap: '0.35rem', alignItems: 'center' }}
                >
                  <MicIcon muted={muted} />
                  {muted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  type="button"
                  onClick={stopVoice}
                  style={{ border: '1px solid #B87D6B', background: '#F4E2D9', color: '#1E1E1A', borderRadius: 6, padding: '0.45rem 0.65rem', fontSize: '0.72rem', fontWeight: 900, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Stop
                </button>
              </>
            )}
            <span style={{ fontSize: '0.68rem', color: status === 'error' ? '#7B3D32' : '#6A604B' }}>
              {statusLabel}{status === 'error' && statusDetail ? `: ${statusDetail}` : ''}
            </span>
          </div>

          {status === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div style={{ fontSize: '0.68rem', color: '#6A604B' }}>{companion.fallbackPrompt || 'Type to Jordan instead.'}</div>
              <textarea
                value={typedInput}
                onChange={(event) => setTypedInput(event.target.value)}
                rows={3}
                placeholder="Ask Jordan what to inspect..."
                style={{ border: '1px solid #CDBF94', background: '#FBF7EA', color: '#1E1E1A', borderRadius: 6, padding: '0.5rem', fontFamily: 'Inter, system-ui, sans-serif', fontSize: '0.75rem', lineHeight: 1.4, resize: 'vertical' }}
              />
              <button
                type="button"
                onClick={submitTyped}
                disabled={!typedInput.trim() || typedLoading}
                style={{ alignSelf: 'flex-start', border: '1px solid #000', background: typedInput.trim() && !typedLoading ? '#3A6B5E' : '#EFE8D2', color: typedInput.trim() && !typedLoading ? '#F2EBD9' : '#6A604B', borderRadius: 6, padding: '0.42rem 0.65rem', fontSize: '0.72rem', fontWeight: 900, cursor: typedInput.trim() && !typedLoading ? 'pointer' : 'not-allowed', fontFamily: 'Inter, system-ui, sans-serif' }}
              >
                {typedLoading ? 'Asking...' : 'Ask Jordan'}
              </button>
              {typedError && <div style={{ fontSize: '0.68rem', color: '#7B3D32' }}>{typedError}</div>}
            </div>
          )}
    </div>
  )

  if (chrome === 'plain') {
    return (
      <aside data-testid="app-audit-companion" style={{ minHeight: 0, display: 'block' }}>
        {body}
      </aside>
    )
  }

  return (
    <aside data-testid="app-audit-companion" style={{ minHeight: 0, display: 'flex' }}>
      <LaptopFrame variant="slack" title={companion.title || `Ask ${npc.name.split(' ')[0]}`} fill scrollable>
        {body}
      </LaptopFrame>
    </aside>
  )
}
