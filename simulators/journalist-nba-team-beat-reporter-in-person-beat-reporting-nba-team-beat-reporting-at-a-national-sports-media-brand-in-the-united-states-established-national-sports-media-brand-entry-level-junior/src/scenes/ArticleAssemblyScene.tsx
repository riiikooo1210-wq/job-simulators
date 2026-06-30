import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import LaptopFrame from '../components/ui/LaptopFrame'
import ActionButton from '../components/ui/ActionButton'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { ArticleAssemblyChoice, ArticleAssemblyNode, ArticleAssemblySection } from '../types/game'

type CmsSourceTabId = 'results' | 'notes' | 'rules'
type AppTab = NonNullable<ArticleAssemblyNode['appTabs']>[number]

const cmsSourceTabs: { id: CmsSourceTabId; label: string }[] = [
  { id: 'results', label: 'Results' },
  { id: 'notes', label: 'Player Notes' },
  { id: 'rules', label: 'Safe Rules' },
]

interface AssemblyState {
  headline: string
  selectedChoiceIds: Record<string, string>
}

interface DragPreviewState {
  choiceId: string
  x: number
  y: number
}

interface DragPoint {
  x: number
  y: number
}

const emptyAssembly: AssemblyState = {
  headline: '',
  selectedChoiceIds: {},
}

function parseAssembly(raw: string | undefined): AssemblyState {
  if (!raw) return emptyAssembly
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return emptyAssembly
    const record = parsed as Partial<AssemblyState>
    const selectedChoiceIds = record.selectedChoiceIds
      && typeof record.selectedChoiceIds === 'object'
      && !Array.isArray(record.selectedChoiceIds)
      ? Object.fromEntries(
        Object.entries(record.selectedChoiceIds).filter((entry): entry is [string, string] => (
          typeof entry[0] === 'string' && typeof entry[1] === 'string'
        )),
      )
      : {}

    return {
      headline: typeof record.headline === 'string' ? record.headline : '',
      selectedChoiceIds,
    }
  } catch {
    return emptyAssembly
  }
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function readTextField(item: Record<string, unknown>, key: string) {
  const value = item[key]
  return typeof value === 'string' ? value.trim() : ''
}

function formatPhysicalMemo(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object') return ''
  const observations = (parsed as { observations?: unknown }).observations
  if (!observations || typeof observations !== 'object' || Array.isArray(observations)) return ''
  const notes = (observations as Record<string, unknown>).__running_reporter_notes
  return typeof notes === 'string' ? notes.trim() : ''
}

function formatPossessionTimelineArticleNotes(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object') return ''
  const record = parsed as { viewedEventIds?: unknown; notes?: unknown }
  const notes = record.notes && typeof record.notes === 'object' && !Array.isArray(record.notes)
    ? record.notes as Record<string, unknown>
    : {}
  const preferredOrder = Array.isArray(record.viewedEventIds)
    ? record.viewedEventIds.filter((id): id is string => typeof id === 'string')
    : []
  const orderedIds = [...preferredOrder, ...Object.keys(notes).filter((id) => !preferredOrder.includes(id))]
  const usableLines = orderedIds
    .map((id) => {
      if (id === 'final_score_board') return ''
      const note = notes[id]
      if (!note || typeof note !== 'object' || Array.isArray(note)) return ''
      const noteRecord = note as Record<string, unknown>
      const categoryId = readTextField(noteRecord, 'categoryId')
      if (categoryId !== 'confirmed_fact' && categoryId !== 'scene_color') return ''
      const text = readTextField(noteRecord, 'note')
      return text ? `${humanizeKey(id)}: ${text}` : ''
    })
    .filter(Boolean)
  return [
    usableLines.length ? `Verified facts and usable observations:\n${usableLines.join('\n')}` : '',
    'Caution: Leave out rumors and any medical claim stronger than your named sources support.',
  ].filter(Boolean).join('\n\n')
}

