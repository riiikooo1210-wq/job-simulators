import { motion } from 'framer-motion'
import type { MetricRow } from '../../types/game'

interface MetricsTableProps {
  metrics: MetricRow[]
}

const statusColors: Record<MetricRow['status'], string> = {
  on_track: '#3A6B5E',
  warning: '#B87D6B',
  critical: '#c0392b',
}

const statusLabels: Record<MetricRow['status'], string> = {
  on_track: 'On track',
  warning: 'Needs a look',
  critical: 'Needs help',
}

export default function MetricsTable({ metrics }: MetricsTableProps) {
  const hasExplanations = metrics.some((row) => row.areaLabel || row.meaning || row.roomNote)

  if (hasExplanations) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13rem), 1fr))',
          gap: '0.6rem',
        }}
      >
        {metrics.map((row, i) => {
          const statusColor = statusColors[row.status]
          return (
            <article
              key={i}
              style={{
                border: '1px solid #000000',
                boxShadow: '4px 4px 0 #000000',
                backgroundColor: '#F2EBD9',
                padding: '0.7rem',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div>
                {row.areaLabel && (
                  <div
                    style={{
                      color: '#3A6B5E',
                      fontSize: '0.72rem',
                      fontWeight: 900,
                      textTransform: 'uppercase',
                      letterSpacing: 0,
                    }}
                  >
                    {row.areaLabel}
                  </div>
                )}
                <h3 style={{ margin: '0.12rem 0 0', fontSize: '0.86rem', lineHeight: 1.28 }}>
                  {row.metric}
                </h3>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  gap: '0.5rem',
                }}
              >
                <div style={valueBlockStyle}>
                  <span style={valueLabelStyle}>Goal</span>
                  <strong style={valueTextStyle}>{row.target}</strong>
                </div>
                <div style={{ ...valueBlockStyle, borderColor: statusColor }}>
                  <span style={valueLabelStyle}>What happened</span>
                  <strong style={{ ...valueTextStyle, color: statusColor }}>{row.actual}</strong>
                  <span style={{ marginTop: '0.1rem', fontSize: '0.66rem', fontWeight: 800, color: statusColor }}>
                    {statusLabels[row.status]}
                  </span>
                </div>
              </div>

              {row.meaning && (
                <p style={bodyTextStyle}>{row.meaning}</p>
              )}
              {row.roomNote && (
                <p style={{ ...bodyTextStyle, borderTop: '1px solid #CDBF94', paddingTop: '0.45rem', color: '#3F605C', fontWeight: 700 }}>
                  {row.roomNote}
                </p>
              )}
            </article>
          )
        })}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        border: '1px solid #000000',
        boxShadow: '4px 4px 0 #000000',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <table style={{ width: '100%', minWidth: '420px', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#E8DCC8' }}>
            <th style={thStyle}>What to watch</th>
            <th style={thStyle}>Goal</th>
            <th style={thStyle}>What happened</th>
          </tr>
        </thead>
        <tbody>
          {metrics.map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#F2EBD9' : '#EDE5D1' }}>
              <td style={tdStyle}>{row.metric}</td>
              <td style={tdStyle}>{row.target}</td>
              <td style={{ ...tdStyle, color: statusColors[row.status], fontWeight: 600 }}>
                {row.actual}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.625rem 0.875rem',
  borderBottom: '1px solid #000',
  fontWeight: 700,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '0.625rem 0.875rem',
  borderBottom: '1px solid rgba(0,0,0,0.15)',
  whiteSpace: 'nowrap',
}

const valueBlockStyle: React.CSSProperties = {
  border: '1px solid #CDBF94',
  backgroundColor: '#FBF7EA',
  padding: '0.42rem',
  minWidth: 0,
}

const valueLabelStyle: React.CSSProperties = {
  display: 'block',
  color: '#6F6758',
  fontSize: '0.66rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: 0,
}

const valueTextStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '0.15rem',
  color: '#1E1E1A',
  fontSize: '0.94rem',
  lineHeight: 1.2,
}

const bodyTextStyle: React.CSSProperties = {
  margin: 0,
  color: '#333333',
  fontSize: '0.74rem',
  lineHeight: 1.42,
}
