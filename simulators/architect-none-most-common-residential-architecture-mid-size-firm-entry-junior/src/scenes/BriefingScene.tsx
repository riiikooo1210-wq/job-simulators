import { useEffect, useState } from 'react'
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
import type { CSSProperties, ReactNode } from 'react'
import type { BriefingNode, BriefingSubStep, SlackMessageData, SourceInboxFile } from '../types/game'
import DesktopOverlay from '../components/layout/DesktopOverlay'

interface Props { node: BriefingNode }

function resolveSlackMessage(
  msg: SlackMessageData,
  ctx: { playerName: string; branchFlags: Record<string, string>; mcSelections: Record<string, string> },
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
  const sourceInbox = node.sourceInbox

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
      {sourceInbox && (
        <section
          style={{
            border: '1px solid #000',
            boxShadow: '4px 4px 0 #000',
            backgroundColor: '#F7F1E3',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.6875rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
              Source Inbox
            </div>
            <h3 style={{ margin: '0.2rem 0 0', fontSize: '1rem', lineHeight: 1.3 }}>
              {sourceInbox.folder.path}
            </h3>
          </div>
          <div
            style={{
              border: '1px solid #CDBF94',
              backgroundColor: '#F2EBD9',
              padding: '0.75rem',
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              color: '#1E1E1A',
              whiteSpace: 'pre-wrap',
            }}
          >
            <strong>{interpolate(sourceInbox.entryMessage.subject || sourceInbox.entryMessage.channel, ctx)}</strong>
            {'\n'}
            From: {interpolate(sourceInbox.entryMessage.from, ctx)}
            {'\n\n'}
            {renderContentWithGlossary(interpolate(sourceInbox.entryMessage.body, ctx))}
          </div>
          {sourceInbox.folder.files.map((file) => (
            <article
              key={file.id}
              style={{
                border: '1px solid #CDBF94',
                backgroundColor: '#FBF7EA',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ color: '#3F605C', paddingTop: '0.1rem' }}>{fileIcon(file)}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1E1E1A', lineHeight: 1.35 }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6f6758', lineHeight: 1.4 }}>
                    {file.summary}
                  </div>
                </div>
              </div>
              {renderSourceInboxFilePreview(file)}
            </article>
          ))}
        </section>
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

function fileIcon(file: SourceInboxFile) {
  if (file.kind === 'spreadsheet' || file.kind === 'dashboard') return <ChartIcon size={16} />
  return <DocumentIcon size={16} />
}

function formatSourceColumnLabel(key: string) {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function renderSourceInboxFilePreview(file: SourceInboxFile | null) {
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

  if (rows.length > 0 && columns.length > 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
            {file.kind}
          </div>
          <h3 style={{ margin: '0.15rem 0 0', fontSize: '1rem', lineHeight: 1.3 }}>{file.previewTitle}</h3>
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#E8DCC8' }}>
                {columns.map((column) => (
                  <th key={column} style={fileThStyle}>{formatSourceColumnLabel(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.item}-${i}`} style={{ backgroundColor: i % 2 === 0 ? '#F7F1E3' : '#F2EBD9' }}>
                  {columns.map((column) => {
                    const value = row[column] || ''
                    const isStatus = column.toLowerCase() === 'status'
                    const isEscalate = /escalate|critical|risk|verify/i.test(value)
                    return (
                      <td
                        key={column}
                        style={{
                          ...fileTdStyle,
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
      {file.sections?.map((section) => (
        <div
          key={section.heading}
          style={{
            borderLeft: '3px solid #B87D6B',
            padding: '0.15rem 0 0.15rem 0.75rem',
            backgroundColor: '#F2EBD9',
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E1E1A', marginBottom: '0.25rem' }}>
            {section.heading}
          </div>
          <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#1E1E1A' }}>
            {renderContentWithGlossary(section.body)}
          </div>
        </div>
      ))}
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
  const [folderOpen, setFolderOpen] = useState(canvasState.visited.length > 0)
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
                              {fileIcon(file)}
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
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={continueNext} variant="secondary" fullWidth={false} />
        )}
      </motion.div>
    </SceneWrapper>
  )
}

const fileThStyle: CSSProperties = {
  textAlign: 'left',
  padding: '0.55rem 0.65rem',
  borderBottom: '1px solid #000',
  fontWeight: 800,
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: 0,
  whiteSpace: 'normal',
}

const fileTdStyle: CSSProperties = {
  padding: '0.55rem 0.65rem',
  borderBottom: '1px solid rgba(0,0,0,0.15)',
  whiteSpace: 'normal',
  verticalAlign: 'top',
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
      {import.meta.env.DEV && (
        <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
      )}
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
      {import.meta.env.DEV && (
        <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
      )}
    </>
  )
}

export default function BriefingScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()

  if (node.sourceInbox) {
    return <SourceInboxBriefing node={node} />
  }

  const onAdvance = () => goNext(node)
  const mode = node.briefingMode || 'simple'
  const actionLabel = node.actionLabel || 'Start the Task'

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
            {import.meta.env.DEV && (
              <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
            )}
          </>
        )}
      </motion.div>
    </SceneWrapper>
  )
}