function formatStoredResponse(raw: string, key: string, responseFormat?: AppTab['responseFormat']) {
  if (!raw.trim()) return ''
  try {
    const parsed = JSON.parse(raw)
    if (responseFormat === 'physicalMemo' || key === 'warmup_observation') {
      return formatPhysicalMemo(parsed)
    }
    if (responseFormat === 'possessionTimelineArticleNotes') {
      return formatPossessionTimelineArticleNotes(parsed)
    }
  } catch {
    if (responseFormat === 'possessionTimelineArticleNotes') return ''
  }
  return raw.trim()
}

function choiceIsCorrect(choice: ArticleAssemblyChoice) {
  return typeof choice.isCorrect === 'boolean' ? choice.isCorrect : choice.quality === 'strong'
}

function buildArticleText(args: {
  headline: string
  articleSections: ArticleAssemblySection[]
  selectedChoiceIds: Record<string, string>
}) {
  const paragraphs = args.articleSections
    .map((section) => section.choices.find((choice) => choice.id === args.selectedChoiceIds[section.id])?.text.trim())
    .filter((text): text is string => Boolean(text))
  const headline = args.headline.trim()
  return [headline ? `Headline: ${headline}` : '', ...paragraphs].filter(Boolean).join('\n\n')
}

function buildMetadata(args: {
  state: AssemblyState
  articleSections: ArticleAssemblySection[]
}) {
  const sectionSummaries = args.articleSections.map((section, index) => {
    const selected = section.choices.find((choice) => choice.id === args.state.selectedChoiceIds[section.id])
    const unselectedChoices = section.choices
      .filter((choice) => choice.id !== selected?.id)
      .map((choice) => ({
        id: choice.id,
        label: choice.label,
        quality: choice.quality,
        isCorrect: choiceIsCorrect(choice),
      }))

    return {
      sectionId: section.id,
      sectionLabel: section.label,
      sectionOrder: index + 1,
      selectedChoiceId: selected?.id || null,
      selectedLabel: selected?.label || null,
      selectedQuality: selected?.quality || null,
      selectedIsCorrect: selected ? choiceIsCorrect(selected) : false,
      unselectedChoices,
    }
  })

  return JSON.stringify({
    headline: args.state.headline.trim(),
    selectedChoiceIds: args.state.selectedChoiceIds,
    sectionOrder: args.articleSections.map((section) => section.id),
    sections: sectionSummaries,
    selectedChoices: sectionSummaries
      .filter((section) => section.selectedChoiceId)
      .map((section) => ({
        sectionId: section.sectionId,
        choiceId: section.selectedChoiceId,
        quality: section.selectedQuality,
        isCorrect: section.selectedIsCorrect,
      })),
    unselectedChoices: sectionSummaries.flatMap((section) => (
      section.unselectedChoices.map((choice) => ({
        sectionId: section.sectionId,
        choiceId: choice.id,
        quality: choice.quality,
        isCorrect: choice.isCorrect,
      }))
    )),
    weakOrUnsafeSelections: sectionSummaries
      .filter((section) => section.selectedQuality === 'weak' || section.selectedQuality === 'unsafe')
      .map((section) => ({
        sectionId: section.sectionId,
        choiceId: section.selectedChoiceId,
        quality: section.selectedQuality,
      })),
    correctSectionCount: sectionSummaries.filter((section) => section.selectedIsCorrect).length,
    totalSections: args.articleSections.length,
  }, null, 2)
}

