import type { CSSProperties, ReactNode } from 'react'

export type LaptopFrameVariant = 'doc' | 'email' | 'email-read' | 'slack' | 'figma' | 'notion' | 'spreadsheet' | 'code' | 'miro' | 'kanban' | 'meeting'

interface LaptopFrameProps {
  children: ReactNode
  variant?: LaptopFrameVariant
  title?: string
  scrollable?: boolean
  fill?: boolean
  titleTabs?: LaptopFrameTab[]
  activeTitleTabId?: string
  onTitleTabChange?: (id: string) => void
}

interface LaptopFrameTab {
  id: string
  label: string
}

const menuItems: Partial<Record<LaptopFrameVariant, string[]>> = {
  doc: ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools'],
  email: ['File', 'Edit', 'View', 'Format'],
  'email-read': [],
  slack: [],
  figma: [],
  notion: [],
  spreadsheet: ['File', 'Edit', 'View', 'Insert', 'Format', 'Data'],
  code: ['File', 'Edit', 'Selection', 'View', 'Go', 'Run'],
  miro: [],
  kanban: [],
  meeting: [],
}

const titleBarColors: Record<LaptopFrameVariant, string> = {
  doc: '#EFE8D2',
  email: '#EFE8D2',
  'email-read': '#EFE8D2',
  slack: '#EFE8D2',
  figma: '#F2EBD9',
  notion: '#EFE8D2',
  spreadsheet: '#EFE8D2',
  code: '#EFE8D2',
  miro: '#EFE8D2',
  kanban: '#EFE8D2',
  meeting: '#EFE8D2',
}

const titleTextColors: Record<LaptopFrameVariant, string> = {
  doc: '#3F605C',
  email: '#3F605C',
  'email-read': '#3F605C',
  slack: '#3F605C',
  figma: '#3F605C',
  notion: '#3F605C',
  spreadsheet: '#3F605C',
  code: '#3F605C',
  miro: '#3F605C',
  kanban: '#3F605C',
  meeting: '#3F605C',
}

const contentBgColors: Record<LaptopFrameVariant, string> = {
  doc: '#F7F1E3',
  email: '#F7F1E3',
  'email-read': '#F7F1E3',
  slack: '#F7F1E3',
  figma: '#F7F1E3',
  notion: '#F7F1E3',
  spreadsheet: '#F7F1E3',
  code: '#F7F1E3',
  miro: '#F7F1E3',
  kanban: '#F7F1E3',
  meeting: '#F7F1E3',
}

const defaultTitles: Record<LaptopFrameVariant, string> = {
  doc: 'Untitled document',
  email: 'New Message',
  'email-read': 'Message',
  slack: 'Slack',
  figma: 'Untitled.fig',
  notion: 'Untitled',
  spreadsheet: 'Untitled spreadsheet',
  code: 'Untitled',
  miro: 'Untitled board',
  kanban: 'Project Board',
  meeting: 'Video call',
}

