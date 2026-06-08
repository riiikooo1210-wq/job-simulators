import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame, {
  hasWorkSurfaceVisual,
  mergeWorkSurfaceTabs,
  resolveWorkSurfaceVariant,
} from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import EmailCompose from '../components/ui/EmailCompose'
import SlackCompose from '../components/ui/SlackCompose'
import LongFormEditor from '../components/ui/LongFormEditor'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { FreeTextNode } from '../types/game'

interface Props { node: FreeTextNode }

type FreeTextContext = {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
  freeTextResponses?: Record<string, string>
}

function parseDelimitedTable(content: string) {
  const lines = content.split('\n')
  const start = lines.findIndex((line) => line.includes('|'))
  if (start < 0) return null

  let end = start
  while (end < lines.length && lines[end].includes('|')) end += 1

  const rows = lines
    .slice(start, end)
    .map((line) => line.split('|').map((cell) => cell.trim()))
  const columnCount = rows[0]?.length || 0
  if (rows.length < 2 || columnCount < 2 || rows.some((row) => row.length !== columnCount)) {
    return null
  }

  return {
    before: lines.slice(0, start).join('\n').trim(),
    rows,
    after: lines.slice(end).join('\n').trim(),
  }
}

function renderSourceText(content: string) {
  const blocks: ReactNode[] = []
  let paragraph: string[] = []
  let bullets: string[] = []

  const flushParagraph = () => {
    const text = paragraph.join('\n').trim()
    if (text) {
      blocks.push(
        <div key={`p-${blocks.length}`} style={{ whiteSpace: 'pre-wrap' }}>
          {renderContentWithGlossary(text)}
        </div>
      )
    }
    paragraph = []
  }

  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul
          key={`ul-${blocks.length}`}
          style={{
            margin: '0.1rem 0 0.65rem 1.15rem',
            paddingLeft: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            listStyle: 'none',
          }}
        >
          {bullets.map((item, idx) => (
            <li
              key={`${item}-${idx}`}
              style={{ display: 'grid', gridTemplateColumns: '0.85rem 1fr', columnGap: '0.35rem', alignItems: 'start' }}
            >
              <span aria-hidden="true" style={{ color: '#3A6B5E', fontWeight: 800 }}>-</span>
              <span>{renderContentWithGlossary(item)}</span>
            </li>
          ))}
        </ul>
      )
    }
    bullets = []
  }

  content.split('\n').forEach((line) => {
    const bullet = line.match(/^\s*[-*]\s+(.+)$/)
    if (bullet) {
      flushParagraph()
      bullets.push(bullet[1])
      return
    }

    if (!line.trim()) {
      flushParagraph()
      flushBullets()
      return
    }

    flushBullets()
    paragraph.push(line)
  })

  flushParagraph()
  flushBullets()

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>{blocks}</div>
}

function SourceTabContent({ content, ctx }: { content: string; ctx: FreeTextContext }) {
  const resolved = interpolate(content, ctx)
  const table = parseDelimitedTable(resolved)

  if (!table) {
    return renderSourceText(resolved)
  }

  const [head, ...body] = table.rows

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {table.before && (
        renderSourceText(table.before)
      )}
      <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 620 }}>
          <thead>
            <tr>
              {head.map((cell) => (
                <th
                  key={cell}
                  style={{
                    textAlign: 'left',
                    padding: '0.55rem 0.65rem',
                    borderBottom: '1px solid #CDBF94',
                    background: '#EFE8D2',
                    color: '#3A6B5E',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                  }}
                >
                  {renderContentWithGlossary(cell)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={`${row.join('-')}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    style={{
                      padding: '0.55rem 0.65rem',
                      borderTop: rowIndex ? '1px solid #E4D8B9' : 0,
                      color: cell.toLowerCase() === 'critical' ? '#8F2D24' : cell.toLowerCase() === 'warning' ? '#7A5A00' : '#1E1E1A',
                      fontWeight: cellIndex === 0 || ['critical', 'warning'].includes(cell.toLowerCase()) ? 800 : 500,
                      lineHeight: 1.45,
                    }}
                  >
                    {renderContentWithGlossary(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {table.after && (
        renderSourceText(table.after)
      )}
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
  const [activeAppTab, setActiveAppTab] = useState('editor')

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = resolveWorkSurfaceVariant(node, 'notion') as LaptopFrameVariant
  const isEmailCompose = appWindow === 'email'
  const isSlackCompose = appWindow === 'slack'
  const appTabs = mergeWorkSurfaceTabs(node, node.appTabs || [])
  const titleTabs = appTabs.length > 0
    ? [{ id: 'editor', label: isSlackCompose ? 'Slack' : node.workSurface?.title || node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
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
  ) : isSlackCompose ? (
    <SlackCompose
      channel={node.windowTitle || node.workSurface?.title || node.title}
      value={value}
      onChange={(v) => setFreeTextResponse(node.id, v)}
      placeholder={node.placeholder}
      sections={node.slackPromptSections}
      minWords={node.minWords}
      maxWords={node.maxWords}
      onSend={() => goNext(node)}
      sendDisabled={!canSubmit}
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

  const tabbedWindowContent = activeAppTab === 'editor' ? (
    editorContent
  ) : (
    appTabs.map((tab) => (
      activeAppTab === tab.id && (
        <div
          key={tab.id}
          style={{
            background: '#F7F1E3',
            border: '1px solid #CDBF94',
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: '#1E1E1A',
            minHeight: '100%',
          }}
        >
          <SourceTabContent content={tab.content} ctx={{ playerName, branchFlags, mcSelections, freeTextResponses: responses }} />
        </div>
      )
    ))
  )

  const sceneIllustration = node.contextIllustration || node.illustration

  return (
    <SceneWrapper
      illustration={sceneIllustration}
      showBack
      backLabel="Back"
      hideIllustration={hasWorkSurfaceVisual(node) && !sceneIllustration}
    >
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
          variant={appWindow}
          title={node.workSurface?.title || node.windowTitle}
          titleTabs={titleTabs}
          activeTitleTabId={activeAppTab}
          onTitleTabChange={setActiveAppTab}
        >
          {appTabs.length > 0 ? tabbedWindowContent : editorContent}
        </WorkSurfaceFrame>
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