function SectionDropZone({
  section,
  activePointerChoiceId,
  getActivePointerChoiceId,
  onPointerChoiceEnd,
  onDropChoice,
  children,
}: {
  section: ArticleAssemblySection
  activePointerChoiceId: string | null
  getActivePointerChoiceId: () => string | null
  onPointerChoiceEnd: () => void
  onDropChoice: (sectionId: string, choiceId: string) => void
  children: ReactNode
}) {
  const [isOver, setIsOver] = useState(false)

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsOver(false)
    const payload = event.dataTransfer.getData('application/x-article-choice') || event.dataTransfer.getData('text/plain')
    if (!payload) return
    try {
      const parsed = JSON.parse(payload)
      if (parsed && typeof parsed.choiceId === 'string') {
        onDropChoice(section.id, parsed.choiceId)
        return
      }
    } catch {
      // Plain text fallback is used by some browsers and test tools.
    }
    onDropChoice(section.id, payload)
  }

  return (
    <div
      className={`article-section-slot${isOver ? ' article-section-slot--over' : ''}${activePointerChoiceId ? ' article-section-slot--armed' : ''}`}
      data-article-section-id={section.id}
      aria-label={`${section.label} selected paragraph slot`}
      onDragEnter={(event) => {
        event.preventDefault()
        setIsOver(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsOver(false)
      }}
      onDrop={handleDrop}
      onMouseUp={() => {
        const choiceId = getActivePointerChoiceId()
        if (choiceId) onDropChoice(section.id, choiceId)
        onPointerChoiceEnd()
      }}
      onPointerUp={() => {
        const choiceId = getActivePointerChoiceId()
        if (choiceId) onDropChoice(section.id, choiceId)
        onPointerChoiceEnd()
      }}
    >
      {children}
    </div>
  )
}

function ChoiceCard({
  choice,
  isMoving,
  onPointerChoiceStart,
  onChoose,
}: {
  choice: ArticleAssemblyChoice
  isMoving: boolean
  onPointerChoiceStart: (choiceId: string, point: DragPoint) => void
  onChoose: () => void
}) {
  return (
    <article
      className={`article-choice-card${isMoving ? ' article-choice-card--moving' : ''}`}
      onMouseDown={(event) => {
        event.preventDefault()
        onPointerChoiceStart(choice.id, { x: event.clientX, y: event.clientY })
      }}
      onPointerDown={(event) => {
        event.preventDefault()
        onPointerChoiceStart(choice.id, { x: event.clientX, y: event.clientY })
      }}
    >
      <div className="article-choice-card-header">
        <span>{choice.label}</span>
        <button
          type="button"
          className="article-choice-card-choose"
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation()
            onChoose()
          }}
        >
          Choose
        </button>
      </div>
      <p>{renderContentWithGlossary(choice.text)}</p>
    </article>
  )
}

function SelectedChoiceCard({
  choice,
  onReturn,
}: {
  choice: ArticleAssemblyChoice
  onReturn: () => void
}) {
  return (
    <article
      className="article-selected-card"
      role="button"
      tabIndex={0}
      aria-label="Return selected paragraph to choices"
      onClick={onReturn}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onReturn()
      }}
    >
      <p>{renderContentWithGlossary(choice.text)}</p>
    </article>
  )
}

function ArticleSectionBuilder({
  section,
  selectedChoiceId,
  activePointerChoiceId,
  getActivePointerChoiceId,
  onPointerChoiceStart,
  onPointerChoiceEnd,
  onSelect,
  onClear,
}: {
  section: ArticleAssemblySection
  selectedChoiceId?: string
  activePointerChoiceId: string | null
  getActivePointerChoiceId: () => string | null
  onPointerChoiceStart: (choiceId: string, point: DragPoint) => void
  onPointerChoiceEnd: () => void
  onSelect: (sectionId: string, choiceId: string) => void
  onClear: (sectionId: string) => void
}) {
  const selectedChoice = section.choices.find((choice) => choice.id === selectedChoiceId)
  const availableChoices = section.choices.filter((choice) => choice.id !== selectedChoice?.id)

  return (
    <section className="article-section-builder">
      <div className="article-section-heading">
        <div>
          <span>{section.label}</span>
          {section.instruction && <p>{renderContentWithGlossary(section.instruction)}</p>}
        </div>
        <strong>{selectedChoice ? '1/1 chosen' : 'Choose 1'}</strong>
      </div>

      <SectionDropZone
        section={section}
        activePointerChoiceId={activePointerChoiceId}
        getActivePointerChoiceId={getActivePointerChoiceId}
        onPointerChoiceEnd={onPointerChoiceEnd}
        onDropChoice={onSelect}
      >
        {selectedChoice ? (
          <SelectedChoiceCard choice={selectedChoice} onReturn={() => onClear(section.id)} />
        ) : (
          <div className="article-empty-state">
            Drag one paragraph here.
          </div>
        )}
      </SectionDropZone>

      <div className="article-choice-options" aria-label={`${section.label} paragraph choices`}>
        {availableChoices.map((choice) => (
          <ChoiceCard
            key={choice.id}
            choice={choice}
            isMoving={activePointerChoiceId === choice.id}
            onPointerChoiceStart={onPointerChoiceStart}
            onChoose={() => onSelect(section.id, choice.id)}
          />
        ))}
      </div>
    </section>
  )
}

