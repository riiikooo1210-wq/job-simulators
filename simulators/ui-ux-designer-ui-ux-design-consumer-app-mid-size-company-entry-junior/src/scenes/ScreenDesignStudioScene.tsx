import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode, WheelEvent } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import LaptopFrame from '../components/ui/LaptopFrame'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { ScreenDesignStudioNode } from '../types/game'

type ElementKind =
  | 'top_bar'
  | 'screen_title'
  | 'habit_card'
  | 'friend_card'
  | 'progress_ring'
  | 'primary_button'
  | 'secondary_button'
  | 'shape_square'
  | 'shape_horizontal'
  | 'shape_vertical'
  | 'freeform_rectangle'
  | 'freeform_vertical'
  | 'status_chip'
  | 'tab_bar'

type ElementVariant = 'neutral' | 'brand' | 'success' | 'warning'
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

interface DesignElement {
  id: string
  kind: ElementKind
  label: string
  detail: string
  x: number
  y: number
  w: number
  h: number
  variant: ElementVariant
  locked?: boolean
  hidden?: boolean
  opacity?: number
}

interface StudioState {
  screenId: string
  screenLabel: string
  elements: DesignElement[]
  selectedId?: string
  notes: string
  mode: 'edit' | 'preview'
}

interface DragState {
  id: string
  startClientX: number
  startClientY: number
  originX: number
  originY: number
}

interface ResizeState {
  id: string
  handle: ResizeHandle
  startClientX: number
  startClientY: number
  originX: number
  originY: number
  originW: number
  originH: number
}

interface CanvasPanState {
  startClientX: number
  startClientY: number
  originX: number
  originY: number
}

interface ComponentDefinition {
  kind: ElementKind
  label: string
  detail: string
  w: number
  h: number
  variant: ElementVariant
}

interface StudioChecks {
  minElements: number
  enoughElements: boolean
  notesReady: boolean
  requirements: StudioRequirement[]
  requiredConceptsReady: boolean
  buttonOverlap: boolean
  buttonOverlapLabels: string[]
}

interface StudioRequirement {
  id: string
  label: string
  hint: string
  met: boolean
}

const fixedScreen = { id: 'shared_streak_screen', label: 'Shared Streak Screen' }
const studioGridColumns = 'clamp(84px, 24%, 156px) minmax(0, 1fr) clamp(92px, 29%, 196px)'
const phoneCanvasAspectRatio = 458 / 220
const minElementWidth = 18
const maxElementWidth = 92
const minElementHeight = 5
const maxElementHeight = 28
const resizeHandles: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

const resizeHandleLabels: Record<ResizeHandle, string> = {
  nw: 'top left',
  n: 'top edge',
  ne: 'top right',
  e: 'right edge',
  se: 'bottom right',
  s: 'bottom edge',
  sw: 'bottom left',
  w: 'left edge',
}

const resizeHandleCursors: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
}

const componentDefinitions: ComponentDefinition[] = [
  { kind: 'top_bar', label: 'Shared Streak', detail: 'Hydration with Ava', w: 84, h: 8, variant: 'neutral' },
  { kind: 'screen_title', label: 'Shared Hydration Streak', detail: 'Final screen after Ava accepts', w: 76, h: 10, variant: 'neutral' },
  { kind: 'habit_card', label: 'Hydration', detail: 'Both finish the same day', w: 78, h: 15, variant: 'brand' },
  { kind: 'friend_card', label: 'You + Ava', detail: 'Ava completed, you are next', w: 78, h: 14, variant: 'neutral' },
  { kind: 'progress_ring', label: '12-day Streak', detail: 'Current shared count', w: 48, h: 16, variant: 'success' },
  { kind: 'status_chip', label: 'Active', detail: 'Friend accepted', w: 28, h: 7, variant: 'success' },
  { kind: 'primary_button', label: "Mark Today's Habit", detail: 'Complete your Hydration side', w: 72, h: 9, variant: 'brand' },
  { kind: 'secondary_button', label: 'Message Friend', detail: 'Encourage the friend without leaving the screen', w: 72, h: 9, variant: 'neutral' },
  { kind: 'tab_bar', label: 'Bottom Nav', detail: 'Home, habits, profile', w: 84, h: 10, variant: 'neutral' },
  { kind: 'shape_square', label: 'Friend Avatar', detail: 'Add your own text', w: 28, h: 14, variant: 'neutral' },
  { kind: 'shape_horizontal', label: 'Last 7 Days Row', detail: 'Use for shared streak history', w: 64, h: 9, variant: 'brand' },
  { kind: 'shape_vertical', label: 'Motivation Card', detail: 'Add your own text', w: 30, h: 24, variant: 'neutral' },
  { kind: 'freeform_rectangle', label: 'Horizontal Rect', detail: 'Freeform label or button area', w: 64, h: 9, variant: 'neutral' },
  { kind: 'freeform_vertical', label: 'Vertical Rect', detail: 'Freeform panel or placeholder', w: 30, h: 24, variant: 'neutral' },
]

const paletteComponentKinds: ElementKind[] = [
  'top_bar',
  'screen_title',
  'habit_card',
  'friend_card',
  'progress_ring',
  'status_chip',
  'primary_button',
]

const paletteComponentDefinitions = paletteComponentKinds
  .map((kind) => componentDefinitions.find((item) => item.kind === kind))
  .filter((item): item is ComponentDefinition => Boolean(item))

const defaultPlacements: Record<ElementKind, { x: number; y: number }> = {
  top_bar: { x: 8, y: 5 },
  screen_title: { x: 12, y: 16 },
  habit_card: { x: 11, y: 30 },
  friend_card: { x: 11, y: 48 },
  progress_ring: { x: 11, y: 64 },
  primary_button: { x: 14, y: 83 },
  secondary_button: { x: 14, y: 82 },
  shape_square: { x: 12, y: 43 },
  shape_horizontal: { x: 18, y: 66 },
  shape_vertical: { x: 58, y: 38 },
  freeform_rectangle: { x: 18, y: 58 },
  freeform_vertical: { x: 58, y: 36 },
  status_chip: { x: 62, y: 68 },
  tab_bar: { x: 8, y: 88 },
}

const variantStyles: Record<ElementVariant, { bg: string; border: string; text: string; accent: string }> = {
  neutral: { bg: '#F8FAFC', border: '#CBD5E1', text: '#111827', accent: '#64748B' },
  brand: { bg: '#ECFEFF', border: '#0891B2', text: '#0F172A', accent: '#0891B2' },
  success: { bg: '#ECFDF5', border: '#059669', text: '#0F172A', accent: '#059669' },
  warning: { bg: '#FFF7ED', border: '#EA580C', text: '#0F172A', accent: '#EA580C' },
}

const requirementDefinitions: Omit<StudioRequirement, 'met'>[] = [
  {
    id: 'accepted_state',
    label: 'Accepted final state',
    hint: 'Add an Active status, or explain that the friend accepted in the build note.',
  },
  {
    id: 'shared_habit',
    label: 'Shared habit',
    hint: 'Show Hydration or another single habit so the screen is habit-specific.',
  },
  {
    id: 'two_people',
    label: 'Two people',
    hint: 'Add the You + Ava card or another clear pair of people.',
  },
  {
    id: 'progress_or_today',
    label: 'Streak count or today status',
    hint: 'Add 12 days, today complete, or another same-day completion state.',
  },
  {
    id: 'main_action',
    label: 'Main action or next state',
    hint: 'Add a primary/secondary action, or explain the next state in the build note.',
  },
]

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function elementText(element: DesignElement) {
  return `${element.label} ${element.detail}`.toLowerCase()
}

function visibleElements(state: StudioState) {
  return state.elements.filter((element) => !element.hidden)
}

function fullStudioText(state: StudioState) {
  return `${state.notes} ${visibleElements(state).map(elementText).join(' ')}`.toLowerCase()
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term))
}

