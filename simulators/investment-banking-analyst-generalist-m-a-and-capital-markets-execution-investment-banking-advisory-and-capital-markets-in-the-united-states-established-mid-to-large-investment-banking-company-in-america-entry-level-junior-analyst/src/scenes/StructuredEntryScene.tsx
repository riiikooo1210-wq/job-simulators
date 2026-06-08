import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevControls } from '../lib/devControls'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { StructuredEntryNode } from '../types/game'

interface Props { node: StructuredEntryNode }

type Item = Record<string, string>

type RenderContext = {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
}

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

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

function isTableSeparator(line: string): boolean {
  return splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell))
}

function renderSpreadsheetReference(content: string, ctx: RenderContext) {
  const lines = interpolate(content, ctx).split('\n')
  const rendered = []

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      rendered.push(<div key={`space-${i}`} style={{ height: '0.375rem' }} />)
      continue
    }

    if (trimmed.startsWith('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i])
        i += 1
      }
      i -= 1

      const rows = tableLines.filter((row) => !isTableSeparator(row)).map(splitTableRow)
      const [header, ...body] = rows
      rendered.push(
        <div key={`table-${i}`} style={{ overflowX: 'auto', border: '1px solid #D6D0BE', backgroundColor: '#FFFDF7' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: '#1d1c1d' }}>
            {header && (
              <thead>
                <tr>
                  {header.map((cell, idx) => (
                    <th
                      key={idx}
                      style={{
                        textAlign: 'left',
                        border: '1px solid #D6D0BE',
                        backgroundColor: '#EFE8D2',
                        padding: '0.375rem 0.5rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {renderContentWithGlossary(cell)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {body.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      style={{
                        border: '1px solid #D6D0BE',
                        padding: '0.375rem 0.5rem',
                        verticalAlign: 'top',
                        whiteSpace: cell.length < 32 ? 'nowrap' : 'normal',
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
      )
      continue
    }

    if (trimmed.startsWith('### ')) {
      rendered.push(
        <h3 key={i} style={{ fontSize: '0.875rem', fontWeight: 800, color: '#24483F', margin: '0.375rem 0 0.125rem' }}>
          {renderContentWithGlossary(trimmed.slice(4))}
        </h3>
      )
      continue
    }

    if (trimmed.startsWith('- ')) {
      rendered.push(
        <div key={i} style={{ display: 'flex', gap: '0.375rem', fontSize: '0.78rem', lineHeight: 1.55, color: '#333' }}>
          <span style={{ color: '#6B9EA6', fontWeight: 800 }}>-</span>
          <span>{renderContentWithGlossary(trimmed.slice(2))}</span>
        </div>
      )
      continue
    }

    rendered.push(
      <p key={i} style={{ fontSize: '0.78rem', lineHeight: 1.55, color: '#333', margin: 0 }}>
        {renderContentWithGlossary(trimmed)}
      </p>
    )
  }

  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '1rem' }}>{rendered}</div>
}

type RedlineComment = {
  slide: string
  owner: string
  role: string
  time: string
  priority: string
  tag: string
  comment: string
  dependency: string
  done: string
}

function parseRedlineComments(content: string): RedlineComment[] {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('COMMENT|'))
    .map((line) => {
      const [, slide, owner, role, time, priority, tag, comment, dependency, done] = line.split('|').map((part) => part.trim())
      return { slide, owner, role, time, priority, tag, comment, dependency, done }
    })
    .filter((comment) => comment.slide && comment.comment)
}

function priorityStyles(priority: string) {
  const normalized = priority.toLowerCase()
  if (normalized.includes('high')) return { bg: '#F2EBD9', border: '#B87D6B', ink: '#7E3F32' }
  if (normalized.includes('medium')) return { bg: '#EFE8D2', border: '#6B9EA6', ink: '#24483F' }
  return { bg: '#F7F1E3', border: '#CDBF94', ink: '#444' }
}

function renderRedlineComments(content: string, ctx: RenderContext) {
  const comments = parseRedlineComments(interpolate(content, ctx))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', backgroundColor: '#FFFDF7' }}>
      <div
        style={{
          border: '1px solid #D6D0BE',
          backgroundColor: '#F7F1E3',
          padding: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#24483F' }}>
            HarborThread_Management_Presentation_v24.pptx
          </div>
          <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.2rem' }}>
            {comments.length} comments on management presentation · open items for tonight's turn
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {['Client-visible first', 'Model-linked', 'Needs review'].map((label) => (
            <span
              key={label}
              style={{
                border: '1px solid #CDBF94',
                backgroundColor: '#FFFDF7',
                color: '#24483F',
                borderRadius: '999px',
                padding: '0.22rem 0.45rem',
                fontSize: '0.65rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.625rem' }}>
        {comments.map((item, idx) => {
          const styles = priorityStyles(item.priority)
          const initials = item.owner.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()

          return (
            <div
              key={`${item.slide}-${idx}`}
              style={{
                border: '1px solid #D6D0BE',
                backgroundColor: '#FFFDF7',
                display: 'grid',
                gridTemplateColumns: '5.25rem minmax(0, 1fr)',
                minHeight: '7rem',
              }}
            >
              <div
                style={{
                  borderRight: '1px solid #D6D0BE',
                  backgroundColor: '#EFE8D2',
                  padding: '0.625rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div style={{ fontSize: '0.64rem', fontWeight: 800, color: '#24483F', lineHeight: 1.25 }}>
                  {item.slide}
                </div>
                <div
                  style={{
                    height: '3rem',
                    border: '1px solid #CDBF94',
                    backgroundColor: '#FFFDF7',
                    display: 'grid',
                    gridTemplateRows: '1fr 1fr 1fr',
                    gap: '2px',
                    padding: '0.25rem',
                  }}
                >
                  <span style={{ backgroundColor: '#D6D0BE' }} />
                  <span style={{ backgroundColor: '#F2EBD9' }} />
                  <span style={{ backgroundColor: '#CDBF94' }} />
                </div>
              </div>
              <div style={{ padding: '0.7rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        backgroundColor: '#B87D6B',
                        color: '#F7F1E3',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#1d1c1d' }}>{item.owner}</div>
                      <div style={{ fontSize: '0.64rem', color: '#666' }}>{item.role} · {item.time}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span
                      style={{
                        backgroundColor: styles.bg,
                        border: `1px solid ${styles.border}`,
                        color: styles.ink,
                        padding: '0.2rem 0.4rem',
                        borderRadius: '999px',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.priority}
                    </span>
                    <span style={{ color: '#555', fontSize: '0.62rem', fontWeight: 700, paddingTop: '0.25rem' }}>
                      {item.tag}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    borderLeft: '3px solid #B87D6B',
                    paddingLeft: '0.625rem',
                    fontSize: '0.78rem',
                    lineHeight: 1.45,
                    color: '#252525',
                  }}
                >
                  {renderContentWithGlossary(item.comment)}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div style={{ backgroundColor: '#F7F1E3', border: '1px solid #D6D0BE', padding: '0.45rem' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#24483F', marginBottom: '0.2rem' }}>DEPENDENCY</div>
                    <div style={{ fontSize: '0.68rem', lineHeight: 1.4, color: '#333' }}>{renderContentWithGlossary(item.dependency)}</div>
                  </div>
                  <div style={{ backgroundColor: '#F7F1E3', border: '1px solid #D6D0BE', padding: '0.45rem' }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#24483F', marginBottom: '0.2rem' }}>DONE CHECK</div>
                    <div style={{ fontSize: '0.68rem', lineHeight: 1.4, color: '#333' }}>{renderContentWithGlossary(item.done)}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function StructuredEntryScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)

  const def = node.definition
  const appTabs = node.appTabs ?? []
  const auditTabId = 'audit_log'
  const [activeTabId, setActiveTabId] = useState(appTabs[0]?.id ?? auditTabId)
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
  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const activeReferenceTab = appTabs.find((tab) => tab.id === activeTabId)
  const workTabLabel = node.id === 'turn_plan' ? 'Turn Plan' : 'Audit Log'

  const formContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: appWindow ? '1rem' : '0' }}>
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
      {showDevControls && (
        <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
      )}
    </div>
  )

  const renderSheetTab = (tabId: string, label: string) => {
    const active = activeTabId === tabId

    return (
      <button
        key={tabId}
        onClick={() => setActiveTabId(tabId)}
        style={{
          border: '1px solid #BFB69F',
          borderTop: active ? '2px solid #0F9D58' : '1px solid #BFB69F',
          borderBottom: active ? '1px solid #FFFDF7' : '1px solid #BFB69F',
          backgroundColor: active ? '#FFFDF7' : '#EFE8D2',
          color: '#1d1c1d',
          padding: active ? '0.35rem 0.875rem 0.45rem' : '0.4rem 0.875rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.75rem',
          fontWeight: active ? 700 : 500,
          cursor: 'pointer',
          borderRadius: '3px 3px 0 0',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
    )
  }

  const tabbedContent = appTabs.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, backgroundColor: '#FFFDF7' }}>
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          backgroundColor: '#FFFDF7',
        }}
      >
        {activeReferenceTab ? (
          node.id === 'turn_plan' && activeReferenceTab.id === 'redline_comments'
            ? renderRedlineComments(activeReferenceTab.content, { playerName, branchFlags, mcSelections })
            : renderSpreadsheetReference(activeReferenceTab.content, { playerName, branchFlags, mcSelections })
        ) : (
          formContent
        )}
      </div>
      <div
        style={{
          display: 'flex',
          gap: '0.25rem',
          padding: '0.375rem 0.75rem 0',
          backgroundColor: '#F7F1E3',
          borderTop: '1px solid #D6D0BE',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.04)',
          flexShrink: 0,
          overflowX: 'auto',
        }}
      >
        {appTabs.map((tab) => renderSheetTab(tab.id, tab.label))}
        {renderSheetTab(auditTabId, workTabLabel)}
      </div>
    </div>
  ) : (
    formContent
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
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
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
          {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
        </div>

        {appWindow ? (
          <DesktopOverlay>
            <LaptopFrame
              variant={appWindow}
              title={node.windowTitle}
              fill
              scrollable={appTabs.length === 0}
              contentPadding={appTabs.length > 0 ? '0' : undefined}
            >
              {tabbedContent}
            </LaptopFrame>
          </DesktopOverlay>
        ) : (
          formContent
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