function SourceTray({
  node,
  responses,
  activeTab,
  onTabChange,
}: {
  node: ArticleAssemblyNode
  responses: Record<string, string>
  activeTab: CmsSourceTabId
  onTabChange: (tab: CmsSourceTabId) => void
}) {
  const resultsTab = node.appTabs?.find((tab) => tab.id === 'results')
  const notesTab = node.appTabs?.find((tab) => tab.id === 'all_player_notes') || node.appTabs?.find((tab) => tab.responseSources?.length)

  return (
    <aside className="article-assembly-source-panel" aria-label="Deadline source tray">
      <div className="cms-panel-header">
        <div>
          <span className="cms-source-eyebrow">Source tray</span>
          <h2>Player Notes and Results</h2>
        </div>
      </div>
      <div className="cms-source-tabs" role="tablist" aria-label="Source tray sections">
        {cmsSourceTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'cms-source-tab cms-source-tab--active' : 'cms-source-tab'}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="article-assembly-source-content" role="tabpanel">
        {activeTab === 'results' && (
          <div className="cms-box-score">
            <div className="cms-source-card-header">
              <div>
                <div className="cms-source-kind">Official box score</div>
                <h3>Results desk</h3>
              </div>
              <span className="cms-source-state cms-source-state--saved">Verified</span>
            </div>
            <div className="cms-scoreboard">
              <div className="cms-score-row cms-score-row--winner">
                <span>Harbor City Cyclones</span>
                <strong>112</strong>
              </div>
              <div className="cms-score-row">
                <span>Denver Altitude</span>
                <strong>107</strong>
              </div>
            </div>
            <div className="cms-stat-card">
              <span>Malik Reed official line</span>
              <strong>{resultsTab?.content.match(/Malik Reed finished with\s+([^.]*)\./i)?.[1] || '24 points, 6 assists, and 2 steals'}</strong>
            </div>
          </div>
        )}
        {activeTab === 'notes' && (
          <div className="cms-source-card-list">
            {notesTab?.responseSources?.map((source) => {
              const formatted = formatStoredResponse(responses[source.key] || '', source.key, source.responseFormat)
              const isSaved = Boolean(formatted)
              return (
                <article
                  className={isSaved ? 'cms-source-card' : 'cms-source-card cms-source-card--missing'}
                  key={source.key}
                >
                  <div className="cms-source-card-header">
                    <div>
                      <div className="cms-source-kind">{source.sourceKind || 'Source note'}</div>
                      <h3>{source.title || humanizeKey(source.key)}</h3>
                    </div>
                    <span className={isSaved ? 'cms-source-state cms-source-state--saved' : 'cms-source-state'}>
                      {isSaved ? 'Saved' : 'Missing'}
                    </span>
                  </div>
                  {source.articleUses?.length && (
                    <p className="cms-source-use-summary">
                      <strong>Use for:</strong> {source.articleUses.join(', ')}
                    </p>
                  )}
                  <div className="cms-source-card-body">
                    {renderContentWithGlossary(formatted || `${source.emptyText || 'No note saved.'} Use only the sources that are shown.`)}
                  </div>
                  {source.caution && (
                    <details className="cms-source-care">
                      <summary>Use carefully</summary>
                      <p>{renderContentWithGlossary(source.caution)}</p>
                    </details>
                  )}
                </article>
              )
            }) || <div className="cms-source-empty">No Player Notes are configured for this draft.</div>}
          </div>
        )}
        {activeTab === 'rules' && (
          <div className="cms-publish-checks">
            <div>
              <div className="cms-source-eyebrow">Safe rules</div>
              <strong>Check these before you submit</strong>
            </div>
            <div className="cms-check-list">
              {(node.cmsRequirements || []).map((requirement) => (
                <div key={requirement.id} className="cms-check-row">
                  <span aria-hidden="true" />
                  <p>
                    <strong>{requirement.kind === 'avoid' ? 'Avoid: ' : 'Include: '}</strong>
                    {requirement.label} - {requirement.sourceHint}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

export default function ArticleAssemblyScene({ node }: { node: ArticleAssemblyNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const [activeSourceTab, setActiveSourceTab] = useState<CmsSourceTabId>('results')
  const activePointerChoiceRef = useRef<string | null>(null)
  const [activePointerChoiceId, setActivePointerChoiceId] = useState<string | null>(null)
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null)

  const metadataKey = node.metadataKey || `${node.id}_assembly`
  const assembly = useMemo(() => parseAssembly(responses[metadataKey]), [responses, metadataKey])
  const choiceToSection = useMemo(() => {
    const entries = node.articleSections.flatMap((section) => section.choices.map((choice) => [choice.id, section.id] as const))
    return new Map(entries)
  }, [node.articleSections])
  const choiceMap = useMemo(() => {
    const entries = node.articleSections.flatMap((section) => section.choices.map((choice) => [choice.id, choice] as const))
    return new Map(entries)
  }, [node.articleSections])
  const minHeadlineWords = node.minHeadlineWords || 4
  const headlineWords = wordCount(assembly.headline)
  const selectedSectionCount = node.articleSections.filter((section) => assembly.selectedChoiceIds[section.id]).length
  const totalSections = node.articleSections.length
  const canSubmit = selectedSectionCount === totalSections && headlineWords >= minHeadlineWords

  const startPointerChoice = useCallback((choiceId: string, point: DragPoint) => {
    activePointerChoiceRef.current = choiceId
    setActivePointerChoiceId(choiceId)
    setDragPreview({ choiceId, x: point.x, y: point.y })
  }, [])

  const getActivePointerChoiceId = useCallback(() => activePointerChoiceRef.current, [])

  const clearPointerChoice = useCallback(() => {
    activePointerChoiceRef.current = null
    setActivePointerChoiceId(null)
    setDragPreview(null)
  }, [])

  useEffect(() => {
    if (!activePointerChoiceId) return undefined
    const updateDragPreview = (event: MouseEvent | PointerEvent) => {
      setDragPreview((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current)
    }
    window.addEventListener('pointermove', updateDragPreview)
    window.addEventListener('mousemove', updateDragPreview)
    window.addEventListener('pointerup', clearPointerChoice)
    window.addEventListener('pointercancel', clearPointerChoice)
    window.addEventListener('mouseup', clearPointerChoice)
    return () => {
      window.removeEventListener('pointermove', updateDragPreview)
      window.removeEventListener('mousemove', updateDragPreview)
      window.removeEventListener('pointerup', clearPointerChoice)
      window.removeEventListener('pointercancel', clearPointerChoice)
      window.removeEventListener('mouseup', clearPointerChoice)
    }
  }, [activePointerChoiceId, clearPointerChoice])

  const persist = useCallback((nextState: AssemblyState) => {
    const cleanSelectedChoiceIds = Object.fromEntries(
      Object.entries(nextState.selectedChoiceIds).filter(([sectionId, choiceId]) => (
        node.articleSections.some((section) => (
          section.id === sectionId && section.choices.some((choice) => choice.id === choiceId)
        ))
      )),
    )
    const cleanState = {
      headline: nextState.headline,
      selectedChoiceIds: cleanSelectedChoiceIds,
    }

    setFreeTextResponse(node.id, buildArticleText({
      headline: cleanState.headline,
      articleSections: node.articleSections,
      selectedChoiceIds: cleanState.selectedChoiceIds,
    }))
    setFreeTextResponse(metadataKey, buildMetadata({
      state: cleanState,
      articleSections: node.articleSections,
    }))
  }, [metadataKey, node.articleSections, node.id, setFreeTextResponse])

  const selectChoice = useCallback((sectionId: string, choiceId: string) => {
    if (choiceToSection.get(choiceId) !== sectionId) return
    persist({
      ...assembly,
      selectedChoiceIds: {
        ...assembly.selectedChoiceIds,
        [sectionId]: choiceId,
      },
    })
  }, [assembly, choiceToSection, persist])

  const clearSection = useCallback((sectionId: string) => {
    const selectedChoiceIds = { ...assembly.selectedChoiceIds }
    delete selectedChoiceIds[sectionId]
    persist({ ...assembly, selectedChoiceIds })
  }, [assembly, persist])

  const articleText = buildArticleText({
    headline: assembly.headline,
    articleSections: node.articleSections,
    selectedChoiceIds: assembly.selectedChoiceIds,
  })
  const dragPreviewChoice = dragPreview ? choiceMap.get(dragPreview.choiceId) : undefined
  const countStatus = selectedSectionCount < totalSections
    ? `${totalSections - selectedSectionCount} section${totalSections - selectedSectionCount === 1 ? '' : 's'} needed`
    : 'Article sections ready'

  const cmsWindowContent = (
    <div className="article-assembly-shell">
      <div className="cms-deadline-status">
        <div>
          <span>Slug</span>
          <strong>cyclones-altitude-gamer</strong>
        </div>
        <div>
          <span>Due</span>
          <strong>11:10 PM ET</strong>
        </div>
        <div>
          <span>Target</span>
          <strong>{totalSections} article parts</strong>
        </div>
        <div>
          <span>Draft</span>
          <strong>{canSubmit ? 'Ready to submit' : countStatus}</strong>
        </div>
      </div>

      <div className="article-assembly-grid">
        <section className="article-assembly-workspace">
          <div className="cms-panel-header">
            <div>
              <span className="cms-source-eyebrow">Story builder</span>
              <h2>{node.windowTitle || 'Deadline Draft'}</h2>
            </div>
            <span className="cms-deadline-pill">Autosaved 10:34 PM</span>
          </div>

          <div className="cms-editor-brief">
            {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
          </div>

          <label className="article-headline-field">
            <span>{node.headlinePrompt || 'Write one clear headline.'}</span>
            <input
              value={assembly.headline}
              onChange={(event) => persist({ ...assembly, headline: event.target.value })}
              placeholder={node.headlinePlaceholder || 'Reed return steadies Cyclones late'}
            />
            <small>{headlineWords}/{minHeadlineWords} headline words needed</small>
          </label>

          <div className="article-section-list">
            {node.articleSections.map((section) => (
              <ArticleSectionBuilder
                key={section.id}
                section={section}
                selectedChoiceId={assembly.selectedChoiceIds[section.id]}
                activePointerChoiceId={activePointerChoiceId}
                getActivePointerChoiceId={getActivePointerChoiceId}
                onPointerChoiceStart={startPointerChoice}
                onPointerChoiceEnd={clearPointerChoice}
                onSelect={selectChoice}
                onClear={clearSection}
              />
            ))}
          </div>

          {dragPreview && dragPreviewChoice && (
            <div
              className="article-drag-preview"
              style={{ left: dragPreview.x, top: dragPreview.y }}
              aria-hidden="true"
            >
              <div className="article-choice-card-header">
                <span>{dragPreviewChoice.label}</span>
              </div>
              <p>{renderContentWithGlossary(dragPreviewChoice.text)}</p>
            </div>
          )}

          <div className="article-preview-panel">
            <div className="article-lane-heading">
              <span>Saved article preview</span>
              <strong>{wordCount(articleText)} words</strong>
            </div>
            <div>{articleText || 'No article saved yet.'}</div>
          </div>

          <div className="cms-submit-row">
            <ActionButton
              text="Submit Draft"
              onClick={() => goNext(node)}
              disabled={!canSubmit}
              variant={canSubmit ? 'primary' : 'secondary'}
            />
            {import.meta.env.DEV && (
              <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
            )}
          </div>
        </section>

        <SourceTray
          node={node}
          responses={responses}
          activeTab={activeSourceTab}
          onTabChange={setActiveSourceTab}
        />
      </div>
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
        <DesktopOverlay fitToScreen>
          <LaptopFrame variant="cms" title={node.windowTitle || node.title} scrollable fill>
            {cmsWindowContent}
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