function buildRequirementResults(state: StudioState): StudioRequirement[] {
  const text = fullStudioText(state)
  const elements = visibleElements(state)
  const hasKind = (kind: ElementKind) => elements.some((element) => element.kind === kind)
  const hasAnyKind = (kinds: ElementKind[]) => elements.some((element) => kinds.includes(element.kind))
  const metById: Record<string, boolean> = {
    accepted_state: hasKind('status_chip') || includesAny(text, ['active', 'accepted', 'friend accepts', 'friend accepted', 'after the friend accepts', 'final screen']),
    shared_habit: hasKind('habit_card') || includesAny(text, ['hydration', 'shared habit', 'same habit', 'habit-specific', 'same day rule']),
    two_people: hasKind('friend_card') || includesAny(text, ['you +', 'you and', 'ava', 'friend', 'two people', 'both people']),
    progress_or_today: hasKind('progress_ring') || includesAny(text, ['12 days', 'streak count', 'today', 'completion', 'complete', 'same-day']),
    main_action: hasAnyKind(['primary_button', 'secondary_button']) || includesAny(text, ['main action', 'mark', 'message', 'next state', 'next step', 'complete your side']),
  }

  return requirementDefinitions.map((item) => ({
    ...item,
    met: Boolean(metById[item.id]),
  }))
}

function findButtonOverlapLabels(elements: DesignElement[]) {
  const buttons = elements.filter((element) => !element.hidden && (element.kind === 'primary_button' || element.kind === 'secondary_button'))
  const overlaps: string[] = []

  for (let i = 0; i < buttons.length; i += 1) {
    for (let j = i + 1; j < buttons.length; j += 1) {
      const a = buttons[i]
      const b = buttons[j]
      const intersects = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
      if (intersects) {
        overlaps.push(`${a.label} / ${b.label}`)
      }
    }
  }

  return overlaps
}

function defaultStudioState(): StudioState {
  return {
    screenId: fixedScreen.id,
    screenLabel: fixedScreen.label,
    elements: [],
    notes: '',
    mode: 'edit',
  }
}

function sanitizeElement(raw: Partial<DesignElement>): DesignElement | null {
  const definition = componentDefinitions.find((item) => item.kind === raw.kind)
  if (!definition) return null

  const w = clamp(typeof raw.w === 'number' ? raw.w : definition.w, minElementWidth, maxElementWidth)
  const h = clamp(typeof raw.h === 'number' ? raw.h : definition.h, minElementHeight, maxElementHeight)
  return {
    id: typeof raw.id === 'string' ? raw.id : `el_${Date.now()}`,
    kind: definition.kind,
    label: typeof raw.label === 'string' ? raw.label : definition.label,
    detail: typeof raw.detail === 'string' ? raw.detail : definition.detail,
    x: clamp(typeof raw.x === 'number' ? raw.x : 10, 0, 100 - w),
    y: clamp(typeof raw.y === 'number' ? raw.y : 10, 0, 100 - h),
    w,
    h,
    variant: raw.variant && raw.variant in variantStyles ? raw.variant : definition.variant,
    locked: Boolean(raw.locked),
    hidden: Boolean(raw.hidden),
    opacity: clamp(typeof raw.opacity === 'number' ? raw.opacity : 1, 0.25, 1),
  }
}

function parseStudioState(raw: string | undefined): StudioState {
  const base = defaultStudioState()
  if (!raw) return base

  try {
    const parsed = JSON.parse(raw) as Partial<StudioState>
    const elements = Array.isArray(parsed.elements)
      ? parsed.elements
          .map((item) => sanitizeElement(item))
          .filter((item): item is DesignElement => Boolean(item))
      : base.elements

    return {
      screenId: fixedScreen.id,
      screenLabel: fixedScreen.label,
      elements,
      selectedId: typeof parsed.selectedId === 'string' ? parsed.selectedId : undefined,
      notes: typeof parsed.notes === 'string' ? parsed.notes : base.notes,
      mode: parsed.mode === 'preview' ? 'preview' : 'edit',
    }
  } catch {
    return base
  }
}

function buildChecks(state: StudioState, node: ScreenDesignStudioNode): StudioChecks {
  const minElements = node.minElements ?? 1
  const minNotesChars = node.minNotesChars ?? 1
  const requirements = buildRequirementResults(state)
  const buttonOverlapLabels = findButtonOverlapLabels(state.elements)
  const shownElements = visibleElements(state)

  return {
    minElements,
    enoughElements: shownElements.length >= minElements,
    notesReady: state.notes.trim().length >= minNotesChars,
    requirements,
    requiredConceptsReady: requirements.every((item) => item.met),
    buttonOverlap: buttonOverlapLabels.length > 0,
    buttonOverlapLabels,
  }
}

function serializeStudioState(state: StudioState) {
  return JSON.stringify({
    ...state,
    summary: {
      selectedScreen: state.screenLabel,
      elementCount: state.elements.length,
      visibleElementCount: visibleElements(state).length,
      implementationNote: state.notes,
      elements: state.elements.map((item) => ({
        kind: item.kind,
        label: item.label,
        detail: item.detail,
        variant: item.variant,
        locked: Boolean(item.locked),
        hidden: Boolean(item.hidden),
        opacity: item.opacity ?? 1,
      })),
      buttonsAndShapes: state.elements
        .filter((item) => ['primary_button', 'secondary_button', 'shape_square', 'shape_horizontal', 'shape_vertical', 'freeform_rectangle', 'freeform_vertical'].includes(item.kind))
        .map((item) => ({
          type: item.kind,
          text: item.label,
          notes: item.detail,
        })),
    },
  }, null, 2)
}

function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: '0.64rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: 0 }}>
      {children}
    </div>
  )
}

function resizeHandleButtonStyle(handle: ResizeHandle): CSSProperties {
  const isCorner = handle.length === 2
  const isHorizontalEdge = handle === 'n' || handle === 's'
  const isVerticalEdge = handle === 'e' || handle === 'w'

  return {
    position: 'absolute',
    top: handle.includes('n') ? -13 : handle === 'e' || handle === 'w' ? 14 : undefined,
    right: handle.includes('e') ? -13 : undefined,
    bottom: handle.includes('s') ? -13 : undefined,
    left: handle === 'n' || handle === 's' ? 14 : handle.includes('w') ? -13 : undefined,
    width: isCorner || isVerticalEdge ? 26 : 'calc(100% - 28px)',
    height: isCorner || isHorizontalEdge ? 26 : 'calc(100% - 28px)',
    minWidth: isCorner ? 26 : 24,
    minHeight: isCorner ? 26 : 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 0,
    background: 'transparent',
    cursor: resizeHandleCursors[handle],
    zIndex: 5,
    padding: 0,
    touchAction: 'none',
  }
}

function resizeHandleVisualStyle(handle: ResizeHandle): CSSProperties {
  const isCorner = handle.length === 2
  const isHorizontalEdge = handle === 'n' || handle === 's'

  return {
    display: 'block',
    width: isCorner ? 10 : isHorizontalEdge ? 26 : 5,
    height: isCorner ? 10 : isHorizontalEdge ? 5 : 26,
    borderRadius: isCorner ? 4 : 999,
    border: isCorner ? '2px solid #FFFFFF' : 0,
    background: '#2563EB',
    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.24)',
    opacity: isCorner ? 1 : 0.82,
  }
}

