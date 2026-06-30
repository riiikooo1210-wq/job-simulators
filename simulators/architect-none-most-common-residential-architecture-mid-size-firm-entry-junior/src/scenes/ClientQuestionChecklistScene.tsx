import { useMemo, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import LaptopFrame from '../components/ui/LaptopFrame'
import ActionButton from '../components/ui/ActionButton'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { useNarrowViewport } from '../components/hooks/useNarrowViewport'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import { renderStructuredEntryAppTab } from './StructuredEntryScene'
import type { ClientQuestionChecklistNode, ClientQuestionChecklistOption } from '../types/game'

interface StoredChecklistState {
  selectedIds: string[]
  teamCheckClicks: string[]
  submitted?: boolean
}

function parseState(raw: string | undefined): StoredChecklistState {
  if (!raw) return { selectedIds: [], teamCheckClicks: [] }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      return {
        selectedIds: Array.isArray(parsed.selectedIds) ? parsed.selectedIds.filter((id: unknown): id is string => typeof id === 'string') : [],
        teamCheckClicks: Array.isArray(parsed.teamCheckClicks) ? parsed.teamCheckClicks.filter((id: unknown): id is string => typeof id === 'string') : [],
        submitted: Boolean(parsed.submitted),
      }
    }
  } catch {
    // Ignore stale saved state.
  }
  return { selectedIds: [], teamCheckClicks: [] }
}

function responsePayload(node: ClientQuestionChecklistNode, state: StoredChecklistState) {
  const selectedOptions = state.selectedIds
    .map((id) => node.options.find((option) => option.id === id))
    .filter((option): option is ClientQuestionChecklistOption => Boolean(option))
  const selectedFocusGroups = Array.from(new Set(selectedOptions.map((option) => option.focusGroup)))
  const missingFocusGroups = node.requiredFocusGroups.filter((focus) => !selectedFocusGroups.includes(focus))

  return JSON.stringify({
    closestRealTool: 'Client call prep checklist',
    simulatedTool: 'Guided homeowner-question builder',
    selectedIds: state.selectedIds,
    selectedQuestions: selectedOptions.map((option) => ({
      id: option.id,
      question: option.label,
      focusGroup: option.focusGroup,
      source: option.source,
      why: option.why,
    })),
    teamCheckClicks: state.teamCheckClicks,
    requiredSelections: node.requiredSelections,
    requiredFocusGroups: node.requiredFocusGroups,
    missingFocusGroups,
    readyForDana: selectedOptions.length === node.requiredSelections && missingFocusGroups.length === 0,
    submitted: Boolean(state.submitted),
  }, null, 2)
}

function focusLabel(focus: string) {
  if (focus === 'privacy') return 'Privacy/daylight'
  if (focus === 'daily_life') return 'Kitchen, mudroom, or daily routine'
  return focus.replace(/_/g, ' ')
}

function optionTone(option: ClientQuestionChecklistOption, selected: boolean, revealed: boolean) {
  if (!revealed) {
    return {
      border: '#CDBF94',
      background: '#FBF7EA',
      label: 'Candidate question',
      color: '#6A604B',
      feedbackColor: '#6A604B',
    }
  }

  if (!option.validForClient) {
    return {
      border: '#B87D6B',
      background: '#FFF7F2',
      label: 'Team check',
      color: '#8B5E50',
      feedbackColor: '#8B5E50',
    }
  }

  return {
    border: selected ? '#1E1E1A' : '#CDBF94',
    background: selected ? '#DCEAE6' : '#FBF7EA',
    label: 'Dana question',
    color: '#3A6B5E',
    feedbackColor: '#3A6B5E',
  }
}

function optionFeedback(option: ClientQuestionChecklistOption) {
  return option.validForClient
    ? (option.why || 'This is a Dana-facing choice.')
    : (option.teamCheckReason || 'Keep this as a team check.')
}

