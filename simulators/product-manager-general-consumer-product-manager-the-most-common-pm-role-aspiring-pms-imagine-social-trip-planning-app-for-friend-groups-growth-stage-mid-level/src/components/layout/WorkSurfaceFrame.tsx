import type { ReactNode } from 'react'
import DesktopOverlay from './DesktopOverlay'
import LaptopFrame from '../ui/LaptopFrame'
import type { LaptopFrameVariant } from '../ui/LaptopFrame'
import type { WorkSurfaceDevice, WorkSurfaceKind, WorkSurfaceSpec, WorkSurfaceTab } from '../../types/game'

type AppWindowVariant = Exclude<WorkSurfaceSpec['appWindow'], undefined | 'meeting'>

interface WorkSurfaceLikeNode {
  type?: string
  appWindow?: AppWindowVariant
  windowTitle?: string
  title?: string
  workSurface?: WorkSurfaceSpec
}

interface WorkSurfaceFrameProps {
  node: WorkSurfaceLikeNode
  children: ReactNode
  variant?: LaptopFrameVariant
  title?: string
  device?: WorkSurfaceDevice
  scrollable?: boolean
  fill?: boolean
  width?: string
  height?: string
  titleTabs?: { id: string; label: string }[]
  activeTitleTabId?: string
  onTitleTabChange?: (id: string) => void
}

const KIND_TO_VARIANT: Record<WorkSurfaceKind, LaptopFrameVariant> = {
  slack_reply: 'slack',
  email_compose: 'email',
  document_editor: 'doc',
  notion_doc: 'notion',
  spreadsheet_workbook: 'spreadsheet',
  figma_canvas: 'figma',
  screen_design_studio: 'figma',
  ats_screening: 'kanban',
  canvas_inbox: 'notion',
  comment_queue: 'slack',
  camera_shoot: 'figma',
  campaign_builder: 'figma',
  kanban_board: 'kanban',
  priority_matrix: 'miro',
  physical_action: 'doc',
  ticket_triage: 'kanban',
  code_review: 'code',
  generic_tool: 'doc',
}

const KIND_TO_DEVICE: Record<WorkSurfaceKind, WorkSurfaceDevice> = {
  slack_reply: 'desktop',
  email_compose: 'desktop',
  document_editor: 'document',
  notion_doc: 'desktop',
  spreadsheet_workbook: 'desktop',
  figma_canvas: 'desktop',
  screen_design_studio: 'desktop',
  ats_screening: 'desktop',
  canvas_inbox: 'desktop',
  comment_queue: 'desktop',
  camera_shoot: 'phone',
  campaign_builder: 'desktop',
  kanban_board: 'desktop',
  priority_matrix: 'desktop',
  physical_action: 'none',
  ticket_triage: 'desktop',
  code_review: 'desktop',
  generic_tool: 'desktop',
}

const TYPE_TO_KIND: Record<string, WorkSurfaceKind> = {
  free_text: 'document_editor',
  structured_entry: 'document_editor',
  slack_thread: 'slack_reply',
  email_thread: 'email_compose',
  live_chat: 'slack_reply',
  flow_diagram: 'figma_canvas',
  screen_design_studio: 'screen_design_studio',
  kanban_board: 'kanban_board',
  priority_matrix: 'priority_matrix',
  camera_shoot: 'camera_shoot',
  comment_queue: 'comment_queue',
  campaign_studio: 'campaign_builder',
}

export function inferWorkSurfaceKind(node: WorkSurfaceLikeNode): WorkSurfaceKind {
  if (node.workSurface?.kind) return node.workSurface.kind
  if (node.appWindow === 'email') return 'email_compose'
  if (node.appWindow === 'slack') return 'slack_reply'
  if (node.appWindow === 'spreadsheet') return 'spreadsheet_workbook'
  if (node.appWindow === 'figma') return 'figma_canvas'
  if (node.appWindow === 'kanban') return 'kanban_board'
  if (node.appWindow === 'miro') return 'priority_matrix'
  return TYPE_TO_KIND[node.type ?? ''] ?? 'document_editor'
}

export function resolveWorkSurfaceVariant(node: WorkSurfaceLikeNode, fallback?: LaptopFrameVariant): LaptopFrameVariant {
  const explicit = node.workSurface?.appWindow
  if (explicit && explicit !== 'meeting') return explicit
  if (node.appWindow) return node.appWindow
  const kind = inferWorkSurfaceKind(node)
  return fallback ?? KIND_TO_VARIANT[kind] ?? 'doc'
}

