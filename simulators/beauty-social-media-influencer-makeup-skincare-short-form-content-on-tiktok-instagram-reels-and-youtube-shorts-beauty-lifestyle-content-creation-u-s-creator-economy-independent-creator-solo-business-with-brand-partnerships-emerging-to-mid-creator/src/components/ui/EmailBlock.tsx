import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { EmailData } from '../../types/game'

interface EmailBlockProps {
  email: EmailData
  delay?: number
  initialExpanded?: boolean
}

export default function EmailBlock({ email, delay = 0, initialExpanded = false }: EmailBlockProps) {
  const [expanded, setExpanded] = useState(initialExpanded)
  const senderName = email.from.split('<')[0].split('(')[0].trim() || email.from
  const preview = email.content.replace(/\s+/g, ' ').trim()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #D7DCE2',
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: expanded ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      {/* Collapsed: inbox row */}
      {!expanded && (
        <div
          onClick={() => setExpanded(true)}
          style={{
            display: 'grid',
            gridTemplateColumns: '0.5rem minmax(7rem, 12rem) minmax(0, 1fr) auto',
            alignItems: 'center',
            gap: '0.625rem',
            padding: '0.55rem 0.75rem',
            cursor: 'pointer',
            transition: 'background-color 0.15s',
            minWidth: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F4F7FB')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#2563EB',
            }}
          />
          <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {senderName}
          </span>
          <span
            style={{
              fontSize: '0.75rem',
              color: '#4B5563',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            <strong style={{ color: '#111827' }}>{email.subject}</strong>
            {preview ? ` - ${preview}` : ''}
          </span>
          {email.isForwarded && (
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#2563EB',
              }}
            >
              FWD
            </span>
          )}
        </div>
      )}

      {/* Expanded: full email */}
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
                padding: '0.85rem 1rem',
                borderBottom: '1px solid #E5E7EB',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              {email.isForwarded && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563EB' }}>
                  Forwarded Email
                </span>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.25, color: '#111827' }}>
                  {email.subject}
                </h3>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '0.7rem',
                    color: '#6B7280',
                    cursor: 'pointer',
                    padding: '0.125rem 0.25rem',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  Collapse
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '3.25rem 1fr', rowGap: '0.2rem', columnGap: '0.5rem', fontSize: '0.75rem', color: '#4B5563' }}>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>From</span>
                <span>{email.from}</span>
                <span style={{ fontWeight: 700, color: '#6B7280' }}>To</span>
                <span>{email.to}</span>
              </div>
            </div>
            <div
              style={{
                padding: '1rem',
                fontSize: '0.875rem',
                lineHeight: 1.7,
                color: '#111827',
                whiteSpace: 'pre-wrap',
                backgroundColor: '#FFFFFF',
              }}
            >
              {email.content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
