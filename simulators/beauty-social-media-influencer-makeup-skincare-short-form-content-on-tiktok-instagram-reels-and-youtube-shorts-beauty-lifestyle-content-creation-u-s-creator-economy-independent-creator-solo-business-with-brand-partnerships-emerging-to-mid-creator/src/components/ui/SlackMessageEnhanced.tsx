import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SlackMessageData } from '../../types/game'

interface Props {
  message: SlackMessageData
  delay?: number
  initialExpanded?: boolean
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = ['#E07A5F', '#3D405B', '#81B29A', '#F2CC8F', '#6A4C93', '#1982C4', '#FF595E', '#8AC926']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return text.slice(0, max).trimEnd() + '...'
}

export default function SlackMessageEnhanced({ message, delay = 0, initialExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(initialExpanded)

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        borderRadius: '4px',
        backgroundColor: '#F7F1E3',
        transition: 'background-color 0.15s',
        cursor: expanded ? 'default' : 'pointer',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EDE5D3')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F7F1E3')}
    >
      {/* Collapsed: inbox row */}
      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.25rem 0.75rem',
          }}
        >
          {/* Unread dot */}
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#B87D6B',
              flexShrink: 0,
            }}
          />
          {/* Small avatar */}
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              backgroundColor: getAvatarColor(message.sender),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: 700 }}>
              {getInitials(message.sender)}
            </span>
          </div>
          {/* Sender + preview */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1d1c1d', flexShrink: 0 }}>
              {message.sender}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#616061',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {truncate(message.content.replace(/\n/g, ' '), 80)}
            </span>
          </div>
          {/* Timestamp */}
          <span style={{ fontSize: '0.6875rem', color: '#9e9e9e', flexShrink: 0, whiteSpace: 'nowrap' }}>
            {message.timestamp}
          </span>
        </div>
      )}

      {/* Expanded: full message */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                display: 'flex',
                gap: '0.625rem',
                padding: '0.5rem 0.75rem',
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: getAvatarColor(message.sender),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                  {getInitials(message.sender)}
                </span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1d1c1d' }}>
                    {message.sender}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: '#9e9e9e', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {message.timestamp}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: '#1d1c1d',
                    whiteSpace: 'pre-wrap',
                    marginTop: '0.125rem',
                  }}
                >
                  {message.content}
                </div>
              </div>
            </div>
            {/* Collapse button */}
            <div style={{ padding: '0 0.75rem 0.375rem', textAlign: 'right' }}>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.6875rem',
                  color: '#616061',
                  cursor: 'pointer',
                  padding: '0.125rem 0.25rem',
                }}
              >
                Collapse
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
