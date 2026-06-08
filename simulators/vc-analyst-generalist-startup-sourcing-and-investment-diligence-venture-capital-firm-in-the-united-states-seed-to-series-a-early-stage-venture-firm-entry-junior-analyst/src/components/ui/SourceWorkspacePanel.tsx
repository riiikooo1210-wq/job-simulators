import { useState } from 'react'
import EmailBlock from './EmailBlock'
import SlackMessageEnhanced from './SlackMessageEnhanced'
import { ChartIcon, DocumentIcon } from './Icons'
import { renderContentWithGlossary } from './JargonTerm'
import { interpolate } from '../../lib/interpolate'
import type {
  EmailData,
  SlackMessageData,
  SourceInboxFile,
  SourceWorkspace,
  SourceWorkspaceApp,
  SourceWorkspaceMessage,
} from '../../types/game'

interface SourceWorkspaceContext {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
}

interface SourceWorkspacePanelProps {
  sourceWorkspace: SourceWorkspace
  activeAppId: string
  ctx: SourceWorkspaceContext
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

function workspaceAppVariantLabel(kind: SourceWorkspaceApp['kind']) {
  return kind.replace(/_/g, ' ')
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
        padding: '0.65rem 0.75rem',
      }}
    >
      <div style={{ fontSize: '0.64rem', fontWeight: 900, color: '#315D50', textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.28rem' }}>
        What to look for
      </div>
      <div style={{ fontSize: '0.78rem', lineHeight: 1.5, color: '#1E1E1A' }}>
        {renderContentWithGlossary(body)}
      </div>
    </div>
  )
}

function renderSourceFileSection(section: NonNullable<SourceInboxFile['sections']>[number], ctx: SourceWorkspaceContext) {
  if (isLookForSection(section)) return renderLookForCard(interpolate(section.body, ctx), section.heading)

  return (
    <div
      key={section.heading}
      style={{
        borderLeft: '3px solid #B87D6B',
        padding: '0.15rem 0 0.15rem 0.75rem',
        backgroundColor: '#F2EBD9',
      }}
    >
      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E1E1A', marginBottom: '0.25rem' }}>
        {interpolate(section.heading, ctx)}
      </div>
      <div style={{ fontSize: '0.82rem', lineHeight: 1.55, color: '#1E1E1A' }}>
        {renderContentWithGlossary(interpolate(section.body, ctx))}
      </div>
    </div>
  )
}

function groupSourceFiles(files: SourceInboxFile[]) {
  const groups: { category: string; files: SourceInboxFile[] }[] = []
  files.forEach((file) => {
    const category = file.category || 'Source files'
    const existing = groups.find((group) => group.category === category)
    if (existing) {
      existing.files.push(file)
    } else {
      groups.push({ category, files: [file] })
    }
  })
  return groups
}

function resolveWorkspaceSlackMessage(message: SourceWorkspaceMessage, ctx: SourceWorkspaceContext): SlackMessageData {
  return {
    sender: interpolate(message.from, ctx),
    role: interpolate(message.channelName || 'Slack', ctx),
    timestamp: message.timestamp ? interpolate(message.timestamp, ctx) : '',
    content: interpolate(message.body, ctx),
  }
}

function resolveWorkspaceEmailMessage(
  message: SourceWorkspaceMessage,
  ctx: SourceWorkspaceContext,
  fallbackSubject: string,
): EmailData {
  return {
    from: interpolate(message.from, ctx),
    to: message.to ? interpolate(message.to, ctx) : 'You',
    subject: interpolate(message.subject || fallbackSubject || 'Email', ctx),
    content: interpolate(message.body, ctx),
  }
}

const sourceFileThStyle = {
  textAlign: 'left' as const,
  padding: '0.45rem 0.55rem',
  borderBottom: '1px solid #000',
  fontWeight: 800,
  fontSize: '0.68rem',
  textTransform: 'uppercase' as const,
  letterSpacing: 0,
  whiteSpace: 'normal' as const,
}

const sourceFileTdStyle = {
  padding: '0.45rem 0.55rem',
  borderBottom: '1px solid rgba(0,0,0,0.15)',
  whiteSpace: 'normal' as const,
  verticalAlign: 'top' as const,
  lineHeight: 1.45,
  fontSize: '0.75rem',
}

