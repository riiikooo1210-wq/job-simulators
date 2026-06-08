import { useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame, {
  hasWorkSurfaceVisual,
  mergeWorkSurfaceTabs,
  resolveWorkSurfaceVariant,
} from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import EmailCompose from '../components/ui/EmailCompose'
import LongFormEditor from '../components/ui/LongFormEditor'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { ChartIcon, DocumentIcon } from '../components/ui/Icons'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import SlideDeckEditor from './SlideDeckEditor'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { CSSProperties } from 'react'
import type { FreeTextNode, WorkSurfaceTab } from '../types/game'

interface Props { node: FreeTextNode }

type SceneContext = {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
}

const sourceDocPageStyle: CSSProperties = {
  width: 'min(100%, 860px)',
  margin: '0 auto',
  backgroundColor: '#FFFFFF',
  border: '1px solid #D9DEE5',
  boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
  minHeight: '100%',
  padding: '1.15rem 1.25rem',
}

const sourceDocEyebrowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  color: '#475569',
  fontSize: '0.72rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0,
}

function splitContentBlocks(content: string) {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function renderSourceBlock(block: string, key: string) {
  const lines = block.split('\n').map((line) => line.trim()).filter(Boolean)
  const [firstLine, ...rest] = lines
  const hasBullets = rest.some((line) => line.startsWith('- '))
  const heading = firstLine.endsWith(':') ? firstLine.slice(0, -1) : hasBullets ? firstLine : ''
  const bodyLines = heading ? rest : lines

  return (
    <section key={key} style={{ borderTop: '1px solid #E5E7EB', paddingTop: '0.85rem' }}>
      {heading && (
        <h3 style={{ margin: '0 0 0.45rem', fontSize: '0.86rem', lineHeight: 1.35, color: '#111827' }}>
          {heading}
        </h3>
      )}
      {bodyLines.some((line) => line.startsWith('- ')) ? (
        <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.32rem' }}>
          {bodyLines.map((line, i) => (
            <li key={i} style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#1F2937' }}>
              {renderContentWithGlossary(line.replace(/^- /, ''))}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {bodyLines.map((line, i) => (
            <p key={i} style={{ margin: 0, fontSize: '0.84rem', lineHeight: 1.6, color: '#1F2937' }}>
              {renderContentWithGlossary(line)}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}

function SourceDocumentTab({ tab, ctx }: { tab: WorkSurfaceTab; ctx: SceneContext }) {
  const content = interpolate(tab.content, ctx)
  const blocks = splitContentBlocks(content)
  const title = blocks[0] || tab.label
  const bodyBlocks = blocks.slice(1)

  return (
    <div style={sourceDocPageStyle}>
      <div style={sourceDocEyebrowStyle}>
        <DocumentIcon size={15} />
        Source document
      </div>
      <h2 style={{ margin: '0.45rem 0 0.35rem', fontSize: '1.35rem', lineHeight: 1.2, color: '#111827' }}>
        {renderContentWithGlossary(title)}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.95rem' }}>
        {bodyBlocks.map((block, i) => renderSourceBlock(block, `${tab.id}-${i}`))}
      </div>
    </div>
  )
}

function parseMarkdownTable(content: string) {
  const lines = content.split('\n')
  const tableLines = lines.filter((line) => line.trim().startsWith('|'))
  if (tableLines.length < 3) return null
  const splitRow = (line: string) => line.split('|').slice(1, -1).map((cell) => cell.trim())
  const hasSeparatorRow = splitRow(tableLines[1]).every((cell) => /^:?-{2,}:?$/.test(cell))
  return {
    headers: splitRow(tableLines[0]),
    rows: tableLines.slice(hasSeparatorRow ? 2 : 1).map(splitRow),
    noteLines: lines
      .slice(lines.findIndex((line) => line.trim() === 'Data quality notes:') + 1)
      .filter((line) => line.trim().startsWith('- '))
      .map((line) => line.replace(/^- /, '').trim()),
  }
}

function SpreadsheetTab({ tab, ctx }: { tab: WorkSurfaceTab; ctx: SceneContext }) {
  const content = interpolate(tab.content, ctx)
  const table = parseMarkdownTable(content)
  const title = content.split('\n')[0] || tab.label
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

  if (!table) return <SourceDocumentTab tab={tab} ctx={ctx} />

  return (
    <div style={{ minHeight: '100%', backgroundColor: '#FFFFFF', border: '1px solid #D1D5DB', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.7rem 0.85rem',
          borderBottom: '1px solid #D1D5DB',
          backgroundColor: '#F8FAFC',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
          <span style={{ color: '#256F52', display: 'inline-flex' }}><ChartIcon size={18} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748B' }}>Store-level extract · read-only</div>
          </div>
        </div>
        <div style={{ fontSize: '0.68rem', color: '#64748B', whiteSpace: 'nowrap' }}>Sheet1</div>
      </div>

      <div style={{ overflow: 'auto', minHeight: 0, flex: 1 }}>
        <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: '0.74rem' }}>
          <colgroup>
            <col style={{ width: '2.4rem' }} />
            {table.headers.map((header) => (
              <col key={header} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th style={sheetCornerStyle} />
              {table.headers.map((header, i) => (
                <th key={header} style={sheetLetterStyle}>{letters[i]}</th>
              ))}
            </tr>
            <tr>
              <th style={sheetRowNumberStyle}>1</th>
              {table.headers.map((header) => (
                <th key={header} style={sheetHeaderCellStyle}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th style={sheetRowNumberStyle}>{rowIndex + 2}</th>
                {row.map((cell, cellIndex) => {
                  const flagged = /missing|n\/a|43%|31%/.test(cell)
                  return (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      style={{
                        ...sheetBodyCellStyle,
                        backgroundColor: flagged ? '#FFF7ED' : '#FFFFFF',
                        color: flagged ? '#9A3412' : '#111827',
                        fontWeight: flagged ? 800 : 500,
                      }}
                    >
                      {cell}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: '1px solid #D1D5DB', backgroundColor: '#F8FAFC', padding: '0.75rem 0.85rem' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#334155', marginBottom: '0.4rem' }}>Data quality notes</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.45rem' }}>
          {table.noteLines.map((note) => (
            <div key={note} style={{ border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', padding: '0.45rem 0.55rem', fontSize: '0.72rem', lineHeight: 1.45, color: '#1F2937' }}>
              {renderContentWithGlossary(note)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const sheetCornerStyle: CSSProperties = {
  border: '1px solid #D1D5DB',
  backgroundColor: '#EEF2F7',
  height: '1.7rem',
}

const sheetLetterStyle: CSSProperties = {
  border: '1px solid #D1D5DB',
  backgroundColor: '#EEF2F7',
  color: '#475569',
  fontSize: '0.68rem',
  fontWeight: 800,
  textAlign: 'center',
}

const sheetRowNumberStyle: CSSProperties = {
  border: '1px solid #D1D5DB',
  backgroundColor: '#F8FAFC',
  color: '#64748B',
  fontSize: '0.68rem',
  fontWeight: 700,
  textAlign: 'center',
}

const sheetHeaderCellStyle: CSSProperties = {
  border: '1px solid #CBD5E1',
  backgroundColor: '#DCE6D2',
  color: '#163B32',
  padding: '0.5rem',
  fontSize: '0.7rem',
  fontWeight: 900,
  textAlign: 'left',
  verticalAlign: 'top',
}

const sheetBodyCellStyle: CSSProperties = {
  border: '1px solid #E2E8F0',
  padding: '0.45rem 0.5rem',
  lineHeight: 1.35,
  verticalAlign: 'top',
  wordBreak: 'break-word',
}

function ClientReadoutEditor({
  node,
  value,
  wordCount,
  canSubmit,
  setValue,
  onSubmit,
}: {
  node: FreeTextNode
  value: string
  wordCount: number
  canSubmit: boolean
  setValue: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <div style={{ minHeight: '100%', backgroundColor: '#F8FAFC', padding: '1rem' }}>
      <div style={{ ...sourceDocPageStyle, padding: '1.25rem 1.35rem', minHeight: 'calc(100% - 2rem)' }}>
        <div style={sourceDocEyebrowStyle}>
          <DocumentIcon size={15} />
          Call prep
        </div>
        <h2 style={{ margin: '0.45rem 0 0.65rem', fontSize: '1.45rem', lineHeight: 1.18, color: '#111827' }}>
          Hypotheses and questions for Marcus
        </h2>
        <p style={{ margin: '0 0 1rem', paddingTop: '0.7rem', borderTop: '1px solid #E5E7EB', fontSize: '0.86rem', lineHeight: 1.55, color: '#334155' }}>
          Pair each working hypothesis with one question that would test or improve the team's first-cut answer.
        </p>
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 800, marginBottom: '0.4rem' }}>
            Hypothesis-question pairs
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={node.placeholder}
            rows={10}
            style={{
              width: '100%',
              minHeight: '15rem',
              border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF',
              padding: '0.85rem 0.95rem',
              resize: 'vertical',
              outline: 'none',
              fontSize: '0.9rem',
              lineHeight: 1.65,
              color: '#111827',
              fontFamily: 'Inter, system-ui, sans-serif',
              borderRadius: '4px',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
            {node.minWords ? `Min ${node.minWords}. ` : ''}
            {node.maxWords ? `Max ${node.maxWords}. ` : ''}
            {wordCount} word{wordCount === 1 ? '' : 's'}.
          </span>
          <ActionButton
            text="Submit"
            onClick={onSubmit}
            disabled={!canSubmit}
            variant={canSubmit ? 'primary' : 'secondary'}
            fullWidth={false}
          />
        </div>
        {import.meta.env.DEV && (
          <div style={{ marginTop: '0.6rem' }}>
            <ActionButton text="Skip (dev)" onClick={onSubmit} variant="secondary" fullWidth={false} />
          </div>
        )}
      </div>
    </div>
  )
}

function renderSourceTab(tab: WorkSurfaceTab, ctx: SceneContext, nodeId: string) {
  if (nodeId === 'client_files_readout' && tab.id === 'kpi_extract') {
    return <SpreadsheetTab key={tab.id} tab={tab} ctx={ctx} />
  }
  if (nodeId === 'client_files_readout') {
    return <SourceDocumentTab key={tab.id} tab={tab} ctx={ctx} />
  }

  return (
    <div
      key={tab.id}
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

function resolveActiveFreeTextVariant(nodeId: string, defaultVariant: LaptopFrameVariant, activeTabId: string): LaptopFrameVariant {
  if (nodeId === 'slide_draft') return activeTabId === 'editor' ? 'figma' : 'doc'
  if (nodeId !== 'client_files_readout') return defaultVariant
  if (activeTabId === 'kpi_extract') return 'spreadsheet'
  if (activeTabId === 'editor') return 'notion'
  return 'doc'
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
  const [activeAppTab, setActiveAppTab] = useState('editor')

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = resolveWorkSurfaceVariant(node, 'notion') as LaptopFrameVariant
  const activeWindowVariant = resolveActiveFreeTextVariant(node.id, appWindow, activeAppTab)
  const desktopZoom = node.id === 'slide_draft' ? 1.16 : undefined
  const desktopLaptopOffsetX = node.id === 'slide_draft' ? '-1.2%' : undefined
  const isEmailCompose = appWindow === 'email'
  const appTabs = mergeWorkSurfaceTabs(node, node.appTabs || [])
  const titleTabs = appTabs.length > 0
    ? [{ id: 'editor', label: node.workSurface?.title || node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined

  const emailHeaders = {
    from: interpolate(node.emailHeaders?.from || '{{playerName}}', { playerName, branchFlags, mcSelections }),
    to: interpolate(node.emailHeaders?.to || '', { playerName, branchFlags, mcSelections }),
    subject: interpolate(node.emailHeaders?.subject || node.windowTitle || node.title, { playerName, branchFlags, mcSelections }),
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
  ) : node.id === 'client_files_readout' ? (
    <ClientReadoutEditor
      node={node}
      value={value}
      wordCount={wordCount}
      canSubmit={canSubmit}
      setValue={(v) => setFreeTextResponse(node.id, v)}
      onSubmit={() => goNext(node)}
    />
  ) : node.id === 'slide_draft' ? (
    <SlideDeckEditor
      node={node}
      value={value}
      setValue={(v) => setFreeTextResponse(node.id, v)}
    />
  ) : (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', minHeight: '100%' }}>
        <div
          style={{
            border: '1px solid #CDBF94',
            background: '#FBF7EA',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase' }}>
            {node.workSurface?.kind ? node.workSurface.kind.replace(/_/g, ' ') : 'Work draft'}
          </div>
          <LongFormEditor
            value={value}
            onChange={(v) => setFreeTextResponse(node.id, v)}
            placeholder={node.placeholder}
            maxWords={node.maxWords}
            minRows={8}
          />
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            {node.minWords ? `Min ${node.minWords} words. ` : ''}
            {node.maxWords ? `Max ${node.maxWords} words. ` : ''}
            Currently {wordCount} word{wordCount === 1 ? '' : 's'}.
          </div>
        </div>
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

  const ctx = { playerName, branchFlags, mcSelections }
  const activeSourceTab = appTabs.find((tab) => tab.id === activeAppTab)
  const tabbedWindowContent = activeAppTab === 'editor'
    ? editorContent
    : activeSourceTab
      ? renderSourceTab(activeSourceTab, ctx, node.id)
      : null

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={hasWorkSurfaceVisual(node)}>
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
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
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
          {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
        </div>

        <WorkSurfaceFrame
          node={node}
          variant={activeWindowVariant}
          title={node.workSurface?.title || node.windowTitle}
          titleTabs={titleTabs}
          activeTitleTabId={activeAppTab}
          onTitleTabChange={setActiveAppTab}
          desktopZoom={desktopZoom}
          desktopLaptopOffsetX={desktopLaptopOffsetX}
        >
          {appTabs.length > 0 ? tabbedWindowContent : editorContent}
        </WorkSurfaceFrame>
        {node.id === 'slide_draft' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem' }}>
            {import.meta.env.DEV && (
              <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
            )}
            <ActionButton text="Submit" onClick={() => goNext(node)} variant="primary" fullWidth={false} />
          </div>
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
