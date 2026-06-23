import { useEffect, useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
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
  | 'text_input'
  | 'empty_state'
  | 'error_banner'

type ElementVariant = 'neutral' | 'brand' | 'success' | 'warning'

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
  enoughElements: boolean
  notesReady: boolean
}

const fixedScreen = { id: 'shared_streak_screen', label: 'Shared Streak Screen' }
const studioGridColumns = 'clamp(84px, 24%, 156px) minmax(0, 1fr) clamp(92px, 29%, 196px)'
const phoneCanvasAspectRatio = 458 / 220

const componentDefinitions: ComponentDefinition[] = [
  { kind: 'top_bar', label: 'Shared Streak Nav', detail: 'Back + shared habit context', w: 84, h: 8, variant: 'neutral' },
  { kind: 'screen_title', label: 'Shared Hydration Streak', detail: 'Final screen after the friend accepts', w: 76, h: 10, variant: 'neutral' },
  { kind: 'progress_ring', label: '12 days', detail: 'Current shared streak count', w: 34, h: 17, variant: 'success' },
  { kind: 'friend_card', label: 'You + Ava', detail: 'Both friends and completion state', w: 78, h: 14, variant: 'neutral' },
  { kind: 'habit_card', label: 'Hydration', detail: 'Same habit, same day rule', w: 78, h: 15, variant: 'brand' },
  { kind: 'status_chip', label: 'Active', detail: 'Accepted shared streak state', w: 44, h: 7, variant: 'success' },
  { kind: 'primary_button', label: "Mark Today's Habit", detail: 'Complete your side of the shared habit', w: 72, h: 9, variant: 'brand' },
  { kind: 'secondary_button', label: 'Message Friend', detail: 'Encourage the friend without leaving the screen', w: 72, h: 9, variant: 'neutral' },
  { kind: 'tab_bar', label: 'Bottom Nav', detail: 'Home, habits, profile', w: 84, h: 10, variant: 'neutral' },
  { kind: 'shape_square', label: 'Friend Avatar', detail: 'Add your own text', w: 28, h: 14, variant: 'neutral' },
  { kind: 'shape_horizontal', label: 'Last 7 Days Row', detail: 'Use for shared streak history', w: 64, h: 9, variant: 'brand' },
  { kind: 'shape_vertical', label: 'Motivation Card', detail: 'Add your own text', w: 30, h: 24, variant: 'neutral' },
  { kind: 'freeform_rectangle', label: 'Horizontal Rect', detail: 'Freeform label or button area', w: 64, h: 9, variant: 'neutral' },
  { kind: 'freeform_vertical', label: 'Vertical Rect', detail: 'Freeform panel or placeholder', w: 30, h: 24, variant: 'neutral' },
]

const defaultPlacements: Record<ElementKind, { x: number; y: number }> = {
  top_bar: { x: 8, y: 5 },
  screen_title: { x: 12, y: 14 },
  habit_card: { x: 11, y: 29 },
  friend_card: { x: 11, y: 46 },
  progress_ring: { x: 33, y: 48 },
  primary_button: { x: 14, y: 73 },
  secondary_button: { x: 14, y: 82 },
  shape_square: { x: 12, y: 43 },
  shape_horizontal: { x: 18, y: 66 },
  shape_vertical: { x: 58, y: 38 },
  freeform_rectangle: { x: 18, y: 58 },
  freeform_vertical: { x: 58, y: 36 },
  status_chip: { x: 28, y: 62 },
  tab_bar: { x: 8, y: 88 },
  text_input: { x: 12, y: 24 },
  empty_state: { x: 15, y: 38 },
  error_banner: { x: 12, y: 23 },
}

const variantStyles: Record<ElementVariant, { bg: string; border: string; text: string; accent: string }> = {
  neutral: { bg: '#F7F1E3', border: '#CDBF94', text: '#1E1E1A', accent: '#6B9EA6' },
  brand: { bg: '#EFE8D2', border: '#3A6B5E', text: '#1E1E1A', accent: '#3A6B5E' },
  success: { bg: '#E6EFE3', border: '#3A6B5E', text: '#1E1E1A', accent: '#3A6B5E' },
  warning: { bg: '#F3DDD6', border: '#B87D6B', text: '#1E1E1A', accent: '#B87D6B' },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
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

  const w = clamp(typeof raw.w === 'number' ? raw.w : definition.w, 18, 92)
  const h = clamp(typeof raw.h === 'number' ? raw.h : definition.h, 5, 28)
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

  return {
    enoughElements: state.elements.length >= minElements,
    notesReady: state.notes.trim().length >= minNotesChars,
  }
}

