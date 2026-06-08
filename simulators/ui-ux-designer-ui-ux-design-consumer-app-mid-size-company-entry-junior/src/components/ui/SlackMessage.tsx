import { motion } from 'framer-motion'
import type { SlackMessageData } from '../../types/game'

interface SlackMessageProps {
  message: SlackMessageData
  delay?: number
}

export default function SlackMessage({ message, delay = 0 }: SlackMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        backgroundColor: '#F2EBD9',
        border: '1px solid #000000',
        boxShadow: '4px 4px 0 #000000',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#000' }}>
          {message.sender}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#555555' }}>
          {message.role}
        </span>
        <span style={{ fontSize: '0.7rem', color: '#888', marginLeft: 'auto' }}>
          {message.timestamp}
        </span>
      </div>
      <div
        style={{
          fontSize: '0.875rem',
          lineHeight: 1.7,
          color: '#000',
          whiteSpace: 'pre-wrap',
          borderLeft: '3px solid #B87D6B',
          paddingLeft: '0.75rem',
        }}
      >
        {message.content}
      </div>
    </motion.div>
  )
}
