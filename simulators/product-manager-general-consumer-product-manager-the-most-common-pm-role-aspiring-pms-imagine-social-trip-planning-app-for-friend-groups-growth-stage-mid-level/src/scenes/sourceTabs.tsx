import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { interpolate } from '../lib/interpolate'
import { renderSourceInboxFilePreview } from './BriefingScene'
import type { ChatMessage, SourceInboxFile, WorkSurfaceTab } from '../types/game'

export interface SourceTabContext {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
  freeTextResponses: Record<string, string>
  npcConversations?: Record<string, ChatMessage[]>
}

export type SourceTabView = WorkSurfaceTab & {
  workspaceDocuments?: WorkSurfaceTab[]
}

function hasSourcePreview(tab: WorkSurfaceTab) {
  return Boolean(tab.previewTitle || tab.sections?.length || tab.rows?.length)
}

function inferredSourceKind(tab: WorkSurfaceTab): SourceInboxFile['kind'] {
  return tab.kind || (tab.rows?.length ? 'spreadsheet' : 'doc')
}

function isWorkspaceDocumentTab(tab: WorkSurfaceTab) {
  if (tab.sourceBindingKey || !hasSourcePreview(tab)) return false

  const kind = inferredSourceKind(tab)
  if (kind === 'dashboard' || kind === 'email') return false

  const owner = (tab.owner || '').trim().toLowerCase()
  if (['shared', 'product ops', 'workspace', 'drive'].includes(owner)) return true

  return /\.(doc|docx|txt|pdf|xls|xlsx|csv)$/i.test(tab.name || '')
}

export function organizeSourceTabs(tabs: WorkSurfaceTab[]): SourceTabView[] {
  const workspaceDocuments = tabs.filter(isWorkspaceDocumentTab)
  if (workspaceDocuments.length <= 1) return tabs

  const workspaceTab: SourceTabView = {
    id: 'workspace_sources',
    label: 'Workspace',
    content: 'Workspace documents.',
    workspaceDocuments,
  }
  let insertedWorkspace = false

  return tabs.reduce<SourceTabView[]>((organized, tab) => {
    if (isWorkspaceDocumentTab(tab)) {
      if (!insertedWorkspace) {
        organized.push(workspaceTab)
        insertedWorkspace = true
      }
      return organized
    }
    organized.push(tab)
    return organized
  }, [])
}

function normalizeBoundNotes(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}

  return Object.entries(value).reduce<Record<string, string>>((notes, [key, item]) => {
    if (typeof item === 'string') {
      notes[key] = item
    } else if (typeof item === 'number' || typeof item === 'boolean') {
      notes[key] = String(item)
    }
    return notes
  }, {})
}

function parseBoundNotes(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return normalizeBoundNotes(parsed)
  } catch {
    return { note: raw }
  }
}

function toSourceFile(tab: WorkSurfaceTab, ctx: SourceTabContext): SourceInboxFile {
  return {
    id: tab.id,
    name: tab.name || tab.label,
    kind: inferredSourceKind(tab),
    modified: tab.modified,
    owner: tab.owner,
    previewTitle: tab.previewTitle || tab.label,
    summary: tab.summary,
    sections: tab.sections?.map((section) => ({
      ...section,
      body: interpolate(section.body, ctx),
    })),
    columns: tab.columns,
    rows: tab.rows,
  }
}

