import { motion } from 'framer-motion'

interface ScoreBarProps {
  score: number
  max?: number
}

function getScoreColor(score: number): string {
  if (score >= 7) return '#3A6B5E'
  if (score >= 4) return '#B87D6B'
  return '#c0392b'
}

export default function ScoreBar({ score, max = 10 }: ScoreBarProps) {
  const pct = (score / max) * 100
  const color = getScoreColor(score)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        style={{
          flex: 1,
          height: '8px',
          backgroundColor: '#E8DCC8',
          border: '1px solid rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{ height: '100%', backgroundColor: color }}
        />
      </div>
      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color, minWidth: '2rem', textAlign: 'right' }}>
        {score}/{max}
      </span>
    </div>
  )
}
