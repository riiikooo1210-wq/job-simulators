import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import {
  mergeWorkSurfaceTabs,
  resolveWorkSurfaceVariant,
} from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import EmailBlock from '../components/ui/EmailBlock'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { ChartIcon, DocumentIcon, EmailIcon } from '../components/ui/Icons'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import { npcs, storyline } from '../data/storyline'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { BriefingNode, ChatMessage, SourceInboxFile, SourceWorkspaceMessage, StructuredEntryNode } from '../types/game'

interface Props { node: StructuredEntryNode }

type Item = Record<string, string>
type AppTab = NonNullable<StructuredEntryNode['appTabs']>[number]
type RenderCtx = {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
  npcConversations: Record<string, ChatMessage[]>
  responses: Record<string, string>
}
type WorkspaceDoc =
  | { id: string; title: string; subtitle?: string; kind: 'email'; message: SourceWorkspaceMessage }
  | { id: string; title: string; subtitle?: string; kind: 'file'; file: SourceInboxFile }

function parseItems(raw: string, fields: { key: string }[], initialCount: number): Item[] {
  if (!raw) return Array.from({ length: initialCount }, () =>
    Object.fromEntries(fields.map((f) => [f.key, ''])) as Item
  )
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // ignore parse error
  }
  return Array.from({ length: initialCount }, () =>
    Object.fromEntries(fields.map((f) => [f.key, ''])) as Item
  )
}

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

function getConversationSpeaker(conversationKey: string, message: ChatMessage) {
  if (message.role === 'user') return 'You'
  const keyParts = conversationKey.split(':')
  const npcId = keyParts[keyParts.length - 1] || conversationKey
  return npcs[npcId]?.name || 'City staff'
}

