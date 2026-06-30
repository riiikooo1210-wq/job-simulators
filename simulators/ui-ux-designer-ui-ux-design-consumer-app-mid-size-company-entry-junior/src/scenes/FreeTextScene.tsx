import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import LongFormEditor from '../components/ui/LongFormEditor'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import WellNestExistingAppMock, { wellNestTaskHint, wellNestWorkspaceMaxHeight } from '../components/ui/WellNestExistingAppMock'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { FreeTextNode } from '../types/game'

interface Props { node: FreeTextNode }
type NoteSection = NonNullable<FreeTextNode['noteSections']>[number]

const wellNestScreenBounds = { left: '12.5%', top: '8%', width: '75%', height: '76%' }

function parseSectionedResponse(value: string, sections: NoteSection[]): Record<string, string> {
  const parsed = Object.fromEntries(sections.map((section) => [section.key, ''])) as Record<string, string>
  if (!value) return parsed

  const matches = sections
    .map((section) => {
      const marker = `${section.label}\n`
      const start = value.indexOf(marker)
      return start >= 0 ? { section, start, contentStart: start + marker.length } : null
    })
    .filter((match): match is { section: NoteSection; start: number; contentStart: number } => Boolean(match))
    .sort((a, b) => a.start - b.start)

  if (!matches.length) {
    parsed[sections[0].key] = value
    return parsed
  }

  matches.forEach((match, index) => {
    const nextStart = matches[index + 1]?.start ?? value.length
    let content = value.slice(match.contentStart, nextStart)
    if (matches[index + 1] && content.endsWith('\n\n')) {
      content = content.slice(0, -2)
    }
    parsed[match.section.key] = content
  })

  return parsed
}

