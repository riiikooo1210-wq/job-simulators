import { useState, useRef, useEffect, createContext } from 'react'
import { glossary } from '../../data/glossary'
import { useGameStore } from '../../store/gameStore'

// Case-insensitive glossary lookup; also tries stripping a trailing 's' for plurals.
function resolveGlossaryKey(term: string): string | undefined {
  const lower = term.toLowerCase()
  const exact = Object.keys(glossary).find(k => k.toLowerCase() === lower)
  if (exact) return exact
  if (lower.endsWith('s')) {
    const singular = lower.slice(0, -1)
    return Object.keys(glossary).find(k => k.toLowerCase() === singular)
  }
  return undefined
}

// --- Jargon context (API surface kept for future use) ---
const JargonSeenContext = createContext<Set<string>>(new Set())

export function JargonProvider({ nodeId, children }: { nodeId: string; children: React.ReactNode }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const seen = useRef(new Set<string>())
  useEffect(() => {
    seen.current = new Set<string>()
  }, [nodeId])
  return <JargonSeenContext.Provider value={seen.current}>{children}</JargonSeenContext.Provider>
}

interface JargonTermProps {
  term: string
  children?: React.ReactNode
}

export default function JargonTerm({ term, children }: JargonTermProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ left: 12, bottom: 0, arrowLeft: 130 })
  const ref = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const trackDefinitionClick = useGameStore((s) => s.trackDefinitionClick)

  const glossaryKey = resolveGlossaryKey(term)
  const definition = glossaryKey ? glossary[glossaryKey] : undefined
  if (!definition) return <>{children || term}</>

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) trackDefinitionClick(glossaryKey!)
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    if (!isOpen) return
    const updateTooltipPosition = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const tooltipWidth = Math.min(260, window.innerWidth - 24)
      const preferredLeft = rect.left + rect.width / 2 - tooltipWidth / 2
      const left = Math.min(Math.max(preferredLeft, 12), window.innerWidth - tooltipWidth - 12)
      setTooltipPosition({
        left,
        bottom: Math.max(8, window.innerHeight - rect.top + 6),
        arrowLeft: Math.min(Math.max(rect.left + rect.width / 2 - left, 12), tooltipWidth - 12),
      })
    }
    updateTooltipPosition()
    window.addEventListener('resize', updateTooltipPosition)
    const handleOutside = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('resize', updateTooltipPosition)
    }
  }, [isOpen])

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
      {children || term}
      <span
        onClick={handleClick}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '14px',
          height: '14px',
          fontSize: '0.5625rem',
          fontWeight: 700,
          color: '#fff',
          backgroundColor: '#B87D6B',
          borderRadius: '50%',
          cursor: 'pointer',
          marginLeft: '2px',
          verticalAlign: 'super',
          lineHeight: 1,
          userSelect: 'none',
          position: 'relative',
          top: '-2px',
        }}
        title={`What is ${glossaryKey}?`}
      >
        ?
      </span>
      {isOpen && (
        <div
          ref={tooltipRef}
          style={{
            position: 'fixed',
            bottom: `${tooltipPosition.bottom}px`,
            left: `${tooltipPosition.left}px`,
            backgroundColor: '#1d1c1d',
            color: '#fff',
            padding: '0.625rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            width: '260px',
            maxWidth: 'calc(100vw - 24px)',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#C99080' }}>
            {glossaryKey}
          </div>
          {definition}
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              bottom: '-5px',
              left: `${tooltipPosition.arrowLeft}px`,
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #1d1c1d',
            }}
          />
        </div>
      )}
    </span>
  )
}

/**
 * Parses text containing {{term}} markers and returns JSX with JargonTerm components.
 * The marker text is rendered as-is (preserving original case/plurals); the glossary
 * lookup is case-insensitive so {{user flows}} resolves to the "User Flow" entry.
 * Also handles **bold** markers.
 */
export function renderContentWithGlossary(text: string): React.ReactNode {
  const parts = text.split(/(\{\{[^}]+\}\}|\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    const glossaryMatch = part.match(/^\{\{(.+)\}\}$/)
    if (glossaryMatch) {
      const displayText = glossaryMatch[1]
      return <JargonTerm key={i} term={displayText}>{displayText}</JargonTerm>
    }
    const boldMatch = part.match(/^\*\*(.+)\*\*$/)
    if (boldMatch) return <strong key={i}>{boldMatch[1]}</strong>
    return part
  })
}
