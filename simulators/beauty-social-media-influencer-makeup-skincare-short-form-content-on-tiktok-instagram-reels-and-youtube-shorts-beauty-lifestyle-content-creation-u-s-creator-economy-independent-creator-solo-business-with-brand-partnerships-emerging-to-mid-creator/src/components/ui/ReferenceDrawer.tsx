import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'
import { DocumentIcon } from './Icons'

interface ReferenceDrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function ReferenceDrawer({ isOpen, onClose, title = 'Reference Info', children }: ReferenceDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              zIndex: 998,
            }}
          />
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '420px',
              maxWidth: '90vw',
              backgroundColor: '#F2EBD9',
              zIndex: 999,
              boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.25rem',
                borderBottom: '1px solid rgba(0,0,0,0.15)',
              }}
            >
              <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#000' }}>
                {title}
              </span>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: '1px solid #000',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#333',
                  padding: '0.25rem 0.625rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                Close
              </button>
            </div>
            {/* Scrollable content */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/** Small toggle button to place on pages that have a reference drawer */
export function ReferenceButton({ onClick, label = 'View Reference' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        backgroundColor: '#E8DCC8',
        border: '1px solid #000',
        boxShadow: '2px 2px 0 #000',
        padding: '0.375rem 0.75rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#333',
        cursor: 'pointer',
        fontFamily: 'Inter, system-ui, sans-serif',
        transition: 'transform 0.1s, box-shadow 0.1s',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translate(2px, 2px)'
        e.currentTarget.style.boxShadow = '0 0 0 #000'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)'
        e.currentTarget.style.boxShadow = '2px 2px 0 #000'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translate(0, 0)'
        e.currentTarget.style.boxShadow = '2px 2px 0 #000'
      }}
    >
      <DocumentIcon size={14} />
      {label}
    </button>
  )
}