function serializeSectionedResponse(sections: NoteSection[], values: Record<string, string>): string {
  return sections
    .map((section) => {
      const body = values[section.key] || ''
      return body ? `${section.label}\n${body}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function countNonEmptyLines(text: string): number {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean).length
}

function DocsNoteTextArea({
  value,
  onChange,
  placeholder,
  minRows = 6,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minRows?: number
}) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={minRows}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        border: '1px solid #DADCE0',
        background: '#FFFFFF',
        borderRadius: 6,
        padding: '0.72rem 0.82rem',
        fontSize: '0.82rem',
        lineHeight: 1.65,
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#202124',
        resize: 'vertical',
        outlineColor: '#1A73E8',
        minHeight: minRows * 28,
      }}
    />
  )
}

function DocsInspiredEditor({
  title,
  children,
  status,
  actions,
}: {
  title?: string
  children: ReactNode
  status: ReactNode
  actions: ReactNode
}) {
  return (
    <section
      data-ui-surface="docs-inspired-editor"
      aria-label="Design notes editor"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#F8F9FA',
        border: '1px solid #DADCE0',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 18px 38px rgba(60, 64, 67, 0.22)',
        color: '#202124',
      }}
    >
      <div style={{ flexShrink: 0, background: '#FFFFFF', borderBottom: '1px solid #E8EAED' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0, padding: '0.55rem 0.8rem 0.35rem' }}>
          <div style={{ width: 24, height: 30, borderRadius: 4, background: '#1A73E8', color: '#FFFFFF', display: 'grid', placeItems: 'center', fontSize: '0.7rem', fontWeight: 900, flexShrink: 0 }}>
            D
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title || 'Early Design Notes'}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: 3, fontSize: '0.62rem', color: '#5F6368' }}>
              {['File', 'Edit', 'View', 'Insert', 'Format', 'Tools'].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '0.62rem', color: '#188038', fontWeight: 700, whiteSpace: 'nowrap' }}>Saved</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderTop: '1px solid #F1F3F4', padding: '0.34rem 0.8rem', overflowX: 'auto' }}>
          {['Undo', 'Redo', '100%', 'Normal text', 'B', 'I', 'Link', 'Comment'].map((item) => (
            <span
              key={item}
              style={{
                border: item === '100%' || item === 'Normal text' ? '1px solid #DADCE0' : '1px solid transparent',
                borderRadius: 4,
                padding: item.length <= 2 ? '0.16rem 0.32rem' : '0.16rem 0.48rem',
                fontSize: '0.62rem',
                color: '#3C4043',
                background: '#FFFFFF',
                whiteSpace: 'nowrap',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem 1.1rem', background: '#F1F3F4' }}>
        <div
          style={{
            width: '100%',
            minHeight: '100%',
            background: '#FFFFFF',
            border: '1px solid #E0E0E0',
            borderRadius: 3,
            boxShadow: '0 1px 3px rgba(60, 64, 67, 0.18)',
            padding: '1rem 1.05rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.95rem',
          }}
        >
          {children}
        </div>
      </div>
      <div style={{ flexShrink: 0, borderTop: '1px solid #E8EAED', background: '#FFFFFF', padding: '0.55rem 0.75rem', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: '0.75rem' }}>
        {status}
        {actions}
      </div>
    </section>
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
  const [wellNestHint, setWellNestHint] = useState('')

  const value = responses[node.id] || ''
  const noteSections = node.noteSections || []
  const sectionValues = noteSections.length ? parseSectionedResponse(value, noteSections) : {}
  const responseText = noteSections.length ? noteSections.map((section) => sectionValues[section.key]).join(' ') : value
  const wordCount = countWords(responseText)
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const sectionStatuses = noteSections.map((section) => {
    const text = sectionValues[section.key] || ''
    const trimmed = text.trim()
    const minChars = section.minChars ?? 1
    const minNonEmptyLines = section.minNonEmptyLines ?? 1
    const charReady = trimmed.length >= minChars
    const lineReady = countNonEmptyLines(text) >= minNonEmptyLines
    return {
      key: section.key,
      label: section.label,
      ready: charReady && lineReady,
      missing:
        !trimmed
          ? `Add notes for ${section.label}.`
          : !lineReady
            ? `Add ${minNonEmptyLines} filled line${minNonEmptyLines === 1 ? '' : 's'} for ${section.label}.`
            : `Add a little more detail for ${section.label}.`,
    }
  })
  const missingSectionMessages = sectionStatuses.filter((status) => !status.ready).map((status) => status.missing)
  const sectionsReady = !noteSections.length || missingSectionMessages.length === 0
  const canSubmit = meetsMin && underMax && sectionsReady

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const renderedPrompt = node.prompt ? interpolate(node.prompt, { playerName, branchFlags, mcSelections }) : ''
  const useDocsInspiredEditor = Boolean(node.wellNestAppMock)

  const updateNoteSection = (sectionKey: string, nextValue: string) => {
    const nextValues = { ...sectionValues, [sectionKey]: nextValue }
    setFreeTextResponse(node.id, serializeSectionedResponse(noteSections, nextValues))
  }

  const noteInputContent = (
    <>
      {noteSections.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {noteSections.map((section) => (
            <section
              key={section.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: useDocsInspiredEditor ? '0.9rem' : '0.84rem', lineHeight: 1.55, fontWeight: 700, color: useDocsInspiredEditor ? '#202124' : '#1E1E1A' }}>
                {section.guidance}
              </div>
              {section.exampleAnswer && (
                <div
                  style={{
                    border: '1px solid #DADCE0',
                    background: '#F8F9FA',
                    borderRadius: 6,
                    padding: '0.55rem 0.65rem',
                    fontSize: '0.76rem',
                    lineHeight: 1.45,
                    color: '#3C4043',
                  }}
                >
                  {section.exampleAnswer}
                </div>
              )}
              {useDocsInspiredEditor ? (
                <DocsNoteTextArea
                  value={sectionValues[section.key] || ''}
                  onChange={(v) => updateNoteSection(section.key, v)}
                  placeholder={section.placeholder}
                  minRows={section.minRows ?? 5}
                />
              ) : (
                <LongFormEditor
                  value={sectionValues[section.key] || ''}
                  onChange={(v) => updateNoteSection(section.key, v)}
                  placeholder={section.placeholder}
                  minRows={section.minRows ?? 5}
                />
              )}
            </section>
          ))}
        </div>
      ) : (
        <LongFormEditor
          value={value}
          onChange={(v) => setFreeTextResponse(node.id, v)}
          placeholder={node.placeholder}
          maxWords={node.maxWords}
          minRows={6}
        />
      )}
    </>
  )

  const statusLine = (
    <div
      aria-live="polite"
      style={{
        fontSize: '0.75rem',
        lineHeight: 1.45,
        color: !canSubmit && missingSectionMessages.length ? '#7B3D32' : useDocsInspiredEditor ? '#5F6368' : appWindow ? '#888' : '#666',
        padding: useDocsInspiredEditor ? 0 : appWindow ? '0.5rem 1rem' : '0',
      }}
    >
      {missingSectionMessages.length ? (
        missingSectionMessages[0]
      ) : (
        <>
          {noteSections.length ? `${sectionStatuses.length}/${sectionStatuses.length} sections ready. ` : ''}
          {node.minWords ? `Min ${node.minWords} words. ` : ''}
          {node.maxWords ? `Max ${node.maxWords} words. ` : ''}
          Currently {wordCount} word{wordCount === 1 ? '' : 's'}.
        </>
      )}
    </div>
  )

  const submitActions = (
    <div style={{ padding: useDocsInspiredEditor ? 0 : appWindow ? '0 1rem 1rem' : '0', display: 'flex', flexDirection: useDocsInspiredEditor ? 'row' : 'column', justifyContent: 'flex-end', gap: '0.5rem' }}>
      <ActionButton
        text="Submit"
        onClick={() => goNext(node)}
        disabled={!canSubmit}
        variant={canSubmit ? 'primary' : 'secondary'}
        fullWidth={!useDocsInspiredEditor}
      />
      {import.meta.env.DEV && (
        <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
      )}
    </div>
  )

  const editorContent = useDocsInspiredEditor ? (
    <DocsInspiredEditor title={node.windowTitle} status={statusLine} actions={submitActions}>
      {noteInputContent}
    </DocsInspiredEditor>
  ) : (
    <>
      {noteInputContent}
      {statusLine}
      {submitActions}
    </>
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
        {renderedPrompt.trim() && (
          <div
            style={{
              backgroundColor: '#F7F1E3',
              border: '1px solid #000',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {renderedPrompt}
          </div>
        )}

        {node.wellNestAppMock && (
          <div
            style={{
              border: '1px solid #000',
              background: '#F7F1E3',
              boxShadow: '2px 2px 0 #000',
              padding: '0.7rem 0.85rem',
              display: 'grid',
              gap: '0.25rem',
              fontSize: '0.78rem',
              lineHeight: 1.45,
              color: '#4B4538',
            }}
          >
            <div style={{ color: '#3A6B5E', fontWeight: 900 }}>
              {wellNestTaskHint}
            </div>
            {wellNestHint && (
              <div aria-live="polite" style={{ borderTop: '1px solid #CDBF94', marginTop: '0.25rem', paddingTop: '0.35rem' }}>
                {wellNestHint}
              </div>
            )}
          </div>
        )}

        {appWindow ? (
          node.wellNestAppMock ? (
            <DesktopOverlay contentBounds={wellNestScreenBounds}>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.85rem', width: '100%', height: '100%', maxHeight: wellNestWorkspaceMaxHeight, minWidth: 0, margin: 'auto 0' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  {editorContent}
                </div>
                <WellNestExistingAppMock onHintChange={setWellNestHint} />
              </div>
            </DesktopOverlay>
          ) : (
            <DesktopOverlay>
              <LaptopFrame variant={appWindow} title={node.windowTitle} fill scrollable>
                {editorContent}
              </LaptopFrame>
            </DesktopOverlay>
          )
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
