import { motion } from 'framer-motion'
import type { TaskFeedbackResult } from '../../types/game'
import { getCareerSignalTitle } from '../../services/assessment'

interface GradingCardProps {
  result: TaskFeedbackResult
  delay?: number
}

const levelColors: Record<TaskFeedbackResult['level'], string> = {
  'Strong signal': '#3A6B5E',
  'Solid signal': '#6B9EA6',
  'Developing signal': '#B87D6B',
  'Early signal': '#8A6F4D',
}

export default function GradingCard({ result, delay = 0 }: GradingCardProps) {
  const levelColor = levelColors[result.level]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        border: '1px solid #000',
        boxShadow: '4px 4px 0 #000',
        backgroundColor: '#F2EBD9',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000' }}>
          {result.task}
        </div>
        <div
          style={{
            flexShrink: 0,
            border: '1px solid #000',
            backgroundColor: levelColor,
            color: '#F7F1E3',
            fontSize: '0.6875rem',
            fontWeight: 800,
            padding: '0.2rem 0.45rem',
            textTransform: 'uppercase',
          }}
        >
          {result.level}
        </div>
      </div>
      <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: '#333', fontStyle: 'italic' }}>
        {result.evidence}
      </p>
      {result.career_signal_ids.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {result.career_signal_ids.map((signalId) => (
            <span
              key={signalId}
              style={{
                border: '1px solid rgba(0,0,0,0.25)',
                backgroundColor: '#EFE8D2',
                color: '#1E1E1A',
                padding: '0.2rem 0.4rem',
                fontSize: '0.6875rem',
                fontWeight: 700,
              }}
            >
              {getCareerSignalTitle(signalId)}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}
