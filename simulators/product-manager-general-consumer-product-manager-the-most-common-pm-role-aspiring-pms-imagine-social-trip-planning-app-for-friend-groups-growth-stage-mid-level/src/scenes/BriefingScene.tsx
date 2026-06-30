import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import { useScrollToTopOnChange } from '../components/hooks/useScrollToTopOnChange'
import ActionButton from '../components/ui/ActionButton'
import SlackMessageEnhanced from '../components/ui/SlackMessageEnhanced'
import EmailBlock from '../components/ui/EmailBlock'
import MetricsTable from '../components/ui/MetricsTable'
import QuoteBlock from '../components/ui/QuoteBlock'
import LaptopFrame from '../components/ui/LaptopFrame'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { ChartIcon, CheckIcon, DocumentIcon } from '../components/ui/Icons'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { npcs } from '../data/npcs'
import { coworkerRecapReply } from '../services/gemini'
import type { CSSProperties, ReactNode } from 'react'
import type { BriefingNode, BriefingSubStep, CoworkerRecapTurn, EmailData, SlackMessageData, SourceInboxFile, SourceWorkspaceApp, SourceWorkspaceMessage } from '../types/game'
import DesktopOverlay from '../components/layout/DesktopOverlay'

interface Props { node: BriefingNode }

type BriefingContext = {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
}

function resolveSlackMessage(
  msg: SlackMessageData,
  ctx: BriefingContext,
): SlackMessageData {
  return {
    ...msg,
    sender: interpolate(msg.sender, ctx),
    role: interpolate(msg.role, ctx),
    timestamp: interpolate(msg.timestamp, ctx),
    content: interpolate(msg.content, ctx),
    avatarInitials: msg.avatarInitials ? interpolate(msg.avatarInitials, ctx) : undefined,
  }
}

function resolveWorkspaceSlackMessage(message: SourceWorkspaceMessage, ctx: BriefingContext): SlackMessageData {
  return {
    sender: interpolate(message.from, ctx),
    role: interpolate(message.channelName || 'Slack', ctx),
    timestamp: message.timestamp ? interpolate(message.timestamp, ctx) : '',
    content: interpolate(message.body, ctx),
  }
}

function resolveWorkspaceEmailMessage(
  message: SourceWorkspaceMessage,
  ctx: BriefingContext,
  fallbackSubject: string,
): EmailData {
  return {
    from: interpolate(message.from, ctx),
    to: message.to ? interpolate(message.to, ctx) : 'You',
    subject: interpolate(message.subject || fallbackSubject || 'Email', ctx),
    content: interpolate(message.body, ctx),
  }
}

function SourceAttachmentButtons({
  fileIds,
  files,
  onOpenFile,
}: {
  fileIds?: string[]
  files?: SourceInboxFile[]
  onOpenFile: (fileId: string) => void
}) {
  if (!fileIds?.length || !files?.length) return null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
      {fileIds.map((fileId) => {
        const linkedFile = files.find((file) => file.id === fileId)
        if (!linkedFile) return null
        return (
          <button
            key={fileId}
            type="button"
            onClick={() => onOpenFile(fileId)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
              padding: '0.4rem 0.6rem',
              fontSize: '0.72rem',
              fontWeight: 800,
              color: '#1F2937',
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            }}
          >
            <DocumentIcon size={14} />
            Attached: {linkedFile.name}
          </button>
        )
      })}
    </div>
  )
}

function isLikelyAck(text: string) {
  const cleaned = text.trim().toLowerCase()
  if (!cleaned) return false
  if (cleaned.includes('?') || cleaned.includes('？')) return false
  const ackWords = ['yes', 'yeah', 'yep', 'ok', 'okay', 'got it', 'understood', 'i understand', 'makes sense', 'はい', 'うん', '了解', 'わかった', '分かった', '大丈夫']
  return cleaned.length <= 40 && ackWords.some((word) => cleaned.includes(word))
}

