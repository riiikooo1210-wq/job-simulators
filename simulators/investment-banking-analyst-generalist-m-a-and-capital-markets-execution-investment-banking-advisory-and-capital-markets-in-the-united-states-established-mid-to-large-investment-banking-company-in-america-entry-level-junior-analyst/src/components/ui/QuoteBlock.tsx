import { motion } from 'framer-motion'
import type { QuoteData } from '../../types/game'

interface QuoteBlockProps {
  quote: QuoteData
  delay?: number
}

export default function QuoteBlock({ quote, delay = 0 }: QuoteBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        borderLeft: '4px solid #B87D6B',
        padding: '0.875rem 1rem',
        backgroundColor: 'rgba(232,220,200,0.5)',
      }}
    >
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.375rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>{quote.speaker}</span>
        <span style={{ fontSize: '0.75rem', color: '#555' }}>{quote.role}</span>
      </div>
      <p style={{ fontSize: '0.875rem', lineHeight: 1.7, fontStyle: 'italic', color: '#000' }}>
        "{quote.text}"
      </p>
    </motion.div>
  )
}