export default function LaptopFrame({
  children,
  variant = 'doc',
  title,
  scrollable = false,
  fill = false,
  titleTabs = [],
  activeTitleTabId,
  onTitleTabChange,
}: LaptopFrameProps) {
  const displayTitle = title || defaultTitles[variant]
  const menus = menuItems[variant] ?? []
  const titleBarBg = titleBarColors[variant]
  const titleTextColor = titleTextColors[variant]
  const contentBg = contentBgColors[variant]
  const isDark = variant === 'code'
  const hasTitleTabs = titleTabs.length > 0

  const titleTabStyle = (active: boolean): CSSProperties => ({
    border: active ? `1px solid ${isDark ? '#30363D' : '#cfc7b8'}` : '1px solid transparent',
    borderBottomColor: active ? contentBg : 'transparent',
    background: active ? contentBg : 'transparent',
    color: active ? (isDark ? '#C9D1D9' : '#1f1f1f') : titleTextColor,
    borderRadius: '6px 6px 0 0',
    padding: '0.35rem 0.7rem',
    fontSize: '0.72rem',
    fontWeight: active ? 700 : 600,
    cursor: 'pointer',
    minWidth: 0,
    maxWidth: active ? '11rem' : '10rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    transform: active ? 'translateY(1px)' : 'none',
  })

  return (
    <div
      style={{
        border: isDark ? '2px solid #444' : '2px solid #333',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        backgroundColor: contentBg,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        ...(fill ? { flex: 1, height: '100%', width: '100%' } : {}),
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: hasTitleTabs ? '0.4rem 0.75rem 0' : '0.5rem 0.75rem',
          backgroundColor: titleBarBg,
          borderBottom: isDark ? '1px solid #555' : '1px solid #ccc',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f57', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#febc2e', display: 'inline-block' }} />
          <span style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28c840', display: 'inline-block' }} />
        </div>

        {hasTitleTabs && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '0.125rem',
              flex: 1,
              minWidth: 0,
              overflowX: 'auto',
              marginLeft: '0.5rem',
              paddingTop: '0.1rem',
            }}
          >
            {titleTabs.map((tab) => {
              const active = tab.id === activeTitleTabId
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTitleTabChange?.(tab.id)}
                  style={titleTabStyle(active)}
                  title={tab.label}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Figma: left sidebar strip indicator */}
        {!hasTitleTabs && variant === 'figma' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, marginLeft: '0.5rem' }}>
            <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: 500 }}>Drafts /</span>
            <span style={{ fontSize: '0.75rem', color: '#333', fontWeight: 500 }}>{displayTitle}</span>
          </div>
        )}

        {/* Notion: page icon + breadcrumb */}
        {!hasTitleTabs && variant === 'notion' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginLeft: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem' }}>📄</span>
            <span style={{ fontSize: '0.75rem', color: '#555', fontWeight: 500 }}>{displayTitle}</span>
          </div>
        )}

        {/* Spreadsheet: file name centered */}
        {!hasTitleTabs && variant === 'spreadsheet' && (
          <span style={{ fontSize: '0.75rem', color: '#3F605C', fontWeight: 600, marginLeft: '0.5rem', flex: 1, textAlign: 'center' }}>
            {displayTitle}
          </span>
        )}

        {/* Code: file tab */}
        {!hasTitleTabs && variant === 'code' && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '0.5rem', flex: 1 }}>
            <span style={{ fontSize: '0.7rem', color: '#ccc', backgroundColor: '#2d2d2d', padding: '0.2rem 0.75rem', borderRadius: '4px 4px 0 0' }}>
              {displayTitle}
            </span>
          </div>
        )}

        {/* Miro: toolbar stub */}
        {!hasTitleTabs && variant === 'miro' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginLeft: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem' }}>🟡</span>
            <span style={{ fontSize: '0.75rem', color: '#6B4FA0', fontWeight: 600 }}>{displayTitle}</span>
          </div>
        )}

        {/* Kanban: project name */}
        {!hasTitleTabs && variant === 'kanban' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, marginLeft: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#8899aa', fontWeight: 600 }}>{displayTitle}</span>
          </div>
        )}

        {/* Default (doc, email, slack, meeting): centered title */}
        {!hasTitleTabs && (variant === 'doc' || variant === 'email' || variant === 'email-read' || variant === 'slack' || variant === 'meeting') && (
          <>
            <span
              style={{
                fontSize: '0.75rem',
                color: titleTextColor,
                fontWeight: 500,
                marginLeft: '0.5rem',
                flex: 1,
                textAlign: 'center',
              }}
            >
              {displayTitle}
            </span>
            <div style={{ width: 54 }} />
          </>
        )}
      </div>

      {/* Menu bar (doc/email/spreadsheet/code only) */}
      {menus.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.125rem',
            padding: '0.25rem 0.75rem',
            backgroundColor: isDark ? '#252526' : '#f5f5f5',
            borderBottom: isDark ? '1px solid #333' : '1px solid #e0e0e0',
            flexShrink: 0,
          }}
        >
          {menus.map((item) => (
            <span
              key={item}
              style={{
                fontSize: '0.7rem',
                color: isDark ? '#ccc' : '#555',
                padding: '0.15rem 0.4rem',
                borderRadius: '2px',
                cursor: 'default',
                userSelect: 'none',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Email navigation strip */}
      {(variant === 'email' || variant === 'email-read') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.75rem',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            flexShrink: 0,
            overflowX: 'auto',
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#1F2937', marginRight: '0.25rem' }}>Mail</span>
          {['Inbox', 'Focused', 'Archive', 'Reply', 'Forward'].map((item) => (
            <span
              key={item}
              style={{
                fontSize: '0.68rem',
                color: item === 'Focused' ? '#1D4ED8' : '#4B5563',
                backgroundColor: item === 'Focused' ? '#EFF6FF' : 'transparent',
                border: item === 'Focused' ? '1px solid #BFDBFE' : '1px solid transparent',
                borderRadius: '999px',
                padding: '0.14rem 0.48rem',
                whiteSpace: 'nowrap',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Slack channel header */}
      {variant === 'slack' && (
        <div
          style={{
            backgroundColor: '#f8f8f8',
            borderBottom: '1px solid #e0e0e0',
            padding: '0.5rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.375rem',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d1c1d' }}>
            {displayTitle}
          </span>
        </div>
      )}

      {/* Figma toolbar strip */}
      {variant === 'figma' && (
        <div
          style={{
            backgroundColor: '#EFE8D2',
            borderBottom: '1px solid #ccc',
            padding: '0.375rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          {['Move', 'Frame', 'Shape', 'Text', 'Component'].map((tool) => (
            <span key={tool} style={{ fontSize: '0.65rem', color: '#555', cursor: 'default', userSelect: 'none' }}>{tool}</span>
          ))}
        </div>
      )}

      {/* Spreadsheet formula bar */}
      {variant === 'spreadsheet' && (
        <div
          style={{
            backgroundColor: '#fff',
            borderBottom: '1px solid #e0e0e0',
            padding: '0.25rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.7rem', color: '#888', fontFamily: 'monospace', minWidth: '2.5rem', textAlign: 'center', border: '1px solid #ddd', padding: '0.1rem 0.25rem' }}>A1</span>
          <span style={{ fontSize: '0.7rem', color: '#aaa' }}>fx</span>
          <div style={{ flex: 1, height: '1.25rem', backgroundColor: '#fafafa', border: '1px solid #eee' }} />
        </div>
      )}

      {/* Miro zoom controls stub */}
      {variant === 'miro' && (
        <div
          style={{
            backgroundColor: '#EFE8D2',
            borderBottom: '1px solid #CDBF94',
            padding: '0.25rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexShrink: 0,
          }}
        >
          {['Select', 'Hand', 'Sticky', 'Shape', 'Text', 'Arrow'].map((tool) => (
            <span key={tool} style={{ fontSize: '0.65rem', color: '#3A6B5E', cursor: 'default', userSelect: 'none' }}>{tool}</span>
          ))}
        </div>
      )}

      {/* Kanban column header stub */}
      {variant === 'kanban' && (
        <div
          style={{
            backgroundColor: '#F7F1E3',
            borderBottom: '1px solid #CDBF94',
            padding: '0.25rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexShrink: 0,
          }}
        >
          {['Board', 'Backlog', 'Timeline', 'Reports'].map((tab) => (
            <span key={tab} style={{ fontSize: '0.65rem', color: '#3F605C', cursor: 'default', userSelect: 'none' }}>{tab}</span>
          ))}
        </div>
      )}

      {/* Content area */}
      <div
        style={{
          padding: variant === 'slack' || variant === 'figma' || variant === 'kanban' || variant === 'meeting' ? '0' : '1.25rem',
          backgroundColor: contentBg,
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: scrollable ? 'auto' : 'visible',
        }}
      >
        {children}
      </div>

      {/* Laptop base/bezel */}
      {variant !== 'meeting' && (
        <div
          style={{
            height: '12px',
            backgroundColor: isDark ? '#111' : '#d4d4d4',
            borderTop: isDark ? '1px solid #333' : '1px solid #bbb',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: '60px',
              height: '4px',
              backgroundColor: isDark ? '#333' : '#bbb',
              borderRadius: '2px',
            }}
          />
        </div>
      )}
    </div>
  )
}