export function resolveWorkSurfaceDevice(node: WorkSurfaceLikeNode, fallback: WorkSurfaceDevice = 'desktop'): WorkSurfaceDevice {
  if (node.workSurface?.device) return node.workSurface.device
  const kind = inferWorkSurfaceKind(node)
  return KIND_TO_DEVICE[kind] ?? fallback
}

export function resolveWorkSurfaceTitle(node: WorkSurfaceLikeNode, fallback?: string): string {
  return node.workSurface?.title || node.windowTitle || fallback || node.title || 'Work surface'
}

export function hasWorkSurfaceVisual(node: WorkSurfaceLikeNode): boolean {
  if (node.workSurface || node.appWindow) return true
  return Boolean(node.type && TYPE_TO_KIND[node.type])
}

export function mergeWorkSurfaceTabs(node: WorkSurfaceLikeNode, localTabs: WorkSurfaceTab[] = []): WorkSurfaceTab[] {
  const seen = new Set<string>()
  const tabs = [...(node.workSurface?.sourceTabs ?? []), ...localTabs, ...(node.workSurface?.workTabs ?? [])]
  return tabs.filter((tab) => {
    if (seen.has(tab.id)) return false
    seen.add(tab.id)
    return true
  })
}

function PhoneSurface({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        width: 'min(100%, 420px)',
        margin: '0 auto',
        background: '#1E1E1A',
        border: '2px solid #000',
        borderRadius: '30px',
        padding: '0.75rem',
        boxShadow: '6px 6px 0 #000',
      }}
    >
      <div
        style={{
          minHeight: '620px',
          maxHeight: '76vh',
          overflowY: 'auto',
          background: '#F7F1E3',
          border: '1px solid #CDBF94',
          borderRadius: '22px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #CDBF94',
            background: '#EFE8D2',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#3A6B5E',
            textAlign: 'center',
          }}
        >
          {title}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      </div>
    </div>
  )
}

function DocumentSurface({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        border: '1px solid #000',
        boxShadow: '5px 5px 0 #000',
        background: '#F7F1E3',
        minHeight: 420,
      }}
    >
      {children}
    </div>
  )
}

export default function WorkSurfaceFrame({
  node,
  children,
  variant,
  title,
  device,
  scrollable = true,
  fill = true,
  width,
  height,
  titleTabs,
  activeTitleTabId,
  onTitleTabChange,
}: WorkSurfaceFrameProps) {
  const resolvedVariant = variant ?? resolveWorkSurfaceVariant(node)
  const resolvedDevice = device ?? resolveWorkSurfaceDevice(node)
  const resolvedTitle = title ?? resolveWorkSurfaceTitle(node)

  if (resolvedDevice === 'none') {
    return <>{children}</>
  }

  if (resolvedDevice === 'phone') {
    return <PhoneSurface title={resolvedTitle}>{children}</PhoneSurface>
  }

  if (resolvedDevice === 'document') {
    return (
      <DocumentSurface>
        <LaptopFrame
          variant={resolvedVariant}
          title={resolvedTitle}
          fill={false}
          scrollable={scrollable}
          titleTabs={titleTabs}
          activeTitleTabId={activeTitleTabId}
          onTitleTabChange={onTitleTabChange}
        >
          {children}
        </LaptopFrame>
      </DocumentSurface>
    )
  }

  if (resolvedDevice === 'meeting') {
    return (
      <LaptopFrame
        variant="meeting"
        title={resolvedTitle}
        fill={fill}
        scrollable={scrollable}
        titleTabs={titleTabs}
        activeTitleTabId={activeTitleTabId}
        onTitleTabChange={onTitleTabChange}
      >
        {children}
      </LaptopFrame>
    )
  }

  return (
    <DesktopOverlay width={width} height={height}>
      <LaptopFrame
        variant={resolvedVariant}
        title={resolvedTitle}
        fill={fill}
        scrollable={scrollable}
        titleTabs={titleTabs}
        activeTitleTabId={activeTitleTabId}
        onTitleTabChange={onTitleTabChange}
      >
        {children}
      </LaptopFrame>
    </DesktopOverlay>
  )
}
