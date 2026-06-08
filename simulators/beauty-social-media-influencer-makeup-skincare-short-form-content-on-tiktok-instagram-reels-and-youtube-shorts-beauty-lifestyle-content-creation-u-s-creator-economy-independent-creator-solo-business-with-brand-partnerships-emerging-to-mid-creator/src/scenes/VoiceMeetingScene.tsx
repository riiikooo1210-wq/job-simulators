import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevTools } from '../lib/devTools'
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

function SupportDocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <h3
        style={{
          margin: 0,
          fontSize: '0.68rem',
          color: '#3A6B5E',
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </h3>
      <div style={{ fontSize: '0.75rem', lineHeight: 1.45, color: '#1f1b16' }}>
        {children}
      </div>
    </section>
  )
}

function BrandCallSupportDoc({ counterofferDraft }: { counterofferDraft: string }) {
  const hasDraft = counterofferDraft.trim().length > 0

  return (
    <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <SupportDocSection title="Jordan's Ask">
        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
          <li>1 TikTok, 1 Instagram Reel, and 3 Story frames for GlowKind SPF Skin Tint.</li>
          <li>Initial offer: $650 + product, with final assets due tonight.</li>
          <li>Brand wants paid social usage and whitelisting from your handle.</li>
        </ul>
      </SupportDocSection>

      <SupportDocSection title="Maya's Terms Checklist">
        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
          <li>Paid usage window.</li>
          <li>Whitelisting permissions and where ads can run.</li>
          <li>Category exclusivity.</li>
          <li>Revision count.</li>
          <li>Exact final deadline and time zone.</li>
        </ul>
      </SupportDocSection>

      <SupportDocSection title="Review Guardrails">
        <ul style={{ margin: 0, paddingLeft: '1rem' }}>
          <li>Disclose paid partnership and product provided by GlowKind.</li>
          <li>Only claim what you actually test: shade, texture, natural light, several-hour wear.</li>
          <li>Avoid acne treatment, dermatologist-level benefits, all-day wear, or universal shade claims.</li>
        </ul>
      </SupportDocSection>

      <SupportDocSection title="Your Sent Counteroffer Email">
        <div
          style={{
            border: '1px solid #d7cfbc',
            backgroundColor: '#fffaf0',
            padding: '0.55rem',
            whiteSpace: 'pre-wrap',
            maxHeight: 170,
            overflowY: 'auto',
          }}
        >
          {hasDraft
            ? counterofferDraft
            : 'No sent counteroffer email found. Use Jordan’s ask and Maya’s checklist as your call notes.'}
        </div>
      </SupportDocSection>
    </div>
  )
}

export default function VoiceMeetingScene({ node }: Props) {
  const npc = npcs[node.npcId]
  const conversationKey = `voice:${node.id}:${node.npcId}`
  const messages = useGameStore((s) => s.npcConversations[conversationKey] || [])
  const responses = useGameStore((s) => s.freeTextResponses)
  const appendNpcMessage = useGameStore((s) => s.appendNpcMessage)
  const setBranchFlag = useGameStore((s) => s.setBranchFlag)
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
  const counterofferDraft = responses.scene_04_counteroffer || ''
  const baseMeetingContext = interpolate(node.meetingContext || node.content || '', { playerName, branchFlags, mcSelections })
  const meetingContext = node.id === 'scene_05_brand_call'
    ? `${baseMeetingContext}\n\nPLAYER'S SENT COUNTEROFFER EMAIL:\n${counterofferDraft || 'No sent counteroffer email found.'}`
    : baseMeetingContext
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

  const assessBrandCallOutcome = () => {
    const currentMessages = useGameStore.getState().npcConversations[conversationKey] || []
    const userTranscript = currentMessages
      .filter((m) => m.role === 'user')
      .map((m) => m.content.toLowerCase())
      .join(' ')

    if (node.id !== 'scene_05_brand_call') return undefined

    const conceptsCovered = [
      /\b(rate|fee|price|package|compensation|budget)\b|\$/.test(userTranscript),
      /\b(usage|license|licensing|paid social|ad|ads|boost|reuse|window|days|month)\b/.test(userTranscript),
      /\b(whitelist|whitelisting|handle|spark ad|boosting from my account)\b/.test(userTranscript),
      /\b(disclos|paid partnership|honest|caveat|wear|tested|claim|review)\b/.test(userTranscript),
    ].filter(Boolean).length

    return conceptsCovered >= 3 ? 'terms_secured' : 'terms_unclear'
  }

  const advanceMeeting = (forcedOutcome?: string) => {
    flushPending('user')
    flushPending('npc')
    const outcome = forcedOutcome ?? assessBrandCallOutcome()
    if (outcome) setBranchFlag(node.id, outcome)
    goNext(node)
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
  const showBrandSupportDoc = node.id === 'scene_05_brand_call'
  const meetingBody = (
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
        {!inCall && !meetingEnded && (
          <button
            onClick={startMeeting}
            style={{ background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '24px', padding: '0.55rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Join meeting
          </button>
        )}
        {inCall && (
          <>
            <button
              onClick={toggleMuted}
              style={{
                background: muted ? '#EA4335' : 'rgba(255,255,255,0.14)',
                color: '#fff',
                border: muted ? '1px solid #EA4335' : '1px solid rgba(255,255,255,0.25)',
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
              style={{ background: '#EA4335', color: '#fff', border: 'none', borderRadius: '50px', padding: '0.45rem 1rem', fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer' }}
            >
              End meeting
            </button>
          </>
        )}
      </div>

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
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          {node.id === 'scene_05_brand_call' && (
            <ActionButton text="Skip (dev)" onClick={() => advanceMeeting('terms_secured')} variant="secondary" fullWidth={false} />
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

        <DesktopOverlay
          width={showBrandSupportDoc ? '82%' : '70%'}
          height={showBrandSupportDoc ? '82%' : '74%'}
          contentPaddingBottom={showBrandSupportDoc ? '2%' : '5%'}
          backgroundScale={showBrandSupportDoc ? 1.18 : 1}
          backgroundObjectPosition={showBrandSupportDoc ? 'center 28%' : 'center'}
        >
          {showBrandSupportDoc ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 0.78fr) minmax(0, 1.22fr)',
                gap: '0.6rem',
                height: '100%',
                minHeight: 0,
              }}
            >
              <LaptopFrame variant="doc" title="Call Support Doc" fill scrollable>
                <BrandCallSupportDoc counterofferDraft={counterofferDraft} />
              </LaptopFrame>
              <LaptopFrame variant="meeting" title={`Live meeting – ${npc.name}`} fill>
                {meetingBody}
              </LaptopFrame>
            </div>
          ) : (
            <LaptopFrame variant="meeting" title={`Live meeting – ${npc.name}`} fill>
              {meetingBody}
            </LaptopFrame>
          )}
        </DesktopOverlay>

        {meetingEnded && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <ActionButton
              text="Submit & continue"
              onClick={() => advanceMeeting()}
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
        )}
        {showDevTools && node.id !== 'scene_05_brand_call' && (
          <ActionButton text="Skip (dev)" onClick={() => advanceMeeting('terms_secured')} variant="secondary" fullWidth={false} />
        )}
      </motion.div>
    </SceneWrapper>
  )
}
