import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import EmailBlock from '../components/ui/EmailBlock'
import EmailCompose from '../components/ui/EmailCompose'
import LaptopFrame from '../components/ui/LaptopFrame'
import LongFormEditor from '../components/ui/LongFormEditor'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { ChartIcon, DocumentIcon, EmailIcon } from '../components/ui/Icons'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import { storyline } from '../data/storyline'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { BriefingNode, FreeTextNode, SourceInboxFile, SourceWorkspaceMessage, StructuredEntryNode } from '../types/game'

interface Props { node: FreeTextNode }

type AppTab = NonNullable<FreeTextNode['appTabs']>[number]
type RenderCtx = {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
  responses: Record<string, string>
}
type WorkspaceDoc =
  | { id: string; title: string; subtitle?: string; kind: 'email'; message: SourceWorkspaceMessage }
  | { id: string; title: string; subtitle?: string; kind: 'file'; file: SourceInboxFile }

function formatSourceColumnLabel(key: string) {
  return key.replace(/[_-]/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

function renderSourceFileSection(section: NonNullable<SourceInboxFile['sections']>[number], ctx: RenderCtx) {
  const isGuidance = section.heading.trim().toLowerCase() === 'what to look for'
  if (isGuidance) {
    return (
      <div key={section.heading} style={{ borderLeft: '3px solid #B87D6B', padding: '0.15rem 0 0.15rem 0.75rem', backgroundColor: '#F2EBD9' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E1E1A', marginBottom: '0.25rem' }}>{section.heading}</div>
        <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: '#1E1E1A' }}>
          {renderContentWithGlossary(interpolate(section.body, ctx))}
        </div>
      </div>
    )
  }
  return (
    <div key={section.heading} style={{ border: '1px solid #000', backgroundColor: '#F7F1E3', boxShadow: '3px 3px 0 rgba(0,0,0,0.16)', padding: '0.85rem 0.95rem' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1E1E1A', marginBottom: '0.45rem' }}>{section.heading}</div>
      <div style={{ fontSize: '0.875rem', lineHeight: 1.65, color: '#1E1E1A', whiteSpace: 'pre-wrap' }}>
        {renderContentWithGlossary(interpolate(section.body, ctx))}
      </div>
    </div>
  )
}

function renderSourceFile(file: SourceInboxFile, ctx: RenderCtx) {
  const rows = file.rows || []
  const columns = file.columns || (rows[0] ? Object.keys(rows[0]).filter(Boolean) : [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div>
        <div style={{ fontSize: '0.72rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase' }}>{file.kind}</div>
        <h2 style={{ margin: '0.15rem 0 0', fontSize: '1rem', lineHeight: 1.3 }}>{file.previewTitle}</h2>
      </div>
      {file.sections?.map((section) => renderSourceFileSection(section, ctx))}
      {rows.length > 0 && columns.length > 0 && (
        <div style={{ overflowX: 'auto', border: '1px solid #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ backgroundColor: '#E8DCC8' }}>
                {columns.map((column) => (
                  <th key={column} style={{ textAlign: 'left', padding: '0.55rem 0.65rem', borderBottom: '1px solid #000', fontWeight: 800, fontSize: '0.72rem', textTransform: 'uppercase', whiteSpace: 'normal' }}>
                    {formatSourceColumnLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F7F1E3' : '#F2EBD9' }}>
                  {columns.map((column) => (
                    <td key={column} style={{ padding: '0.55rem 0.65rem', borderBottom: '1px solid rgba(0,0,0,0.15)', whiteSpace: 'normal', verticalAlign: 'top', lineHeight: 1.5 }}>
                      {row[column] || ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function getWorkspaceDocuments(tab: AppTab): WorkspaceDoc[] {
  const sortWorkspaceDocs = (a: WorkspaceDoc, b: WorkspaceDoc) => {
    if (a.kind === 'email' && b.kind !== 'email') return -1
    if (a.kind !== 'email' && b.kind === 'email') return 1
    return a.title.localeCompare(b.title)
  }

  if (tab.sourceWorkspaceNodeId) {
    const sourceNode = storyline.nodes[tab.sourceWorkspaceNodeId] as BriefingNode | undefined
    const sourceWorkspace = sourceNode?.sourceWorkspace
    if (sourceWorkspace) {
      return sourceWorkspace.apps.flatMap((app) => {
        const messages = (app.messages || []).map((message) => ({
          id: `${app.id}:${message.id}`,
          title: message.subject || app.title || app.label,
          subtitle: `${app.label}${message.timestamp ? ` - ${message.timestamp}` : ''}`,
          kind: 'email' as const,
          message,
        }))
        const files = (app.files || []).map((file) => ({
          id: `${app.id}:${file.id}`,
          title: file.name,
          subtitle: file.category || `${file.owner || app.label} - ${file.modified || 'recent'}`,
          kind: 'file' as const,
          file,
        }))
        return [...messages, ...files]
      }).sort(sortWorkspaceDocs)
    }
  }

  return [...(tab.workspaceDocuments || [])]
    .map((doc) => ({
      id: doc.id,
      title: doc.title,
      subtitle: doc.subtitle,
      kind: 'file' as const,
      file: {
        id: doc.id,
        name: doc.title,
        kind: 'doc' as const,
        previewTitle: doc.title,
        sections: [{ heading: doc.title, body: doc.content }],
      },
    }))
    .sort(sortWorkspaceDocs)
}

function docIcon(doc: WorkspaceDoc) {
  if (doc.kind === 'email') return <EmailIcon size={16} />
  if (doc.file.kind === 'spreadsheet' || doc.file.kind === 'dashboard') return <ChartIcon size={16} />
  return <DocumentIcon size={16} />
}

function WorkspaceDocumentBrowser({ tab, ctx }: { tab: AppTab; ctx: RenderCtx }) {
  const documents = useMemo(() => getWorkspaceDocuments(tab), [tab])
  const [activeDocId, setActiveDocId] = useState(() => documents[0]?.id || '')
  const activeDoc = documents.find((doc) => doc.id === activeDocId) || documents[0]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0, 1fr)', minHeight: '100%', background: '#F7F1E3' }}>
      <aside
        style={{
          borderRight: '1px solid #CDBF94',
          background: '#EFE8D2',
          padding: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
          Documents
        </div>
        {documents.map((doc) => {
          const active = doc.id === activeDoc?.id
          return (
            <button
              key={doc.id}
              type="button"
              onClick={() => setActiveDocId(doc.id)}
              style={{
                width: '100%',
                border: active ? '1px solid #000' : '1px solid #CDBF94',
                background: active ? '#FBF7EA' : '#F7F1E3',
                boxShadow: active ? '2px 2px 0 #000' : 'none',
                padding: '0.55rem 0.65rem',
                textAlign: 'left',
                cursor: 'pointer',
                color: '#1E1E1A',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
              title={doc.title}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ color: doc.kind === 'email' ? '#4F3A7A' : doc.kind === 'file' && doc.file.kind === 'spreadsheet' ? '#3A6B5E' : '#B87D6B' }}>
                  {docIcon(doc)}
                </span>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, lineHeight: 1.25 }}>{doc.title}</div>
              </div>
              {doc.subtitle && (
                <div style={{ marginTop: '0.2rem', fontSize: '0.66rem', color: '#6f6758', lineHeight: 1.25 }}>
                  {doc.subtitle}
                </div>
              )}
            </button>
          )
        })}
      </aside>
      <section style={{ minWidth: 0, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase' }}>
          {tab.label}
        </div>
        {activeDoc && (
          activeDoc.kind === 'email' ? (
            <EmailBlock
              initialExpanded
              email={{
                from: activeDoc.message.from,
                to: activeDoc.message.to || 'VerdantWorks planning team',
                subject: activeDoc.message.subject || activeDoc.title,
                content: interpolate(activeDoc.message.body, ctx),
              }}
            />
          ) : (
            <article style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '1rem', color: '#1E1E1A' }}>
              {renderSourceFile(activeDoc.file, ctx)}
            </article>
          )
        )}
      </section>
    </div>
  )
}

function parseReferencedResponse(raw: string) {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    if (parsed && typeof parsed === 'object') return [parsed]
    if (typeof parsed === 'string') return parsed
  } catch {
    return raw
  }
  return raw
}

function getResponseLabels(tab: AppTab) {
  const reference = tab.responseReference
  if (!reference) return {}
  const sourceNode = storyline.nodes[reference.bindingKey] as StructuredEntryNode | undefined
  const definitionLabels = sourceNode?.type === 'structured_entry'
    ? Object.fromEntries(sourceNode.definition.fields.map((field) => [field.key, field.label]))
    : {}
  return { ...definitionLabels, ...(reference.fieldLabels || {}) }
}

function ResponseReferenceTab({ tab, ctx }: { tab: AppTab; ctx: RenderCtx }) {
  const reference = tab.responseReference
  const raw = reference ? ctx.responses[reference.bindingKey] || '' : ''
  const parsed = parseReferencedResponse(raw)
  const labels = getResponseLabels(tab)
  const title = reference?.title || tab.label
  const hasRows = Array.isArray(parsed) && parsed.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '1rem', minHeight: '100%', background: '#F7F1E3' }}>
      <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase' }}>
        {title}
      </div>
      {!raw.trim() && (
        <div
          style={{
            border: '1px solid #CDBF94',
            background: '#EFE8D2',
            padding: '0.7rem 0.85rem',
            fontSize: '0.78rem',
            lineHeight: 1.5,
            color: '#3A3A31',
            fontWeight: 700,
          }}
        >
          {reference?.emptyLabel || 'Complete the prior task to populate this tab.'}
        </div>
      )}
      {hasRows ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {parsed.map((row: Record<string, string>, rowIndex: number) => (
            <article key={rowIndex} style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.85rem 0.95rem', color: '#1E1E1A' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
                Scan Entry {rowIndex + 1}
              </div>
              <div style={{ display: 'grid', gap: '0.7rem' }}>
                {Object.entries(row).map(([key, value]) => (
                  <section key={key} style={{ borderLeft: '3px solid #B87D6B', paddingLeft: '0.65rem' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 800, color: '#5A5145', marginBottom: '0.2rem' }}>
                      {labels[key] || formatSourceColumnLabel(key)}
                    </div>
                    <div style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {renderContentWithGlossary(interpolate(String(value || ''), ctx))}
                    </div>
                  </section>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : raw.trim() ? (
        <div
          style={{
            border: '1px solid #CDBF94',
            background: '#FBF7EA',
            padding: '0.85rem',
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: '#1E1E1A',
            whiteSpace: 'pre-wrap',
          }}
        >
          {renderContentWithGlossary(interpolate(String(parsed), ctx))}
        </div>
      ) : (
        <div
          style={{
            border: '1px solid #CDBF94',
            background: '#FBF7EA',
            padding: '0.85rem',
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: '#1E1E1A',
            whiteSpace: 'pre-wrap',
          }}
        >
          {renderContentWithGlossary(interpolate(tab.content, ctx))}
        </div>
      )}
    </div>
  )
}

function renderAppTab(tab: AppTab, ctx: RenderCtx) {
  if (tab.responseReference) {
    return <ResponseReferenceTab tab={tab} ctx={ctx} />
  }

  if (tab.sourceWorkspaceNodeId || tab.workspaceDocuments?.length) {
    return <WorkspaceDocumentBrowser tab={tab} ctx={ctx} />
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

export default function FreeTextScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const appTabs = node.appTabs || []
  const [activeAppTab, setActiveAppTab] = useState(() => node.defaultAppTabId || 'editor')

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const isEmailCompose = appWindow === 'email'
  const titleTabs = appTabs.length > 0
    ? [...appTabs.map((tab) => ({ id: tab.id, label: tab.label })), { id: 'editor', label: node.windowTitle || node.title }]
    : undefined
  const activeSourceTab = appTabs.find((tab) => tab.id === activeAppTab)
  const renderCtx = { playerName, branchFlags, mcSelections, responses }

  const emailHeaders = {
    from: interpolate(node.emailHeaders?.from || '{{playerName}}', renderCtx),
    to: interpolate(node.emailHeaders?.to || '', renderCtx),
    subject: interpolate(node.emailHeaders?.subject || node.windowTitle || node.title, renderCtx),
  }

  const editorContent = isEmailCompose ? (
    <EmailCompose
      value={value}
      onChange={(v) => setFreeTextResponse(node.id, v)}
      placeholder={node.placeholder}
      maxWords={node.maxWords}
      from={emailHeaders.from}
      to={emailHeaders.to}
      subject={emailHeaders.subject}
      onSend={() => goNext(node)}
      sendDisabled={!canSubmit}
    />
  ) : (
    <>
      <LongFormEditor
        value={value}
        onChange={(v) => setFreeTextResponse(node.id, v)}
        placeholder={node.placeholder}
        maxWords={node.maxWords}
        minRows={6}
      />
      <div style={{ fontSize: '0.75rem', color: appWindow ? '#888' : '#666', padding: appWindow ? '0.5rem 1rem' : '0' }}>
        {node.minWords ? `Min ${node.minWords} words. ` : ''}
        {node.maxWords ? `Max ${node.maxWords} words. ` : ''}
        Currently {wordCount} word{wordCount === 1 ? '' : 's'}.
      </div>
      <div style={{ padding: appWindow ? '0 1rem 1rem' : '0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <ActionButton
          text="Submit"
          onClick={() => goNext(node)}
          disabled={!canSubmit}
          variant={canSubmit ? 'primary' : 'secondary'}
        />
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
        )}
      </div>
    </>
  )

  const tabbedWindowContent = activeAppTab === 'editor' ? (
    editorContent
  ) : (
    activeSourceTab ? renderAppTab(activeSourceTab, renderCtx) : null
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, renderCtx))}
          </div>
        )}
        <div
          style={{
            backgroundColor: '#F7F1E3',
            border: '1px solid #CDBF94',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1E1E1A',
          }}
        >
          {renderContentWithGlossary(interpolate(node.prompt, renderCtx))}
        </div>

        {appWindow ? (
          <DesktopOverlay>
            <LaptopFrame
              variant={appWindow}
              title={node.windowTitle}
              fill
              scrollable
              titleTabs={titleTabs}
              activeTitleTabId={activeAppTab}
              onTitleTabChange={setActiveAppTab}
            >
              {appTabs.length > 0 ? tabbedWindowContent : editorContent}
            </LaptopFrame>
          </DesktopOverlay>
        ) : (
          <>
            {editorContent}
          </>
        )}
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
