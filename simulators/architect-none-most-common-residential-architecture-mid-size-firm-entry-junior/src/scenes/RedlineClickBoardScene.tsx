import { useMemo, useState } from 'react'
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
import type { RedlineClickBoardNode, RedlineClickCallout } from '../types/game'

type SelectionMap = Record<string, string>

interface StoredRedlineState {
  responses: SelectionMap
  submitted?: boolean
}

const SITE = { w: 100, h: 75 }
const PROPOSED_ADDITION = { x: 38, y: 37, w: 38, h: 18 }

function parseState(raw: string | undefined): StoredRedlineState {
  if (!raw) return { responses: {} }
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.responses && typeof parsed.responses === 'object') {
      return {
        responses: parsed.responses,
        submitted: Boolean(parsed.submitted),
      }
    }
    if (parsed && typeof parsed === 'object') {
      return { responses: parsed as SelectionMap }
    }
  } catch {
    // Ignore stale or non-JSON answers.
  }
  return { responses: {} }
}

function categoryLabel(node: RedlineClickBoardNode, categoryId: string) {
  return node.categories.find((category) => category.id === categoryId)?.label ?? categoryId
}

function buildReview(node: RedlineClickBoardNode, responses: SelectionMap) {
  return node.callouts.map((callout) => {
    const selectedCategoryId = responses[callout.id] ?? ''
    return {
      id: callout.id,
      ref: callout.ref,
      title: callout.title,
      selectedCategoryId,
      selectedLabel: selectedCategoryId ? categoryLabel(node, selectedCategoryId) : 'Unmarked',
      recommendedCategoryId: callout.correctCategoryId,
      recommendedLabel: categoryLabel(node, callout.correctCategoryId),
      matchesOwen: selectedCategoryId === callout.correctCategoryId,
      owenNote: callout.owenNote,
    }
  })
}

function responsePayload(node: RedlineClickBoardNode, responses: SelectionMap, submitted: boolean) {
  const owenReview = buildReview(node, responses)
  const correctCount = owenReview.filter((item) => item.matchesOwen).length
  return JSON.stringify({
    closestRealTool: 'Autodesk Revit / PDF markup review',
    simulatedTool: 'Static A101/A201/Schedule redline classification board',
    submitted,
    categories: Object.fromEntries(node.categories.map((category) => [category.id, category.label])),
    responses,
    owenReview,
    correctCount,
    totalCount: node.callouts.length,
  }, null, 2)
}

function calloutBorderColor(selected: boolean, submitted: boolean, matchesOwen: boolean) {
  if (!selected) return '#B87D6B'
  if (!submitted) return '#3A6B5E'
  return matchesOwen ? '#3A6B5E' : '#B87D6B'
}

function categoryButtonStyle(active: boolean, disabled: boolean) {
  return {
    border: `1px solid ${active ? '#1E1E1A' : '#CDBF94'}`,
    background: active ? '#3A6B5E' : '#F7F1E3',
    color: active ? '#F2EBD9' : '#1E1E1A',
    borderRadius: 4,
    padding: '4px 6px',
    fontSize: 10,
    lineHeight: 1.1,
    fontWeight: 900,
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'Inter, system-ui, sans-serif',
    opacity: disabled && !active ? 0.55 : 1,
    minWidth: 0,
  }
}

