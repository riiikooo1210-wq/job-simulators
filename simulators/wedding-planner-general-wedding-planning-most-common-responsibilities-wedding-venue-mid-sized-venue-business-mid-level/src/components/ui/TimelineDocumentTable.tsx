export interface TimelineDocumentRow {
  id?: string
  time?: string
  timeline_item?: string
  item?: string
  source?: string
  status?: string
  planner_note?: string
  recommended_fix?: string
}

interface TimelineDocumentTableProps {
  rows: TimelineDocumentRow[]
  activeRowId?: string
  onSelectRow?: (row: TimelineDocumentRow, index: number) => void
  showCommentColumn?: boolean
  showInlineStatus?: boolean
}

function rowId(row: TimelineDocumentRow, index: number) {
  return row.id || `${row.time || 'row'}-${index}`
}

function commentComplete(row: TimelineDocumentRow) {
  return Boolean(
    row.status?.trim()
      && row.planner_note?.trim()
      && row.recommended_fix?.trim()
  )
}

function commentBadge(row: TimelineDocumentRow) {
  if (commentComplete(row)) return { label: row.status || 'Commented', bg: '#DCE6D2', fg: '#315D50' }
  if (row.status?.trim()) return { label: row.status, bg: '#F4E0C8', fg: '#7A4A2A' }
  return { label: 'No comment', bg: '#EFE8D2', fg: '#6f6758' }
}

const thStyle = {
  padding: '0.55rem 0.65rem',
  borderBottom: '1px solid #000',
  background: '#E8DCC8',
  color: '#1E1E1A',
  fontSize: '0.68rem',
  fontWeight: 900,
  letterSpacing: 0,
  lineHeight: 1.25,
  textAlign: 'left' as const,
  textTransform: 'uppercase' as const,
}

const tdStyle = {
  padding: '0.58rem 0.65rem',
  borderBottom: '1px solid rgba(0,0,0,0.14)',
  color: '#1E1E1A',
  fontSize: '0.78rem',
  lineHeight: 1.35,
  verticalAlign: 'top' as const,
}

export default function TimelineDocumentTable({
  rows,
  activeRowId,
  onSelectRow,
  showCommentColumn = false,
  showInlineStatus = false,
}: TimelineDocumentTableProps) {
  return (
    <div style={{ border: '1px solid #000', background: '#FBF7EA', minWidth: 0 }}>
      <div style={{ padding: '0.65rem 0.75rem', borderBottom: '1px solid #000', background: '#F7F1E3' }}>
        <div style={{ fontSize: '0.68rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0 }}>
          Draft timeline
        </div>
        <div style={{ fontSize: '0.92rem', fontWeight: 800, lineHeight: 1.25, marginTop: '0.1rem' }}>
          Rivera-Chen wedding day
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: showCommentColumn ? 620 : 360 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, width: '5rem' }}>Time</th>
              <th style={thStyle}>Timeline item</th>
              {showCommentColumn && <th style={{ ...thStyle, width: '11rem' }}>Planner comment</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const id = rowId(row, index)
              const active = id === activeRowId
              const interactive = Boolean(onSelectRow)
              const badge = commentBadge(row)
              return (
                <tr
                  key={id}
                  onClick={() => onSelectRow?.(row, index)}
                  onKeyDown={(event) => {
                    if (!interactive) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onSelectRow?.(row, index)
                    }
                  }}
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
                  style={{
                    background: active ? '#DCE6D2' : index % 2 === 0 ? '#FBF7EA' : '#F2EBD9',
                    cursor: interactive ? 'pointer' : 'default',
                    outline: active ? '2px solid #315D50' : 'none',
                    outlineOffset: '-2px',
                  }}
                >
                  <td style={{ ...tdStyle, fontWeight: 900, color: '#3F605C' }}>{row.time || '-'}</td>
                  <td style={tdStyle}>
                    <div style={{ fontWeight: 700 }}>{row.timeline_item || row.item || '-'}</div>
                    {row.source && (
                      <div style={{ color: '#6f6758', fontSize: '0.68rem', marginTop: '0.22rem' }}>{row.source}</div>
                    )}
                    {showInlineStatus && (
                      <span
                        style={{
                          display: 'inline-block',
                          maxWidth: '100%',
                          marginTop: '0.4rem',
                          padding: '0.18rem 0.38rem',
                          border: '1px solid rgba(0,0,0,0.18)',
                          background: badge.bg,
                          color: badge.fg,
                          fontSize: '0.66rem',
                          fontWeight: 900,
                          lineHeight: 1.2,
                        }}
                      >
                        {badge.label}
                      </span>
                    )}
                  </td>
                  {showCommentColumn && (
                    <td style={tdStyle}>
                      <span
                        style={{
                          display: 'inline-block',
                          maxWidth: '100%',
                          padding: '0.18rem 0.38rem',
                          border: '1px solid rgba(0,0,0,0.18)',
                          background: badge.bg,
                          color: badge.fg,
                          fontSize: '0.68rem',
                          fontWeight: 900,
                          lineHeight: 1.2,
                        }}
                      >
                        {badge.label}
                      </span>
                      {row.planner_note?.trim() && (
                        <div
                          style={{
                            color: '#1E1E1A',
                            fontSize: '0.72rem',
                            lineHeight: 1.35,
                            marginTop: '0.35rem',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {row.planner_note}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
