import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import ActionButton from './ActionButton'
import LaptopFrame from './LaptopFrame'
import SlackCompose from './SlackCompose'
import { renderContentWithGlossary } from './JargonTerm'
import { useGameStore } from '../../store/gameStore'
import { npcs } from '../../data/npcs'
import { npcReply } from '../../services/gemini'
import { interpolate } from '../../lib/interpolate'
import type { ChatMessage, NPC, PresetReply, SlackWorkspaceContext } from '../../types/game'

interface Props {
  /** Required: which NPC the player is talking to */
  npcId: string
  /** Required: NPC system-prompt instruction (never shown to the player) */
  goalPrompt: string
  /** Optional: player-facing objective shown above the chat when there are no messages yet */
  playerGoal?: string
  /** Optional label for the compose placeholder when a thread is not a direct reply to the primary NPC */
  replyTargetLabel?: string
  /** Optional Slack workspace chrome and channel context for embedded Slack scenes */
  slackWorkspace?: SlackWorkspaceContext
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
}

function getSlackInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getSlackAvatarColor(name: string): string {
  const colors = ['#E07A5F', '#3D405B', '#81B29A', '#F2CC8F', '#6A4C93', '#1982C4', '#FF595E', '#8AC926']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function formatSlackTime(ts?: string): string {
  if (!ts) return ''
  const parsed = new Date(ts)
  if (!Number.isNaN(parsed.getTime()) && /\d{4}-\d{2}-\d{2}T/.test(ts)) {
    return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return ts
}

function normalizeChannelName(name: string): string {
  return name.replace(/^#/, '')
}

function slackRoleLabel(sender: string, npc: NPC, isUser: boolean): string {
  if (isUser) return 'Junior UI/UX Designer'
  if (sender === npc.name) return npc.role
  if (sender === 'Leo Chen') return 'Front-End Engineer'
  if (sender === 'Maya Singh') return 'Senior Product Designer'
  return 'Team member'
}

function statusColor(status?: 'online' | 'away' | 'offline'): string {
  if (status === 'away') return '#F2C94C'
  if (status === 'offline') return '#8A8176'
  return '#2EB67D'
}

function SlackMessageRow({ message, npc, playerName }: { message: ChatMessage; npc: NPC; playerName: string }) {
  const isUser = message.role === 'user'
  const sender = isUser ? playerName || 'You' : message.npcName ?? npc.name
  const initials = getSlackInitials(sender) || getSlackInitials(npc.name) || (isUser ? 'Y' : 'N')
  const timestamp = formatSlackTime(message.ts)
  const roleLabel = slackRoleLabel(sender, npc, isUser)

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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem 0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1d1c1d', whiteSpace: 'nowrap' }}>
            {sender}
          </span>
          <span style={{ fontSize: '0.6875rem', color: '#616061' }}>
            {roleLabel}
          </span>
          {timestamp && (
            <span style={{ fontSize: '0.6875rem', color: '#8A8176', whiteSpace: 'nowrap' }}>
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
  const initials = getSlackInitials(npc.name) || 'N'

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
  replyTargetLabel,
  slackWorkspace,
  channel = 'chat',
  maxTurns = 8,
  initialMessages = [],
  onComplete,
  completeLabel = 'Done',
  presetReplies,
  presetsOnly = false,
  sceneId,
  embedded = false,
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

  const userTurns = messages.filter((m) => m.role === 'user').length
  const reachedMax = userTurns >= maxTurns

  // Keep seeded Slack context readable from the first message, then follow active replies.
  useEffect(() => {
    const pane = scrollRef.current
    if (!pane) return
    pane.scrollTo({ top: userTurns === 0 && !loading ? 0 : pane.scrollHeight, behavior: 'smooth' })
  }, [messages.length, loading, userTurns])

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
  const isSlack = channel === 'slack'
  const composeTarget = replyTargetLabel ?? npc.name
  const activeChannelName = normalizeChannelName(slackWorkspace?.channelName ?? composeTarget)
  const workspace = {
    workspaceName: slackWorkspace?.workspaceName ?? 'WellNest',
    channelName: activeChannelName,
    channelPurpose: slackWorkspace?.channelPurpose ?? 'Design and engineering discussion',
    threadLabel: slackWorkspace?.threadLabel ?? 'Feature decision thread',
    activeMembers: slackWorkspace?.activeMembers ?? ['Ben Carter', 'Leo Chen', playerName || 'You'],
    sidebarChannels: slackWorkspace?.sidebarChannels ?? [
      { name: 'core-experience' },
      { name: activeChannelName, active: true, unread: true },
      { name: 'friend-streaks' },
      { name: 'product-updates' },
    ],
    directMessages: slackWorkspace?.directMessages ?? [
      { name: 'Maya Singh', status: 'away' as const },
      { name: 'Ben Carter', status: 'online' as const, active: true },
      { name: 'Leo Chen', status: 'online' as const },
    ],
  }
  const canComplete = !loading && (userTurns >= 1 || reachedMax)
  const presetsAvailable = visiblePresets.length > 0 && !reachedMax
  const emptyMessage = playerGoal || `Start the conversation with ${npc.name}.`
  const hasSentReply = userTurns >= 1
  const slackPane = (
    <div
      ref={scrollRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: embedded ? '1 1 auto' : undefined,
        minHeight: embedded ? '150px' : '180px',
        maxHeight: embedded ? 'none' : '420px',
        overflowY: 'auto',
        backgroundColor: '#F7F1E3',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', padding: '0.5rem 0' }}>
        {messages.length === 0 && (
          <p style={{ fontStyle: 'italic', color: '#616061', fontSize: '0.8125rem', margin: 0, padding: '0.375rem 0.875rem' }}>
            {renderContentWithGlossary(emptyMessage)}
          </p>
        )}
        {messages.map((m, i) => (
          <SlackMessageRow key={`${m.role}-${i}`} message={m} npc={npc} playerName={playerName} />
        ))}
        {loading && <SlackTypingRow npc={npc} />}
      </div>
    </div>
  )

  const chatPane = (
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
        <p style={{ fontStyle: 'italic', color: '#888', fontSize: '0.8125rem' }}>{renderContentWithGlossary(emptyMessage)}</p>
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
          {renderContentWithGlossary(m.content)}
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

  if (embedded && isSlack) {
    return (
      <div
        data-ui-surface="slack-workspace"
        style={{
          height: '100%',
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'clamp(4.5rem, 22%, 10rem) minmax(0, 1fr)',
          backgroundColor: '#FFFFFF',
          color: '#1D1C1D',
        }}
      >
        <aside
          aria-label="WellNest Slack sidebar"
          style={{
            backgroundColor: '#3F0E40',
            color: '#F8EEF7',
            padding: '0.75rem 0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {workspace.workspaceName}
            </div>
            <div style={{ fontSize: '0.62rem', color: '#D9C3D8', marginTop: '0.15rem' }}>Product team</div>
          </div>

          <div>
            <div style={{ fontSize: '0.58rem', color: '#D9C3D8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem' }}>
              Channels
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              {workspace.sidebarChannels.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.28rem',
                    minWidth: 0,
                    borderRadius: '4px',
                    padding: '0.18rem 0.35rem',
                    backgroundColor: item.active ? '#1164A3' : 'transparent',
                    color: item.active ? '#FFFFFF' : '#E8D5E7',
                    fontWeight: item.unread ? 800 : 600,
                    fontSize: '0.68rem',
                  }}
                >
                  <span aria-hidden="true" style={{ color: item.active ? '#FFFFFF' : '#BDA7BC' }}>#</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.58rem', color: '#D9C3D8', textTransform: 'uppercase', fontWeight: 800, marginBottom: '0.25rem' }}>
              Direct messages
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              {workspace.directMessages.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    minWidth: 0,
                    borderRadius: '4px',
                    padding: '0.18rem 0.35rem',
                    backgroundColor: item.active ? 'rgba(255,255,255,0.13)' : 'transparent',
                    fontSize: '0.68rem',
                    color: '#E8D5E7',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '999px',
                      backgroundColor: statusColor(item.status),
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, backgroundColor: '#FFFFFF' }}>
          <header
            style={{
              borderBottom: '1px solid #E5E0E8',
              padding: '0.45rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexShrink: 0,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', minWidth: 0 }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 850, color: '#1D1C1D', whiteSpace: 'nowrap' }}>#{workspace.channelName}</span>
                <span style={{ fontSize: '0.66rem', color: '#616061', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {workspace.threadLabel}
                </span>
              </div>
              <div style={{ fontSize: '0.66rem', color: '#616061', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.1rem' }}>
                {workspace.channelPurpose}
              </div>
            </div>
            <div
              style={{
                flexShrink: 0,
                fontSize: '0.66rem',
                color: '#616061',
                backgroundColor: '#F8F6F8',
                border: '1px solid #E5E0E8',
                borderRadius: '999px',
                padding: '0.18rem 0.5rem',
                whiteSpace: 'nowrap',
              }}
            >
              {workspace.activeMembers.length} people
            </div>
          </header>

          <div
            ref={scrollRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: '1 1 auto',
              minHeight: '150px',
              overflowY: 'auto',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', padding: '0.45rem 0.15rem 0.35rem' }}>
              {messages.length === 0 && (
                <p style={{ fontStyle: 'italic', color: '#616061', fontSize: '0.8125rem', margin: 0, padding: '0.375rem 0.875rem' }}>
                  {renderContentWithGlossary(emptyMessage)}
                </p>
              )}
              {messages.map((m, i) => (
                <SlackMessageRow key={`${m.role}-${i}`} message={m} npc={npc} playerName={playerName} />
              ))}
              {loading && <SlackTypingRow npc={npc} />}
            </div>
          </div>

          {error && (
            <div style={{ color: '#B87D6B', fontSize: '0.75rem', padding: '0.45rem 0.85rem 0' }}>
              {error}
            </div>
          )}

          {presetsAvailable && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.65rem 0.85rem 0' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#555' }}>Quick replies</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                {visiblePresets.map((p, idx) => {
                  const used = usedPresetIds.has(p.id!)
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePresetClick(p, idx)}
                      disabled={used || loading || reachedMax}
                      style={{
                        background: used ? '#F4F1F4' : '#FFFFFF',
                        color: used ? '#999' : '#1D1C1D',
                        border: '1px solid #D8CFBE',
                        borderRadius: '4px',
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.8125rem',
                        cursor: used || loading || reachedMax ? 'not-allowed' : 'pointer',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        textAlign: 'left',
                        maxWidth: '100%',
                        opacity: used ? 0.55 : 1,
                      }}
                    >
                      {used ? 'Sent: ' : ''}
                      {renderContentWithGlossary(p.label)}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {!presetsOnly && (
            <SlackCompose
              channel={`#${workspace.channelName}`}
              value={input}
              onChange={setInput}
              onSend={() => submit(input)}
              sendDisabled={loading || reachedMax || !input.trim()}
              showChannelHeader={false}
              compact
              helperText={hasSentReply ? 'Reply sent. Wait for Ben, then submit.' : 'Send one team reply. Then use Submit & continue.'}
              placeholder={reachedMax ? `Reply sent. Use "${completeLabel}" below.` : `Reply in #${workspace.channelName}: Ben goal + Leo concern + next step...`}
            />
          )}

          {onComplete && (
            <div
              style={{
                padding: '0 0.85rem 0.75rem',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: '#FFFFFF',
              }}
            >
              <button
                type="button"
                onClick={onComplete}
                disabled={!canComplete}
                style={{
                  backgroundColor: canComplete ? '#4A154B' : '#F4F1F4',
                  color: canComplete ? '#FFFFFF' : '#8A8176',
                  border: canComplete ? '1px solid #4A154B' : '1px solid #D8CFBE',
                  borderRadius: '4px',
                  padding: '0.5rem 0.875rem',
                  fontSize: '0.8125rem',
                  fontWeight: 800,
                  cursor: canComplete ? 'pointer' : 'not-allowed',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {completeLabel}
              </button>
            </div>
          )}
        </section>
      </div>
    )
  }

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
      {!(embedded && isSlack) && (
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
        isSlack ? slackPane : chatPane
      ) : (
        <LaptopFrame
          variant={channel === 'email' ? 'email' : channel === 'slack' ? 'slack' : 'doc'}
          title={`${channel === 'email' ? 'Email' : channel === 'slack' ? '#dm' : 'Chat'} · ${npc.name}`}
        >
          {isSlack ? slackPane : chatPane}
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
                  {renderContentWithGlossary(p.label)}
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
          placeholder={reachedMax ? 'Conversation complete. Click "Done" below.' : `Reply to ${composeTarget}...`}
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
