import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { useNarrowViewport } from '../components/hooks/useNarrowViewport'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { StructuredEntryNode } from '../types/game'

interface Props { node: StructuredEntryNode }

type Item = Record<string, string>
export type StructuredEntryAppTab = NonNullable<StructuredEntryNode['appTabs']>[number]
type AppTab = StructuredEntryAppTab
type AppCard = NonNullable<AppTab['cards']>[number]
export type StructuredEntryContext = {
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

function StandardCard({ card, ctx }: { card: AppCard; ctx: StructuredEntryContext }) {
  return (
    <div
      style={{
        border: '1px solid #CDBF94',
        background: '#FBF7EA',
        borderRadius: 6,
        padding: '0.75rem 0.85rem',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.12)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '0.82rem', color: '#1E1E1A' }}>{card.title}</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {card.ref && <span style={{ fontSize: '0.68rem', color: '#6A604B', fontWeight: 800 }}>{card.ref}</span>}
          {card.status && (
            <span style={{ border: '1px solid #B87D6B', borderRadius: 4, padding: '0.1rem 0.35rem', fontSize: '0.62rem', color: '#8B5E50', fontWeight: 900 }}>
              {card.status}
            </span>
          )}
        </div>
      </div>
      <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', lineHeight: 1.5, color: '#333' }}>
        {renderContentWithGlossary(interpolate(card.body, ctx))}
      </div>
    </div>
  )
}

export function renderStructuredEntryAppTab(tab: AppTab, ctx: StructuredEntryContext) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        padding: '1rem',
        minHeight: '100%',
        background: '#F7F1E3',
      }}
    >
      {tab.content && (
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
          {tab.heading && (
            <div style={{ fontWeight: 900, marginBottom: '0.35rem' }}>
              {renderContentWithGlossary(interpolate(tab.heading, ctx))}
            </div>
          )}
          {renderContentWithGlossary(interpolate(tab.content, ctx))}
        </div>
      )}
      {tab.cards && tab.cards.length > 0 && (
        <div style={{ display: 'grid', gap: '0.65rem' }}>
          {tab.cards.map((card) => (
            <StandardCard key={`${card.ref || 'card'}-${card.title}`} card={card} ctx={ctx} />
          ))}
        </div>
      )}
      {tab.imagePath && (
        <div
          style={{
            border: '1px solid #000',
            background: '#EFE8D2',
            padding: '0.5rem',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.22)',
          }}
        >
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
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const appTabs = node.appTabs || []
  const [activeAppTab, setActiveAppTab] = useState(() => node.defaultAppTabId || (appTabs[0]?.id ?? 'editor'))
  const isNarrow = useNarrowViewport()

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
  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const titleTabs = appTabs.length > 0
    ? [...appTabs.map((tab) => ({ id: tab.id, label: tab.label })), { id: 'editor', label: node.editorTabLabel || def.itemLabel || node.title }]
    : undefined
  const activeSourceTab = appTabs.find((tab) => tab.id === activeAppTab)
  const singleLockedItem = items.length === 1 && def.minItems === 1 && def.maxItems === 1

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
          {!singleLockedItem && (
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
          )}
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
                    lineHeight: 1.55,
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
          <StructuredEntryToolShell isNarrow={isNarrow}>
            <LaptopFrame
              variant={appWindow}
              title={node.windowTitle}
              fill={!isNarrow}
              scrollable
              titleTabs={titleTabs}
              activeTitleTabId={activeAppTab}
              onTitleTabChange={setActiveAppTab}
            >
              {activeSourceTab
                ? renderStructuredEntryAppTab(activeSourceTab, { playerName, branchFlags, mcSelections })
                : formContent}
            </LaptopFrame>
          </StructuredEntryToolShell>
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

function StructuredEntryToolShell({ isNarrow, children }: { isNarrow: boolean; children: ReactNode }) {
  if (isNarrow) {
    return (
      <div style={{ width: '100%', minHeight: 560 }}>
        {children}
      </div>
    )
  }

  return (
    <DesktopOverlay>
      {children}
    </DesktopOverlay>
  )
}