function MemoryCard({ node, ctx }: { node: BriefingNode; ctx: BriefingContext }) {
  if (!node.memoryCard?.bullets?.length) return null
  return (
    <div
      style={{
        border: '1px solid #CDBF94',
        backgroundColor: '#F7F1E3',
        boxShadow: '3px 3px 0 rgba(0,0,0,0.18)',
        padding: '0.75rem 0.9rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
        {node.memoryCard.title || 'You already know'}
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {node.memoryCard.bullets.slice(0, 3).map((bullet, i) => (
          <li key={i} style={{ fontSize: '0.8rem', lineHeight: 1.45, color: '#1E1E1A' }}>
            {renderContentWithGlossary(interpolate(bullet, ctx))}
          </li>
        ))}
      </ul>
    </div>
  )
}

function fallbackRecapAnswer(turn: CoworkerRecapTurn, fallback: string) {
  if (!turn.answerFacts?.length) return fallback
  return `${fallback} ${turn.answerFacts[0]}`
}

function CoworkerRecap({
  node,
  ctx,
  variant = 'briefing',
}: {
  node: BriefingNode
  ctx: BriefingContext
  variant?: 'briefing' | 'slack'
}) {
  const recap = node.coworkerRecap
  const npc = recap?.npcId ? npcs[recap.npcId] : undefined
  const speakerName = recap?.speakerName || npc?.name || 'Your coworker'
  const speakerRole = recap?.speakerRole || npc?.role
  const fallback = recap?.fallback || "You don't need that extra context for this moment. Focus on the point I just gave you."
  const turns = recap?.turns || []
  const [turnIndex, setTurnIndex] = useState(0)
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; content: string }[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const messageScrollRef = useRef<HTMLDivElement>(null)
  const complete = turns.length > 0 && turnIndex >= turns.length
  const currentTurn = turns[turnIndex]
  const isSlack = variant === 'slack'
  const showChatMessages = messages.length > 0
  const visibleMessages = messages
  const briefBullets = node.id === 'briefing_kickoff'
    ? [
        'Your job: find where friend groups get stuck.',
        'Use Slack first, then check the trip numbers in Analytics.',
        'Do not suggest a feature yet. Find the problem first.',
      ]
    : (node.memoryCard?.bullets || []).slice(0, 3)

  useEffect(() => {
    setTurnIndex(0)
    setDraft('')
    setLoading(false)
    setMessages(turns[0] ? [{ role: 'assistant', content: turns[0].coworkerLine }] : [])
  }, [node.id])

  useEffect(() => {
    if (isSlack) return undefined
    if (!showChatMessages || !messageScrollRef.current) return undefined
    const frame = window.requestAnimationFrame(() => {
      const scroller = messageScrollRef.current
      if (scroller) scroller.scrollTop = scroller.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [loading, messages, showChatMessages])

  if (!recap || turns.length === 0) return null

  const advanceTurn = (nextMessages: { role: 'assistant' | 'user'; content: string }[]) => {
    const nextIndex = turnIndex + 1
    if (nextIndex < turns.length) {
      setTurnIndex(nextIndex)
      setMessages([...nextMessages, { role: 'assistant', content: turns[nextIndex].coworkerLine }])
    } else {
      setTurnIndex(nextIndex)
      if (isSlack) {
        setMessages(nextMessages)
        return
      }
      setMessages([...nextMessages, { role: 'assistant', content: "Great. You have Maya's brief now. Next, open Analytics and check the trip numbers." }])
    }
  }

  const submitText = async (text: string) => {
    if (!currentTurn || loading) return
    const trimmed = text.trim()
    if (!trimmed) return
    const withUser = [...messages, { role: 'user' as const, content: trimmed }]
    setMessages(withUser)
    setDraft('')

    if (isLikelyAck(trimmed)) {
      advanceTurn(withUser)
      return
    }

    setLoading(true)
    try {
      const answer = await coworkerRecapReply({
        speakerName,
        speakerRole,
        topic: currentTurn.topic,
        question: trimmed,
        facts: currentTurn.answerFacts || [],
        fallback,
      })
      setMessages([...withUser, { role: 'assistant', content: answer }])
    } catch {
      setMessages([...withUser, { role: 'assistant', content: fallbackRecapAnswer(currentTurn, fallback) }])
    } finally {
      setLoading(false)
    }
  }

  const confirmCurrentMessage = () => {
    if (!currentTurn || loading) return
    if (isSlack) {
      advanceTurn([...messages, { role: 'user', content: 'OK' }])
      return
    }
    void submitText('Yes, I understand.')
  }

  return (
    <div
      style={{
        border: isSlack ? '1px solid #E5E0D4' : '1px solid #000',
        borderRadius: isSlack ? '8px' : 0,
        backgroundColor: isSlack ? '#FFFFFF' : '#EFE8D2',
        boxShadow: isSlack ? '0 1px 3px rgba(0,0,0,0.08)' : '4px 4px 0 rgba(0,0,0,0.24)',
        padding: isSlack ? '0.38rem' : '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: isSlack ? '0.26rem' : '0.7rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline' }}>
        <div style={{ display: isSlack ? 'flex' : 'block', alignItems: 'baseline', gap: '0.4rem', minWidth: 0 }}>
          <div style={{ fontSize: isSlack ? '0.76rem' : '0.82rem', fontWeight: 900, color: '#1E1E1A' }}>
            {speakerName}
          </div>
          {speakerRole && <div style={{ fontSize: isSlack ? '0.62rem' : '0.68rem', color: '#6f6758', whiteSpace: 'nowrap' }}>{speakerRole}</div>}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#3A6B5E', fontWeight: 800 }}>
          Context {Math.min(turnIndex + 1, turns.length)}/{turns.length}
        </div>
      </div>
      {!complete && (
        <div style={{ fontSize: isSlack ? '0.62rem' : '0.72rem', lineHeight: isSlack ? 1.25 : 1.45, color: '#6f6758' }}>
          {isSlack ? 'Click OK after each message.' : 'Click "I understand" or ask a question if anything is unclear.'}
        </div>
      )}
      {showChatMessages && (
        <div
          ref={messageScrollRef}
          aria-live="polite"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: isSlack ? '0.2rem' : '0.5rem',
            maxHeight: isSlack ? undefined : '15rem',
            overflowY: isSlack ? 'visible' : 'auto',
            scrollBehavior: isSlack ? undefined : 'smooth',
          }}
        >
          {visibleMessages.map((message, i) => (
            <div
              key={`${messages.length - visibleMessages.length + i}-${message.role}`}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: isSlack ? '96%' : '86%',
                border: isSlack ? '1px solid #E5E0D4' : '1px solid #CDBF94',
                borderRadius: isSlack ? '8px' : 0,
                backgroundColor: message.role === 'user' ? '#DCE6D2' : '#F7F1E3',
                padding: isSlack ? (message.role === 'user' ? '0.16rem 0.42rem' : '0.28rem 0.42rem') : '0.55rem 0.65rem',
                fontSize: isSlack ? '0.64rem' : '0.8rem',
                lineHeight: isSlack ? 1.23 : 1.45,
                color: '#1E1E1A',
                whiteSpace: 'pre-wrap',
              }}
            >
              {renderContentWithGlossary(interpolate(message.content, ctx))}
            </div>
          ))}
          {loading && <div style={{ fontSize: '0.75rem', color: '#6f6758' }}>{speakerName} is answering...</div>}
        </div>
      )}
      {!complete && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: isSlack ? '0.22rem' : '0.5rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: isSlack ? '0.35rem' : '0.5rem', alignItems: 'stretch', justifyContent: isSlack ? 'flex-end' : 'stretch' }}>
            {!isSlack && (
              <>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void submitText(draft)
                  }}
                  placeholder={'Click "I understand" or ask a question if anything is unclear.'}
                  style={{
                    flex: 1,
                    border: '1px solid #CDBF94',
                    backgroundColor: '#FBF7EA',
                    padding: '0.55rem 0.65rem',
                    font: 'inherit',
                    fontSize: '0.8rem',
                    minWidth: 0,
                  }}
                />
                <button
                  type="button"
                  onClick={() => void submitText(draft)}
                  disabled={loading || !draft.trim()}
                  style={{
                    border: '1px solid #000',
                    backgroundColor: '#3A6B5E',
                    color: '#F7F1E3',
                    boxShadow: '2px 2px 0 #000',
                    padding: '0 0.8rem',
                    fontWeight: 900,
                    cursor: loading || !draft.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  Send
                </button>
              </>
            )}
            <button
              type="button"
              onClick={confirmCurrentMessage}
              disabled={loading}
              style={{
                border: '1px solid #000',
                backgroundColor: '#F7F1E3',
                color: '#1E1E1A',
                boxShadow: '2px 2px 0 #000',
                minHeight: isSlack ? '1.65rem' : undefined,
                padding: isSlack ? '0.22rem 0.9rem' : '0 0.75rem',
                fontWeight: 900,
                fontSize: isSlack ? '0.68rem' : undefined,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {isSlack ? 'OK' : 'I understand'}
            </button>
          </div>
        </div>
      )}
      {complete && isSlack && briefBullets.length > 0 && (
        <div
          style={{
            border: '1px solid #D7CDBA',
            borderRadius: '8px',
            backgroundColor: '#F7F1E3',
            padding: '0.36rem 0.46rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.16rem',
          }}
        >
          <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
            Maya's brief
          </div>
          <ul style={{ margin: 0, paddingLeft: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.08rem' }}>
            {briefBullets.map((bullet, i) => (
              <li key={i} style={{ fontSize: '0.64rem', lineHeight: 1.24, color: '#1E1E1A' }}>
                {renderContentWithGlossary(interpolate(bullet, ctx))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function BriefingLeadIn({ node, ctx }: { node: BriefingNode; ctx: BriefingContext }) {
  if (!node.memoryCard && !node.coworkerRecap) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <MemoryCard node={node} ctx={ctx} />
      <CoworkerRecap node={node} ctx={ctx} />
    </div>
  )
}

function BriefingReferenceCard({ title, content }: { title: string; content: string }) {
  return (
    <section
      style={{
        border: '1px solid #000',
        boxShadow: '4px 4px 0 #000',
        backgroundColor: '#F7F1E3',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}
    >
      <div style={{ fontSize: '0.6875rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
        {title}
      </div>
      <div style={{ fontSize: '0.8125rem', lineHeight: 1.62, color: '#1E1E1A', whiteSpace: 'pre-wrap' }}>
        {renderContentWithGlossary(content)}
      </div>
    </section>
  )
}

export function BriefingDrawerContent({ node }: { node: BriefingNode }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const ctx = { playerName, branchFlags, mcSelections }
  const allSteps = node.subSteps || node.pages || []
  const referenceContent = node.referenceContent ? interpolate(node.referenceContent, ctx) : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {node.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', whiteSpace: 'pre-wrap', margin: 0 }}>
          {renderContentWithGlossary(interpolate(node.content, ctx))}
        </p>
      )}
      {referenceContent && (
        <BriefingReferenceCard title={node.referenceTitle || 'Reference'} content={referenceContent} />
      )}
      {allSteps.length === 0 && (
        <>
          {node.slackMessages?.map((msg, i) => (
            <SlackMessageEnhanced key={i} message={resolveSlackMessage(msg, ctx)} delay={0} showUnreadDot={i === (node.slackMessages?.length ?? 0) - 1} />
          ))}
          {node.emails?.map((email, i) => (
            <EmailBlock key={i} email={{ ...email, content: interpolate(email.content, ctx) }} delay={0} initialExpanded={i === 0} />
          ))}
          {node.quotes?.map((q, i) => (
            <QuoteBlock key={i} quote={{ ...q, text: interpolate(q.text, ctx) }} delay={0} />
          ))}
          {node.metrics && node.metrics.length > 0 && <MetricsTable metrics={node.metrics} />}
        </>
      )}
      {allSteps.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: i > 0 ? '0.75rem' : 0, borderTop: i > 0 ? '1px solid rgba(0,0,0,0.12)' : 'none' }}>
          {s.content && (
            <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', whiteSpace: 'pre-wrap', margin: 0 }}>
              {renderContentWithGlossary(interpolate(s.content, ctx))}
            </p>
          )}
          {s.slackMessages?.map((msg, j) => (
            <SlackMessageEnhanced key={j} message={resolveSlackMessage(msg, ctx)} delay={0} showUnreadDot={j === (s.slackMessages?.length ?? 0) - 1} />
          ))}
          {s.emails?.map((email, j) => (
            <EmailBlock key={j} email={{ ...email, content: interpolate(email.content, ctx) }} delay={0} initialExpanded={j === 0} />
          ))}
          {s.quotes?.map((q, j) => (
            <QuoteBlock key={j} quote={{ ...q, text: interpolate(q.text, ctx) }} delay={0} />
          ))}
        </div>
      ))}
    </div>
  )
}


function InlineIllustration({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      style={{
        width: 'calc(100% + 6rem)',
        marginLeft: '-3rem',
        marginRight: '-3rem',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000',
        backgroundColor: '#E8DCC8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {failed ? (
        <span style={{ fontSize: '0.8125rem', color: '#999', fontStyle: 'italic' }}>Image Placeholder</span>
      ) : (
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

function sourceFileIcon(file: SourceInboxFile) {
  if (file.kind === 'spreadsheet' || file.kind === 'dashboard') return <ChartIcon size={16} />
  return <DocumentIcon size={16} />
}

function formatSourceColumnLabel(key: string) {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function isLookForSection(section: NonNullable<SourceInboxFile['sections']>[number]) {
  return section.heading.trim().toLowerCase() === 'what to look for'
}

function renderLookForCard(body?: string, key = 'look-for') {
  if (!body) return null
  return (
    <div
      key={key}
      style={{
        border: '1px solid #7A9A8D',
        borderLeft: '5px solid #3F605C',
        backgroundColor: '#E7F0EA',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.12)',
        padding: '0.75rem 0.85rem',
      }}
    >
      <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#315D50', textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.32rem' }}>
        What to look for
      </div>
      <div style={{ fontSize: '0.82rem', lineHeight: 1.55, color: '#1E1E1A' }}>
        {renderContentWithGlossary(body)}
      </div>
    </div>
  )
}

function renderSourceFileSection(section: NonNullable<SourceInboxFile['sections']>[number]) {
  if (isLookForSection(section)) return renderLookForCard(section.body, section.heading)

  return (
    <div
      key={section.heading}
      style={{
        border: '1px solid #000',
        backgroundColor: '#F7F1E3',
        boxShadow: '3px 3px 0 rgba(0,0,0,0.16)',
        padding: '0.85rem 0.95rem',
      }}
    >
      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E1E1A', marginBottom: '0.45rem' }}>
        {section.heading}
      </div>
      <div style={{ fontSize: '0.875rem', lineHeight: 1.65, color: '#1E1E1A', whiteSpace: 'pre-wrap' }}>
        {renderContentWithGlossary(section.body)}
      </div>
    </div>
  )
}

export function renderSourceInboxFilePreview(file: SourceInboxFile | null, compact = false) {
  if (!file) {
    return (
      <div
        style={{
          minHeight: '18rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px dashed #CDBF94',
          backgroundColor: '#F2EBD9',
          color: '#6f6758',
          fontSize: '0.875rem',
          textAlign: 'center',
          padding: '1rem',
        }}
      >
        Select a file from the folder.
      </div>
    )
  }

  const rows = file.rows || []
  const columns = file.columns || (rows[0] ? Object.keys(rows[0]).filter(Boolean) : [])
  const sourceSections = file.sections || []

  if (rows.length > 0 && columns.length > 0) {
    const thStyle = compact ? { ...sourceFileThStyle, padding: '0.35rem 0.45rem', fontSize: '0.66rem' } : sourceFileThStyle
    const tdStyle = compact ? { ...sourceFileTdStyle, padding: '0.35rem 0.45rem', fontSize: '0.7rem', lineHeight: 1.25 } : sourceFileTdStyle

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '0.45rem' : '0.875rem' }}>
        <div style={compact ? { display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' } : undefined}>
          <div style={{ fontSize: compact ? '0.66rem' : '0.72rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
            {file.kind}
          </div>
          <h3 style={{ margin: compact ? 0 : '0.15rem 0 0', fontSize: compact ? '0.9rem' : '1rem', lineHeight: 1.3 }}>{file.previewTitle}</h3>
        </div>
        {renderLookForCard(file.lookFor)}
        {sourceSections.map((section) => renderSourceFileSection(section))}
        <div style={{ overflowX: 'auto', border: '1px solid #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#E8DCC8' }}>
                {columns.map((column) => (
                  <th key={column} style={thStyle}>{formatSourceColumnLabel(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F7F1E3' : '#F2EBD9' }}>
                  {columns.map((column) => {
                    const value = row[column] || ''
                    const isStatus = column.toLowerCase() === 'status'
                    const isEscalate = /escalate|critical|risk|verify/i.test(value)
                    return (
                      <td
                        key={column}
                        style={{
                          ...tdStyle,
                          fontWeight: isStatus ? 700 : 400,
                          color: isStatus && isEscalate ? '#9B3E35' : isStatus ? '#3F605C' : '#1E1E1A',
                        }}
                      >
                        {value}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div>
        <div style={{ fontSize: '0.72rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
          {file.kind}
        </div>
        <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem', lineHeight: 1.3 }}>{file.previewTitle}</h3>
      </div>
      {renderLookForCard(file.lookFor)}
      {sourceSections.map((section) => renderSourceFileSection(section))}
    </div>
  )
}

function SourceInboxBriefing({ node }: { node: BriefingNode }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const canvasState = useGameStore((s) => s.interactiveCanvasState[node.id]) || { visited: [], completed: false }
  const markZoneVisited = useGameStore((s) => s.markZoneVisited)
  const setSceneCompleted = useGameStore((s) => s.setSceneCompleted)
  const goNext = useGoNext()
  const sourceInbox = node.sourceInbox!
  const files = sourceInbox.folder.files
  const requiredFileIds = sourceInbox.requiredFileIds || files.map((file) => file.id)
  const [folderOpen, setFolderOpen] = useState(Boolean(sourceInbox.startOpen) || canvasState.visited.length > 0)
  const [activeFileId, setActiveFileId] = useState<string | null>(canvasState.visited[canvasState.visited.length - 1] || null)
  const visitedFiles = canvasState.visited
  const openedRequiredCount = requiredFileIds.filter((id) => visitedFiles.includes(id)).length
  const canContinue = openedRequiredCount >= requiredFileIds.length
  const activeFile = files.find((file) => file.id === activeFileId) || null
  const ctx = { playerName, branchFlags, mcSelections }
  const entry = sourceInbox.entryMessage
  const entryTitle = entry.channel === 'slack'
    ? (entry.channelName || 'Source request')
    : (entry.subject || 'Inbox')

  const openFile = (fileId: string) => {
    setFolderOpen(true)
    setActiveFileId(fileId)
    markZoneVisited(node.id, fileId)
  }

  const continueNext = () => {
    setSceneCompleted(node.id)
    goNext(node)
  }

  return (
    <SceneWrapper illustration={node.illustration}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: '#555' }}>Section {node.section}</span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000', lineHeight: 1.3 }}>
            {node.title}
          </h2>
        </div>

        {node.content && (
          <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', margin: 0 }}>
            {renderContentWithGlossary(interpolate(node.content, ctx))}
          </p>
        )}

        <BriefingLeadIn node={node} ctx={ctx} />

        <DesktopOverlay width={sourceInbox.desktop?.width || '75%'} height={sourceInbox.desktop?.height || '80%'}>
          <LaptopFrame
            variant={folderOpen ? 'doc' : entry.channel}
            title={folderOpen ? sourceInbox.folder.path : entryTitle}
            scrollable
            fill
          >
            {!folderOpen ? (
              entry.channel === 'email' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  <EmailBlock
                    email={{
                      from: interpolate(entry.from, ctx),
                      to: entry.to ? interpolate(entry.to, ctx) : 'You',
                      subject: interpolate(entry.subject || 'Source request', ctx),
                      content: interpolate(entry.body, ctx),
                    }}
                    initialExpanded
                  />
                  <button
                    type="button"
                    onClick={() => setFolderOpen(true)}
                    style={{
                      alignSelf: 'flex-start',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      border: '1px solid #D1D5DB',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                      padding: '0.5rem 0.7rem',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      color: '#1E1E1A',
                      cursor: 'pointer',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    <DocumentIcon size={16} />
                    Attached: {interpolate(entry.linkLabel, ctx)}
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingBottom: '0.75rem', borderBottom: '1px solid #CDBF94' }}>
                    <div style={{ fontSize: '0.75rem', color: '#555' }}><strong>From:</strong> {interpolate(entry.from, ctx)}</div>
                    {entry.to && <div style={{ fontSize: '0.75rem', color: '#555' }}><strong>To:</strong> {interpolate(entry.to, ctx)}</div>}
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#1E1E1A' }}>{interpolate(entry.subject || entry.channelName || 'Source request', ctx)}</strong>
                      {entry.timestamp && <span style={{ fontSize: '0.7rem', color: '#777' }}>{interpolate(entry.timestamp, ctx)}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', lineHeight: 1.65, whiteSpace: 'pre-wrap', color: '#1E1E1A' }}>
                    {renderContentWithGlossary(interpolate(entry.body, ctx))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFolderOpen(true)}
                    style={{
                      alignSelf: 'flex-start',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      border: '1px solid #000',
                      backgroundColor: '#E8DCC8',
                      boxShadow: '3px 3px 0 #000',
                      padding: '0.55rem 0.8rem',
                      fontSize: '0.8125rem',
                      fontWeight: 800,
                      color: '#1E1E1A',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      fontFamily: 'Inter, system-ui, sans-serif',
                    }}
                  >
                    <DocumentIcon size={16} />
                    {interpolate(entry.linkLabel, ctx)}
                  </button>
                </div>
              )
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', height: '100%', minHeight: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'baseline' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
                      Shared folder
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.3 }}>{sourceInbox.folder.name}</h3>
                  </div>
                  {sourceInbox.folder.updatedLabel && (
                    <div style={{ fontSize: '0.72rem', color: '#6f6758' }}>{sourceInbox.folder.updatedLabel}</div>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
                    gap: '0.85rem',
                    alignItems: 'stretch',
                    flex: '1 1 auto',
                    minHeight: 0,
                  }}
                >
                  <div style={{ border: '1px solid #CDBF94', backgroundColor: '#EFE8D2', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #CDBF94', fontSize: '0.75rem', fontWeight: 800, color: '#3F605C', flexShrink: 0 }}>
                      Name
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
                      {files.map((file) => {
                        const active = file.id === activeFileId
                        const visited = visitedFiles.includes(file.id)
                        return (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => openFile(file.id)}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.25rem 1fr auto',
                              gap: '0.55rem',
                              alignItems: 'start',
                              textAlign: 'left',
                              border: 'none',
                              borderBottom: '1px solid #D7CDBA',
                              backgroundColor: active ? '#DCE6D2' : '#F7F1E3',
                              color: '#1E1E1A',
                              cursor: 'pointer',
                              padding: '0.7rem 0.75rem',
                              fontFamily: 'Inter, system-ui, sans-serif',
                            }}
                          >
                            <span style={{ color: file.kind === 'spreadsheet' || file.kind === 'dashboard' ? '#3A6B5E' : '#B87D6B', paddingTop: '0.1rem' }}>
                              {sourceFileIcon(file)}
                            </span>
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.25, wordBreak: 'break-word' }}>{file.name}</span>
                              <span style={{ display: 'block', fontSize: '0.68rem', color: '#6f6758', marginTop: '0.2rem' }}>
                                {file.owner || 'Shared'} · {file.modified || 'recent'}
                              </span>
                            </span>
                            {visited && (
                              <span title="Opened" style={{ color: '#3A6B5E', paddingTop: '0.05rem' }}>
                                <CheckIcon size={15} />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div key={activeFileId || 'empty'} style={{ minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
                    {renderSourceInboxFilePreview(activeFile)}
                  </div>
                </div>
              </div>
            )}
          </LaptopFrame>
        </DesktopOverlay>

        <div style={{ fontSize: '0.75rem', color: '#555' }}>
          Source files opened {openedRequiredCount}/{requiredFileIds.length}
        </div>

        <ActionButton
          text={sourceInbox.continueLabel || node.actionLabel || 'Continue'}
          onClick={continueNext}
          disabled={!canContinue}
          variant={canContinue ? 'primary' : 'secondary'}
        />
        <ActionButton text="Skip (dev)" onClick={continueNext} variant="secondary" fullWidth={false} />
      </motion.div>
    </SceneWrapper>
  )
}

function workspaceAppVariant(kind: SourceWorkspaceApp['kind']) {
  if (kind === 'email') return 'email'
  if (kind === 'slack') return 'slack'
  if (kind === 'spreadsheet') return 'spreadsheet'
  if (kind === 'dashboard' || kind === 'analytics') return 'analytics'
  if (kind === 'crm' || kind === 'ats' || kind === 'ticket' || kind === 'build_tracker') return 'kanban'
  if (kind === 'gis') return 'miro'
  return 'doc'
}

function workspaceAppIcon(app: SourceWorkspaceApp) {
  if (['dashboard', 'spreadsheet', 'analytics', 'pos'].includes(app.kind)) return <ChartIcon size={18} />
  return <DocumentIcon size={18} />
}

function workspaceAppWindowTitle(app: SourceWorkspaceApp, ctx: BriefingContext) {
  if (app.kind === 'slack') {
    const channelTitle = app.messages?.find((message) => message.channel === 'slack')?.channelName
    return interpolate(channelTitle || app.title || app.label || 'Slack', ctx)
  }
  return interpolate(app.title || app.label || 'Source workspace', ctx)
}

function workspaceAppAccent(kind: SourceWorkspaceApp['kind']) {
  if (kind === 'email') return { bg: '#E9E1FF', fg: '#4F3A7A' }
  if (kind === 'slack') return { bg: '#E2F0FF', fg: '#245B82' }
  if (kind === 'drive' || kind === 'folder' || kind === 'data_room' || kind === 'docs') return { bg: '#FFF0C7', fg: '#775A16' }
  if (kind === 'dashboard' || kind === 'spreadsheet' || kind === 'analytics' || kind === 'pos') return { bg: '#DCE6D2', fg: '#315D50' }
  if (kind === 'crm' || kind === 'ats' || kind === 'ticket' || kind === 'build_tracker') return { bg: '#FFE0D4', fg: '#8A4A32' }
  if (kind === 'gis') return { bg: '#D8F1EA', fg: '#29665B' }
  if (kind === 'ehr') return { bg: '#FCE2E6', fg: '#8A3D4A' }
  return { bg: '#F7F1E3', fg: '#3F605C' }
}

function renderWorkspaceRows(app: SourceWorkspaceApp, compact = false) {
  const rows = app.rows || []
  const columns = app.columns || (rows[0] ? Object.keys(rows[0]).filter(Boolean) : [])
  if (rows.length === 0 || columns.length === 0) return null
  const thStyle = compact ? { ...sourceFileThStyle, padding: '0.35rem 0.45rem', fontSize: '0.66rem' } : sourceFileThStyle
  const tdStyle = compact ? { ...sourceFileTdStyle, padding: '0.35rem 0.45rem', fontSize: '0.7rem', lineHeight: 1.25 } : sourceFileTdStyle
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #000' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ backgroundColor: '#E8DCC8' }}>
            {columns.map((column) => (
              <th key={column} style={thStyle}>{formatSourceColumnLabel(column)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F7F1E3' : '#F2EBD9' }}>
              {columns.map((column) => (
                <td key={column} style={tdStyle}>{row[column] || ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function parsePercentValue(value?: string) {
  const parsed = Number(String(value || '').replace(/[^\d.]/g, ''))
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

function resolveStatusColor(status?: string) {
  const normalized = (status || '').toLowerCase()
  if (normalized.includes('track') || normalized.includes('good')) return { bg: '#DCE6D2', fg: '#315D50' }
  if (normalized.includes('warn') || normalized.includes('risk')) return { bg: '#F6E2B8', fg: '#775A16' }
  return { bg: '#E8DCC8', fg: '#5F5749' }
}

function SlackWorkspaceContext({ node, ctx }: { node: BriefingNode; ctx: BriefingContext }) {
  const hasMayaThread = Boolean(node.coworkerRecap?.turns?.length)
  if (!hasMayaThread) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 0 }}>
      <CoworkerRecap node={node} ctx={ctx} variant="slack" />
    </div>
  )
}

function renderSlackWorkspaceApp(
  app: SourceWorkspaceApp,
  node: BriefingNode,
  ctx: BriefingContext,
  workspaceFiles: SourceInboxFile[],
  openFile: (fileId: string) => void,
) {
  const messages = app.messages || []
  const channelName = interpolate(messages.find((message) => message.channel === 'slack')?.channelName || app.title || '#product', ctx)
  const displayChannel = channelName.startsWith('#') ? channelName : `#${channelName}`
  const channelLabel = displayChannel.replace(/^#/, '')
  const hasMayaThread = Boolean(node.coworkerRecap?.turns?.length)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(8.8rem, 27%) minmax(0, 1fr)',
        height: '100%',
        minHeight: 0,
        backgroundColor: '#FFFFFF',
      }}
    >
      <aside
        style={{
          minHeight: 0,
          backgroundColor: '#3F605C',
          color: '#F7F1E3',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid rgba(0,0,0,0.18)',
        }}
      >
        <div style={{ padding: hasMayaThread ? '0.44rem 0.62rem' : '0.8rem 0.85rem', borderBottom: '1px solid rgba(247,241,227,0.18)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 900, lineHeight: 1.2 }}>Roamly HQ</div>
              <div style={{ marginTop: '0.16rem', fontSize: '0.62rem', color: 'rgba(247,241,227,0.76)' }}>3 online</div>
            </div>
            <div
              aria-hidden="true"
              style={{
                width: '1.45rem',
                height: '1.45rem',
                borderRadius: '6px',
                display: 'grid',
                placeItems: 'center',
                backgroundColor: 'rgba(247,241,227,0.15)',
                border: '1px solid rgba(247,241,227,0.28)',
                fontSize: '0.85rem',
                fontWeight: 900,
              }}
            >
              R
            </div>
          </div>
        </div>

        <div style={{ padding: hasMayaThread ? '0.36rem 0.42rem' : '0.7rem 0.55rem', display: 'flex', flexDirection: 'column', gap: hasMayaThread ? '0.18rem' : '0.4rem', minHeight: 0 }}>
          <div style={{ padding: '0 0.35rem', fontSize: '0.62rem', color: 'rgba(247,241,227,0.64)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
            Channels
          </div>
          {['social-trip-planning', 'product-review', 'design-feedback'].map((channel) => {
            const active = channel === channelLabel.replace(/^social-/, 'social-')
              || displayChannel.toLowerCase().includes(channel.toLowerCase())
            return (
              <div
                key={channel}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  borderRadius: '5px',
                  padding: hasMayaThread ? '0.28rem 0.38rem' : '0.38rem 0.42rem',
                  backgroundColor: active ? 'rgba(247,241,227,0.22)' : 'transparent',
                  color: active ? '#FFFFFF' : 'rgba(247,241,227,0.82)',
                  fontSize: '0.7rem',
                  fontWeight: active ? 900 : 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                <span aria-hidden="true">#</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{channel}</span>
              </div>
            )
          })}

          <div style={{ marginTop: hasMayaThread ? '0.18rem' : '0.55rem', padding: '0 0.35rem', fontSize: '0.62rem', color: 'rgba(247,241,227,0.64)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
            Direct messages
          </div>
          {['Maya Patel', 'Jordan Lee'].map((name) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.42rem', padding: '0.32rem 0.42rem', fontSize: '0.7rem', color: 'rgba(247,241,227,0.82)' }}>
              <span style={{ width: '0.45rem', height: '0.45rem', borderRadius: '999px', backgroundColor: '#DCE6D2', flexShrink: 0 }} />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
            </div>
          ))}
        </div>
      </aside>

      <section style={{ minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#FFFFFF' }}>
        <header
          style={{
            flexShrink: 0,
            padding: hasMayaThread ? '0.32rem 0.62rem' : '0.72rem 0.95rem',
            borderBottom: '1px solid #E5E0D4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: hasMayaThread ? '0.82rem' : '0.95rem', fontWeight: 900, color: '#1D1C1D', lineHeight: 1.15 }}>{displayChannel}</div>
            <div style={{ marginTop: hasMayaThread ? '0.08rem' : '0.18rem', fontSize: hasMayaThread ? '0.61rem' : '0.66rem', color: '#6F6758' }}>
              {hasMayaThread ? 'Start with Maya, then open Analytics.' : 'Product lead handoff - today'}
            </div>
          </div>
          {!hasMayaThread && (
            <div
              style={{
                border: '1px solid #D8D2C6',
                borderRadius: '999px',
                padding: '0.28rem 0.55rem',
                color: '#6F6758',
                fontSize: '0.64rem',
                whiteSpace: 'nowrap',
              }}
            >
              Search
            </div>
          )}
        </header>

        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: hasMayaThread ? '0.28rem 0.5rem' : '0.8rem 0.9rem', display: 'flex', flexDirection: 'column', gap: hasMayaThread ? '0.28rem' : '0.65rem' }}>
          {!hasMayaThread && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7A7162', fontSize: '0.66rem', fontWeight: 800 }}>
              <span style={{ height: '1px', backgroundColor: '#E3DDD2', flex: 1 }} />
              Today
              <span style={{ height: '1px', backgroundColor: '#E3DDD2', flex: 1 }} />
            </div>
          )}

          <SlackWorkspaceContext node={node} ctx={ctx} />

          {!hasMayaThread && messages.map((message, i) => {
            const resolved = resolveWorkspaceSlackMessage(message, ctx)
            return (
              <article
                key={message.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.2rem minmax(0, 1fr)',
                  gap: '0.65rem',
                  padding: '0.45rem 0.2rem',
                }}
              >
                <div
                  style={{
                    width: '2.1rem',
                    height: '2.1rem',
                    borderRadius: '7px',
                    backgroundColor: i % 2 === 0 ? '#B87D6B' : '#3A6B5E',
                    color: '#FFFFFF',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: '0.72rem',
                    fontWeight: 900,
                  }}
                >
                  {resolved.sender.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.82rem', color: '#1D1C1D' }}>{resolved.sender}</strong>
                    <span style={{ fontSize: '0.64rem', color: '#7A7162' }}>{resolved.timestamp}</span>
                  </div>
                  <div style={{ marginTop: '0.16rem', fontSize: '0.78rem', lineHeight: 1.48, color: '#1E1E1A', whiteSpace: 'pre-wrap' }}>
                    {renderContentWithGlossary(resolved.content)}
                  </div>
                  {message.lookFor && (
                    <div style={{ marginTop: '0.55rem', border: '1px solid #D7CDBA', borderRadius: '6px', backgroundColor: '#F7F1E3', padding: '0.55rem 0.65rem' }}>
                      <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.2rem' }}>
                        What to look for
                      </div>
                      <div style={{ fontSize: '0.72rem', lineHeight: 1.45, color: '#1E1E1A' }}>{renderContentWithGlossary(interpolate(message.lookFor, ctx))}</div>
                    </div>
                  )}
                  {message.linkedFileIds && message.linkedFileIds.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', marginTop: '0.55rem' }}>
                      {message.linkedFileIds.map((fileId) => {
                        const linkedFile = workspaceFiles.find((file) => file.id === fileId)
                        if (!linkedFile) return null
                        return (
                          <button
                            key={fileId}
                            type="button"
                            onClick={() => openFile(fileId)}
                            style={{
                              border: '1px solid #CDBF94',
                              backgroundColor: '#EFE8D2',
                              borderRadius: '5px',
                              padding: '0.34rem 0.5rem',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              color: '#1E1E1A',
                              cursor: 'pointer',
                              fontFamily: 'Inter, system-ui, sans-serif',
                            }}
                          >
                            Open {linkedFile.name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        {!hasMayaThread && (
          <div style={{ flexShrink: 0, padding: '0.65rem 0.9rem', borderTop: '1px solid #E5E0D4', backgroundColor: '#FFFFFF' }}>
            <div style={{ border: '1px solid #D8D2C6', borderRadius: '8px', padding: '0.52rem 0.7rem', color: '#9A9083', fontSize: '0.72rem' }}>
              Message {displayChannel}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function renderAnalyticsWorkspaceApp(app: SourceWorkspaceApp, ctx: BriefingContext) {
  const rows = app.rows || []
  const columns = app.columns || (rows[0] ? Object.keys(rows[0]).filter(Boolean) : [])
  const chartRows = rows.map((row) => ({
    label: row.metric || row.name || '',
    value: row.actual || '',
    percent: parsePercentValue(row.actual),
    status: row.status || '',
  }))
  const cardRows = [rows[0], rows[1], rows[3] || rows[2]].filter(Boolean)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(8rem, 23%) minmax(0, 1fr)',
        minHeight: '100%',
        backgroundColor: '#F6F2E8',
      }}
    >
      <aside
        style={{
          borderRight: '1px solid #D7CDBA',
          backgroundColor: '#EFE8D2',
          padding: '0.85rem 0.65rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.8rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#315D50' }}>Roamly Analytics</div>
          <div style={{ marginTop: '0.2rem', fontSize: '0.62rem', color: '#6F6758' }}>Product workspace</div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem' }} aria-label="Analytics navigation">
          {['Overview', 'Step chart', 'Actions', 'Groups'].map((item) => {
            const active = item === 'Step chart'
            return (
              <div
                key={item}
                style={{
                  border: active ? '1px solid #AFC2B7' : '1px solid transparent',
                  borderRadius: '6px',
                  backgroundColor: active ? '#DCE6D2' : 'transparent',
                  color: active ? '#315D50' : '#5F5749',
                  padding: '0.42rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: active ? 900 : 700,
                }}
              >
                {item}
              </div>
            )
          })}
        </nav>
        <div style={{ marginTop: 'auto', border: '1px solid #D7CDBA', borderRadius: '6px', backgroundColor: '#F7F1E3', padding: '0.55rem' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>Showing</div>
          <div style={{ marginTop: '0.2rem', fontSize: '0.7rem', color: '#1E1E1A' }}>People who started a trip</div>
        </div>
      </aside>

      <main style={{ minWidth: 0, minHeight: 0, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.62rem', color: '#6F6758', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>Trip step chart</div>
            <h3 style={{ margin: '0.15rem 0 0', color: '#1E1E1A', fontSize: '1rem', lineHeight: 1.2 }}>{interpolate(app.title || app.label, ctx)}</h3>
          </div>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {['Last 30 days', 'All platforms'].map((filter) => (
              <span
                key={filter}
                style={{
                  border: '1px solid #D7CDBA',
                  borderRadius: '999px',
                  backgroundColor: '#FFFFFF',
                  color: '#5F5749',
                  padding: '0.28rem 0.55rem',
                  fontSize: '0.64rem',
                  fontWeight: 800,
                  whiteSpace: 'nowrap',
                }}
              >
                {filter}
              </span>
            ))}
          </div>
        </header>

        {app.lookFor && (
          <div style={{ border: '1px solid #AFC2B7', borderLeft: '5px solid #3A6B5E', borderRadius: '6px', backgroundColor: '#E7F0EA', padding: '0.55rem 0.65rem' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#315D50', textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.18rem' }}>
              How to read this
            </div>
            <div style={{ fontSize: '0.72rem', lineHeight: 1.45, color: '#1E1E1A' }}>{renderContentWithGlossary(interpolate(app.lookFor, ctx))}</div>
          </div>
        )}

        <section style={{ border: '1px solid #D7CDBA', borderRadius: '8px', backgroundColor: '#FFFFFF', padding: '0.7rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.82rem', color: '#1E1E1A' }}>Where people stop</h4>
            <span style={{ fontSize: '0.62rem', color: '#6F6758' }}>Out of 100 people who start a trip</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.42rem' }}>
            {chartRows.map((row, index) => (
              <div key={`${row.label}-${index}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(8.8rem, 39%) minmax(0, 1fr) 2.5rem', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ fontSize: '0.66rem', lineHeight: 1.2, color: '#4A443A', minWidth: 0, overflow: 'visible', whiteSpace: 'normal' }}>
                  {row.label}
                </div>
                <div style={{ height: '0.7rem', borderRadius: '999px', backgroundColor: '#EFE8D2', overflow: 'hidden', border: '1px solid #E1D6C3' }}>
                  <div
                    style={{
                      width: `${Math.max(row.percent, 3)}%`,
                      height: '100%',
                      borderRadius: '999px',
                      backgroundColor: index < 2 ? '#3A6B5E' : index < 4 ? '#B87D6B' : '#6B9EA6',
                    }}
                  />
                </div>
                <strong style={{ fontSize: '0.66rem', color: '#1E1E1A', textAlign: 'right' }}>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.55rem' }}>
          {cardRows.map((row, index) => {
            const status = resolveStatusColor(row.status)
            return (
              <div key={`${row.metric}-${index}`} style={{ border: '1px solid #D7CDBA', borderRadius: '7px', backgroundColor: '#FFFFFF', padding: '0.58rem 0.65rem', minWidth: 0 }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#6F6758', textTransform: 'uppercase', letterSpacing: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.metric}
                </div>
                <div style={{ marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.35rem' }}>
                  <strong style={{ fontSize: '1.12rem', color: '#1E1E1A', lineHeight: 1 }}>{row.actual}</strong>
                  <span style={{ borderRadius: '999px', backgroundColor: status.bg, color: status.fg, padding: '0.12rem 0.38rem', fontSize: '0.56rem', fontWeight: 900 }}>
                    {String(row.status || '').replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {columns.length > 0 && rows.length > 0 && (
          <div style={{ border: '1px solid #D7CDBA', borderRadius: '7px', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.66rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#EFE8D2' }}>
                  {columns.map((column) => (
                    <th key={column} style={{ padding: '0.42rem 0.48rem', textAlign: 'left', color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0, borderBottom: '1px solid #D7CDBA' }}>
                      {formatSourceColumnLabel(column)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} style={{ backgroundColor: rowIndex % 2 === 0 ? '#FFFFFF' : '#FBF7EE' }}>
                    {columns.map((column) => {
                      const status = column === 'status' ? resolveStatusColor(row[column]) : null
                      return (
                        <td key={column} style={{ padding: '0.42rem 0.48rem', borderBottom: '1px solid #EEE7DA', color: '#1E1E1A', wordBreak: 'break-word' }}>
                          {status ? (
                            <span style={{ display: 'inline-block', borderRadius: '999px', backgroundColor: status.bg, color: status.fg, padding: '0.12rem 0.38rem', fontWeight: 900 }}>
                              {String(row[column] || '').replace(/_/g, ' ')}
                            </span>
                          ) : (
                            row[column] || ''
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function groupSourceFiles(files: SourceInboxFile[]) {
  const groups: { category: string; files: SourceInboxFile[] }[] = []
  for (const file of files) {
    const category = file.category || 'Source files'
    const existing = groups.find((group) => group.category === category)
    if (existing) {
      existing.files.push(file)
    } else {
      groups.push({ category, files: [file] })
    }
  }
  return groups
}

type SourceWorkspaceMission = {
  title: string
  body: string
  steps: string[]
  startLabel: string
  workspaceIntro: string
}

function getSourceWorkspaceMission(node: BriefingNode): SourceWorkspaceMission {
  if (node.id === 'briefing_kickoff') {
    return {
      title: 'Find why Roamly trips get stuck.',
      body: 'Roamly helps friends plan weekend trips. Your first job is to read two sources and spot where group planning slows down.',
      steps: [
        "Read Maya's message.",
        'Check the trip planning numbers.',
        'Then review the current app flow.',
      ],
      startLabel: 'Open workspace',
      workspaceIntro: 'Open Slack and Analytics. Those two sources are enough before you review the app flow.',
    }
  }

  return {
    title: node.title,
    body: 'Start with the source materials, then move to the next task.',
    steps: ['Open the source apps.', 'Look for the main user problem.', 'Continue when the key sources are reviewed.'],
    startLabel: 'Open workspace',
    workspaceIntro: 'Open the required source apps before moving on.',
  }
}

function SourceWorkspaceMissionCard({
  node,
  onStart,
}: {
  node: BriefingNode
  onStart: () => void
}) {
  const mission = getSourceWorkspaceMission(node)

  return (
    <section
      className="source-workspace-mission-card"
    >
      <div>
        <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
          Section {node.section}
        </div>
        <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.55rem', lineHeight: 1.18, color: '#000' }}>
          {mission.title}
        </h2>
      </div>

      <p style={{ margin: 0, maxWidth: '42rem', fontSize: '0.95rem', lineHeight: 1.58, color: '#1E1E1A' }}>
        {mission.body}
      </p>

      <div className="source-workspace-mission-steps" aria-label="Mission steps">
        {mission.steps.map((step, index) => (
          <div
            key={step}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.8rem minmax(0, 1fr)',
              gap: '0.65rem',
              alignItems: 'center',
              minHeight: '2rem',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: '1.55rem',
                height: '1.55rem',
                display: 'grid',
                placeItems: 'center',
                border: '1px solid #000',
                borderRadius: '999px',
                backgroundColor: index === 0 ? '#DCE6D2' : '#E8DCC8',
                color: '#1E1E1A',
                fontSize: '0.78rem',
                fontWeight: 900,
              }}
            >
              {index + 1}
            </span>
            <span style={{ minWidth: 0, fontSize: '0.92rem', lineHeight: 1.35, color: '#1E1E1A' }}>{step}</span>
          </div>
        ))}
      </div>

      <div className="source-workspace-mission-action">
        <ActionButton text={mission.startLabel} onClick={onStart} fullWidth={false} />
      </div>
    </section>
  )
}

function SourceWorkspaceBriefing({ node }: { node: BriefingNode }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const canvasState = useGameStore((s) => s.interactiveCanvasState[node.id]) || { visited: [], completed: false }
  const markZoneVisited = useGameStore((s) => s.markZoneVisited)
  const setSceneCompleted = useGameStore((s) => s.setSceneCompleted)
  const goNext = useGoNext()
  const sourceWorkspace = node.sourceWorkspace!
  const apps = sourceWorkspace.apps
  const workspaceFiles = apps.flatMap((app) => app.files || [])
  const [workspaceStarted, setWorkspaceStarted] = useState(false)
  const [activeAppId, setActiveAppId] = useState<string | null>(null)
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const activeApp = apps.find((app) => app.id === activeAppId) || null
  const activeFile = workspaceFiles.find((file) => file.id === activeFileId) || null
  const allFileIds = apps.flatMap((app) => app.files?.map((file) => file.id) || [])
  const contentAppIds = apps
    .filter((app) => !app.files?.length && (app.sections?.length || app.rows?.length || app.messages?.length))
    .map((app) => `app:${app.id}`)
  const requiredSourceIds = sourceWorkspace.requiredSourceIds || [...allFileIds, ...contentAppIds]
  const visitedIds = canvasState.visited
  const openedRequiredCount = requiredSourceIds.filter((id) => visitedIds.includes(id)).length
  const canContinue = openedRequiredCount >= requiredSourceIds.length
  const ctx = { playerName, branchFlags, mcSelections }
  const activeAppNeedsContentMargin = activeApp ? ['ticket', 'build_tracker', 'crm', 'ats'].includes(activeApp.kind) : false
  const activeFileGroups = activeApp?.files ? groupSourceFiles(activeApp.files) : []
  const activeAppHasFiles = Boolean(activeApp?.files?.length)
  const mission = getSourceWorkspaceMission(node)

  const openApp = (appId: string) => {
    setActiveAppId(appId)
    setActiveFileId(null)
    markZoneVisited(node.id, `app:${appId}`)
  }

  const openFile = (fileId: string) => {
    const owningApp = apps.find((app) => app.files?.some((file) => file.id === fileId))
    if (owningApp) {
      setActiveAppId(owningApp.id)
      markZoneVisited(node.id, `app:${owningApp.id}`)
    }
    setActiveFileId(fileId)
    markZoneVisited(node.id, fileId)
  }

  const continueNext = () => {
    setSceneCompleted(node.id)
    goNext(node)
  }

  return (
    <SceneWrapper illustration={node.illustration} hideIllustration>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        {!workspaceStarted ? (
          <SourceWorkspaceMissionCard node={node} onStart={() => setWorkspaceStarted(true)} />
        ) : (
          <>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#555' }}>Section {node.section}</span>
              <h2 style={{ margin: '0.2rem 0 0', fontSize: '1.25rem', fontWeight: 700, color: '#000', lineHeight: 1.3 }}>
                {node.title}
              </h2>
              <p style={{ margin: '0.45rem 0 0', fontSize: '0.875rem', lineHeight: 1.6, color: '#1E1E1A' }}>
                {mission.workspaceIntro}
              </p>
            </div>

        <DesktopOverlay width={sourceWorkspace.desktop?.width || '75%'} height={sourceWorkspace.desktop?.height || '80%'}>
          <div
            className="pm-source-workspace"
            data-testid="pm-source-workspace-shell"
            style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}
          >
            <header className="pm-source-topbar">
              <div className="pm-source-brand">
                <span aria-hidden="true">R</span>
                <div>
                  <strong>Roamly Product Workspace</strong>
                  <small>Discovery sources · Monday 9:12 AM</small>
                </div>
              </div>
              <div className="pm-source-search" aria-label="Workspace search">Search sources</div>
              <div className="pm-source-progress" data-testid="pm-source-progress">
                Evidence checked {openedRequiredCount}/{requiredSourceIds.length}
              </div>
            </header>
            <div
              aria-label={sourceWorkspace.introLabel || 'Source apps'}
              className="pm-source-app-rail"
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '4.15rem',
                bottom: '0.85rem',
                zIndex: 2,
                width: '5.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.72rem',
                overflowY: 'auto',
                paddingRight: '0.2rem',
              }}
            >
              {apps.map((app) => {
                const active = app.id === activeApp?.id
                const opened = visitedIds.includes(`app:${app.id}`)
                const fileCount = app.files?.length || 0
                const accent = workspaceAppAccent(app.kind)
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => openApp(app.id)}
                    title={`${app.label}${fileCount ? ` (${fileCount} item${fileCount === 1 ? '' : 's'})` : ''}`}
                    className="pm-source-app-button"
                    data-testid={`pm-source-app-${app.id}`}
                    style={{
                      position: 'relative',
                      width: '4.65rem',
                      minHeight: '5.25rem',
                      border: 'none',
                      backgroundColor: active ? 'rgba(247, 241, 227, 0.68)' : 'transparent',
                      color: '#1E1E1A',
                      cursor: 'pointer',
                      padding: '0.25rem 0.15rem',
                      textAlign: 'center',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.28rem',
                      borderRadius: '7px',
                    }}
                  >
                    <span
                      style={{
                        position: 'relative',
                        width: '2.75rem',
                        height: '2.75rem',
                        display: 'grid',
                        placeItems: 'center',
                        border: '1px solid #000',
                        borderRadius: '0.7rem',
                        backgroundColor: accent.bg,
                        color: accent.fg,
                        boxShadow: active ? '3px 3px 0 #000' : '2px 2px 0 rgba(0,0,0,0.72)',
                      }}
                    >
                      {workspaceAppIcon(app)}
                      {opened && (
                        <span
                          style={{
                            position: 'absolute',
                            right: '-0.3rem',
                            top: '-0.3rem',
                            width: '1rem',
                            height: '1rem',
                            display: 'grid',
                            placeItems: 'center',
                            border: '1px solid #000',
                            borderRadius: '999px',
                            backgroundColor: '#DCE6D2',
                          }}
                        >
                          <CheckIcon size={10} color="#315D50" />
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        maxWidth: '4.5rem',
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        lineHeight: 1.15,
                        color: '#1E1E1A',
                        textShadow: '0 1px 0 rgba(247,241,227,0.9)',
                        wordBreak: 'break-word',
                      }}
                    >
                      {app.label}
                    </span>
                  </button>
                )
              })}
            </div>

            {activeApp ? (
              <div
                className="pm-source-active-window"
                style={{
                  position: 'absolute',
                  inset: '4.15rem 0.85rem 0.95rem 6.6rem',
                  display: 'flex',
                  minWidth: 0,
                  minHeight: 0,
                }}
              >
                <LaptopFrame
                  variant={workspaceAppVariant(activeApp.kind)}
                  title={workspaceAppWindowTitle(activeApp, ctx) || sourceWorkspace.introLabel || 'Source workspace'}
                  scrollable
                  fill
                >
                  {activeApp.kind === 'slack' ? (
                    renderSlackWorkspaceApp(activeApp, node, ctx, workspaceFiles, openFile)
                  ) : activeApp.kind === 'analytics' || activeApp.kind === 'dashboard' ? (
                    renderAnalyticsWorkspaceApp(activeApp, ctx)
                  ) : (
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem', height: activeAppHasFiles ? '100%' : undefined, minHeight: 0, overflow: activeAppHasFiles ? 'hidden' : undefined }}>
                    <div
                      style={{
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem',
                        height: activeAppHasFiles ? '100%' : undefined,
                        minHeight: 0,
                        overflow: activeAppHasFiles ? 'hidden' : undefined,
                        padding: activeAppNeedsContentMargin ? '1.25rem' : undefined,
                        boxSizing: 'border-box',
                      }}
                    >
                    {!(activeApp.kind === 'email' && activeApp.messages?.length) && (
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
                          {activeApp.kind.replace(/_/g, ' ')}
                        </div>
                        <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem', lineHeight: 1.3 }}>{activeApp.title || activeApp.label}</h3>
                        {activeApp.subtitle && (
                          <div style={{ fontSize: '0.72rem', color: '#6f6758', marginTop: '0.2rem' }}>{interpolate(activeApp.subtitle, ctx)}</div>
                        )}
                      </div>
                    )}

                    {activeApp.messages && activeApp.messages.length > 0 && (
                        activeApp.messages.map((message) => {
                          const title = message.channel === 'slack' ? (message.channelName || 'Slack') : (message.subject || 'Email')
                          if (message.channel === 'email' || activeApp.kind === 'email') {
                            return (
                              <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {message.channel !== 'slack' && renderLookForCard(message.lookFor ? interpolate(message.lookFor, ctx) : undefined)}
                                <EmailBlock
                                  email={resolveWorkspaceEmailMessage(message, ctx, activeApp.title || activeApp.label)}
                                  initialExpanded
                                />
                                <SourceAttachmentButtons
                                  fileIds={message.linkedFileIds}
                                  files={workspaceFiles}
                                  onOpenFile={openFile}
                                />
                              </div>
                            )
                          }
                          return (
                            <div key={message.id} style={{ border: '1px solid #CDBF94', backgroundColor: '#F2EBD9', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                              {message.channel !== 'slack' && renderLookForCard(message.lookFor ? interpolate(message.lookFor, ctx) : undefined)}
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.82rem' }}>{interpolate(title, ctx)}</strong>
                                {message.timestamp && <span style={{ fontSize: '0.68rem', color: '#6f6758' }}>{interpolate(message.timestamp, ctx)}</span>}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#555' }}>
                                <strong>From:</strong> {interpolate(message.from, ctx)}
                                {message.to ? <> · <strong>To:</strong> {interpolate(message.to, ctx)}</> : null}
                              </div>
                              <div style={{ fontSize: '0.82rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>
                                {renderContentWithGlossary(interpolate(message.body, ctx))}
                              </div>
                              {message.linkedFileIds && message.linkedFileIds.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                                  {message.linkedFileIds.map((fileId) => {
                                    const linkedFile = workspaceFiles.find((file) => file.id === fileId)
                                    if (!linkedFile) return null
                                    return (
                                      <button
                                        key={fileId}
                                        type="button"
                                        onClick={() => openFile(fileId)}
                                        style={{
                                          border: '1px solid #000',
                                          backgroundColor: '#E8DCC8',
                                          boxShadow: '2px 2px 0 #000',
                                          padding: '0.35rem 0.55rem',
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                          fontFamily: 'Inter, system-ui, sans-serif',
                                        }}
                                      >
                                        Open {linkedFile.name}
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })
                    )}

                    {activeApp.files && activeApp.files.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: activeAppNeedsContentMargin ? '8.5rem minmax(0, 1fr)' : 'minmax(11rem, 15rem) minmax(0, 1fr)', gap: '0.75rem', alignItems: 'stretch', flex: '1 1 auto', minHeight: 0 }}>
                        <div style={{ border: '1px solid #CDBF94', backgroundColor: '#EFE8D2', minHeight: 0, overflowY: 'auto' }}>
                          {activeFileGroups.map((group) => (
                            <div key={group.category}>
                              <div style={{ padding: '0.5rem 0.65rem', borderBottom: '1px solid #CDBF94', fontSize: '0.72rem', fontWeight: 800, color: '#3F605C' }}>
                                {group.category}
                              </div>
                              {group.files.map((file) => {
                                const active = file.id === activeFileId
                                const visited = visitedIds.includes(file.id)
                                return (
                                  <button
                                    key={file.id}
                                    type="button"
                                    onClick={() => openFile(file.id)}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1.1rem 1fr auto',
                                      gap: '0.45rem',
                                      alignItems: 'start',
                                      width: '100%',
                                      border: 'none',
                                      borderBottom: '1px solid #D7CDBA',
                                      backgroundColor: active ? '#DCE6D2' : '#F7F1E3',
                                      color: '#1E1E1A',
                                      cursor: 'pointer',
                                      padding: '0.55rem 0.65rem',
                                      textAlign: 'left',
                                      fontFamily: 'Inter, system-ui, sans-serif',
                                    }}
                                  >
                                    <span style={{ color: file.kind === 'spreadsheet' || file.kind === 'dashboard' ? '#3A6B5E' : '#B87D6B' }}>
                                      {sourceFileIcon(file)}
                                    </span>
                                    <span style={{ minWidth: 0 }}>
                                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.2, wordBreak: 'break-word' }}>{file.name}</span>
                                      <span style={{ display: 'block', fontSize: '0.62rem', color: '#6f6758', marginTop: '0.15rem' }}>
                                        {file.owner || 'Shared'} · {file.modified || 'recent'}
                                      </span>
                                    </span>
                                    {visited && <CheckIcon size={14} color="#3A6B5E" />}
                                  </button>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                        <div key={activeFileId || 'empty'} style={{ minWidth: 0, minHeight: 0, overflowY: 'auto' }}>{renderSourceInboxFilePreview(activeFile, activeAppNeedsContentMargin)}</div>
                      </div>
                    )}

                    {renderLookForCard(activeApp.lookFor ? interpolate(activeApp.lookFor, ctx) : undefined)}

                    {activeApp.sections?.map((section) => renderSourceFileSection({
                      ...section,
                      body: interpolate(section.body, ctx),
                    }))}

                    {renderWorkspaceRows(activeApp, activeAppNeedsContentMargin)}
                    </div>
                  </div>
                  )}
                </LaptopFrame>
              </div>
            ) : (
              <div
                className="pm-source-empty-window"
                style={{
                  position: 'absolute',
                  inset: '4.15rem 0.85rem 0.95rem 6.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0,
                  minHeight: 0,
                  border: '1px solid rgba(0,0,0,0.22)',
                  backgroundColor: 'rgba(247, 241, 227, 0.72)',
                  boxShadow: '3px 3px 0 rgba(0,0,0,0.25)',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#3F605C', textAlign: 'center', maxWidth: '18rem', lineHeight: 1.45 }}>
                  Open the desktop apps to review the sources.
                </div>
              </div>
            )}
          </div>
        </DesktopOverlay>

        <div style={{ fontSize: '0.75rem', color: '#555' }}>
          Source items opened {openedRequiredCount}/{requiredSourceIds.length}
        </div>

        <ActionButton
          text={sourceWorkspace.continueLabel || node.actionLabel || 'Continue'}
          onClick={continueNext}
          disabled={!canContinue}
          variant={canContinue ? 'primary' : 'secondary'}
        />
        <ActionButton text="Skip (dev)" onClick={continueNext} variant="secondary" fullWidth={false} />
          </>
        )}
      </motion.div>
    </SceneWrapper>
  )
}

const sourceFileThStyle: CSSProperties = {
  textAlign: 'left',
  padding: '0.55rem 0.65rem',
  borderBottom: '1px solid #000',
  fontWeight: 800,
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: 0,
  whiteSpace: 'normal',
}

const sourceFileTdStyle: CSSProperties = {
  padding: '0.55rem 0.65rem',
  borderBottom: '1px solid rgba(0,0,0,0.15)',
  whiteSpace: 'normal',
  verticalAlign: 'top',
  lineHeight: 1.5,
}

function renderSubStep(s: BriefingSubStep, playerName: string, branchFlags: Record<string, string>, mcSelections: Record<string, string>): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {s.illustration && <InlineIllustration src={s.illustration} />}
      {s.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', whiteSpace: 'pre-wrap' }}>
          {renderContentWithGlossary(interpolate(s.content, { playerName, branchFlags, mcSelections }))}
        </p>
      )}
      {s.metrics && s.metrics.length > 0 && (
        <LaptopFrame variant="doc" title="Metrics">
          <MetricsTable metrics={s.metrics} />
        </LaptopFrame>
      )}
      {s.slackMessages && s.slackMessages.length > 0 && (
        <DesktopOverlay>
          <LaptopFrame variant="slack" title="Slack" scrollable fill>
            {s.slackMessages.map((msg, i) => (
              <SlackMessageEnhanced
                key={i}
                message={resolveSlackMessage(msg, { playerName, branchFlags, mcSelections })}
                delay={i * 0.12}
                showUnreadDot={i === (s.slackMessages?.length ?? 0) - 1}
              />
            ))}
          </LaptopFrame>
        </DesktopOverlay>
      )}
      {s.emails && s.emails.length > 0 && (
        <DesktopOverlay>
          <LaptopFrame variant="email" title={s.emails[0].subject} scrollable fill>
            {s.emails.map((email, i) => (
              <EmailBlock
                key={i}
                email={{ ...email, content: interpolate(email.content, { playerName, branchFlags, mcSelections }) }}
                delay={i * 0.12}
                initialExpanded={i === 0}
              />
            ))}
          </LaptopFrame>
        </DesktopOverlay>
      )}
      {s.quotes?.map((q, i) => (
        <QuoteBlock
          key={i}
          quote={{ ...q, text: interpolate(q.text, { playerName, branchFlags, mcSelections }) }}
          delay={i * 0.1}
        />
      ))}
    </div>
  )
}

function SequentialBriefing({ node, onAdvance }: { node: BriefingNode; onAdvance: () => void }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const [step, setStep] = useState(0)
  const [showData, setShowData] = useState(false)
  useScrollToTopOnChange(step)

  const subSteps = node.subSteps || []
  const total = subSteps.length
  const actionLabel = node.actionLabel || 'Start the Task'

  useEffect(() => {
    subSteps.forEach((s) => {
      if (s.illustration) {
        const img = new Image()
        img.src = s.illustration
      }
    })
  }, [subSteps])

  if (total === 0) return null
  const cur = subSteps[step]

  return (
    <>
      {node.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000' }}>
          {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
        </p>
      )}
      {node.referenceContent && (
        <BriefingReferenceCard
          title={node.referenceTitle || 'Reference'}
          content={interpolate(node.referenceContent, { playerName, branchFlags, mcSelections })}
        />
      )}
      {renderSubStep(cur, playerName, branchFlags, mcSelections)}

      {(node.metrics && node.metrics.length > 0) && step > 0 && (
        <>
          <button
            onClick={() => setShowData(!showData)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              backgroundColor: '#E8DCC8',
              border: '1px solid #000',
              boxShadow: '2px 2px 0 #000',
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#333',
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              alignSelf: 'flex-start',
            }}
          >
            {showData ? 'Hide Data' : <><ChartIcon size={14} /> View Data</>}
          </button>
          {showData && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
              <LaptopFrame variant="doc" title="Metrics">
                <MetricsTable metrics={node.metrics} />
              </LaptopFrame>
            </motion.div>
          )}
        </>
      )}

      <div style={{ fontSize: '0.6875rem', color: '#999', textAlign: 'center' }}>
        {step + 1} of {total}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {step > 0 && <ActionButton text="Back" onClick={() => setStep(step - 1)} variant="secondary" />}
        {step < total - 1 ? (
          <ActionButton text="Next" onClick={() => setStep(step + 1)} variant="secondary" />
        ) : (
          <ActionButton text={actionLabel} onClick={onAdvance} />
        )}
      </div>
      <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
    </>
  )
}

function PaginatedBriefing({ node, onAdvance }: { node: BriefingNode; onAdvance: () => void }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const [page, setPage] = useState(0)
  const pages = node.pages || []
  const actionLabel = node.actionLabel || 'Start the Task'
  useScrollToTopOnChange(page)

  if (pages.length === 0) return null

  return (
    <>
      {page === 0 && node.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000' }}>
          {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
        </p>
      )}
      {page === 0 && node.referenceContent && (
        <BriefingReferenceCard
          title={node.referenceTitle || 'Reference'}
          content={interpolate(node.referenceContent, { playerName, branchFlags, mcSelections })}
        />
      )}
      {renderSubStep(pages[page], playerName, branchFlags, mcSelections)}
      <div style={{ fontSize: '0.6875rem', color: '#999', textAlign: 'center' }}>
        {page + 1} of {pages.length}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {page > 0 && <ActionButton text="Back" onClick={() => setPage(page - 1)} variant="secondary" />}
        {page < pages.length - 1 ? (
          <ActionButton text="Next" onClick={() => setPage(page + 1)} variant="secondary" />
        ) : (
          <ActionButton text={actionLabel} onClick={onAdvance} />
        )}
      </div>
      <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
    </>
  )
}

export default function BriefingScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()

  const onAdvance = () => goNext(node)
  const mode = node.briefingMode || 'simple'
  const actionLabel = node.actionLabel || 'Start the Task'

  if (node.sourceInbox) {
    return <SourceInboxBriefing node={node} />
  }

  if (node.sourceWorkspace) {
    return <SourceWorkspaceBriefing node={node} />
  }

  return (
    <SceneWrapper illustration={node.illustration}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: '#555' }}>
            Section {node.section}
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000', lineHeight: 1.3 }}>
            {node.title}
          </h2>
        </div>

        <BriefingLeadIn node={node} ctx={{ playerName, branchFlags, mcSelections }} />

        {mode === 'sequential' ? (
          <SequentialBriefing node={node} onAdvance={onAdvance} />
        ) : mode === 'paginated' ? (
          <PaginatedBriefing node={node} onAdvance={onAdvance} />
        ) : (
          <>
            {node.illustration && <InlineIllustration src={node.illustration} />}
            {node.content && (
              <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000' }}>
                {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
              </p>
            )}
            {node.referenceContent && (
              <BriefingReferenceCard
                title={node.referenceTitle || 'Reference'}
                content={interpolate(node.referenceContent, { playerName, branchFlags, mcSelections })}
              />
            )}
            {node.slackMessages && node.slackMessages.length > 0 && (
              <DesktopOverlay>
                <LaptopFrame variant="slack" title="Slack" scrollable fill>
                  {node.slackMessages.map((msg, i) => (
                    <SlackMessageEnhanced
                      key={i}
                      message={resolveSlackMessage(msg, { playerName, branchFlags, mcSelections })}
                      delay={i * 0.12}
                      showUnreadDot={i === (node.slackMessages?.length ?? 0) - 1}
                    />
                  ))}
                </LaptopFrame>
              </DesktopOverlay>
            )}
            {node.emails && node.emails.length > 0 && (
              <DesktopOverlay>
                <LaptopFrame variant="email" title={node.emails[0].subject} scrollable fill>
                  {node.emails.map((email, i) => (
                    <EmailBlock
                      key={i}
                      email={{ ...email, content: interpolate(email.content, { playerName, branchFlags, mcSelections }) }}
                      delay={i * 0.12}
                      initialExpanded={i === 0}
                    />
                  ))}
                </LaptopFrame>
              </DesktopOverlay>
            )}
            {node.metrics && <MetricsTable metrics={node.metrics} />}
            {node.quotes?.map((q, i) => (
              <QuoteBlock
                key={i}
                quote={{ ...q, text: interpolate(q.text, { playerName, branchFlags, mcSelections }) }}
                delay={i * 0.1}
              />
            ))}
            <ActionButton text={actionLabel} onClick={onAdvance} />
            <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
          </>
        )}
      </motion.div>
    </SceneWrapper>
  )
}
