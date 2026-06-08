import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import ActionButton from './ActionButton'
import LaptopFrame from './LaptopFrame'
import SlackCompose from './SlackCompose'
import { renderContentWithGlossary } from './JargonTerm'
import { getSlackAvatarColor, getSlackInitials } from './SlackMessageEnhanced'
import { useGameStore } from '../../store/gameStore'
import { npcs } from '../../data/npcs'
import { npcReply } from '../../services/gemini'
import { interpolate } from '../../lib/interpolate'
import type { ChatMessage, NPC, PresetReply } from '../../types/game'

interface Props {
  /** Required: which NPC the player is talking to */
  npcId: string
  /** Required: NPC system-prompt instruction (never shown to the player) */
  goalPrompt: string
  /** Optional: player-facing objective shown above the chat when there are no messages yet */
  playerGoal?: string
  channel?: 'slack' | 'email' | 'chat'
  maxTurns?: number
  initialMessages?: ChatMessage[]
  onComplete?: () => void
  completeLabel?: string
  /** Optional preset replies the user can pick instead of typing */
  presetReplies?: PresetReply[]
  /** If true, hide free-text input; user must use presets */
  presetsOnly?: boolean
  /** Scene id used to write branch flags when a preset has branchFlag */
  sceneId?: string
  /** If true, skip the inner LaptopFrame (use when already inside an outer window) */
  embedded?: boolean
  /** Slack channel or thread title, usually from the outer app window. */
  threadTitle?: string
}

function formatSlackTime(ts?: string): string {
  if (!ts) return ''
  const parsed = new Date(ts)
  if (!Number.isNaN(parsed.getTime()) && /\d{4}-\d{2}-\d{2}T/.test(ts)) {
    return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return ts
}

function LiveSlackMessageRow({ message, npc, playerName }: { message: ChatMessage; npc: NPC; playerName: string }) {
  const isUser = message.role === 'user'
  const sender = isUser ? playerName || 'You' : message.npcName ?? npc.name
  const speakerRole = isUser ? 'Professor' : message.npcName && message.npcName !== npc.name ? 'Workspace app' : npc.role
  const initials = getSlackInitials(sender) || getSlackInitials(npc.name) || (isUser ? 'Y' : 'N')
  const timestamp = formatSlackTime(message.ts)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        display: 'flex',
        gap: '0.625rem',
        padding: '0.625rem 0.875rem',
        borderRadius: '4px',
        backgroundColor: isUser ? '#EFE8D2' : '#F7F1E3',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '6px',
          backgroundColor: getSlackAvatarColor(sender),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginTop: '2px',
          border: '1px solid rgba(0,0,0,0.12)',
        }}
      >
        <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em' }}>
          {initials}
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1d1c1d' }}>
            {sender}
          </span>
          <span style={{ fontSize: '0.6875rem', color: '#616061' }}>
            {speakerRole}
          </span>
          {timestamp && (
            <span style={{ fontSize: '0.6875rem', color: '#8A8176', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              {timestamp}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: '#1d1c1d',
            whiteSpace: 'pre-wrap',
            marginTop: '0.125rem',
          }}
        >
          {renderContentWithGlossary(message.content)}
        </div>
      </div>
    </motion.div>
  )
}

function SlackTypingRow({ npc }: { npc: NPC }) {
  const initials = getSlackInitials(npc.name) || 'D'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.375rem 0.875rem 0.75rem',
        color: '#616061',
        fontSize: '0.75rem',
        fontStyle: 'italic',
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '4px',
          backgroundColor: getSlackAvatarColor(npc.name),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 700 }}>{initials}</span>
      </div>
      {npc.name} is typing...
    </motion.div>
  )
}