function ComponentPreview({ kind, variant }: { kind: ElementKind; variant: ElementVariant }) {
  const styles = variantStyles[variant]
  const previewShell = {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: '#F8FAFC',
    border: '1px solid #E2E8F0',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)',
    overflow: 'hidden',
    flexShrink: 0,
  } as const

  if (kind === 'top_bar') {
    return (
      <span style={{ ...previewShell, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, padding: 5 }}>
        <span style={{ display: 'grid', gridTemplateColumns: '6px 1fr 7px', gap: 3, alignItems: 'center' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8' }} />
          <span style={{ height: 5, borderRadius: 99, background: '#CBD5E1' }} />
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: styles.accent }} />
        </span>
        <span style={{ height: 4, width: '64%', borderRadius: 99, background: '#E2E8F0', marginLeft: 9 }} />
      </span>
    )
  }

  if (kind === 'screen_title') {
    return (
      <span style={{ ...previewShell, padding: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, background: 'linear-gradient(180deg, #FFFFFF, #F8FAFC)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
          <span style={{ height: 4, width: 17, borderRadius: 99, background: '#BBF7D0' }} />
        </span>
        <span style={{ height: 6, width: '90%', borderRadius: 99, background: '#0F172A' }} />
        <span style={{ height: 4, width: '62%', borderRadius: 99, background: '#CBD5E1' }} />
      </span>
    )
  }

  if (kind === 'habit_card') {
    return (
      <span style={{ ...previewShell, padding: 5, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, background: 'linear-gradient(135deg, #ECFEFF, #FFFFFF)' }}>
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ width: 12, height: 12, borderRadius: 5, background: 'linear-gradient(135deg, #0891B2, #22D3EE)' }} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            <span style={{ height: 5, borderRadius: 99, background: '#0F172A' }} />
            <span style={{ height: 3, width: '70%', borderRadius: 99, background: '#94A3B8' }} />
          </span>
        </span>
        <span style={{ height: 4, borderRadius: 99, background: '#CFFAFE', overflow: 'hidden' }}>
          <span style={{ display: 'block', width: '72%', height: '100%', background: '#0891B2' }} />
        </span>
      </span>
    )
  }

  if (kind === 'friend_card') {
    return (
      <span style={{ ...previewShell, padding: 6, display: 'grid', gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 5 }}>
        <span style={{ display: 'flex' }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#06B6D4', border: '2px solid #FFFFFF' }} />
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#6366F1', border: '2px solid #FFFFFF', marginLeft: -6 }} />
        </span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ height: 5, borderRadius: 99, background: '#0F172A' }} />
          <span style={{ height: 4, width: '78%', borderRadius: 99, background: '#CBD5E1' }} />
        </span>
      </span>
    )
  }

  if (kind === 'progress_ring') {
    return (
      <span style={{ ...previewShell, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #ECFDF5, #FFFFFF)' }}>
        <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'conic-gradient(#10B981 0 78%, #DDE6F0 78% 100%)', padding: 4, boxShadow: '0 6px 12px rgba(5,150,105,0.18)' }}>
          <span style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#FFFFFF', color: '#064E3B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.54rem', fontWeight: 900 }}>12</span>
        </span>
      </span>
    )
  }

  if (kind === 'status_chip') {
    return (
      <span style={{ ...previewShell, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 5, background: '#F0FDF4' }}>
        <span style={{ width: '100%', height: 17, borderRadius: 999, background: 'linear-gradient(135deg, #059669, #10B981)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#FFFFFF' }} />
          <span style={{ width: 14, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.82)' }} />
        </span>
      </span>
    )
  }

  if (kind === 'primary_button') {
    return (
      <span style={{ ...previewShell, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6 }}>
        <span style={{ width: '100%', height: 17, borderRadius: 999, background: 'linear-gradient(135deg, #0891B2, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 12px rgba(8,145,178,0.2)' }}>
          <span style={{ width: 22, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.9)' }} />
        </span>
      </span>
    )
  }

  return <span style={{ ...previewShell, background: `linear-gradient(135deg, ${styles.bg}, #FFFFFF)` }} />
}

function ToolButton({
  active,
  kind,
  label,
  detail,
  variant = 'neutral',
  onClick,
}: {
  active?: boolean
  kind: ElementKind
  label: string
  detail?: string
  variant?: ElementVariant
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        border: active ? '1px solid #2563EB' : '1px solid #E2E8F0',
        background: active ? '#EFF6FF' : '#FFFFFF',
        color: '#111827',
        borderRadius: '8px',
        padding: '0.42rem',
        cursor: 'pointer',
        boxShadow: active ? '0 6px 16px rgba(37, 99, 235, 0.16)' : '0 2px 8px rgba(15, 23, 42, 0.05)',
      }}
    >
      <span style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', gap: '0.48rem', alignItems: 'center' }}>
        <ComponentPreview kind={kind} variant={variant} />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
          {detail && <span style={{ display: 'block', fontSize: '0.6rem', color: '#64748B', lineHeight: 1.25, marginTop: '0.16rem' }}>{detail}</span>}
        </span>
      </span>
    </button>
  )
}

