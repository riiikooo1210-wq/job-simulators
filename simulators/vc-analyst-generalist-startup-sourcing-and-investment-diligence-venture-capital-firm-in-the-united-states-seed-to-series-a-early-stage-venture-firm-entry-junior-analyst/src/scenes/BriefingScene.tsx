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
import type { BriefingNode, BriefingSubStep, EmailData, SlackMessageData, SourceInboxFile, SourceWorkspaceApp, SourceWorkspaceMessage } from '../types/game'
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


function renderSourceInboxFilePreview(file: SourceInboxFile | null, compact = false, constrainTableHeight = false) {
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
        <div style={sourceTableScrollStyle(compact, constrainTableHeight)}>
          <table style={sourceTableStyle(columns, compact)}>
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
      {file.assetPath && (
        <div
          style={{
            border: '1px solid #CDBF94',
            backgroundColor: '#FBF7EA',
            borderRadius: '6px',
            padding: compact ? '0.35rem' : '0.55rem',
            overflowX: 'auto',
          }}
        >
          <img
            src={file.assetPath}
            alt={file.assetAlt || file.previewTitle}
            style={{
              display: 'block',
              width: '100%',
              minWidth: compact ? '34rem' : undefined,
              height: 'auto',
              borderRadius: '4px',
            }}
          />
        </div>
      )}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
                    alignItems: 'start',
                  }}
                >
                  <div style={{ border: '1px solid #CDBF94', backgroundColor: '#EFE8D2' }}>
                    <div style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #CDBF94', fontSize: '0.75rem', fontWeight: 800, color: '#3F605C' }}>
                      Name
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
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

                  <div style={{ minWidth: 0 }}>
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

function workspaceAppVariant(kind: SourceWorkspaceApp['kind']) {
  if (kind === 'email') return 'email'
  if (kind === 'slack') return 'slack'
  if (kind === 'spreadsheet' || kind === 'dashboard' || kind === 'analytics') return 'spreadsheet'
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
    <div style={sourceTableScrollStyle(compact, true)}>
      <table style={sourceTableStyle(columns, compact)}>
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

        <DesktopOverlay width={sourceWorkspace.desktop?.width || '75%'} height={sourceWorkspace.desktop?.height || '80%'}>
          <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
            <div
              aria-label={sourceWorkspace.introLabel || 'Source apps'}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '0.85rem',
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
                style={{
                  position: 'absolute',
                  inset: '0.75rem 0.85rem 0.95rem 6.6rem',
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
                  <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                    <div
                      style={{
                        minWidth: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem',
                        padding: activeAppNeedsContentMargin ? '1.25rem' : undefined,
                        boxSizing: 'border-box',
                      }}
                    >
                    {!((activeApp.kind === 'slack' || activeApp.kind === 'email') && activeApp.messages?.length) && (
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
                      activeApp.kind === 'slack' ? (
                        <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                          {activeApp.messages.map((message, i) => (
                            <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                              {renderLookForCard(message.lookFor ? interpolate(message.lookFor, ctx) : undefined)}
                              <SlackMessageEnhanced
                                message={resolveWorkspaceSlackMessage(message, ctx)}
                                delay={i * 0.12}
                                initialExpanded
                                showUnreadDot={i === activeApp.messages!.length - 1}
                              />
                              {message.linkedFileIds && message.linkedFileIds.length > 0 && (
                                <div style={{ marginLeft: '3.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
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
                          ))}
                        </div>
                      ) : (
                        activeApp.messages.map((message) => {
                          const title = message.channel === 'slack' ? (message.channelName || 'Slack') : (message.subject || 'Email')
                          if (message.channel === 'email' || activeApp.kind === 'email') {
                            return (
                              <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                {renderLookForCard(message.lookFor ? interpolate(message.lookFor, ctx) : undefined)}
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
                              {renderLookForCard(message.lookFor ? interpolate(message.lookFor, ctx) : undefined)}
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
                      )
                    )}

                    {activeApp.files && activeApp.files.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: activeAppNeedsContentMargin ? '8.5rem minmax(0, 1fr)' : 'minmax(11rem, 15rem) minmax(0, 1fr)', gap: '0.75rem', alignItems: 'start' }}>
                        <div style={{ border: '1px solid #CDBF94', backgroundColor: '#EFE8D2' }}>
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
                        <div style={{ minWidth: 0 }}>{renderSourceInboxFilePreview(activeFile, activeAppNeedsContentMargin, true)}</div>
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
                </LaptopFrame>
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: '0.75rem 0.85rem 0.95rem 6.6rem',
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
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={continueNext} variant="secondary" fullWidth={false} />
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
  whiteSpace: 'nowrap',
  verticalAlign: 'top',
  lineHeight: 1.5,
}

function sourceTableScrollStyle(compact: boolean, constrained = false): CSSProperties {
  return {
    maxWidth: '100%',
    maxHeight: constrained ? (compact ? '10.5rem' : '8.5rem') : compact ? '13rem' : '18rem',
    overflow: 'auto',
    border: '1px solid #000',
  }
}

function sourceTableStyle(columns: string[], compact: boolean): CSSProperties {
  return {
    width: 'max-content',
    minWidth: Math.max(compact ? 480 : 560, columns.length * (compact ? 150 : 180)),
    borderCollapse: 'collapse',
    fontSize: compact ? '0.7rem' : '0.78rem',
    tableLayout: 'auto',
  }
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