export default function NPCChatPanel({
  npcId,
  goalPrompt,
  playerGoal,
  channel = 'chat',
  maxTurns = 8,
  initialMessages = [],
  onComplete,
  completeLabel = 'Done',
  presetReplies,
  presetsOnly = false,
  sceneId,
  embedded = false,
  threadTitle,
}: Props) {
  const npc = npcs[npcId]
  const messages = useGameStore((s) => s.npcConversations[npcId] || [])
  const appendNpcMessage = useGameStore((s) => s.appendNpcMessage)
  const setBranchFlag = useGameStore((s) => s.setBranchFlag)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usedPresetIds, setUsedPresetIds] = useState<Set<string>>(new Set())
  const initialized = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Seed initial messages once, resolving {{playerName}} tokens in content
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (messages.length === 0 && initialMessages.length > 0) {
      initialMessages.forEach((m) => appendNpcMessage(npcId, {
        ...m,
        content: interpolate(m.content, { playerName, branchFlags, mcSelections }),
      }))
    }
  }, [npcId, initialMessages, messages.length, appendNpcMessage, playerName, branchFlags, mcSelections])

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, loading])

  const userTurns = messages.filter((m) => m.role === 'user').length
  const reachedMax = userTurns >= maxTurns

  const submit = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    setError(null)
    appendNpcMessage(npcId, { role: 'user', content: trimmed, ts: new Date().toISOString() })
    setInput('')
    setLoading(true)
    try {
      const history: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
      const reply = await npcReply({ npcId, history, goalPrompt, channel })
      appendNpcMessage(npcId, { role: 'npc', content: reply, ts: new Date().toISOString() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'NPC reply failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePresetClick = (preset: PresetReply, idx: number) => {
    const id = preset.id ?? `preset-${idx}`
    if (usedPresetIds.has(id)) return
    setUsedPresetIds(new Set([...usedPresetIds, id]))
    if (preset.branchFlag !== undefined && sceneId) {
      setBranchFlag(sceneId, preset.branchFlag)
    }
    submit(preset.text)
  }

  if (!npc) {
    return (
      <div style={{ padding: '1rem', color: '#c0392b' }}>
        Unknown NPC: <code>{npcId}</code>. Check storyline + npcs in scene-config.json.
      </div>
    )
  }

  const visiblePresets = (presetReplies || []).map((p, idx) => ({
    ...p,
    id: p.id ?? `preset-${idx}`,
    label: p.label ?? (p.text.length > 60 ? p.text.slice(0, 60) + '…' : p.text),
  }))
  const canComplete = !loading && (userTurns >= 1 || reachedMax)
  const presetsAvailable = visiblePresets.length > 0 && !reachedMax
  const isSlack = channel === 'slack'
  const showSummaryHeader = !(embedded && isSlack)
  const emptyMessage = playerGoal || `Start the conversation with ${npc.name}.`
  const slackThreadTitle = threadTitle || `#dm-${npc.name.toLowerCase().split(' ')[0]}`
  const isSlackChannel = slackThreadTitle.startsWith('#') && !slackThreadTitle.startsWith('#dm-')
  const messagePane = isSlack ? (
    <div
      ref={scrollRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: embedded ? '1 1 auto' : undefined,
        minHeight: embedded ? '120px' : '180px',
        maxHeight: embedded ? 'none' : '420px',
        overflowY: 'auto',
        backgroundColor: '#F7F1E3',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.75rem 0.875rem',
          borderBottom: '1px solid #D8CFBE',
          backgroundColor: '#EFE8D2',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: isSlackChannel ? '#3A6B5E' : getSlackAvatarColor(npc.name),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 800 }}>
            {isSlackChannel ? '#' : getSlackInitials(npc.name) || 'D'}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1d1c1d' }}>{slackThreadTitle}</div>
          <div style={{ fontSize: '0.6875rem', color: '#616061', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {isSlackChannel ? 'Channel - Mesa Vista CS faculty' : `Direct message - ${npc.role}`}
          </div>
        </div>
        <div style={{ fontSize: '0.6875rem', color: '#6f6a60', flexShrink: 0 }}>
          {userTurns}/{maxTurns} turns
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', padding: '0.5rem 0' }}>
        {messages.length === 0 && (
          <p style={{ fontStyle: 'italic', color: '#616061', fontSize: '0.8125rem', margin: 0, padding: '0.375rem 0.875rem' }}>
            {emptyMessage}
          </p>
        )}
        {messages.map((m, i) => (
          <LiveSlackMessageRow key={`${m.role}-${i}`} message={m} npc={npc} playerName={playerName} />
        ))}
        {loading && <SlackTypingRow npc={npc} />}
      </div>
    </div>
  ) : (
    <div
      ref={scrollRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '0.75rem',
        flex: embedded ? '1 1 auto' : undefined,
        maxHeight: embedded ? 'none' : '420px',
        minHeight: embedded ? '220px' : '160px',
        overflowY: 'auto',
        backgroundColor: '#F7F1E3',
      }}
    >
      {messages.length === 0 && (
        <p style={{ fontStyle: 'italic', color: '#888', fontSize: '0.8125rem' }}>{emptyMessage}</p>
      )}
      {messages.map((m, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
            backgroundColor: m.role === 'user' ? '#B87D6B' : '#E8DCC8',
            color: m.role === 'user' ? '#F2EBD9' : '#000',
            padding: '0.5rem 0.75rem',
            fontSize: '0.8125rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            border: '1px solid #000',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '0.6875rem', marginBottom: '0.125rem', opacity: 0.8 }}>
            {m.role === 'user' ? 'You' : (m.npcName ?? npc.name)}
          </div>
          {m.content}
        </motion.div>
      ))}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ alignSelf: 'flex-start', fontSize: '0.75rem', color: '#888', fontStyle: 'italic', padding: '0.25rem 0.5rem' }}
        >
          {npc.name} is typing...
        </motion.div>
      )}
    </div>
  )

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: embedded && isSlack ? 0 : '0.75rem',
        height: embedded ? '100%' : undefined,
        minHeight: 0,
      }}
    >
      {showSummaryHeader && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{npc.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#555' }}>{npc.role}</div>
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#888' }}>
            {userTurns}/{maxTurns} turns
          </div>
        </div>
      )}

      {embedded ? (
        messagePane
      ) : (
        <LaptopFrame
          variant={channel === 'email' ? 'email' : channel === 'slack' ? 'slack' : 'doc'}
          title={channel === 'slack' ? slackThreadTitle : `${channel === 'email' ? 'Email' : 'Chat'} · ${npc.name}`}
        >
          {messagePane}
        </LaptopFrame>
      )}

      {error && (
        <div style={{ color: '#B87D6B', fontSize: '0.75rem', padding: embedded && isSlack ? '0.5rem 1rem 0' : undefined }}>
          {error}
        </div>
      )}

      {presetsAvailable && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            padding: embedded && isSlack ? '0.75rem 1rem 0' : undefined,
          }}
        >
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#555', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Quick replies
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {visiblePresets.map((p, idx) => {
              const used = usedPresetIds.has(p.id!)
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetClick(p, idx)}
                  disabled={used || loading || reachedMax}
                  style={{
                    background: used ? '#E8DCC8' : '#F2EBD9',
                    color: used ? '#999' : '#000',
                    border: '1px solid #000',
                    boxShadow: used ? 'none' : '2px 2px 0 #000',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.8125rem',
                    cursor: used || loading || reachedMax ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    textAlign: 'left',
                    maxWidth: '100%',
                    opacity: used ? 0.55 : 1,
                  }}
                >
                  {used ? '✓ ' : ''}
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!presetsOnly && (
        <SlackCompose
          channel={`#${channel === 'email' ? 'email' : channel === 'slack' ? 'dm' : 'chat'}-${npc.name.toLowerCase().split(' ')[0]}`}
          value={input}
          onChange={setInput}
          onSend={() => submit(input)}
          sendDisabled={loading || reachedMax || !input.trim()}
          showChannelHeader={!embedded}
          compact={embedded && isSlack}
          placeholder={reachedMax ? 'Conversation complete. Click "Done" below.' : `Reply to ${npc.name}...`}
        />
      )}

      {onComplete && embedded && isSlack ? (
        <div
          style={{
            padding: '0 1rem 0.875rem',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: '#F7F1E3',
          }}
        >
          <button
            type="button"
            onClick={onComplete}
            disabled={!canComplete}
            style={{
              backgroundColor: canComplete ? '#B87D6B' : '#EFE8D2',
              color: canComplete ? '#F7F1E3' : '#8A8176',
              border: '1px solid #CDBF94',
              borderRadius: '4px',
              padding: '0.5rem 0.875rem',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: canComplete ? 'pointer' : 'not-allowed',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {completeLabel}
          </button>
        </div>
      ) : onComplete ? (
        <div style={{ marginTop: embedded && isSlack ? 0 : '0.5rem', padding: embedded && isSlack ? '0 1rem 1rem' : undefined }}>
          <ActionButton
            text={completeLabel}
            onClick={onComplete}
            disabled={!canComplete}
            variant={canComplete ? 'primary' : 'secondary'}
          />
        </div>
      ) : null}
    </div>
  )
}
