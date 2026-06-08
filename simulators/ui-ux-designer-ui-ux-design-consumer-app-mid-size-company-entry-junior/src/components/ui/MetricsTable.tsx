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

export default function MetricsTable({ metrics }: MetricsTableProps) {
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
            <th style={thStyle}>Metric</th>
            <th style={thStyle}>Target</th>
            <th style={thStyle}>Actual</th>
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
