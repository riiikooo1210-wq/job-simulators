import { motion } from 'framer-motion'
import ScoreBar from './ScoreBar'
import type { CriterionResult } from '../../types/game'

interface GradingCardProps {
  result: CriterionResult
  delay?: number
}

export default function GradingCard({ result, delay = 0 }: GradingCardProps) {
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
      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000' }}>
        {result.criterion}
      </div>
      <ScoreBar score={result.score} />
      <p style={{ fontSize: '0.8125rem', lineHeight: 1.6, color: '#333', fontStyle: 'italic' }}>
        {result.comment}
      </p>
    </motion.div>
  )
}