export default function ClientQuestionChecklistScene({ node }: { node: ClientQuestionChecklistNode }) {
  const freeTextResponses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const briefing = useSectionBriefing()
  const goNext = useGoNext()
  const appTabs = node.appTabs || []
  const isNarrow = useNarrowViewport()
  const [refOpen, setRefOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(node.defaultAppTabId ?? 'builder')
  const [localState, setLocalState] = useState(() => parseState(freeTextResponses[node.bindingKey]))
  const [hint, setHint] = useState('')

  const context = { playerName, branchFlags, mcSelections }
  const selectedOptions = useMemo(
    () => localState.selectedIds
      .map((id) => node.options.find((option) => option.id === id))
      .filter((option): option is ClientQuestionChecklistOption => Boolean(option)),
    [localState.selectedIds, node.options]
  )
  const selectedFocusGroups = useMemo(
    () => new Set(selectedOptions.map((option) => option.focusGroup)),
    [selectedOptions]
  )
  const missingFocusGroups = node.requiredFocusGroups.filter((focus) => !selectedFocusGroups.has(focus))
  const ready = selectedOptions.length === node.requiredSelections && missingFocusGroups.length === 0
  const titleTabs = [
    { id: 'builder', label: 'Checklist' },
    ...appTabs.map((tab) => ({ id: tab.id, label: tab.label })),
  ]

  const save = (next: StoredChecklistState) => {
    setLocalState(next)
    setFreeTextResponse(node.bindingKey, responsePayload(node, next))
  }

  const toggleOption = (option: ClientQuestionChecklistOption) => {
    if (!option.validForClient) {
      const next = {
        ...localState,
        teamCheckClicks: localState.teamCheckClicks.includes(option.id)
          ? localState.teamCheckClicks
          : [...localState.teamCheckClicks, option.id],
      }
      save(next)
      setHint(option.teamCheckReason || 'Keep this as a team check, not a Dana question.')
      return
    }

    setHint('')
    const alreadySelected = localState.selectedIds.includes(option.id)
    if (alreadySelected) {
      save({ ...localState, selectedIds: localState.selectedIds.filter((id) => id !== option.id), submitted: false })
      return
    }
    if (localState.selectedIds.length >= node.requiredSelections) {
      setHint(`You already chose ${node.requiredSelections}. Remove one before choosing another.`)
      return
    }
    save({ ...localState, selectedIds: [...localState.selectedIds, option.id], submitted: false })
  }

  const submit = () => {
    const next = { ...localState, submitted: true }
    save(next)
    goNext(node)
  }

  const activeSourceTab = appTabs.find((tab) => tab.id === activeTab)

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
            {renderContentWithGlossary(interpolate(node.content, context))}
          </div>
        )}

        <ChecklistToolShell isNarrow={isNarrow}>
          <LaptopFrame
            variant="notion"
            title={node.windowTitle ?? node.title}
            fill={!isNarrow}
            scrollable={isNarrow || activeTab !== 'builder'}
            titleTabs={titleTabs}
            activeTitleTabId={activeTab}
            onTitleTabChange={setActiveTab}
          >
            {activeSourceTab ? (
              renderStructuredEntryAppTab(activeSourceTab, context)
            ) : (
              <div style={{ minHeight: '100%', padding: '1rem', background: '#F7F1E3', color: '#1E1E1A', display: 'grid', gap: '0.85rem' }}>
                <section style={{ border: '1px solid #CDBF94', borderLeft: '5px solid #3A6B5E', background: '#FBF7EA', padding: '0.8rem 0.9rem', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 950, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
                    Your task
                  </div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.9rem', lineHeight: 1.55, fontWeight: 750 }}>
                    {renderContentWithGlossary(interpolate(node.prompt, context))}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.65rem' }}>
                    {node.requiredFocusGroups.map((focus) => {
                      const done = selectedFocusGroups.has(focus)
                      return (
                        <span
                          key={focus}
                          style={{
                            border: `1px solid ${done ? '#3A6B5E' : '#CDBF94'}`,
                            background: done ? '#E4F0EA' : '#FFFDF5',
                            borderRadius: 999,
                            padding: '0.22rem 0.5rem',
                            fontSize: '0.68rem',
                            fontWeight: 850,
                            color: done ? '#2F5D51' : '#6A604B',
                            whiteSpace: 'normal',
                          }}
                        >
                          {done ? 'Has: ' : 'Need: '}
                          {focusLabel(focus)}
                        </span>
                      )
                    })}
                  </div>
                </section>

                <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.65rem' }}>
                  {node.options.map((option) => {
                    const selected = localState.selectedIds.includes(option.id)
                    const teamCheckClicked = localState.teamCheckClicks.includes(option.id)
                    const revealed = selected || teamCheckClicked
                    const tone = optionTone(option, selected, revealed)
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => toggleOption(option)}
                        style={{
                          border: `2px solid ${tone.border}`,
                          background: tone.background,
                          boxShadow: selected ? '3px 3px 0 rgba(0,0,0,0.18)' : 'none',
                          borderRadius: 6,
                          padding: '0.75rem',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontFamily: 'Inter, system-ui, sans-serif',
                          display: 'grid',
                          gap: '0.45rem',
                          minHeight: 108,
                          alignContent: 'start',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 950, color: tone.color, textTransform: 'uppercase', letterSpacing: 0 }}>
                            {tone.label}
                          </span>
                          {option.source && (
                            <span style={{ fontSize: '0.65rem', color: '#6A604B', fontWeight: 800 }}>
                              {renderContentWithGlossary(option.source)}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.84rem', lineHeight: 1.45, fontWeight: 850, color: '#1E1E1A' }}>
                          {renderContentWithGlossary(option.label)}
                        </div>
                        {revealed && (
                          <div style={{ fontSize: '0.72rem', lineHeight: 1.45, color: tone.feedbackColor, fontWeight: 700 }}>
                            {renderContentWithGlossary(optionFeedback(option))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </section>
              </div>
            )}
          </LaptopFrame>
        </ChecklistToolShell>

        <section style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 340px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 950, color: '#3A6B5E', marginBottom: '0.25rem' }}>
              Checklist status
            </div>
            <div style={{ fontSize: '0.75rem', lineHeight: 1.5, color: ready ? '#3A6B5E' : '#6A604B' }}>
              {ready
                ? (node.successFeedback || 'Ready for Dana handoff.')
                : `${selectedOptions.length}/${node.requiredSelections} Dana questions selected. Missing: ${missingFocusGroups.map(focusLabel).join(', ') || 'none'}.`}
            </div>
            {hint && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.74rem', lineHeight: 1.45, color: '#8B5E50', fontWeight: 750 }}>
                {renderContentWithGlossary(hint)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <ActionButton text="Continue to Dana handoff" onClick={submit} disabled={!ready} variant={ready ? 'primary' : 'secondary'} fullWidth={false} />
            {import.meta.env.DEV && <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />}
          </div>
        </section>
      </motion.div>

      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}

function ChecklistToolShell({ isNarrow, children }: { isNarrow: boolean; children: ReactNode }) {
  if (isNarrow) {
    return (
      <div style={{ width: '100%', minHeight: 560 }}>
        {children}
      </div>
    )
  }

  return (
    <DesktopOverlay width="78%" height="82%" laptopZoom={1.03}>
      {children}
    </DesktopOverlay>
  )
}
