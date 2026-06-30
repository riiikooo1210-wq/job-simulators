import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { renderContentWithGlossary } from './JargonTerm'
import type { SlackMessageData } from '../../types/game'

interface Props {
  message: SlackMessageData
  delay?: number
  initialExpanded?: boolean
  showUnreadDot?: boolean
  density?: 'default' | 'emphasis' | 'compact'
}

const densityStyles = {
  default: {
    collapsedPadding: '0.25rem 0.75rem',
    collapsedGap: '0.5rem',
    collapsedAvatarSize: '24px',
    collapsedAvatarFontSize: '0.55rem',
    collapsedSenderFontSize: '0.8125rem',
    collapsedPreviewFontSize: '0.75rem',
    collapsedTimestampFontSize: '0.6875rem',
    expandedPadding: '0.5rem 0.75rem',
    expandedGap: '0.625rem',
    expandedAvatarSize: '36px',
    expandedAvatarFontSize: '0.7rem',
    expandedSenderFontSize: '0.875rem',
    expandedBodyFontSize: '0.875rem',
    expandedTimestampFontSize: '0.6875rem',
    expandedLineHeight: 1.6,
    contentMarginTop: '0.125rem',
    collapsePadding: '0 0.75rem 0.375rem',
  },
  emphasis: {
    collapsedPadding: '0.35rem 0.85rem',
    collapsedGap: '0.6rem',
    collapsedAvatarSize: '28px',
    collapsedAvatarFontSize: '0.62rem',
    collapsedSenderFontSize: '0.875rem',
    collapsedPreviewFontSize: '0.8125rem',
    collapsedTimestampFontSize: '0.6875rem',
    expandedPadding: '0.65rem 0.85rem',
    expandedGap: '0.75rem',
    expandedAvatarSize: '40px',
    expandedAvatarFontSize: '0.75rem',
    expandedSenderFontSize: '0.9375rem',
    expandedBodyFontSize: '0.9375rem',
    expandedTimestampFontSize: '0.7rem',
    expandedLineHeight: 1.6,
    contentMarginTop: '0.16rem',
    collapsePadding: '0 0.85rem 0.45rem',
  },
  compact: {
    collapsedPadding: '0.2rem 0.6rem',
    collapsedGap: '0.4rem',
    collapsedAvatarSize: '22px',
    collapsedAvatarFontSize: '0.5rem',
    collapsedSenderFontSize: '0.75rem',
    collapsedPreviewFontSize: '0.7rem',
    collapsedTimestampFontSize: '0.625rem',
    expandedPadding: '0.42rem 0.6rem',
    expandedGap: '0.5rem',
    expandedAvatarSize: '30px',
    expandedAvatarFontSize: '0.62rem',
    expandedSenderFontSize: '0.75rem',
    expandedBodyFontSize: '0.78rem',
    expandedTimestampFontSize: '0.625rem',
    expandedLineHeight: 1.5,
    contentMarginTop: '0.1rem',
    collapsePadding: '0 0.6rem 0.3rem',
  },
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getMessageInitials(message: SlackMessageData): string {
  return message.avatarInitials || getInitials(message.sender)
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

function stripGlossaryMarkers(text: string): string {
  return text.replace(/\{\{([^}]+)\}\}/g, '$1')
}

export default function SlackMessageEnhanced({ message, delay = 0, initialExpanded = false, showUnreadDot = true, density = 'default' }: Props) {
  const [expanded, setExpanded] = useState(initialExpanded)
  const styles = densityStyles[density]

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
            gap: styles.collapsedGap,
            padding: styles.collapsedPadding,
          }}
        >
          {/* Unread dot */}
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: showUnreadDot ? '#B87D6B' : 'transparent',
              flexShrink: 0,
            }}
          />
          {/* Small avatar */}
          <div
            style={{
              width: styles.collapsedAvatarSize,
              height: styles.collapsedAvatarSize,
              borderRadius: '4px',
              backgroundColor: getAvatarColor(message.sender),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#fff', fontSize: styles.collapsedAvatarFontSize, fontWeight: 700 }}>
              {getMessageInitials(message)}
            </span>
          </div>
          {/* Sender + preview */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
            <span style={{ fontWeight: 700, fontSize: styles.collapsedSenderFontSize, color: '#1d1c1d', flexShrink: 0 }}>
              {message.sender}
            </span>
            <span
              style={{
                fontSize: styles.collapsedPreviewFontSize,
                color: '#616061',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}
            >
              {truncate(stripGlossaryMarkers(message.content).replace(/\n/g, ' '), 80)}
            </span>
          </div>
          {/* Timestamp */}
          <span style={{ fontSize: styles.collapsedTimestampFontSize, color: '#9e9e9e', flexShrink: 0, whiteSpace: 'nowrap' }}>
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
                gap: styles.expandedGap,
                padding: styles.expandedPadding,
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: styles.expandedAvatarSize,
                  height: styles.expandedAvatarSize,
                  borderRadius: '6px',
                  backgroundColor: getAvatarColor(message.sender),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <span style={{ color: '#fff', fontSize: styles.expandedAvatarFontSize, fontWeight: 700, letterSpacing: '0.02em' }}>
                  {getMessageInitials(message)}
                </span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: styles.expandedSenderFontSize, color: '#1d1c1d' }}>
                    {message.sender}
                  </span>
                  <span style={{ fontSize: styles.expandedTimestampFontSize, color: '#9e9e9e', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {message.timestamp}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: styles.expandedBodyFontSize,
                    lineHeight: styles.expandedLineHeight,
                    color: '#1d1c1d',
                    whiteSpace: 'pre-wrap',
                    marginTop: styles.contentMarginTop,
                  }}
                >
                  {renderContentWithGlossary(message.content)}
                </div>
              </div>
            </div>
            {/* Collapse button */}
            <div style={{ padding: styles.collapsePadding, textAlign: 'right' }}>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '0.6875rem',
                  color: '#616061',
                  cursor: 'pointer',
                  padding: '0.2rem 0.3rem',
                  minHeight: 28,
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
