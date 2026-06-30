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
import type { ChatMessage, PresetReply } from '../../types/game'

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
  const presetsAvailable = visiblePresets.length > 0 && !reachedMax

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{npc.name}</div>
          <div style={{ fontSize: '0.75rem', color: '#555' }}>{npc.role}</div>
        </div>
        <div style={{ fontSize: '0.6875rem', color: '#888' }}>
          {userTurns}/{maxTurns} turns
        </div>
      </div>

      {embedded ? (
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
            <p style={{ fontStyle: 'italic', color: '#888', fontSize: '0.8125rem' }}>{renderContentWithGlossary(playerGoal)}</p>
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
              {npc.name} is typing…
            </motion.div>
          )}
        </div>
      ) : (
        <LaptopFrame
          variant={channel === 'email' ? 'email' : channel === 'slack' ? 'slack' : 'doc'}
          title={`${channel === 'email' ? 'Email' : channel === 'slack' ? '#dm' : 'Chat'} · ${npc.name}`}
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
              <p style={{ fontStyle: 'italic', color: '#888', fontSize: '0.8125rem' }}>{renderContentWithGlossary(goalPrompt)}</p>
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
          placeholder={reachedMax ? 'Conversation complete — click "Done" below.' : `Reply to ${npc.name}…`}
        />
      )}

      {onComplete && (
        <div style={{ marginTop: '0.5rem' }}>
          <ActionButton
            text={completeLabel}
            onClick={onComplete}
            disabled={userTurns < 1 && !reachedMax}
            variant={userTurns >= 1 || reachedMax ? 'primary' : 'secondary'}
          />
        </div>
      )}
    </div>
  )
}