export default function RedlineClickBoardScene({ node }: { node: RedlineClickBoardNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const saved = useMemo(() => parseState(responses[node.bindingKey]), [responses, node.bindingKey])
  const [activeTab, setActiveTab] = useState(node.tabs[0]?.id ?? 'a101')
  const [localState, setLocalState] = useState(saved)

  const context = { playerName, branchFlags, mcSelections }
  const validCategoryIds = useMemo(() => new Set(node.categories.map((category) => category.id)), [node.categories])
  const selections = useMemo(
    () => Object.fromEntries(Object.entries(localState.responses).filter(([, categoryId]) => validCategoryIds.has(categoryId))),
    [localState.responses, validCategoryIds]
  )
  const submitted = Boolean(localState.submitted)
  const selectedCount = node.callouts.filter((callout) => selections[callout.id]).length
  const requireAll = node.requireAllCalloutsAnswered ?? true
  const canSubmit = !submitted && (!requireAll || selectedCount === node.callouts.length)
  const titleTabs = [
    ...node.tabs.map((tab) => ({ id: tab.id, label: tab.label })),
    ...(node.referenceContent ? [{ id: 'reference', label: node.referenceTitle ?? 'Reference' }] : []),
    ...(submitted ? [{ id: 'owen_review', label: "Owen's review" }] : []),
  ]

  const save = (next: StoredRedlineState) => {
    setLocalState(next)
    setFreeTextResponse(node.bindingKey, responsePayload(node, next.responses, Boolean(next.submitted)))
  }

  const chooseCategory = (calloutId: string, categoryId: string) => {
    if (submitted) return
    save({
      ...localState,
      responses: {
        ...selections,
        [calloutId]: categoryId,
      },
    })
  }

  const submit = () => {
    const next = { responses: selections, submitted: true }
    save(next)
    setActiveTab('owen_review')
  }

  const activeDrawingTab = node.tabs.find((tab) => tab.id === activeTab) ?? node.tabs[0]
  const review = buildReview(node, selections)

  return (
    <SceneWrapper illustration={undefined} hideIllustration showBack backLabel="Back">
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

        <DesktopOverlay width="82%" height="84%" laptopZoom={1.04} laptopOffsetX="-1%">
          <LaptopFrame
            variant="bim"
            title={node.windowTitle ?? 'Maple Street Redline Pickup'}
            fill
            titleTabs={titleTabs}
            activeTitleTabId={activeTab}
            onTitleTabChange={setActiveTab}
            scrollable={activeTab === 'reference' || activeTab === 'owen_review'}
          >
            {activeTab === 'reference' ? (
              <ReferenceTab node={node} context={context} />
            ) : activeTab === 'owen_review' ? (
              <OwenReviewTab node={node} review={review} />
            ) : (
              <DrawingTab
                node={node}
                tab={activeDrawingTab}
                selections={selections}
                submitted={submitted}
                selectedCount={selectedCount}
                onChooseCategory={chooseCategory}
              />
            )}
          </LaptopFrame>
        </DesktopOverlay>

        <section style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 950, color: '#3A6B5E', marginBottom: '0.25rem' }}>
              Redline pickup status
            </div>
            <div style={{ fontSize: '0.75rem', lineHeight: 1.45, color: submitted ? '#3A6B5E' : '#6A604B' }}>
              {submitted
                ? "Owen's review is ready. Read the pickup notes, then continue to Dana call prep."
                : `${selectedCount}/${node.callouts.length} redlines classified. Mark every callout before sending Owen the pickup.`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {submitted ? (
              <ActionButton text="Continue to call prep" onClick={() => goNext(node)} variant="primary" fullWidth={false} />
            ) : (
              <ActionButton text="Send to Owen" onClick={submit} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} fullWidth={false} />
            )}
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

function DrawingTab({
  node,
  tab,
  selections,
  submitted,
  selectedCount,
  onChooseCategory,
}: {
  node: RedlineClickBoardNode
  tab?: RedlineClickBoardNode['tabs'][number]
  selections: SelectionMap
  submitted: boolean
  selectedCount: number
  onChooseCategory: (calloutId: string, categoryId: string) => void
}) {
  const callouts = node.callouts.filter((callout) => callout.sheetId === tab?.id)

  if (tab?.id === 'schedule') {
    return <ScheduleTab node={node} tab={tab} selectedCount={selectedCount} submitted={submitted} />
  }

  return (
    <div style={{ height: '100%', minWidth: 0, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', background: '#F2EBD9', color: '#1E1E1A' }}>
      <div style={{ borderBottom: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.45rem 0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#3A6B5E' }}>{tab?.sheetTitle ?? tab?.label}</div>
          <div style={{ marginTop: '0.1rem', fontSize: '0.62rem', color: '#6A604B' }}>Static redline pickup view. Classify each callout before editing the model.</div>
        </div>
        <div style={{ fontSize: '0.68rem', fontWeight: 850, color: submitted ? '#3A6B5E' : '#8B5E50' }}>
          {selectedCount}/{node.callouts.length} classified
        </div>
      </div>

      <div style={{ minHeight: 0, overflow: 'auto', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: 980, border: '1px solid #1E1E1A', background: '#FBF7EA', boxShadow: '4px 4px 0 rgba(0,0,0,0.22)' }}>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', overflow: 'hidden' }}>
            <svg viewBox={`0 0 ${SITE.w} ${SITE.h}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
              <rect x={0} y={0} width={SITE.w} height={SITE.h} fill="#FBF7EA" />
              {tab?.imagePath && (
                <image href={tab.imagePath} x={0} y={0} width={SITE.w} height={SITE.h} preserveAspectRatio="none" />
              )}
              {tab?.id === 'a101' && <A101StaticOverlays />}
              {callouts.map((callout) => (
                <CalloutLeader
                  key={callout.id}
                  callout={callout}
                  selectedCategoryId={selections[callout.id]}
                  submitted={submitted}
                />
              ))}
            </svg>
            {callouts.map((callout) => (
              <CalloutCard
                key={callout.id}
                node={node}
                callout={callout}
                selectedCategoryId={selections[callout.id]}
                submitted={submitted}
                onChooseCategory={onChooseCategory}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ScheduleTab({
  node,
  tab,
  selectedCount,
  submitted,
}: {
  node: RedlineClickBoardNode
  tab: RedlineClickBoardNode['tabs'][number]
  selectedCount: number
  submitted: boolean
}) {
  const rows = [
    { mark: 'W-1', sheet: 'A101 / A202', location: 'Level 1 north-left opening', note: 'Plan and elevation tag shown.' },
    { mark: 'W-2', sheet: 'A101 / A202', location: 'Level 1 north-center opening', note: 'Plan and elevation tag shown.' },
    { mark: 'W-3', sheet: 'A101 / A202', location: 'Level 1 north-right opening', note: 'Plan and elevation tag shown.' },
    { mark: 'W-4', sheet: 'A101 / A201', location: 'Level 1 south-left opening', note: 'Schedule controls the south-left W-4/W-1 mismatch.' },
    { mark: 'W-5', sheet: 'A101 / A201', location: 'Level 1 south mid-left opening', note: 'Plan and elevation tag shown.' },
    { mark: 'W-6', sheet: 'A102 / A201', location: 'Level 2 south mid-right opening', note: 'Plan and elevation tag shown.' },
    { mark: 'W-7', sheet: 'A102 / A201', location: 'Level 2 south-right opening', note: 'Plan and elevation tag shown.' },
    { mark: 'W-8', sheet: 'A102 / A202', location: 'Level 2 west elevation opening', note: 'Plan and elevation tag shown.' },
    { mark: 'W-9', sheet: 'A102 / A202', location: 'Level 2 west elevation opening', note: 'Plan and elevation tag shown.' },
    { mark: 'W-10', sheet: 'A102 / A201', location: 'Upper-left elevation opening', note: 'Schedule lists the tag; A201 needs the missing tag added.' },
    { mark: 'W-11', sheet: 'A102 / A201', location: 'Level 2 west elevation opening', note: 'Plan and elevation tag shown.' },
    { mark: 'W-12', sheet: 'A102 / A201', location: 'Level 2 west elevation opening', note: 'Plan and elevation tag shown.' },
  ]

  return (
    <div style={{ height: '100%', minWidth: 0, display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', background: '#F2EBD9', color: '#1E1E1A' }}>
      <div style={{ borderBottom: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.45rem 0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '0.74rem', fontWeight: 900, color: '#3A6B5E' }}>{tab.sheetTitle ?? tab.label}</div>
          <div style={{ marginTop: '0.1rem', fontSize: '0.62rem', color: '#6A604B' }}>Static schedule sheet. Use it to resolve tag coordination only.</div>
        </div>
        <div style={{ fontSize: '0.68rem', fontWeight: 850, color: submitted ? '#3A6B5E' : '#8B5E50' }}>
          {selectedCount}/{node.callouts.length} classified
        </div>
      </div>

      <div style={{ minHeight: 0, overflow: 'auto', padding: '0.75rem', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ width: '100%', maxWidth: 920, border: '1px solid #1E1E1A', background: '#FFFDF8', boxShadow: '4px 4px 0 rgba(0,0,0,0.22)', padding: '0.85rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', borderBottom: '2px solid #1E1E1A', paddingBottom: '0.55rem', marginBottom: '0.65rem' }}>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 950, letterSpacing: '0.04em' }}>WINDOW SCHEDULE</div>
              <div style={{ marginTop: '0.2rem', fontSize: '0.68rem', color: '#6A604B' }}>Maple Street Addition - pickup reference</div>
            </div>
            <div style={{ border: '1px solid #1E1E1A', display: 'grid', gridTemplateColumns: 'auto auto', fontSize: '0.62rem', lineHeight: 1.3 }}>
              <span style={{ borderRight: '1px solid #1E1E1A', borderBottom: '1px solid #1E1E1A', padding: '0.22rem 0.35rem', fontWeight: 850 }}>SHEET</span>
              <span style={{ borderBottom: '1px solid #1E1E1A', padding: '0.22rem 0.35rem' }}>A601</span>
              <span style={{ borderRight: '1px solid #1E1E1A', padding: '0.22rem 0.35rem', fontWeight: 850 }}>STATUS</span>
              <span style={{ padding: '0.22rem 0.35rem' }}>Redline pickup</span>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem', lineHeight: 1.35 }}>
              <thead>
                <tr style={{ background: '#EFE8D2' }}>
                  {['MARK', 'VISIBLE ON', 'OPENING / LOCATION', 'COORDINATION NOTE'].map((heading) => (
                    <th key={heading} style={{ border: '1px solid #1E1E1A', padding: '0.32rem 0.4rem', textAlign: 'left', fontSize: '0.62rem', letterSpacing: '0.03em' }}>
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.mark}>
                    <td style={{ border: '1px solid #1E1E1A', padding: '0.32rem 0.4rem', fontWeight: 950, whiteSpace: 'nowrap' }}>{row.mark}</td>
                    <td style={{ border: '1px solid #1E1E1A', padding: '0.32rem 0.4rem', whiteSpace: 'nowrap' }}>{row.sheet}</td>
                    <td style={{ border: '1px solid #1E1E1A', padding: '0.32rem 0.4rem' }}>{row.location}</td>
                    <td style={{ border: '1px solid #1E1E1A', padding: '0.32rem 0.4rem', color: row.note.includes('mismatch') || row.note.includes('missing') ? '#8B5E50' : '#433B2E', fontWeight: row.note.includes('mismatch') || row.note.includes('missing') ? 850 : 500 }}>{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '0.65rem', fontSize: '0.68rem', lineHeight: 1.5, color: '#6A604B' }}>
            The schedule confirms tag numbers only. It does not resolve zoning, privacy choices, field conditions, or permit calculations.
          </div>
        </div>
      </div>
    </div>
  )
}

function A101StaticOverlays() {
  return (
    <>
      <rect
        x={PROPOSED_ADDITION.x}
        y={PROPOSED_ADDITION.y}
        width={PROPOSED_ADDITION.w}
        height={PROPOSED_ADDITION.h}
        fill="#B87D6B"
        opacity={0.2}
        stroke="#B87D6B"
        strokeWidth={0.6}
      />
      <text x={PROPOSED_ADDITION.x + 1.3} y={PROPOSED_ADDITION.y + 3} fontSize={1.35} fill="#8B5E50" fontWeight={900}>
        proposed addition area
      </text>
    </>
  )
}

function CalloutLeader({
  callout,
  selectedCategoryId,
  submitted,
}: {
  callout: RedlineClickCallout
  selectedCategoryId?: string
  submitted: boolean
}) {
  const width = callout.width ?? 22
  const height = 13
  const matchesOwen = selectedCategoryId === callout.correctCategoryId
  const selected = Boolean(selectedCategoryId)
  const stroke = calloutBorderColor(selected, submitted, matchesOwen)
  const anchorX = callout.anchorX ?? callout.x
  const anchorY = callout.anchorY ?? callout.y + height
  const leaderStartX = callout.x + width / 2
  const leaderStartY = callout.y + height

  return (
    <g>
      <line x1={leaderStartX} y1={leaderStartY} x2={anchorX} y2={anchorY} stroke={stroke} strokeWidth={0.32} />
      <circle cx={anchorX} cy={anchorY} r={0.72} fill="#FBF7EA" stroke={stroke} strokeWidth={0.32} />
    </g>
  )
}

function CalloutCard({
  node,
  callout,
  selectedCategoryId,
  submitted,
  onChooseCategory,
}: {
  node: RedlineClickBoardNode
  callout: RedlineClickCallout
  selectedCategoryId?: string
  submitted: boolean
  onChooseCategory: (calloutId: string, categoryId: string) => void
}) {
  const width = callout.width ?? 22
  const matchesOwen = selectedCategoryId === callout.correctCategoryId
  const selected = Boolean(selectedCategoryId)
  const stroke = calloutBorderColor(selected, submitted, matchesOwen)

  return (
    <div
      style={{
        position: 'absolute',
        left: `${(callout.x / SITE.w) * 100}%`,
        top: `${(callout.y / SITE.h) * 100}%`,
        width: `${(width / SITE.w) * 100}%`,
        minWidth: 180,
        boxSizing: 'border-box',
        border: `2px solid ${stroke}`,
        borderRadius: 6,
        background: '#FFFDF8',
        boxShadow: '2px 2px 0 rgba(0,0,0,0.18)',
        padding: 7,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        fontFamily: 'Inter, system-ui, sans-serif',
        zIndex: 2,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, alignItems: 'baseline' }}>
        <strong style={{ fontSize: 11, lineHeight: 1.15, color: '#1E1E1A' }}>{callout.title}</strong>
        <span style={{ fontSize: 9, fontWeight: 900, color: '#8B5E50', whiteSpace: 'nowrap' }}>{callout.ref}</span>
      </div>
      <div style={{ fontSize: 10, lineHeight: 1.28, color: '#433B2E' }}>
        {callout.text}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
        {node.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            disabled={submitted}
            onClick={() => onChooseCategory(callout.id, category.id)}
            style={categoryButtonStyle(selectedCategoryId === category.id, submitted)}
          >
            {category.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ReferenceTab({
  node,
  context,
}: {
  node: RedlineClickBoardNode
  context: { playerName: string; branchFlags: Record<string, string>; mcSelections: Record<string, string> }
}) {
  return (
    <div style={{ minHeight: '100%', padding: '0.875rem', backgroundColor: '#F7F1E3', color: '#1E1E1A' }}>
      <div
        style={{
          border: '1px solid #CDBF94',
          backgroundColor: '#FBF7EA',
          padding: '0.875rem',
          borderRadius: 6,
          fontSize: '0.875rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {node.referenceTitle && (
          <div style={{ fontSize: '0.75rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
            {node.referenceTitle}
          </div>
        )}
        {renderContentWithGlossary(interpolate(node.referenceContent || '', context))}
      </div>
    </div>
  )
}

function OwenReviewTab({
  node,
  review,
}: {
  node: RedlineClickBoardNode
  review: ReturnType<typeof buildReview>
}) {
  return (
    <div style={{ minHeight: '100%', padding: '0.875rem', background: '#F2EBD9', color: '#1E1E1A' }}>
      <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <StaticSlackMessage
          sender="Owen Reed"
          role="Job Captain"
          timestamp="9:12 AM"
          initials="OR"
          content={node.reviewerIntro ?? "I looked over your pickup. The main thing is to only draft what the set already proves, and verify anything that could change the permit path or client promise."}
        />
        <div style={{ display: 'grid', gap: '0.55rem' }}>
          {review.map((item) => (
            <div key={item.id} style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 6, padding: '0.65rem 0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '0.82rem', color: '#1E1E1A' }}>{item.ref}: {item.title}</strong>
                <span style={{ fontSize: '0.68rem', color: item.matchesOwen ? '#3A6B5E' : '#8B5E50', fontWeight: 900 }}>
                  {item.matchesOwen ? 'Aligned with Owen' : 'Owen redirected this'}
                </span>
              </div>
              <div style={{ marginTop: '0.35rem', fontSize: '0.74rem', color: '#6A604B', lineHeight: 1.45 }}>
                You marked: <strong>{item.selectedLabel}</strong> / Owen would treat this as: <strong>{item.recommendedLabel}</strong>
              </div>
              <div style={{ marginTop: '0.35rem', borderLeft: '3px solid #B87D6B', paddingLeft: '0.55rem', fontSize: '0.78rem', lineHeight: 1.5, color: '#333' }}>
                <strong>Owen's note:</strong> {item.owenNote}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StaticSlackMessage({
  sender,
  role,
  timestamp,
  initials,
  content,
}: {
  sender: string
  role: string
  timestamp: string
  initials: string
  content: string
}) {
  return (
    <div style={{ border: '1px solid #D8D1C1', background: '#F7F1E3', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ borderBottom: '1px solid #D8D1C1', background: '#EFE8D2', padding: '0.45rem 0.65rem', fontSize: '0.68rem', fontWeight: 850, color: '#3F605C' }}>
        #maple-street-addition
      </div>
      <div style={{ display: 'flex', gap: '0.625rem', padding: '0.65rem 0.75rem' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            backgroundColor: '#3D405B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em' }}>{initials}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '0.86rem', color: '#1d1c1d' }}>{sender}</span>
            <span style={{ fontSize: '0.68rem', color: '#616061', fontWeight: 650 }}>{role}</span>
            <span style={{ fontSize: '0.68rem', color: '#9e9e9e', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{timestamp}</span>
          </div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.55, color: '#1d1c1d', whiteSpace: 'pre-wrap', marginTop: '0.15rem' }}>
            {content}
          </div>
        </div>
      </div>
    </div>
  )
}