function parsePercentValue(value?: string) {
  if (!value) return 0
  const parsed = Number.parseFloat(value.replace('%', ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatColumnLabel(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatStatusLabel(status?: string) {
  if (!status) return 'Check'
  if (/warning|risk|attention/i.test(status)) return 'Needs attention'
  if (/track|ok|good|complete/i.test(status)) return 'Looks okay'
  return formatColumnLabel(status)
}

function renderSimpleAnalyticsTab(tab: SourceTabView) {
  const rows = tab.rows || []
  const chartRows = rows.map((row) => ({
    label: row.metric || row.name || '',
    actual: row.actual || '',
    target: row.target || '',
    status: row.status || '',
    percent: parsePercentValue(row.actual),
  }))
  const biggestDrop = chartRows.slice(1).reduce<{
    from: string
    to: string
    drop: number
  } | null>((largest, row, index) => {
    const previous = chartRows[index]
    const drop = Math.max(0, previous.percent - row.percent)
    if (!largest || drop > largest.drop) {
      return { from: previous.label, to: row.label, drop }
    }
    return largest
  }, null)

  return (
    <div className="problem-notes-analytics-simple" data-testid="problem-notes-analytics-simple">
      <header className="problem-notes-analytics-header">
        <div>
          <div className="problem-notes-analytics-kicker">Analytics</div>
          <h2>Trip planning numbers</h2>
          <p>Out of 100 people who start a trip, see where the group loses momentum.</p>
        </div>
        <div className="problem-notes-analytics-count">
          <strong>{chartRows.length}</strong>
          <span>steps checked</span>
        </div>
      </header>

      {biggestDrop && (
        <section className="problem-notes-analytics-key-drop" data-testid="problem-notes-analytics-key-drop">
          <div>
            <span>Biggest drop</span>
            <strong>{biggestDrop.drop} fewer people reach "{biggestDrop.to}"</strong>
          </div>
          <p>Use this clue with your app notes. The numbers show where to look, not the final answer.</p>
        </section>
      )}

      <div className="problem-notes-analytics-list" aria-label={tab.previewTitle || tab.label}>
        {chartRows.map((row, index) => {
          const warning = /warning|risk|attention/i.test(row.status)
          return (
            <section
              key={`${row.label}-${index}`}
              className="problem-notes-analytics-row"
              data-testid="problem-notes-analytics-row"
            >
              <div className="problem-notes-analytics-row-main">
                <div className="problem-notes-analytics-row-index">{index + 1}</div>
                <div>
                  <h3>{row.label}</h3>
                  {row.target && <p>{formatColumnLabel(row.target)}</p>}
                </div>
              </div>
              <div className="problem-notes-analytics-bar" aria-label={`${row.label}: ${row.actual}`}>
                <span style={{ width: `${Math.max(row.percent, 3)}%` }} />
              </div>
              <div className="problem-notes-analytics-row-end">
                <strong>{row.actual}</strong>
                <span className={warning ? 'is-warning' : 'is-ok'}>{formatStatusLabel(row.status)}</span>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function renderWorkspaceDocuments(tab: SourceTabView, ctx: SourceTabContext) {
  return (
    <div
      style={{
        padding: '1rem',
        minHeight: '100%',
        background: '#F7F1E3',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {tab.workspaceDocuments?.map((documentTab, index) => (
        <section
          key={documentTab.id}
          style={{
            paddingTop: index === 0 ? 0 : '1rem',
            borderTop: index === 0 ? 'none' : '1px solid #CDBF94',
          }}
        >
          {renderSourceInboxFilePreview(toSourceFile(documentTab, ctx), true)}
        </section>
      ))}
    </div>
  )
}

export function renderSourceTab(tab: SourceTabView, ctx: SourceTabContext) {
  if (tab.workspaceDocuments?.length) {
    return renderWorkspaceDocuments(tab, ctx)
  }

  if (tab.sourceBindingKey) {
    const notes = parseBoundNotes(ctx.freeTextResponses[tab.sourceBindingKey])
    const entries = Object.entries(notes).filter(([, value]) => value.trim().length > 0)
    return (
      <div
        style={{
          background: '#F7F1E3',
          border: '1px solid #CDBF94',
          padding: '1rem',
          color: '#1E1E1A',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: '#3F605C', fontWeight: 900, textTransform: 'uppercase' }}>
            {tab.sourceBindingTitle || tab.label}
          </div>
        </div>
        {entries.length === 0 ? (
          <>
            {tab.content && (
              <div style={{ fontSize: '0.82rem', color: '#6A604B', lineHeight: 1.5 }}>
                {renderContentWithGlossary(interpolate(tab.content, ctx))}
              </div>
            )}
            <div style={{ border: '1px dashed #CDBF94', background: '#FBF7EA', padding: '0.85rem', fontSize: '0.82rem', color: '#6A604B' }}>
              {tab.sourceBindingEmptyText || 'No notes saved yet.'}
            </div>
          </>
        ) : (
          <>
            {entries.map(([key, value]) => (
              <section key={key} style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.75rem', borderRadius: 6 }}>
                <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  {tab.sourceBindingLabels?.[key] || key.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: '0.84rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{value}</div>
              </section>
            ))}
            {tab.content && (
              <div style={{ fontSize: '0.82rem', color: '#6A604B', lineHeight: 1.5 }}>
                {renderContentWithGlossary(interpolate(tab.content, ctx))}
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  if (tab.conversationBindingKey) {
    const messages = ctx.npcConversations?.[tab.conversationBindingKey] || []
    const entries = messages.filter((message) => message.content.trim().length > 0)
    return (
      <div
        style={{
          background: '#F7F1E3',
          border: '1px solid #CDBF94',
          padding: '1rem',
          color: '#1E1E1A',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: '#3F605C', fontWeight: 900, textTransform: 'uppercase' }}>
            {tab.conversationBindingTitle || tab.label}
          </div>
          {tab.content && (
            <div style={{ fontSize: '0.82rem', color: '#6A604B', lineHeight: 1.5, marginTop: '0.25rem' }}>
              {renderContentWithGlossary(interpolate(tab.content, ctx))}
            </div>
          )}
        </div>
        {entries.length === 0 ? (
          <div style={{ border: '1px dashed #CDBF94', background: '#FBF7EA', padding: '0.85rem', fontSize: '0.82rem', color: '#6A604B' }}>
            {tab.conversationBindingEmptyText || 'No interview notes saved yet.'}
          </div>
        ) : (
          entries.map((message, index) => (
            <section key={`${message.role}-${index}`} style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.75rem', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                {message.role === 'user' ? 'You asked' : message.npcName || 'Nina said'}
              </div>
              <div style={{ fontSize: '0.84rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{message.content}</div>
            </section>
          ))
        )}
      </div>
    )
  }

  if (tab.kind === 'dashboard' && tab.rows?.length) {
    return renderSimpleAnalyticsTab(tab)
  }

  if (hasSourcePreview(tab)) {
    return (
      <div style={{ padding: '1rem', minHeight: '100%', background: '#F7F1E3' }}>
        {renderSourceInboxFilePreview(toSourceFile(tab, ctx), true)}
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#F7F1E3',
        border: '1px solid #CDBF94',
        padding: '1rem',
        fontSize: '0.875rem',
        lineHeight: 1.65,
        color: '#1E1E1A',
        whiteSpace: 'pre-wrap',
        minHeight: '100%',
      }}
    >
      {renderContentWithGlossary(interpolate(tab.content, ctx))}
    </div>
  )
}