function MiniButton({
  children,
  onClick,
  disabled,
  dataAction,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  dataAction?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-ui-action={dataAction}
      style={{
        border: '1px solid #D1D5DB',
        background: disabled ? '#F1F5F9' : '#FFFFFF',
        color: '#111827',
        borderRadius: '6px',
        padding: '0.32rem 0.5rem',
        fontSize: '0.66rem',
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#475569' }}>{children}</label>
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  disabled?: boolean
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
      <span style={{ fontSize: '0.58rem', fontWeight: 900, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0 }}>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={1}
        value={Math.round(value)}
        disabled={disabled}
        onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
        style={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          border: '1px solid #CBD5E1',
          background: disabled ? '#F1F5F9' : '#FFFFFF',
          color: '#111827',
          padding: '0.32rem 0.38rem',
          borderRadius: 6,
          fontSize: '0.68rem',
          fontWeight: 800,
        }}
      />
    </label>
  )
}

function ReadinessChecklist({ checks }: { checks: StudioChecks }) {
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <PanelTitle>Before Save</PanelTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem', alignItems: 'start', fontSize: '0.66rem', lineHeight: 1.3 }}>
          <span style={{ color: checks.enoughElements ? '#047857' : '#B45309', fontWeight: 900 }}>{checks.enoughElements ? 'Done' : 'Missing'}</span>
          <span>Add at least {checks.minElements} screen layers.</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem', alignItems: 'start', fontSize: '0.66rem', lineHeight: 1.3 }}>
          <span style={{ color: checks.notesReady ? '#047857' : '#B45309', fontWeight: 900 }}>{checks.notesReady ? 'Done' : 'Missing'}</span>
          <span>Write a short build note for engineering.</span>
        </div>
        {checks.requirements.map((item) => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem', alignItems: 'start', fontSize: '0.66rem', lineHeight: 1.3 }}>
            <span style={{ color: item.met ? '#047857' : '#B45309', fontWeight: 900 }}>{item.met ? 'Done' : 'Missing'}</span>
            <span>
              {item.label}
              {!item.met && <span style={{ display: 'block', color: '#64748B', marginTop: 2 }}>{item.hint}</span>}
            </span>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.4rem', alignItems: 'start', fontSize: '0.66rem', lineHeight: 1.3 }}>
          <span style={{ color: checks.buttonOverlap ? '#B45309' : '#047857', fontWeight: 900 }}>{checks.buttonOverlap ? 'Fix' : 'Done'}</span>
          <span>
            Buttons do not overlap.
            {checks.buttonOverlap && <span style={{ display: 'block', color: '#64748B', marginTop: 2 }}>Move or resize: {checks.buttonOverlapLabels.join(', ')}.</span>}
          </span>
        </div>
      </div>
    </div>
  )
}

function renderDesignElementContent(element: DesignElement) {
  const styles = variantStyles[element.variant]
  const cardShadow = '0 8px 18px rgba(15, 23, 42, 0.08)'

  if (element.kind === 'top_bar') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', height: '100%', gap: 7, padding: '0 0.55rem', background: 'rgba(255,255,255,0.94)' }}>
        <span style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.74rem', fontWeight: 900, color: '#475569', background: '#FFFFFF' }}>&lt;</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#0F172A', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.label}</div>
          <div style={{ fontSize: '0.46rem', fontWeight: 800, color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.detail}</div>
        </div>
        <span style={{ width: 18, height: 18, borderRadius: '50%', background: `linear-gradient(135deg, ${styles.accent}, #6366F1)`, boxShadow: '0 0 0 3px #E0F2FE' }} />
      </div>
    )
  }

  if (element.kind === 'screen_title') {
    return (
      <div style={{ height: '100%', padding: '0.4rem 0.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, background: 'linear-gradient(180deg, #FFFFFF, #F8FAFC)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 0 4px #D1FAE5' }} />
          <span style={{ fontSize: '0.48rem', color: '#047857', fontWeight: 900, textTransform: 'uppercase' }}>Accepted</span>
        </div>
        <div style={{ fontSize: '0.86rem', fontWeight: 900, lineHeight: 1.02, color: '#0F172A', overflowWrap: 'anywhere' }}>{element.label}</div>
        <div style={{ fontSize: '0.52rem', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.detail}</div>
      </div>
    )
  }

  if (element.kind === 'progress_ring') {
    return (
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)', alignItems: 'center', gap: 8, padding: '0.42rem 0.5rem', background: 'linear-gradient(135deg, #ECFDF5, #FFFFFF)' }}>
        <div style={{ width: 46, aspectRatio: '1', borderRadius: '50%', background: `conic-gradient(${styles.accent} 0 78%, #DDE6F0 78% 100%)`, padding: 5, boxShadow: '0 8px 18px rgba(5, 150, 105, 0.18)', flexShrink: 0 }}>
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 900, color: '#064E3B' }}>{element.label.replace(/[^0-9]/g, '') || element.label}</span>
            <span style={{ fontSize: '0.38rem', fontWeight: 900, color: '#059669', textTransform: 'uppercase' }}>days</span>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.62rem', color: '#064E3B', fontWeight: 900, lineHeight: 1.08, overflowWrap: 'anywhere' }}>{element.label}</div>
          <div style={{ marginTop: 3, fontSize: '0.48rem', color: '#64748B', fontWeight: 800, lineHeight: 1.18 }}>{element.detail}</div>
          <div style={{ marginTop: 5, height: 5, borderRadius: 99, background: '#D1FAE5', overflow: 'hidden' }}>
            <div style={{ width: '78%', height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${styles.accent}, #10B981)` }} />
          </div>
        </div>
      </div>
    )
  }

  if (element.kind === 'friend_card') {
    return (
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 7, padding: '0.45rem 0.55rem', background: 'linear-gradient(135deg, #FFFFFF, #F8FAFC)' }}>
        <div style={{ display: 'flex', flexShrink: 0 }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #06B6D4, #0891B2)', border: '2px solid #FFFFFF', boxShadow: cardShadow }} />
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #8B5CF6, #6366F1)', border: '2px solid #FFFFFF', marginLeft: -8, boxShadow: cardShadow }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.label}</div>
          <div style={{ fontSize: '0.52rem', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.detail}</div>
        </div>
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#DCFCE7', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.5rem', fontWeight: 900 }}>OK</div>
      </div>
    )
  }

  if (element.kind === 'habit_card') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6, padding: '0.5rem 0.6rem', background: `linear-gradient(135deg, ${styles.bg}, #FFFFFF)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
          <span style={{ width: 24, height: 24, borderRadius: 9, background: `linear-gradient(135deg, ${styles.accent}, #22D3EE)`, boxShadow: '0 8px 18px rgba(8, 145, 178, 0.18)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.label}</div>
            <div style={{ fontSize: '0.5rem', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.detail}</div>
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: '#DDE6F0', overflow: 'hidden' }}>
          <div style={{ width: '72%', height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${styles.accent}, #10B981)` }} />
        </div>
      </div>
    )
  }

  if (element.kind === 'primary_button' || element.kind === 'secondary_button') {
    const primary = element.kind === 'primary_button'
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 0.5rem', borderRadius: '999px', background: primary ? 'linear-gradient(135deg, #0891B2, #10B981)' : '#FFFFFF', color: primary ? '#FFFFFF' : '#0F172A', border: primary ? 'none' : `1px solid ${styles.border}`, boxShadow: primary ? '0 9px 18px rgba(8,145,178,0.22)' : '0 6px 12px rgba(15,23,42,0.08)', fontSize: '0.66rem', fontWeight: 900, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: primary ? 'rgba(255,255,255,0.82)' : styles.accent, flexShrink: 0 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.label}</span>
      </div>
    )
  }

  if (element.kind === 'shape_horizontal') {
    return (
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', alignItems: 'center', gap: 3, padding: '0.32rem 0.45rem', background: 'linear-gradient(135deg, #ECFEFF, #F8FAFC)' }}>
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} style={{ height: '100%', minHeight: 18, borderRadius: 999, background: index < 5 ? `linear-gradient(180deg, ${styles.accent}, #10B981)` : '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: index < 5 ? '#FFFFFF' : '#64748B', fontSize: '0.48rem', fontWeight: 900 }}>
            {index + 1}
          </div>
        ))}
      </div>
    )
  }

  if (element.kind === 'shape_square') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #EFF6FF, #FFFFFF)' }}>
        <div style={{ width: '58%', aspectRatio: '1', borderRadius: '50%', background: 'linear-gradient(135deg, #06B6D4, #6366F1)', boxShadow: cardShadow, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontSize: '0.62rem', fontWeight: 900 }}>
          {element.label.slice(0, 1)}
        </div>
      </div>
    )
  }

  if (element.kind === 'shape_vertical' || element.kind === 'freeform_vertical') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 5, padding: '0.5rem', textAlign: 'left', background: 'linear-gradient(160deg, #FFFFFF, #F8FAFC)' }}>
        <span style={{ width: 24, height: 24, borderRadius: 10, background: `linear-gradient(135deg, ${styles.accent}, #14B8A6)`, display: 'block', boxShadow: cardShadow }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.12, overflowWrap: 'anywhere' }}>{element.label}</div>
          <div style={{ fontSize: '0.48rem', color: '#64748B', fontWeight: 700, lineHeight: 1.15, marginTop: 3 }}>{element.detail}</div>
        </div>
      </div>
    )
  }

  if (element.kind === 'freeform_rectangle') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '0.35rem 0.5rem', textAlign: 'left', background: 'linear-gradient(135deg, #FFFFFF, #F8FAFC)' }}>
        <span style={{ width: 18, height: 18, borderRadius: 7, background: styles.accent, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 900, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.label}</div>
          <div style={{ fontSize: '0.48rem', color: '#64748B', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.detail}</div>
        </div>
      </div>
    )
  }

  if (element.kind === 'status_chip') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '0 0.5rem', borderRadius: '999px', background: 'linear-gradient(135deg, #059669, #10B981)', color: '#FFFFFF', fontSize: '0.56rem', fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 8px 16px rgba(5,150,105,0.22)' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FFFFFF' }} />
        {element.label}
      </div>
    )
  }

  if (element.kind === 'tab_bar') {
    return (
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'center', gap: 4, padding: '0.35rem', background: 'rgba(255,255,255,0.96)', borderTop: '1px solid #E2E8F0' }}>
        {['Home', 'Habits', 'Profile'].map((item, index) => (
          <div key={item} style={{ textAlign: 'center', fontSize: '0.54rem', fontWeight: index === 1 ? 900 : 700, color: index === 1 ? '#0891B2' : '#64748B' }}>
            <div style={{ width: 16, height: 16, borderRadius: 7, background: index === 1 ? 'linear-gradient(135deg, #0891B2, #10B981)' : '#CBD5E1', margin: '0 auto 2px', boxShadow: index === 1 ? '0 5px 10px rgba(8,145,178,0.18)' : 'none' }} />
            {item}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '0.45rem 0.55rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, background: 'linear-gradient(135deg, #FFFFFF, #F8FAFC)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {element.kind === 'friend_card' && (
          <div style={{ display: 'flex', flexShrink: 0 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#0891B2', border: '2px solid #FFFFFF' }} />
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#6366F1', border: '2px solid #FFFFFF', marginLeft: -7 }} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.label}</div>
          <div style={{ fontSize: '0.54rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.detail}</div>
        </div>
      </div>
      {element.kind === 'habit_card' && (
        <div style={{ height: 5, borderRadius: 99, background: '#CBD5E1', overflow: 'hidden' }}>
          <div style={{ width: '64%', height: '100%', background: styles.accent }} />
        </div>
      )}
    </div>
  )
}

export default function ScreenDesignStudioScene({ node }: { node: ScreenDesignStudioNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const phoneRef = useRef<HTMLDivElement>(null)
  const designCanvasRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [resize, setResize] = useState<ResizeState | null>(null)
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [canvasPan, setCanvasPan] = useState<CanvasPanState | null>(null)
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [designCanvasWidth, setDesignCanvasWidth] = useState(220)
  const [isCompactViewport, setIsCompactViewport] = useState(false)
  const [historyPast, setHistoryPast] = useState<StudioState[]>([])
  const [historyFuture, setHistoryFuture] = useState<StudioState[]>([])

  const templateVars = { playerName, branchFlags, mcSelections }
  const studio = parseStudioState(responses[node.bindingKey])
  const checks = buildChecks(studio, node)
  const selectedElement = studio.elements.find((item) => item.id === studio.selectedId)
  const selectedElementLocked = Boolean(selectedElement?.locked)
  const visibleLayerCount = visibleElements(studio).length
  const canSubmit = checks.enoughElements && checks.notesReady && checks.requiredConceptsReady && !checks.buttonOverlap
  const nextMissingRequirement = checks.requirements.find((item) => !item.met)
  const saveHelp = !checks.enoughElements
    ? `Add at least ${checks.minElements} layers to the mobile screen.`
    : !checks.notesReady
      ? 'Write the implementation note so engineering knows why this screen works.'
      : nextMissingRequirement
        ? nextMissingRequirement.hint
        : checks.buttonOverlap
          ? `Move or resize overlapping buttons: ${checks.buttonOverlapLabels.join(', ')}.`
          : 'Ready to save.'
  const phoneCanvasWidth = clamp(designCanvasWidth - 32, 72, 220)
  const phoneCanvasHeight = Math.round(phoneCanvasWidth * phoneCanvasAspectRatio)
  const phoneShellPadding = clamp(phoneCanvasWidth * 0.055, 4, 12)
  const phoneShellRadius = clamp(phoneCanvasWidth * 0.14, 14, 30)
  const phoneCanvasRadius = clamp(phoneCanvasWidth * 0.11, 12, 24)
  const phoneNotchWidth = clamp(phoneCanvasWidth * 0.33, 28, 72)
  const phoneNotchTop = clamp(phoneCanvasWidth * 0.036, 4, 8)
  const phoneContentTop = clamp(phoneCanvasWidth * 0.082, 10, 18)
  const activeStudioGridColumns = isCompactViewport ? '132px minmax(220px, 1fr) 178px' : studioGridColumns
  const phoneStageHeight = (phoneCanvasHeight + phoneShellPadding * 2 + 52) * canvasZoom

  const getCanvasPanLimits = () => {
    const canvasHeight = designCanvasRef.current?.getBoundingClientRect().height ?? 480
    return {
      minX: -280,
      maxX: 280,
      minY: Math.min(24, canvasHeight - phoneStageHeight - 28),
      maxY: 120,
    }
  }

  const clampCanvasOffset = (offset: { x: number; y: number }) => {
    const limits = getCanvasPanLimits()
    return {
      x: clamp(offset.x, limits.minX, limits.maxX),
      y: clamp(offset.y, limits.minY, limits.maxY),
    }
  }

  const setClampedCanvasOffset = (next: { x: number; y: number } | ((current: { x: number; y: number }) => { x: number; y: number })) => {
    setCanvasOffset((current) => clampCanvasOffset(typeof next === 'function' ? next(current) : next))
  }

  useEffect(() => {
    const canvas = designCanvasRef.current
    if (!canvas) return

    const updateCanvasWidth = () => {
      setDesignCanvasWidth(canvas.getBoundingClientRect().width)
    }

    updateCanvasWidth()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(updateCanvasWidth)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const updateViewport = () => setIsCompactViewport(window.innerWidth < 760)
    updateViewport()
    window.addEventListener('resize', updateViewport)
    return () => window.removeEventListener('resize', updateViewport)
  }, [])

  const pushHistory = (current: StudioState) => {
    setHistoryPast((items) => [...items.slice(-39), current])
    setHistoryFuture([])
  }

  const persistStudio = (next: StudioState, recordHistory = true) => {
    if (recordHistory) pushHistory(studio)
    setFreeTextResponse(node.bindingKey, serializeStudioState(next))
  }

  const updateStudio = (patch: Partial<StudioState>, recordHistory = true) => {
    persistStudio({ ...studio, ...patch }, recordHistory)
  }

  const updateElement = (id: string, patch: Partial<DesignElement>, recordHistory = true) => {
    const nextElements = studio.elements.map((item) => {
      if (item.id !== id) return item
      const controlPatch = Object.prototype.hasOwnProperty.call(patch, 'locked') || Object.prototype.hasOwnProperty.call(patch, 'hidden')
      if (item.locked && !controlPatch) return item
      const next = { ...item, ...patch }
      const w = clamp(next.w, minElementWidth, maxElementWidth)
      const h = clamp(next.h, minElementHeight, maxElementHeight)
      return {
        ...next,
        x: clamp(next.x, 0, 100 - w),
        y: clamp(next.y, 0, 100 - h),
        w,
        h,
        locked: Boolean(next.locked),
        hidden: Boolean(next.hidden),
        opacity: clamp(typeof next.opacity === 'number' ? next.opacity : 1, 0.25, 1),
      }
    })
    persistStudio({ ...studio, elements: nextElements }, recordHistory)
  }

  const addElement = (kind: ElementKind) => {
    const definition = componentDefinitions.find((item) => item.kind === kind)
    if (!definition) return

    const duplicateCount = studio.elements.filter((item) => item.kind === kind).length
    const placement = defaultPlacements[kind]
    const x = clamp(placement.x + duplicateCount * 4, 0, 100 - definition.w)
    const y = clamp(placement.y + duplicateCount * 5, 0, 100 - definition.h)
    const element: DesignElement = {
      id: `el_${Date.now()}_${kind}`,
      kind,
      label: definition.label,
      detail: definition.detail,
      x,
      y,
      w: definition.w,
      h: definition.h,
      variant: definition.variant,
      locked: false,
      hidden: false,
      opacity: 1,
    }
    persistStudio({ ...studio, elements: [...studio.elements, element], selectedId: element.id })
  }

  const removeSelected = () => {
    if (!selectedElement || selectedElement.locked) return
    persistStudio({
      ...studio,
      elements: studio.elements.filter((item) => item.id !== selectedElement.id),
      selectedId: undefined,
    })
  }

  const duplicateSelected = () => {
    if (!selectedElement || selectedElement.locked) return
    const copy: DesignElement = {
      ...selectedElement,
      id: `el_${Date.now()}_${selectedElement.kind}`,
      x: clamp(selectedElement.x + 5, 0, 100 - selectedElement.w),
      y: clamp(selectedElement.y + 5, 0, 100 - selectedElement.h),
      locked: false,
      hidden: false,
    }
    persistStudio({ ...studio, elements: [...studio.elements, copy], selectedId: copy.id })
  }

  const reorderSelected = (direction: 'forward' | 'back') => {
    if (!selectedElement || selectedElement.locked) return
    const rest = studio.elements.filter((item) => item.id !== selectedElement.id)
    const elements = direction === 'forward' ? [...rest, selectedElement] : [selectedElement, ...rest]
    persistStudio({ ...studio, elements })
  }

  const buildResizePatch = (state: ResizeState, dx: number, dy: number): Partial<DesignElement> => {
    const patch: Partial<DesignElement> = {}

    if (state.handle.includes('e')) {
      patch.w = clamp(state.originW + dx, minElementWidth, Math.min(maxElementWidth, 100 - state.originX))
    }

    if (state.handle.includes('s')) {
      patch.h = clamp(state.originH + dy, minElementHeight, Math.min(maxElementHeight, 100 - state.originY))
    }

    if (state.handle.includes('w')) {
      const right = state.originX + state.originW
      const w = clamp(state.originW - dx, minElementWidth, Math.min(maxElementWidth, right))
      patch.x = right - w
      patch.w = w
    }

    if (state.handle.includes('n')) {
      const bottom = state.originY + state.originH
      const h = clamp(state.originH - dy, minElementHeight, Math.min(maxElementHeight, bottom))
      patch.y = bottom - h
      patch.h = h
    }

    return patch
  }

  const undo = () => {
    const previous = historyPast[historyPast.length - 1]
    if (!previous) return
    setHistoryPast((items) => items.slice(0, -1))
    setHistoryFuture((items) => [studio, ...items.slice(0, 39)])
    setDrag(null)
    setResize(null)
    setFreeTextResponse(node.bindingKey, serializeStudioState(previous))
  }

  const redo = () => {
    const next = historyFuture[0]
    if (!next) return
    setHistoryFuture((items) => items.slice(1))
    setHistoryPast((items) => [...items.slice(-39), studio])
    setDrag(null)
    setResize(null)
    setFreeTextResponse(node.bindingKey, serializeStudioState(next))
  }

  const onElementPointerDown = (event: PointerEvent<HTMLDivElement>, element: DesignElement) => {
    if (studio.mode === 'preview') return
    event.stopPropagation()
    updateStudio({ selectedId: element.id }, false)
    if (element.locked) return
    pushHistory(studio)
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      id: element.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: element.x,
      originY: element.y,
    })
  }

  const onResizePointerDown = (event: PointerEvent<HTMLButtonElement>, element: DesignElement, handle: ResizeHandle) => {
    if (studio.mode === 'preview' || element.locked) return
    event.stopPropagation()
    updateStudio({ selectedId: element.id }, false)
    pushHistory(studio)
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag(null)
    setResize({
      id: element.id,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: element.x,
      originY: element.y,
      originW: element.w,
      originH: element.h,
    })
  }

  const onPhonePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!phoneRef.current) {
      if (canvasPan && !resize && !drag) onCanvasPointerMove(event)
      return
    }

    if (resize) {
      const element = studio.elements.find((item) => item.id === resize.id)
      if (!element) return

      const rect = phoneRef.current.getBoundingClientRect()
      const dx = ((event.clientX - resize.startClientX) / rect.width) * 100
      const dy = ((event.clientY - resize.startClientY) / rect.height) * 100
      updateElement(resize.id, buildResizePatch(resize, dx, dy), false)
      return
    }

    if (!drag) {
      if (canvasPan) onCanvasPointerMove(event)
      return
    }

    const element = studio.elements.find((item) => item.id === drag.id)
    if (!element) return

    const rect = phoneRef.current.getBoundingClientRect()
    const dx = ((event.clientX - drag.startClientX) / rect.width) * 100
    const dy = ((event.clientY - drag.startClientY) / rect.height) * 100
    updateElement(drag.id, {
      x: clamp(drag.originX + dx, 0, 100 - element.w),
      y: clamp(drag.originY + dy, 0, 100 - element.h),
    }, false)
  }

  const onCanvasPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (studio.mode === 'preview' || drag || resize) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setCanvasPan({
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: canvasOffset.x,
      originY: canvasOffset.y,
    })
  }

  const onCanvasPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!canvasPan) return
    setClampedCanvasOffset({
      x: canvasPan.originX + event.clientX - canvasPan.startClientX,
      y: canvasPan.originY + event.clientY - canvasPan.startClientY,
    })
  }

  const stopCanvasPan = () => setCanvasPan(null)

  const onPhoneCanvasPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (studio.mode === 'preview') return
    event.stopPropagation()
    updateStudio({ selectedId: undefined }, false)
    event.currentTarget.setPointerCapture(event.pointerId)
    setCanvasPan({
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: canvasOffset.x,
      originY: canvasOffset.y,
    })
  }

  const onCanvasWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    setClampedCanvasOffset((current) => ({
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }))
  }

  const jumpPhoneView = (position: 'top' | 'bottom') => {
    const limits = getCanvasPanLimits()
    setClampedCanvasOffset((current) => ({
      ...current,
      y: position === 'top' ? 0 : limits.minY,
    }))
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT' || target?.isContentEditable
      const modifier = event.metaKey || event.ctrlKey

      if (isTyping) return

      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }

      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }

      if (studio.mode === 'preview' || !selectedElement || selectedElement.locked) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        removeSelected()
        return
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return

      event.preventDefault()
      const step = event.shiftKey ? 5 : 1
      const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
      const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
      updateElement(selectedElement.id, {
        x: selectedElement.x + dx,
        y: selectedElement.y + dy,
      })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0 }}>
            Design studio
          </div>
        </div>

        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, templateVars))}
          </div>
        )}

        <div style={{ backgroundColor: '#fff', border: '1px solid #000', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.55, whiteSpace: 'pre-line' }}>
          {interpolate(node.prompt, templateVars)}
        </div>

	        <DesktopOverlay width={isCompactViewport ? '92%' : undefined} height={isCompactViewport ? '82%' : undefined} minHeight={isCompactViewport ? '680px' : undefined}>
          <LaptopFrame variant="figma" title={node.windowTitle ?? 'Friend Streaks Mockup.fig'} fill showFigmaToolbar={false}>
	            <div data-ui-surface="realistic-screen-design-tool" style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#F8FAFC', color: '#111827' }}>
	              <div style={{ height: isCompactViewport ? 64 : 38, flexShrink: 0, borderBottom: '1px solid #E5E7EB', display: 'flex', flexDirection: isCompactViewport ? 'column' : 'row', alignItems: isCompactViewport ? 'stretch' : 'center', justifyContent: isCompactViewport ? 'center' : 'space-between', gap: isCompactViewport ? '0.25rem' : 0, padding: isCompactViewport ? '0.35rem 0.5rem' : '0 0.75rem', background: '#FFFFFF' }}>
	                <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCompactViewport ? 'space-between' : 'flex-start', gap: '0.45rem', minWidth: 0 }}>
	                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
	                    <span style={{ fontSize: '0.72rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{studio.screenLabel}</span>
	                    <span style={{ fontSize: '0.62rem', color: '#64748B', whiteSpace: 'nowrap' }}>{visibleLayerCount}/{studio.elements.length} visible</span>
	                  </div>
	                  {isCompactViewport && (
	                    <span style={{ fontSize: '0.62rem', color: canSubmit ? '#047857' : '#B45309', fontWeight: 900, whiteSpace: 'nowrap' }}>
	                      {canSubmit ? 'Ready' : 'Needs work'}
	                    </span>
	                  )}
	                </div>
	                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', justifyContent: 'flex-end' }}>
	                  {!isCompactViewport && (
	                    <span style={{ fontSize: '0.62rem', color: canSubmit ? '#047857' : '#B45309', fontWeight: 900, whiteSpace: 'nowrap' }}>
	                      {canSubmit ? 'Ready' : 'Needs work'}
	                    </span>
	                  )}
	                  <MiniButton onClick={undo} disabled={historyPast.length === 0}>Undo</MiniButton>
	                  <MiniButton onClick={redo} disabled={historyFuture.length === 0}>Redo</MiniButton>
	                  <MiniButton onClick={() => updateStudio({ mode: 'edit' }, false)} disabled={studio.mode === 'edit'}>Edit</MiniButton>
	                  <MiniButton onClick={() => updateStudio({ mode: 'preview', selectedId: undefined }, false)} disabled={studio.mode === 'preview'}>Preview</MiniButton>
	                  <MiniButton onClick={() => goNext(node)} disabled={!canSubmit}>Save</MiniButton>
	                </div>
	              </div>

              <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: activeStudioGridColumns, overflowX: isCompactViewport ? 'auto' : 'visible' }}>
                <aside style={{ borderRight: '1px solid #E5E7EB', background: '#FFFFFF', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                  <PanelTitle>Layers</PanelTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    {studio.elements.length === 0 ? (
                      <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, padding: '0.55rem', color: '#64748B', background: '#F8FAFC', fontSize: '0.66rem', lineHeight: 1.35 }}>
                        Add components below, then select layers here to edit, hide, lock, or reorder them.
                      </div>
                    ) : (
                      [...studio.elements].reverse().map((element) => {
                        const active = studio.selectedId === element.id
                        return (
                          <div
                            key={element.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                              gap: '0.25rem',
                              alignItems: 'center',
                              border: active ? '1px solid #2563EB' : '1px solid #E2E8F0',
                              borderRadius: 8,
                              background: active ? '#EFF6FF' : '#FFFFFF',
                              padding: '0.28rem',
                              opacity: element.hidden ? 0.62 : 1,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => updateStudio({ selectedId: element.id }, false)}
                              style={{
                                minWidth: 0,
                                border: 'none',
                                background: 'transparent',
                                color: '#111827',
                                padding: '0.1rem',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              <span style={{ display: 'block', fontSize: '0.64rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {element.label}
                              </span>
                              <span style={{ display: 'block', fontSize: '0.54rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {element.hidden ? 'Hidden' : 'Shown'}{element.locked ? ' · Locked' : ''}
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => updateElement(element.id, { hidden: !element.hidden })}
                              style={{ border: '1px solid #D1D5DB', borderRadius: 5, background: '#FFFFFF', padding: '0.22rem 0.28rem', fontSize: '0.56rem', fontWeight: 900, cursor: 'pointer' }}
                            >
                              {element.hidden ? 'Show' : 'Hide'}
                            </button>
                            <button
                              type="button"
                              onClick={() => updateElement(element.id, { locked: !element.locked })}
                              style={{ border: '1px solid #D1D5DB', borderRadius: 5, background: '#FFFFFF', padding: '0.22rem 0.28rem', fontSize: '0.56rem', fontWeight: 900, cursor: 'pointer' }}
                            >
                              {element.locked ? 'Unlock' : 'Lock'}
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <PanelTitle>Components</PanelTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {paletteComponentDefinitions.map((item) => (
                      <ToolButton
                        key={item.kind}
                        kind={item.kind}
                        label={item.label}
                        detail={item.detail}
                        variant={item.variant}
                        onClick={() => addElement(item.kind)}
                      />
                    ))}
                  </div>
                </aside>

                <main
                  ref={designCanvasRef}
                  onPointerDown={onCanvasPointerDown}
                  onPointerMove={onCanvasPointerMove}
                  onPointerUp={stopCanvasPan}
                  onPointerCancel={stopCanvasPan}
                  onWheel={onCanvasWheel}
                  style={{
                    minWidth: 0,
                    minHeight: 0,
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#E5E7EB',
                    cursor: studio.mode === 'preview' ? 'default' : canvasPan ? 'grabbing' : 'grab',
                    touchAction: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0.55,
                      backgroundImage: 'linear-gradient(#CBD5E1 1px, transparent 1px), linear-gradient(90deg, #CBD5E1 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                  <div
                    onPointerDown={(event) => event.stopPropagation()}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: 10,
                      zIndex: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      border: '1px solid #E2E8F0',
                      background: 'rgba(255,255,255,0.92)',
                      borderRadius: 8,
                      padding: '0.28rem',
                      boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
                    }}
                  >
                    <MiniButton onClick={() => jumpPhoneView('top')} dataAction="phone-view-top">Top</MiniButton>
                    <MiniButton onClick={() => setCanvasZoom((value) => clamp(value - 0.1, 0.7, 1.4))} disabled={canvasZoom <= 0.7}>-</MiniButton>
                    <span style={{ minWidth: 34, textAlign: 'center', color: '#475569', fontSize: '0.62rem', fontWeight: 900 }}>{Math.round(canvasZoom * 100)}%</span>
                    <MiniButton onClick={() => setCanvasZoom((value) => clamp(value + 0.1, 0.7, 1.4))} disabled={canvasZoom >= 1.4}>+</MiniButton>
                    <MiniButton onClick={() => jumpPhoneView('bottom')} dataAction="phone-view-bottom">Bottom</MiniButton>
                  </div>
                  <div
                    data-ui-surface="phone-stage"
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '1rem',
                      transform: `translate(calc(-50% + ${canvasOffset.x}px), ${canvasOffset.y}px) scale(${canvasZoom})`,
                      transformOrigin: 'top center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.55rem',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', color: '#475569', fontWeight: 800, background: 'rgba(255,255,255,0.86)', border: '1px solid #E2E8F0', borderRadius: 999, padding: '0.22rem 0.58rem' }}>{studio.mode === 'edit' ? 'Scroll or drag empty space to reach the full phone' : 'Prototype preview'}</div>
                    <div style={{ padding: phoneShellPadding, borderRadius: phoneShellRadius, background: '#0F172A', boxShadow: '0 18px 42px rgba(15, 23, 42, 0.34)', cursor: studio.mode === 'preview' ? 'default' : canvasPan ? 'grabbing' : 'grab' }}>
                      <div
                        data-ui-surface="phone-artboard"
                        ref={phoneRef}
                        onPointerMove={onPhonePointerMove}
                        onPointerUp={() => {
                          setDrag(null)
                          setResize(null)
                          stopCanvasPan()
                        }}
                        onPointerCancel={() => {
                          setDrag(null)
                          setResize(null)
                          stopCanvasPan()
                        }}
                        onPointerDown={onPhoneCanvasPointerDown}
                        style={{
                          position: 'relative',
                          width: phoneCanvasWidth,
                          height: phoneCanvasHeight,
                          borderRadius: phoneCanvasRadius,
                          overflow: 'hidden',
                          background: '#F8FAFC',
                          border: '1px solid rgba(255,255,255,0.16)',
                          touchAction: 'none',
                        }}
                      >
                        <div style={{ position: 'absolute', top: phoneNotchTop, left: '50%', transform: 'translateX(-50%)', width: phoneNotchWidth, height: 4, borderRadius: 99, background: '#0F172A' }} />
                        <div style={{ position: 'absolute', inset: `${phoneContentTop}px 0 0 0`, pointerEvents: 'none' }}>
                          <div style={{ fontSize: '0.58rem', color: '#64748B', textAlign: 'center', fontWeight: 800 }}>{studio.screenLabel}</div>
                        </div>

                        {studio.elements.map((element) => {
                          if (element.hidden) return null
                          const selected = studio.selectedId === element.id && studio.mode === 'edit'
                          const styles = variantStyles[element.variant]
                          return (
                            <div
                              key={element.id}
                              onPointerDown={(event) => onElementPointerDown(event, element)}
                              style={{
                                position: 'absolute',
                                left: `${element.x}%`,
                                top: `${element.y}%`,
                                width: `${element.w}%`,
                                height: `${element.h}%`,
                                boxSizing: 'border-box',
                                border: selected ? (element.locked ? '2px dashed #475569' : '2px solid #2563EB') : `1px solid ${styles.border}`,
	                                borderRadius: element.kind.includes('button') || element.kind === 'status_chip' || element.kind === 'shape_horizontal' ? '999px' : element.kind.startsWith('shape_') || element.kind.startsWith('freeform_') ? '6px' : '8px',
	                                background: element.kind.includes('button') || element.kind === 'status_chip' ? 'transparent' : styles.bg,
                                color: styles.text,
                                boxShadow: selected ? '0 0 0 3px rgba(37, 99, 235, 0.18), 0 8px 18px rgba(37, 99, 235, 0.12)' : '0 2px 8px rgba(15, 23, 42, 0.08)',
                                cursor: studio.mode === 'edit' ? (element.locked ? 'not-allowed' : 'grab') : 'default',
                                overflow: selected ? 'visible' : 'hidden',
                                userSelect: 'none',
                                opacity: element.opacity ?? 1,
                              }}
                            >
                              <div style={{ width: '100%', height: '100%', borderRadius: 'inherit', overflow: 'hidden', pointerEvents: 'none' }}>
                                {renderDesignElementContent(element)}
                              </div>
                              {selected && !element.locked && (
                                <>
                                  {resizeHandles.map((handle) => (
                                    <button
                                      key={handle}
                                      type="button"
                                      aria-label={`Resize ${element.label} from ${resizeHandleLabels[handle]}`}
                                      data-ui-action={`resize-${handle}`}
                                      onPointerDown={(event) => onResizePointerDown(event, element, handle)}
                                      style={resizeHandleButtonStyle(handle)}
                                    >
                                      <span style={resizeHandleVisualStyle(handle)} />
                                    </button>
                                  ))}
                                </>
                              )}
                              {selected && element.locked && (
                                <div style={{ position: 'absolute', right: 3, top: 3, borderRadius: 999, background: '#475569', color: '#FFFFFF', padding: '1px 5px', fontSize: '0.48rem', fontWeight: 900 }}>
                                  Locked
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </main>

	                <aside style={{ borderLeft: '1px solid #E5E7EB', background: '#FFFFFF', padding: '0.65rem', minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
	                  <PanelTitle>Inspector</PanelTitle>
	                  <ReadinessChecklist checks={checks} />

	                  {selectedElement ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', alignItems: 'flex-start' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedElement.label}</div>
                            <div style={{ fontSize: '0.58rem', color: '#64748B', fontWeight: 800 }}>{selectedElement.kind.replace(/_/g, ' ')}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                            <MiniButton onClick={() => updateElement(selectedElement.id, { hidden: !selectedElement.hidden })}>{selectedElement.hidden ? 'Show' : 'Hide'}</MiniButton>
                            <MiniButton onClick={() => updateElement(selectedElement.id, { locked: !selectedElement.locked })}>{selectedElement.locked ? 'Unlock' : 'Lock'}</MiniButton>
                          </div>
                        </div>
                        {selectedElementLocked && (
                          <div style={{ border: '1px solid #CBD5E1', borderRadius: 6, background: '#FFFFFF', color: '#475569', padding: '0.38rem', fontSize: '0.62rem', lineHeight: 1.35, fontWeight: 700 }}>
                            Unlock this layer before editing its text, size, position, or order.
                          </div>
                        )}
                      </div>

                      <FieldLabel>Layer label</FieldLabel>
                      <input
                        value={selectedElement.label}
                        disabled={selectedElementLocked}
                        onChange={(event) => updateElement(selectedElement.id, { label: event.target.value })}
                        style={{ border: '1px solid #CBD5E1', background: selectedElementLocked ? '#F1F5F9' : '#FFFFFF', color: '#111827', padding: '0.38rem 0.45rem', borderRadius: 6, fontSize: '0.75rem' }}
                      />

                      <FieldLabel>Supporting text</FieldLabel>
                      <textarea
                        value={selectedElement.detail}
                        disabled={selectedElementLocked}
                        onChange={(event) => updateElement(selectedElement.id, { detail: event.target.value })}
                        rows={3}
                        style={{ border: '1px solid #CBD5E1', background: selectedElementLocked ? '#F1F5F9' : '#FFFFFF', color: '#111827', padding: '0.38rem 0.45rem', borderRadius: 6, fontSize: '0.72rem', resize: 'vertical' }}
                      />

                      <FieldLabel>Variant</FieldLabel>
                      <select
                        value={selectedElement.variant}
                        disabled={selectedElementLocked}
                        onChange={(event) => updateElement(selectedElement.id, { variant: event.target.value as ElementVariant })}
                        style={{ border: '1px solid #CBD5E1', background: selectedElementLocked ? '#F1F5F9' : '#FFFFFF', color: '#111827', padding: '0.38rem 0.45rem', borderRadius: 6, fontSize: '0.72rem' }}
                      >
                        <option value="neutral">Neutral</option>
                        <option value="brand">Brand</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                      </select>

                      <FieldLabel>Position and size</FieldLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.35rem' }}>
                        <NumberField label="X" value={selectedElement.x} min={0} max={100 - selectedElement.w} disabled={selectedElementLocked} onChange={(value) => updateElement(selectedElement.id, { x: value })} />
                        <NumberField label="Y" value={selectedElement.y} min={0} max={100 - selectedElement.h} disabled={selectedElementLocked} onChange={(value) => updateElement(selectedElement.id, { y: value })} />
                        <NumberField label="W" value={selectedElement.w} min={minElementWidth} max={maxElementWidth} disabled={selectedElementLocked} onChange={(value) => updateElement(selectedElement.id, { w: value })} />
                        <NumberField label="H" value={selectedElement.h} min={minElementHeight} max={maxElementHeight} disabled={selectedElementLocked} onChange={(value) => updateElement(selectedElement.id, { h: value })} />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                        <input
                          type="range"
                          min={minElementWidth}
                          max={maxElementWidth}
                          value={selectedElement.w}
                          disabled={selectedElementLocked}
                          onChange={(event) => updateElement(selectedElement.id, { w: Number(event.target.value) })}
                        />
                        <input
                          type="range"
                          min={minElementHeight}
                          max={maxElementHeight}
                          value={selectedElement.h}
                          disabled={selectedElementLocked}
                          onChange={(event) => updateElement(selectedElement.id, { h: Number(event.target.value) })}
                        />
                      </div>

                      <FieldLabel>Opacity</FieldLabel>
                      <input
                        type="range"
                        min={25}
                        max={100}
                        value={Math.round((selectedElement.opacity ?? 1) * 100)}
                        disabled={selectedElementLocked}
                        onChange={(event) => updateElement(selectedElement.id, { opacity: Number(event.target.value) / 100 })}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <MiniButton onClick={() => updateElement(selectedElement.id, { x: 8 })} disabled={selectedElementLocked}>Left</MiniButton>
                        <MiniButton onClick={() => updateElement(selectedElement.id, { x: 50 - selectedElement.w / 2 })} disabled={selectedElementLocked}>Center</MiniButton>
                        <MiniButton onClick={() => updateElement(selectedElement.id, { y: 10 })} disabled={selectedElementLocked}>Top</MiniButton>
                        <MiniButton onClick={() => updateElement(selectedElement.id, { y: 50 - selectedElement.h / 2 })} disabled={selectedElementLocked}>Middle</MiniButton>
                        <MiniButton onClick={() => updateElement(selectedElement.id, { y: 88 - selectedElement.h })} disabled={selectedElementLocked}>Bottom</MiniButton>
                        <MiniButton onClick={() => reorderSelected('back')} disabled={selectedElementLocked}>Send back</MiniButton>
                        <MiniButton onClick={() => reorderSelected('forward')} disabled={selectedElementLocked}>Bring front</MiniButton>
                        <MiniButton onClick={duplicateSelected} disabled={selectedElementLocked}>Duplicate</MiniButton>
                        <MiniButton onClick={removeSelected} disabled={selectedElementLocked}>Delete</MiniButton>
                      </div>
                    </div>
                  ) : (
                    <div style={{ border: '1px dashed #CBD5E1', borderRadius: 8, padding: '0.7rem', color: '#64748B', background: '#F8FAFC', fontSize: '0.72rem', lineHeight: 1.45 }}>
                      Select a layer to edit text, position, size, visibility, lock state, or stacking.
                    </div>
                  )}

	                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto' }}>
	                    <FieldLabel>Implementation note</FieldLabel>
	                    <textarea
	                      value={studio.notes}
	                      onChange={(event) => updateStudio({ notes: event.target.value })}
	                      placeholder={node.notesPlaceholder ?? 'Describe the state you chose and anything Leo should know.'}
	                      rows={4}
	                      style={{ border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#111827', padding: '0.45rem', borderRadius: 6, fontSize: '0.72rem', resize: 'vertical' }}
	                    />
	                    {!canSubmit && (
	                      <div style={{ border: '1px solid #FED7AA', background: '#FFF7ED', color: '#9A3412', borderRadius: 6, padding: '0.45rem', fontSize: '0.66rem', lineHeight: 1.35, fontWeight: 700 }}>
	                        {saveHelp}
	                      </div>
	                    )}
	                    <ActionButton text="Save Mockup" onClick={() => goNext(node)} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
	                  </div>
                </aside>
              </div>
            </div>
          </LaptopFrame>
        </DesktopOverlay>
      </motion.div>
    </SceneWrapper>
  )
}