function serializeStudioState(state: StudioState) {
  return JSON.stringify({
    ...state,
    summary: {
      selectedScreen: state.screenLabel,
      elementCount: state.elements.length,
      implementationNote: state.notes,
      elements: state.elements.map((item) => ({
        kind: item.kind,
        label: item.label,
        detail: item.detail,
        variant: item.variant,
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
    <div style={{ fontSize: '0.66rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
      {children}
    </div>
  )
}

function ToolButton({
  active,
  label,
  detail,
  onClick,
}: {
  active?: boolean
  label: string
  detail?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        border: active ? '2px solid #3A6B5E' : '1px solid #CDBF94',
        background: active ? '#EFE8D2' : '#F7F1E3',
        color: '#1E1E1A',
        borderRadius: '6px',
        padding: '0.48rem',
        cursor: 'pointer',
        boxShadow: active ? '0 2px 8px rgba(58, 107, 94, 0.16)' : 'none',
      }}
    >
      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.2 }}>{label}</span>
      {detail && <span style={{ display: 'block', fontSize: '0.62rem', color: '#5A5548', lineHeight: 1.3, marginTop: '0.16rem' }}>{detail}</span>}
    </button>
  )
}

function MiniButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border: '1px solid #000',
        background: disabled ? '#E8DCC8' : '#F2EBD9',
        color: '#1E1E1A',
        borderRadius: '4px',
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
  return <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#3A6B5E' }}>{children}</label>
}

function renderDesignElementContent(element: DesignElement) {
  const styles = variantStyles[element.variant]

  if (element.kind === 'top_bar') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%', padding: '0 0.55rem' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 900 }}>&lt;</span>
        <span style={{ fontSize: '0.62rem', fontWeight: 900, textTransform: 'uppercase' }}>{element.label}</span>
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: styles.accent }} />
      </div>
    )
  }

  if (element.kind === 'screen_title') {
    return (
      <div style={{ padding: '0.32rem 0.45rem' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 900, lineHeight: 1.05 }}>{element.label}</div>
        <div style={{ fontSize: '0.56rem', color: '#5A5548', marginTop: 3 }}>{element.detail}</div>
      </div>
    )
  }

  if (element.kind === 'progress_ring') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 3 }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', border: `7px solid ${styles.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 900 }}>
          {element.label}
        </div>
        <span style={{ fontSize: '0.54rem', color: '#5A5548', textAlign: 'center' }}>{element.detail}</span>
      </div>
    )
  }

  if (element.kind === 'primary_button' || element.kind === 'secondary_button') {
    const primary = element.kind === 'primary_button'
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.4rem', borderRadius: '999px', background: primary ? styles.accent : '#F7F1E3', color: primary ? '#F7F1E3' : '#1E1E1A', border: primary ? 'none' : `1px solid ${styles.border}`, fontSize: '0.66rem', fontWeight: 900, textAlign: 'center' }}>
        {element.label}
      </div>
    )
  }

  if (element.kind === 'shape_square' || element.kind === 'shape_horizontal' || element.kind === 'shape_vertical' || element.kind === 'freeform_rectangle' || element.kind === 'freeform_vertical') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.25rem', textAlign: 'center', fontSize: '0.62rem', fontWeight: 900, lineHeight: 1.15, overflowWrap: 'anywhere' }}>
        {element.label}
      </div>
    )
  }

  if (element.kind === 'status_chip') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.45rem', borderRadius: '999px', background: styles.accent, color: '#F7F1E3', fontSize: '0.56rem', fontWeight: 900, textTransform: 'uppercase' }}>
        {element.label}
      </div>
    )
  }

  if (element.kind === 'tab_bar') {
    return (
      <div style={{ height: '100%', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'center', gap: 4, padding: '0.35rem' }}>
        {['Home', 'Habits', 'Profile'].map((item, index) => (
          <div key={item} style={{ textAlign: 'center', fontSize: '0.54rem', fontWeight: index === 1 ? 900 : 700, color: index === 1 ? '#3A6B5E' : '#5A5548' }}>
            <div style={{ width: 14, height: 14, borderRadius: 5, background: index === 1 ? '#3A6B5E' : '#D9CFB8', margin: '0 auto 2px' }} />
            {item}
          </div>
        ))}
      </div>
    )
  }

  if (element.kind === 'text_input') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0 0.6rem', border: `1px solid ${styles.border}`, borderRadius: '999px', background: '#FFFDF6', color: '#5A5548', fontSize: '0.62rem', fontWeight: 700 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${styles.accent}` }} />
        {element.label}
      </div>
    )
  }

  if (element.kind === 'empty_state') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 5, padding: '0.45rem', textAlign: 'center' }}>
        <div style={{ width: 38, height: 28, borderRadius: 8, border: `2px dashed ${styles.border}` }} />
        <div style={{ fontSize: '0.66rem', fontWeight: 900 }}>{element.label}</div>
        <div style={{ fontSize: '0.54rem', color: '#5A5548' }}>{element.detail}</div>
      </div>
    )
  }

  if (element.kind === 'error_banner') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.55rem', background: styles.bg, color: styles.text }}>
        <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${styles.accent}`, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.58rem', fontWeight: 900 }}>{element.label}</div>
          <div style={{ fontSize: '0.5rem', color: '#5A5548', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{element.detail}</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0.45rem 0.55rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {element.kind === 'friend_card' && (
          <div style={{ display: 'flex', flexShrink: 0 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#6B9EA6', border: '2px solid #F7F1E3' }} />
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#B87D6B', border: '2px solid #F7F1E3', marginLeft: -7 }} />
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.label}</div>
          <div style={{ fontSize: '0.54rem', color: '#5A5548', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{element.detail}</div>
        </div>
      </div>
      {element.kind === 'habit_card' && (
        <div style={{ height: 5, borderRadius: 99, background: '#D9CFB8', overflow: 'hidden' }}>
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
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 })
  const [canvasPan, setCanvasPan] = useState<CanvasPanState | null>(null)
  const [designCanvasWidth, setDesignCanvasWidth] = useState(220)

  const templateVars = { playerName, branchFlags, mcSelections }
  const studio = parseStudioState(responses[node.bindingKey])
  const checks = buildChecks(studio, node)
  const selectedElement = studio.elements.find((item) => item.id === studio.selectedId)
  const canSubmit = checks.enoughElements && checks.notesReady
  const phoneCanvasWidth = clamp(designCanvasWidth - 32, 72, 220)
  const phoneCanvasHeight = Math.round(phoneCanvasWidth * phoneCanvasAspectRatio)
  const phoneShellPadding = clamp(phoneCanvasWidth * 0.055, 4, 12)
  const phoneShellRadius = clamp(phoneCanvasWidth * 0.14, 14, 30)
  const phoneCanvasRadius = clamp(phoneCanvasWidth * 0.11, 12, 24)
  const phoneNotchWidth = clamp(phoneCanvasWidth * 0.33, 28, 72)
  const phoneNotchTop = clamp(phoneCanvasWidth * 0.036, 4, 8)
  const phoneContentTop = clamp(phoneCanvasWidth * 0.082, 10, 18)

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

  const persistStudio = (next: StudioState) => {
    setFreeTextResponse(node.bindingKey, serializeStudioState(next))
  }

  const updateStudio = (patch: Partial<StudioState>) => {
    persistStudio({ ...studio, ...patch })
  }

  const updateElement = (id: string, patch: Partial<DesignElement>) => {
    const nextElements = studio.elements.map((item) => {
      if (item.id !== id) return item
      const next = { ...item, ...patch }
      return {
        ...next,
        x: clamp(next.x, 0, 100 - next.w),
        y: clamp(next.y, 0, 100 - next.h),
        w: clamp(next.w, 18, 92),
        h: clamp(next.h, 5, 28),
      }
    })
    persistStudio({ ...studio, elements: nextElements })
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
    }
    persistStudio({ ...studio, elements: [...studio.elements, element], selectedId: element.id })
  }

  const removeSelected = () => {
    if (!selectedElement) return
    persistStudio({
      ...studio,
      elements: studio.elements.filter((item) => item.id !== selectedElement.id),
      selectedId: undefined,
    })
  }

  const duplicateSelected = () => {
    if (!selectedElement) return
    const copy: DesignElement = {
      ...selectedElement,
      id: `el_${Date.now()}_${selectedElement.kind}`,
      x: clamp(selectedElement.x + 5, 0, 100 - selectedElement.w),
      y: clamp(selectedElement.y + 5, 0, 100 - selectedElement.h),
    }
    persistStudio({ ...studio, elements: [...studio.elements, copy], selectedId: copy.id })
  }

  const reorderSelected = (direction: 'forward' | 'back') => {
    if (!selectedElement) return
    const rest = studio.elements.filter((item) => item.id !== selectedElement.id)
    const elements = direction === 'forward' ? [...rest, selectedElement] : [selectedElement, ...rest]
    persistStudio({ ...studio, elements })
  }

  const onElementPointerDown = (event: PointerEvent<HTMLDivElement>, element: DesignElement) => {
    if (studio.mode === 'preview') return
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({
      id: element.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: element.x,
      originY: element.y,
    })
    updateStudio({ selectedId: element.id })
  }

  const onPhonePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag || !phoneRef.current) return
    const element = studio.elements.find((item) => item.id === drag.id)
    if (!element) return

    const rect = phoneRef.current.getBoundingClientRect()
    const dx = ((event.clientX - drag.startClientX) / rect.width) * 100
    const dy = ((event.clientY - drag.startClientY) / rect.height) * 100
    updateElement(drag.id, {
      x: clamp(drag.originX + dx, 0, 100 - element.w),
      y: clamp(drag.originY + dy, 0, 100 - element.h),
    })
  }

  const onCanvasPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (studio.mode === 'preview' || drag) return
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
    setCanvasOffset({
      x: canvasPan.originX + event.clientX - canvasPan.startClientX,
      y: canvasPan.originY + event.clientY - canvasPan.startClientY,
    })
  }

  const stopCanvasPan = () => setCanvasPan(null)

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
          <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
            Real UI task experience
          </div>
        </div>

        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, templateVars))}
          </div>
        )}

        <div style={{ backgroundColor: '#fff', border: '1px solid #000', padding: '0.75rem 1rem', fontSize: '0.875rem', fontWeight: 600 }}>
          {interpolate(node.prompt, templateVars)}
        </div>

        <DesktopOverlay>
          <LaptopFrame variant="figma" title={node.windowTitle ?? 'Friend Streaks Mockup.fig'} fill>
            <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: '#F7F1E3', color: '#1E1E1A' }}>
              <div style={{ height: 36, flexShrink: 0, borderBottom: '1px solid #CDBF94', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.75rem', background: '#EFE8D2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 900, whiteSpace: 'nowrap' }}>{studio.screenLabel}</span>
                  <span style={{ fontSize: '0.62rem', color: '#5A5548', whiteSpace: 'nowrap' }}>{studio.elements.length} layers</span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <MiniButton onClick={() => updateStudio({ mode: 'edit' })} disabled={studio.mode === 'edit'}>Edit</MiniButton>
                  <MiniButton onClick={() => updateStudio({ mode: 'preview', selectedId: undefined })} disabled={studio.mode === 'preview'}>Preview</MiniButton>
                </div>
              </div>

              <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: studioGridColumns }}>
                <aside style={{ borderRight: '1px solid #CDBF94', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}>
                  <PanelTitle>Components</PanelTitle>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {componentDefinitions.map((item) => (
                      <ToolButton
                        key={item.kind}
                        label={item.label}
                        detail={item.detail}
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
                  style={{
                    minWidth: 0,
                    minHeight: 0,
                    overflow: 'hidden',
                    position: 'relative',
                    background: '#E8DCC8',
                    cursor: studio.mode === 'preview' ? 'default' : canvasPan ? 'grabbing' : 'grab',
                    touchAction: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '1rem',
                      transform: `translate(calc(-50% + ${canvasOffset.x}px), ${canvasOffset.y}px)`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.55rem',
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', color: '#5A5548', fontWeight: 800 }}>{studio.mode === 'edit' ? 'Grab the canvas to pan; drag layers to arrange' : 'Prototype preview'}</div>
                    <div style={{ padding: phoneShellPadding, borderRadius: phoneShellRadius, background: '#1E1E1A', boxShadow: '0 16px 36px rgba(0,0,0,0.24)', cursor: studio.mode === 'preview' ? 'default' : canvasPan ? 'grabbing' : 'grab' }}>
                      <div
                        ref={phoneRef}
                        onPointerMove={onPhonePointerMove}
                        onPointerUp={() => setDrag(null)}
                        onPointerCancel={() => setDrag(null)}
                        onPointerDown={() => studio.mode === 'edit' && updateStudio({ selectedId: undefined })}
                        style={{
                          position: 'relative',
                          width: phoneCanvasWidth,
                          height: phoneCanvasHeight,
                          borderRadius: phoneCanvasRadius,
                          overflow: 'hidden',
                          background: '#FFFDF6',
                          border: '2px solid #000',
                          touchAction: 'none',
                        }}
                      >
                        <div style={{ position: 'absolute', top: phoneNotchTop, left: '50%', transform: 'translateX(-50%)', width: phoneNotchWidth, height: 4, borderRadius: 99, background: '#D9CFB8' }} />
                        <div style={{ position: 'absolute', inset: `${phoneContentTop}px 0 0 0`, pointerEvents: 'none' }}>
                          <div style={{ fontSize: '0.58rem', color: '#8A806E', textAlign: 'center', fontWeight: 800 }}>{studio.screenLabel}</div>
                        </div>

                        {studio.elements.map((element) => {
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
                                border: selected ? '2px solid #B87D6B' : `1px solid ${styles.border}`,
                                borderRadius: element.kind.includes('button') || element.kind === 'status_chip' || element.kind === 'text_input' || element.kind === 'shape_horizontal' ? '999px' : element.kind.startsWith('shape_') || element.kind.startsWith('freeform_') ? '6px' : '8px',
                      background: element.kind.includes('button') || element.kind === 'status_chip' || element.kind === 'text_input' ? 'transparent' : styles.bg,
                                color: styles.text,
                                boxShadow: selected ? '3px 3px 0 #B87D6B' : '0 2px 5px rgba(0,0,0,0.08)',
                                cursor: studio.mode === 'edit' ? 'grab' : 'default',
                                overflow: 'hidden',
                                userSelect: 'none',
                              }}
                            >
                              {renderDesignElementContent(element)}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </main>

                <aside style={{ borderLeft: '1px solid #CDBF94', padding: '0.65rem', minHeight: 0, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  <PanelTitle>Inspector</PanelTitle>

                  {selectedElement ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      <FieldLabel>Layer label</FieldLabel>
                      <input
                        value={selectedElement.label}
                        onChange={(event) => updateElement(selectedElement.id, { label: event.target.value })}
                        style={{ border: '1px solid #000', background: '#FFFDF6', color: '#1E1E1A', padding: '0.38rem 0.45rem', borderRadius: 4, fontSize: '0.75rem' }}
                      />

                      <FieldLabel>Supporting text</FieldLabel>
                      <textarea
                        value={selectedElement.detail}
                        onChange={(event) => updateElement(selectedElement.id, { detail: event.target.value })}
                        rows={3}
                        style={{ border: '1px solid #000', background: '#FFFDF6', color: '#1E1E1A', padding: '0.38rem 0.45rem', borderRadius: 4, fontSize: '0.72rem', resize: 'vertical' }}
                      />

                      <FieldLabel>Variant</FieldLabel>
                      <select
                        value={selectedElement.variant}
                        onChange={(event) => updateElement(selectedElement.id, { variant: event.target.value as ElementVariant })}
                        style={{ border: '1px solid #000', background: '#FFFDF6', color: '#1E1E1A', padding: '0.38rem 0.45rem', borderRadius: 4, fontSize: '0.72rem' }}
                      >
                        <option value="neutral">Neutral</option>
                        <option value="brand">Brand</option>
                        <option value="success">Success</option>
                        <option value="warning">Warning</option>
                      </select>

                      <FieldLabel>Size</FieldLabel>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.45rem' }}>
                        <input
                          type="range"
                          min={18}
                          max={92}
                          value={selectedElement.w}
                          onChange={(event) => updateElement(selectedElement.id, { w: Number(event.target.value) })}
                        />
                        <input
                          type="range"
                          min={5}
                          max={28}
                          value={selectedElement.h}
                          onChange={(event) => updateElement(selectedElement.id, { h: Number(event.target.value) })}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                        <MiniButton onClick={() => updateElement(selectedElement.id, { x: 8 })}>Left</MiniButton>
                        <MiniButton onClick={() => updateElement(selectedElement.id, { x: 50 - selectedElement.w / 2 })}>Center</MiniButton>
                        <MiniButton onClick={() => reorderSelected('back')}>Send back</MiniButton>
                        <MiniButton onClick={() => reorderSelected('forward')}>Bring front</MiniButton>
                        <MiniButton onClick={duplicateSelected}>Duplicate</MiniButton>
                        <MiniButton onClick={removeSelected}>Delete</MiniButton>
                      </div>
                    </div>
                  ) : (
                    <div style={{ border: '1px dashed #CDBF94', borderRadius: 6, padding: '0.7rem', color: '#5A5548', fontSize: '0.72rem', lineHeight: 1.45 }}>
                      Select a layer to edit text, variant, size, alignment, or stacking.
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto' }}>
                    <FieldLabel>Implementation note</FieldLabel>
                    <textarea
                      value={studio.notes}
                      onChange={(event) => updateStudio({ notes: event.target.value })}
                      placeholder={node.notesPlaceholder ?? 'Describe the state you chose and anything Leo should know.'}
                      rows={4}
                      style={{ border: '1px solid #000', background: '#FFFDF6', color: '#1E1E1A', padding: '0.45rem', borderRadius: 4, fontSize: '0.72rem', resize: 'vertical' }}
                    />
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
