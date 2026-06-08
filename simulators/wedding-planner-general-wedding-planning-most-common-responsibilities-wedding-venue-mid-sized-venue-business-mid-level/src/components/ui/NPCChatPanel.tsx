import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import ActionButton from './ActionButton'
import LaptopFrame from './LaptopFrame'
import SlackCompose from './SlackCompose'
import SlackMessageEnhanced from './SlackMessageEnhanced'
import { useGameStore } from '../../store/gameStore'
import { npcs } from '../../data/npcs'
import { npcReply } from '../../services/gemini'
import { interpolate } from '../../lib/interpolate'
import type { ChatMessage, PresetReply, SlackMessageData } from '../../types/game'

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
  /** Optional title for the channel/thread, e.g. Vendor DMs */
  conversationTitle?: string
}

function splitNameRole(name: string): { name: string; role?: string } {
  const [displayName, ...roleParts] = name.split(',')
  return {
    name: displayName.trim(),
    role: roleParts.join(',').trim() || undefined,
  }
}

function formatSlackTimestamp(ts?: string, index = 0): string {
  if (!ts) {
    return ['3:31 PM', '3:33 PM', '3:35 PM'][index] ?? 'Now'
  }
  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return 'Now'
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function initialsForName(name: string): string {
  const parts = splitNameRole(name).name.split(/\s+/).filter(Boolean)
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'DM'
}

function getSlackAvatarColor(name: string): string {
  if (/^Tessa Morgan\b/.test(name)) return '#1982C4'
  const colors = ['#E07A5F', '#3D405B', '#81B29A', '#F2CC8F', '#6A4C93', '#1982C4', '#FF595E', '#8AC926']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
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
  conversationTitle,
}: Props) {
  const npc = npcs[npcId]
  const messages = useGameStore((s) => s.npcConversations[npcId] || [])
  const appendNpcMessage = useGameStore((s) => s.appendNpcMessage)
  const setBranchFlag = useGameStore((s) => s.setBranchFlag)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const directDmInitialMessages = channel === 'slack'
    ? initialMessages.filter((message) => {
      const name = message.npcName ?? ''
      return Boolean(name) && !/^Maya Patel\b/.test(name)
    })
    : []
  const directDmNames = Array.from(new Set(
    directDmInitialMessages
      .map((message) => message.npcName)
      .filter((name): name is string => Boolean(name))
  ))
  const directDmKey = directDmNames.join('|')
  const hasDirectDmRail = channel === 'slack' && directDmNames.length > 1
  const [input, setInput] = useState('')
  const [dmInputs, setDmInputs] = useState<Record<string, string>>({})
  const [activeDmName, setActiveDmName] = useState(directDmNames[0] || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usedPresetIds, setUsedPresetIds] = useState<Set<string>>(new Set())
  const initialized = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const hasUserMessage = messages.some((message) => message.role === 'user')
  const fallbackNpcName = npc?.name ?? npcId

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
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    if (channel === 'slack' && !hasUserMessage && !loading) {
      scrollEl.scrollTo({ top: 0 })
      return
    }
    scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' })
  }, [messages.length, loading, channel, hasUserMessage, activeDmName])

  const userTurns = messages.filter((m) => m.role === 'user').length
  const reachedMax = userTurns >= maxTurns
  const repliedDmNames = new Set(
    messages
      .filter((message) => message.role === 'user' && message.npcName)
      .map((message) => message.npcName!)
  )
  const activeDmDetails = splitNameRole(activeDmName || directDmNames[0] || fallbackNpcName)
  const activeDmInput = activeDmName ? (dmInputs[activeDmName] ?? '') : ''
  const activeDmReplied = activeDmName ? repliedDmNames.has(activeDmName) : false
  const activeDmMessages = hasDirectDmRail
    ? messages.filter((message) => {
      const messageName = message.npcName ?? fallbackNpcName
      return messageName === activeDmName
    })
    : messages
  const activeDmHasUserMessage = activeDmMessages.some((message) => message.role === 'user')

  useEffect(() => {
    if (!hasDirectDmRail) return
    if (!directDmNames.includes(activeDmName)) {
      setActiveDmName(directDmNames[0] || '')
    }
  }, [activeDmName, directDmKey, hasDirectDmRail])

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

  const submitDirectDm = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || !activeDmName || activeDmReplied || reachedMax) return
    setError(null)
    appendNpcMessage(npcId, {
      role: 'user',
      content: trimmed,
      ts: new Date().toISOString(),
      npcName: activeDmName,
    })
    setDmInputs((prev) => ({ ...prev, [activeDmName]: '' }))
    const nextUnreplied = directDmNames.find((name) => name !== activeDmName && !repliedDmNames.has(name))
    if (nextUnreplied) {
      setActiveDmName(nextUnreplied)
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
  const presetsAvailable = visiblePresets.length > 0 && !reachedMax
  const rawChannelTitle = conversationTitle || (channel === 'slack' ? '#channel' : `${channel} · ${npc.name}`)
  const slackChannelTitle = rawChannelTitle.startsWith('#') ? rawChannelTitle : `#${rawChannelTitle.replace(/^#+/, '')}`
  const participantNames = Array.from(new Set(
    ((hasDirectDmRail ? directDmInitialMessages : initialMessages).length > 0
      ? (hasDirectDmRail ? directDmInitialMessages : initialMessages).map((message) => message.npcName ?? npc.name)
      : [npc.name]
    ).filter(Boolean)
  ))
  const participantShortNames = participantNames.map((name) => splitNameRole(name).name.split(' ')[0])
  const participantPreview = [...participantShortNames, 'You'].join(', ')

  const toSlackMessage = (m: ChatMessage, i: number): SlackMessageData => {
    const isUser = m.role === 'user'
    const sender = isUser ? (playerName || 'You') : (m.npcName ?? npc.name)

    return {
      sender: isUser ? 'You' : sender,
      role: isUser ? 'Venue Planner' : splitNameRole(sender).role || npc.role,
      timestamp: formatSlackTimestamp(m.ts, i),
      content: m.content,
      avatarInitials: isUser ? 'You' : undefined,
      avatarColor: isUser ? undefined : getSlackAvatarColor(sender),
    }
  }

  const slackDirectDmPanel = (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '12.75rem minmax(0, 1fr)',
        backgroundColor: '#F7F1E3',
        height: '100%',
        minHeight: 0,
      }}
    >
      <aside
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          padding: '0.75rem 0.65rem',
          backgroundColor: '#EFE8D2',
          borderRight: '1px solid #CDBF94',
          minHeight: 0,
        }}
      >
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6f6758', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Direct messages
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {directDmNames.map((name) => {
            const details = splitNameRole(name)
            const isActive = name === activeDmName
            const isReplied = repliedDmNames.has(name)
            return (
              <button
                key={name}
                type="button"
                onClick={() => setActiveDmName(name)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2rem minmax(0, 1fr)',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: '100%',
                  padding: '0.42rem',
                  backgroundColor: isActive ? '#F7F1E3' : 'transparent',
                  border: isActive ? '1px solid #CDBF94' : '1px solid transparent',
                  borderRadius: '6px',
                  color: '#1d1c1d',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '24px',
                    height: '24px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    justifySelf: 'center',
                    borderRadius: '4px',
                    border: '1px solid rgba(29, 28, 29, 0.28)',
                    backgroundColor: getSlackAvatarColor(name),
                    boxSizing: 'border-box',
                    color: '#F7F1E3',
                    fontSize: '0.55rem',
                    fontWeight: 700,
                  }}
                >
                  {initialsForName(name)}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {details.name}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.68rem', color: isReplied ? '#3A6B5E' : '#7a4a3e', fontWeight: 700 }}>
                    {isReplied ? 'Replied' : 'Needs reply'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </aside>
      <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, backgroundColor: '#F7F1E3' }}>
        <div
          style={{
            padding: '0.65rem 0.85rem',
            borderBottom: '1px solid #CDBF94',
            backgroundColor: '#F7F1E3',
          }}
        >
          <div style={{ fontSize: '0.95rem', fontWeight: 850, color: '#1d1c1d' }}>{activeDmDetails.name}</div>
          <div style={{ fontSize: '0.72rem', color: '#6f6758' }}>
            Direct message{activeDmDetails.role ? ` · ${activeDmDetails.role}` : ''}
          </div>
        </div>
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            padding: '0.75rem',
            flex: '1 1 auto',
            minHeight: 0,
            overflowY: 'auto',
            backgroundColor: '#F7F1E3',
          }}
        >
          {activeDmMessages.length === 0 && playerGoal && (
            <p style={{ fontStyle: 'italic', color: '#888', fontSize: '0.8125rem' }}>{playerGoal}</p>
          )}
          {activeDmMessages.map((message, index) => (
            <SlackMessageEnhanced
              key={`${activeDmName}-${index}`}
              message={toSlackMessage(message, index)}
              delay={0}
              showUnreadDot={index === activeDmMessages.length - 1 && !activeDmHasUserMessage}
            />
          ))}
        </div>
        {!presetsOnly && (
          <SlackCompose
            channel={activeDmDetails.name}
            value={activeDmInput}
            onChange={(value) => setDmInputs((prev) => ({ ...prev, [activeDmName]: value }))}
            onSend={() => submitDirectDm(activeDmInput)}
            sendDisabled={reachedMax || activeDmReplied || !activeDmInput.trim()}
            disabled={reachedMax || activeDmReplied}
            placeholder={activeDmReplied ? `Reply sent to ${activeDmDetails.name}.` : `Reply to ${activeDmDetails.name}...`}
            showHeader={false}
            rows={2}
          />
        )}
      </section>
    </div>
  )

  const slackThreadPanel = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F7F1E3',
        height: '100%',
        minHeight: 0,
      }}
    >
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          padding: '0.75rem',
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          backgroundColor: '#F7F1E3',
        }}
      >
        <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '0.125rem' }}>
          Group channel · visible to {participantPreview}
        </div>
        {messages.length === 0 && playerGoal && (
          <p style={{ fontStyle: 'italic', color: '#888', fontSize: '0.8125rem' }}>{playerGoal}</p>
        )}
        {messages.map((message, index) => (
          <SlackMessageEnhanced
            key={index}
            message={toSlackMessage(message, index)}
            delay={0}
            showUnreadDot={index === messages.length - 1}
          />
        ))}
        {loading && (
          <div
            style={{ alignSelf: 'flex-start', fontSize: '0.75rem', color: '#888', fontStyle: 'italic', padding: '0.25rem 0.5rem' }}
          >
            {npc.name} is typing…
          </div>
        )}
      </div>
      {!presetsOnly && (
        <SlackCompose
          channel={slackChannelTitle}
          value={input}
          onChange={setInput}
          onSend={() => submit(input)}
          sendDisabled={loading || reachedMax || !input.trim()}
          placeholder={reachedMax ? 'Conversation complete — click "Done" below.' : `Reply in ${slackChannelTitle}…`}
          showHeader={false}
          rows={2}
        />
      )}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', ...(channel === 'slack' ? { height: '100%', minHeight: 0 } : {}) }}>
      {channel !== 'slack' && (
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

      {channel === 'slack' ? (
        embedded ? (
          hasDirectDmRail ? slackDirectDmPanel : slackThreadPanel
        ) : (
          <LaptopFrame variant="slack" title={slackChannelTitle}>
            {hasDirectDmRail ? slackDirectDmPanel : slackThreadPanel}
          </LaptopFrame>
        )
      ) : embedded ? (
        <div
          ref={scrollRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            padding: '0.75rem',
            maxHeight: '420px',
            minHeight: '160px',
            overflowY: 'auto',
            backgroundColor: '#fff',
          }}
        >
          {messages.length === 0 && playerGoal && (
            <p style={{ fontStyle: 'italic', color: '#888', fontSize: '0.8125rem' }}>{playerGoal}</p>
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
              {npc.name} is typing…
            </motion.div>
          )}
        </div>
      ) : (
        <LaptopFrame
          variant={channel === 'email' ? 'email' : 'doc'}
          title={`${channel === 'email' ? 'Email' : 'Chat'} · ${npc.name}`}
        >
          <div
            ref={scrollRef}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              padding: '0.75rem',
              maxHeight: '420px',
              minHeight: '160px',
              overflowY: 'auto',
              backgroundColor: '#fff',
            }}
          >
            {messages.length === 0 && (
              <p style={{ fontStyle: 'italic', color: '#888', fontSize: '0.8125rem' }}>{goalPrompt}</p>
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
                {npc.name} is typing…
              </motion.div>
            )}
          </div>
        </LaptopFrame>
      )}

      {error && <div style={{ color: '#c0392b', fontSize: '0.75rem' }}>{error}</div>}

      {presetsAvailable && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
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

      {!presetsOnly && channel !== 'slack' && (
        <SlackCompose
          channel={`#${channel === 'email' ? 'email' : 'chat'}-${npc.name.toLowerCase().split(' ')[0]}`}
          value={input}
          onChange={setInput}
          onSend={() => submit(input)}
          sendDisabled={loading || reachedMax || !input.trim()}
          placeholder={reachedMax ? 'Conversation complete — click "Done" below.' : `Reply to ${npc.name}…`}
        />
      )}

      {onComplete && (
        channel === 'slack' ? (
          <button
            type="button"
            onClick={onComplete}
            disabled={userTurns < 1 && !reachedMax}
            style={{
              background: userTurns >= 1 || reachedMax ? '#B87D6B' : '#F2EBD9',
              color: userTurns >= 1 || reachedMax ? '#F2EBD9' : '#000',
              border: '1px solid #000',
              borderRadius: '2px',
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '0.45rem 0.75rem',
              width: '100%',
              cursor: userTurns < 1 && !reachedMax ? 'not-allowed' : 'pointer',
              opacity: userTurns < 1 && !reachedMax ? 0.4 : 1,
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {completeLabel}
          </button>
        ) : (
          <div style={{ marginTop: '0.5rem' }}>
            <ActionButton
              text={completeLabel}
              onClick={onComplete}
              disabled={userTurns < 1 && !reachedMax}
              variant={userTurns >= 1 || reachedMax ? 'primary' : 'secondary'}
            />
          </div>
        )
      )}
    </div>
  )
}