function renderSourceFilePreview(file: SourceInboxFile | null, ctx: SourceWorkspaceContext) {
  if (!file) {
    return (
      <div
        style={{
          minHeight: '14rem',
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
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div>
          <div style={{ fontSize: '0.68rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
            {file.kind}
          </div>
          <h3 style={{ margin: '0.1rem 0 0', fontSize: '0.95rem', lineHeight: 1.3 }}>{file.previewTitle}</h3>
        </div>
        {renderLookForCard(file.lookFor ? interpolate(file.lookFor, ctx) : undefined)}
        {sourceSections.map((section) => renderSourceFileSection(section, ctx))}
        <div style={{ overflowX: 'auto', border: '1px solid #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#E8DCC8' }}>
                {columns.map((column) => (
                  <th key={column} style={sourceFileThStyle}>{formatSourceColumnLabel(column)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F7F1E3' : '#F2EBD9' }}>
                  {columns.map((column) => (
                    <td key={column} style={sourceFileTdStyle}>
                      {interpolate(row[column] || '', ctx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div>
        <div style={{ fontSize: '0.68rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
          {file.kind}
        </div>
        <h3 style={{ margin: '0.1rem 0 0', fontSize: '0.95rem', lineHeight: 1.3 }}>{file.previewTitle}</h3>
      </div>
      {renderLookForCard(file.lookFor ? interpolate(file.lookFor, ctx) : undefined)}
      {sourceSections.map((section) => renderSourceFileSection(section, ctx))}
    </div>
  )
}

function renderWorkspaceRows(app: SourceWorkspaceApp, ctx: SourceWorkspaceContext) {
  const rows = app.rows || []
  const columns = app.columns || (rows[0] ? Object.keys(rows[0]).filter(Boolean) : [])
  if (rows.length === 0 || columns.length === 0) return null

  return (
    <div style={{ overflowX: 'auto', border: '1px solid #000' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
        <thead>
          <tr style={{ backgroundColor: '#E8DCC8' }}>
            {columns.map((column) => (
              <th key={column} style={sourceFileThStyle}>{formatSourceColumnLabel(column)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F7F1E3' : '#F2EBD9' }}>
              {columns.map((column) => (
                <td key={column} style={sourceFileTdStyle}>{interpolate(row[column] || '', ctx)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function SourceWorkspacePanel({ sourceWorkspace, activeAppId, ctx }: SourceWorkspacePanelProps) {
  const [activeFileByApp, setActiveFileByApp] = useState<Record<string, string>>({})
  const activeApp = sourceWorkspace.apps.find((app) => app.id === activeAppId) || sourceWorkspace.apps[0]
  const files = activeApp?.files || []
  const fileGroups = groupSourceFiles(files)
  const activeFileId = activeFileByApp[activeApp.id] || files[0]?.id || null
  const activeFile = files.find((file) => file.id === activeFileId) || null

  if (!activeApp) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem', minHeight: '100%', background: '#F7F1E3' }}>
      <div>
        <div style={{ fontSize: '0.72rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
          {workspaceAppVariantLabel(activeApp.kind)}
        </div>
        <h3 style={{ margin: '0.1rem 0 0', fontSize: '1rem', lineHeight: 1.3 }}>
          {interpolate(activeApp.title || activeApp.label, ctx)}
        </h3>
        {activeApp.subtitle && (
          <div style={{ fontSize: '0.72rem', color: '#6f6758', marginTop: '0.2rem' }}>{interpolate(activeApp.subtitle, ctx)}</div>
        )}
      </div>

      {renderLookForCard(activeApp.lookFor ? interpolate(activeApp.lookFor, ctx) : undefined)}

      {activeApp.messages?.map((message, i) => (
        <div key={message.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {renderLookForCard(message.lookFor ? interpolate(message.lookFor, ctx) : undefined)}
          {message.channel === 'email' || activeApp.kind === 'email' ? (
            <EmailBlock
              email={resolveWorkspaceEmailMessage(message, ctx, activeApp.title || activeApp.label)}
              delay={i * 0.08}
              initialExpanded
            />
          ) : (
            <SlackMessageEnhanced
              message={resolveWorkspaceSlackMessage(message, ctx)}
              delay={i * 0.08}
              initialExpanded
              showUnreadDot={i === activeApp.messages!.length - 1}
            />
          )}
        </div>
      ))}

      {files.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))', gap: '0.75rem', alignItems: 'start' }}>
          <div style={{ border: '1px solid #CDBF94', backgroundColor: '#EFE8D2' }}>
            <div style={{ padding: '0.5rem 0.65rem', borderBottom: '1px solid #CDBF94', fontSize: '0.72rem', fontWeight: 800, color: '#3F605C' }}>
              Files
            </div>
            {fileGroups.map((group) => (
              <div key={group.category}>
                <div style={{ padding: '0.45rem 0.65rem 0.25rem', fontSize: '0.62rem', fontWeight: 900, color: '#3F605C', textTransform: 'uppercase', letterSpacing: 0 }}>
                  {group.category}
                </div>
                {group.files.map((file) => {
                  const active = file.id === activeFileId
                  return (
                    <button
                      key={file.id}
                      type="button"
                      onClick={() => setActiveFileByApp((prev) => ({ ...prev, [activeApp.id]: file.id }))}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.1rem 1fr',
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
                        <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.2, wordBreak: 'break-word' }}>
                          {interpolate(file.name, ctx)}
                        </span>
                        <span style={{ display: 'block', fontSize: '0.62rem', color: '#6f6758', marginTop: '0.15rem' }}>
                          {file.owner || 'Shared'} - {file.modified || 'recent'}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div style={{ minWidth: 0 }}>{renderSourceFilePreview(activeFile, ctx)}</div>
        </div>
      )}

      {activeApp.sections?.map((section) => renderSourceFileSection(section, ctx))}

      {renderWorkspaceRows(activeApp, ctx)}
    </div>
  )
}