function ConversationReferenceTab({ tab, ctx }: { tab: AppTab; ctx: RenderCtx }) {
  const reference = tab.conversationReference
  const messages = reference ? (ctx.npcConversations[reference.conversationKey] || []) : []
  const transcript = messages.filter((message) => message.content.trim())
  const fallback = reference?.fallbackContent || tab.content

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '1rem', minHeight: '100%', background: '#F7F1E3' }}>
      <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase' }}>
        {tab.label}
      </div>
      {transcript.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {transcript.map((message, index) => {
            const isUser = message.role === 'user'
            return (
              <article
                key={`${message.ts || 'msg'}-${index}`}
                style={{
                  border: '1px solid #CDBF94',
                  borderLeft: `4px solid ${isUser ? '#3A6B5E' : '#B87D6B'}`,
                  background: '#FBF7EA',
                  padding: '0.75rem 0.85rem',
                  color: '#1E1E1A',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: isUser ? '#3A6B5E' : '#7B4D3E', marginBottom: '0.35rem' }}>
                  {getConversationSpeaker(reference?.conversationKey || '', message)}
                </div>
                <div style={{ fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {renderContentWithGlossary(interpolate(message.content, ctx))}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {reference?.emptyLabel && (
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
              {reference.emptyLabel}
            </div>
          )}
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
            {renderContentWithGlossary(interpolate(fallback, ctx))}
          </div>
        </div>
      )}
    </div>
  )
}

function ResponseReferenceTab({ tab, ctx }: { tab: AppTab; ctx: RenderCtx }) {
  const reference = tab.responseReference
  const raw = reference ? (ctx.responses[reference.bindingKey] || '').trim() : ''
  const title = reference?.title || tab.label

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', padding: '1rem', minHeight: '100%', background: '#F7F1E3' }}>
      <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase' }}>
        {title}
      </div>
      {!raw && reference?.emptyLabel && (
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
          {reference.emptyLabel}
        </div>
      )}
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
        {renderContentWithGlossary(interpolate(raw || tab.content, ctx))}
      </div>
    </div>
  )
}

function renderAppTab(tab: AppTab, ctx: RenderCtx) {
  if (tab.responseReference) {
    return <ResponseReferenceTab tab={tab} ctx={ctx} />
  }

  if (tab.conversationReference) {
    return <ConversationReferenceTab tab={tab} ctx={ctx} />
  }

  if (tab.sourceWorkspaceNodeId || tab.workspaceDocuments?.length) {
    return <WorkspaceDocumentBrowser tab={tab} ctx={ctx} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem', minHeight: '100%', background: '#F7F1E3' }}>
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
      {tab.imagePath && (
        <div style={{ border: '1px solid #000', background: '#EFE8D2', padding: '0.5rem', boxShadow: '4px 4px 0 rgba(0,0,0,0.22)' }}>
          <img
            src={tab.imagePath}
            alt={tab.imageAlt || ''}
            style={{
              display: 'block',
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              border: '1px solid #CDBF94',
              background: '#E8DCC8',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default function StructuredEntryScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const npcConversations = useGameStore((s) => s.npcConversations)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const appTabs = mergeWorkSurfaceTabs(node, node.appTabs || [])
  const [activeAppTab, setActiveAppTab] = useState(() => node.defaultAppTabId || (appTabs[0]?.id ?? 'editor'))

  const def = node.definition
  const initialCount = def.initialCount ?? def.minItems ?? 3
  const items = useMemo(() => {
    return parseItems(responses[def.bindingKey] || '', def.fields, initialCount)
  }, [responses, def.bindingKey, def.fields, initialCount])

  const updateItem = (idx: number, key: string, value: string) => {
    const next = items.map((it, i) => (i === idx ? { ...it, [key]: value } : it))
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const addItem = () => {
    if (def.maxItems && items.length >= def.maxItems) return
    const next = [...items, Object.fromEntries(def.fields.map((f) => [f.key, ''])) as Item]
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const removeItem = (idx: number) => {
    if (def.minItems && items.length <= def.minItems) return
    const next = items.filter((_, i) => i !== idx)
    setFreeTextResponse(def.bindingKey, JSON.stringify(next))
  }

  const allFilled = items.every((it) => def.fields.every((f) => (it[f.key] || '').trim().length > 0))
  const appWindow = resolveWorkSurfaceVariant(node, 'notion') as LaptopFrameVariant
  const titleTabs = appTabs.length > 0
    ? [...appTabs.map((tab) => ({ id: tab.id, label: tab.label })), { id: 'editor', label: node.editorTabLabel || def.itemLabel || node.title }]
    : undefined
  const activeSourceTab = appTabs.find((tab) => tab.id === activeAppTab)
  const renderCtx = { playerName, branchFlags, mcSelections, npcConversations, responses }

  const formContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            border: '1px solid #000',
            boxShadow: '4px 4px 0 #000',
            backgroundColor: '#F2EBD9',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.625rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong style={{ fontSize: '0.8125rem' }}>
              {def.itemLabel} #{idx + 1}
            </strong>
            {(!def.minItems || items.length > def.minItems) && (
              <button
                onClick={() => removeItem(idx)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#c0392b',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                }}
              >
                Remove
              </button>
            )}
          </div>
          {def.fields.map((field) => (
            <div key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#444' }}>{field.label}</label>
              {field.multiline ? (
                <textarea
                  value={item[field.key] || ''}
                  onChange={(e) => updateItem(idx, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={field.rows ?? 3}
                  style={{
                    padding: '0.5rem 0.625rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    color: '#000',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              ) : (
                <input
                  type="text"
                  value={item[field.key] || ''}
                  onChange={(e) => updateItem(idx, field.key, e.target.value)}
                  placeholder={field.placeholder}
                  style={{
                    padding: '0.5rem 0.625rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    border: '1px solid #000',
                    backgroundColor: '#fff',
                    color: '#000',
                    outline: 'none',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      {(!def.maxItems || items.length < def.maxItems) && (
        <button
          onClick={addItem}
          style={{
            background: '#E8DCC8',
            border: '1px dashed #000',
            padding: '0.625rem 1rem',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          + Add another {def.itemLabel.toLowerCase()}
        </button>
      )}

      <ActionButton
        text="Submit"
        onClick={() => goNext(node)}
        disabled={!allFilled}
        variant={allFilled ? 'primary' : 'secondary'}
      />
      {import.meta.env.DEV && (
        <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
      )}
    </div>
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
            backgroundColor: '#fff',
            border: '1px solid #000',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {renderContentWithGlossary(interpolate(node.prompt, renderCtx))}
        </div>

        <DesktopOverlay>
          <LaptopFrame
            variant={appWindow}
            title={node.workSurface?.title || node.windowTitle}
            fill
            scrollable
            titleTabs={titleTabs}
            activeTitleTabId={activeAppTab}
            onTitleTabChange={setActiveAppTab}
          >
            {activeSourceTab
              ? renderAppTab(activeSourceTab, renderCtx)
              : formContent}
          </LaptopFrame>
        </DesktopOverlay>
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
