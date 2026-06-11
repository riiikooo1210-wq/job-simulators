import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { interpolate } from '../lib/interpolate'
import { renderSourceInboxFilePreview } from './BriefingScene'
import type { SourceInboxFile, WorkSurfaceTab } from '../types/game'

export interface SourceTabContext {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
  freeTextResponses: Record<string, string>
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

function parseBoundNotes(raw: string | undefined): Record<string, string> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
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
          {tab.content && (
            <div style={{ fontSize: '0.82rem', color: '#6A604B', lineHeight: 1.5, marginTop: '0.25rem' }}>
              {renderContentWithGlossary(interpolate(tab.content, ctx))}
            </div>
          )}
        </div>
        {entries.length === 0 ? (
          <div style={{ border: '1px dashed #CDBF94', background: '#FBF7EA', padding: '0.85rem', fontSize: '0.82rem', color: '#6A604B' }}>
            {tab.sourceBindingEmptyText || 'No notes saved yet.'}
          </div>
        ) : (
          entries.map(([key, value]) => (
            <section key={key} style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.75rem', borderRadius: 6 }}>
              <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                {tab.sourceBindingLabels?.[key] || key.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: '0.84rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{value}</div>
            </section>
          ))
        )}
      </div>
    )
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
