import { useState, useRef, useEffect, createContext, useId } from 'react'
import { createPortal } from 'react-dom'
import { glossary } from '../../data/glossary'
import { useGameStore } from '../../store/gameStore'

type GlossaryVariant = {
  variant: string
  key: string
  pattern: RegExp
  startsWithWord: boolean
  endsWithWord: boolean
}

type GlossaryMatch = {
  start: number
  end: number
  text: string
  key: string
}

type TooltipPosition = {
  top: number
  left: number
  width: number
  arrowLeft: number
  placement: 'top' | 'bottom'
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function isWordChar(char: string | undefined): boolean {
  return !!char && /[A-Za-z0-9_]/.test(char)
}

function pluralize(value: string): string | undefined {
  if (!/[A-Za-z0-9]$/.test(value) || /s$/i.test(value)) return undefined
  if (/[^aeiou]y$/i.test(value)) return value.replace(/y$/i, 'ies')
  if (/(x|z|ch|sh)$/i.test(value)) return `${value}es`
  return `${value}s`
}

function buildGlossaryVariants(): GlossaryVariant[] {
  const variants = new Map<string, { variant: string; key: string }>()

  const addVariant = (variant: string | undefined, key: string) => {
    const cleaned = variant?.trim()
    if (!cleaned) return
    const normalized = cleaned.toLowerCase()
    if (!variants.has(normalized)) variants.set(normalized, { variant: cleaned, key })
  }

  const addVariantFamily = (variant: string | undefined, key: string) => {
    addVariant(variant, key)
    addVariant(pluralize(variant ?? ''), key)
  }

  Object.keys(glossary).forEach((key) => {
    addVariantFamily(key, key)

    const withoutParentheticals = key.replace(/\s*\([^)]*\)/g, '').trim()
    if (withoutParentheticals !== key) addVariantFamily(withoutParentheticals, key)

    const parentheticalMatches = key.match(/\(([^)]+)\)/g) ?? []
    parentheticalMatches.forEach((match) => {
      addVariantFamily(match.slice(1, -1), key)
    })
  })

  return Array.from(variants.values())
    .sort((a, b) => b.variant.length - a.variant.length)
    .map(({ variant, key }) => ({
      variant,
      key,
      pattern: new RegExp(escapeRegExp(variant), 'gi'),
      startsWithWord: isWordChar(variant[0]),
      endsWithWord: isWordChar(variant[variant.length - 1]),
    }))
}

const glossaryVariants = buildGlossaryVariants()
const glossaryVariantLookup = new Map(glossaryVariants.map(({ variant, key }) => [variant.toLowerCase(), key]))

// Case-insensitive glossary lookup; also handles simple plurals and parenthetical abbreviations.
function resolveGlossaryKey(term: string): string | undefined {
  const lower = term.toLowerCase()
  const variant = glossaryVariantLookup.get(lower)
  if (variant) return variant
  const exact = Object.keys(glossary).find(k => k.toLowerCase() === lower)
  if (exact) return exact
  if (lower.endsWith('s')) {
    const singular = lower.slice(0, -1)
    return glossaryVariantLookup.get(singular) ?? Object.keys(glossary).find(k => k.toLowerCase() === singular)
  }
  return undefined
}

function findGlossaryMatches(text: string): GlossaryMatch[] {
  const candidates: GlossaryMatch[] = []

  glossaryVariants.forEach(({ key, pattern, startsWithWord, endsWithWord }) => {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index
      const end = start + match[0].length
      if (startsWithWord && isWordChar(text[start - 1])) continue
      if (endsWithWord && isWordChar(text[end])) continue
      candidates.push({ start, end, text: match[0], key })
    }
  })

  candidates.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))

  const accepted: GlossaryMatch[] = []
  let cursor = -1
  candidates.forEach((candidate) => {
    if (candidate.start < cursor) return
    accepted.push(candidate)
    cursor = candidate.end
  })

  return accepted
}

function renderTextWithAutoGlossary(text: string, keyPrefix: string): React.ReactNode {
  const matches = findGlossaryMatches(text)
  if (matches.length === 0) return text

  const nodes: React.ReactNode[] = []
  let cursor = 0
  matches.forEach((match, index) => {
    if (match.start > cursor) nodes.push(text.slice(cursor, match.start))
    nodes.push(
      <JargonTerm key={`${keyPrefix}-term-${index}`} term={match.key}>
        {match.text}
      </JargonTerm>
    )
    cursor = match.end
  })
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return nodes
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
  const [position, setPosition] = useState<TooltipPosition | null>(null)
  const ref = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const tooltipId = useId()
  const trackDefinitionClick = useGameStore((s) => s.trackDefinitionClick)

  const glossaryKey = resolveGlossaryKey(term)
  const definition = glossaryKey ? glossary[glossaryKey] : undefined
  if (!definition) return <>{children || term}</>
  const displayLabel = typeof children === 'string' ? children : term

  const updateTooltipPosition = () => {
    if (!triggerRef.current || typeof window === 'undefined') return

    const margin = 12
    const gap = 8
    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current?.getBoundingClientRect()
    const width = Math.max(160, Math.min(280, window.innerWidth - margin * 2))
    const measuredWidth = tooltipRect?.width || width
    const measuredHeight = tooltipRect?.height || 112
    const triggerCenter = triggerRect.left + triggerRect.width / 2
    const canFitAbove = triggerRect.top >= measuredHeight + margin + gap
    const placement: TooltipPosition['placement'] = canFitAbove ? 'top' : 'bottom'
    const rawTop = placement === 'top'
      ? triggerRect.top - measuredHeight - gap
      : triggerRect.bottom + gap
    const maxTop = Math.max(margin, window.innerHeight - measuredHeight - margin)
    const top = Math.min(Math.max(rawTop, margin), maxTop)
    const maxLeft = Math.max(margin, window.innerWidth - measuredWidth - margin)
    const left = Math.min(Math.max(triggerCenter - measuredWidth / 2, margin), maxLeft)
    const arrowLeft = Math.min(Math.max(triggerCenter - left, 14), measuredWidth - 14)

    setPosition((current) => {
      const next = { top, left, width, arrowLeft, placement }
      if (
        current &&
        Math.abs(current.top - next.top) < 1 &&
        Math.abs(current.left - next.left) < 1 &&
        Math.abs(current.width - next.width) < 1 &&
        Math.abs(current.arrowLeft - next.arrowLeft) < 1 &&
        current.placement === next.placement
      ) {
        return current
      }
      return next
    })
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isOpen) trackDefinitionClick(glossaryKey!)
    setPosition(null)
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    if (!isOpen) return
    updateTooltipPosition()

    const handleOutside = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updateTooltipPosition)
    window.addEventListener('scroll', updateTooltipPosition, true)

    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updateTooltipPosition)
      window.removeEventListener('scroll', updateTooltipPosition, true)
    }
  }, [isOpen])

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
      {children || term}
      <button
        type="button"
        ref={triggerRef}
        onClick={handleClick}
        aria-label={`Show explanation for ${displayLabel}`}
        aria-expanded={isOpen}
        aria-describedby={isOpen ? tooltipId : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '14px',
          height: '14px',
          border: 0,
          padding: 0,
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
        title={`What is ${displayLabel}?`}
      >
        ?
      </button>
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: position?.top ?? 0,
            left: position?.left ?? 0,
            backgroundColor: '#1d1c1d',
            color: '#fff',
            padding: '0.625rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            width: position?.width ?? 260,
            maxWidth: 'calc(100vw - 24px)',
            zIndex: 10000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            visibility: position ? 'visible' : 'hidden',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#C99080' }}>
            {displayLabel}
          </div>
          {definition}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: position ? `${position.arrowLeft}px` : '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              ...(position?.placement === 'top'
                ? { bottom: '-6px', borderTop: '6px solid #1d1c1d' }
                : { top: '-6px', borderBottom: '6px solid #1d1c1d' }),
            }}
          />
        </div>,
        document.body,
      )}
    </span>
  )
}

/**
 * Parses text containing {{term}} markers and returns JSX with JargonTerm components.
 * The marker text is rendered as-is (preserving original case/plurals); the glossary
 * lookup is case-insensitive so {{user flows}} resolves to the "User Flow" entry.
 * Unmarked glossary terms are also detected, preserving the original visible casing.
 * Also handles **bold** markers.
 */
export function renderContentWithGlossary(text: string): React.ReactNode {
  const parts = text.split(/(\{\{[^}]+\}\}|\*\*[^*]+\*\*)/)
  const nodes: React.ReactNode[] = []

  parts.forEach((part, i) => {
    const glossaryMatch = part.match(/^\{\{(.+)\}\}$/)
    if (glossaryMatch) {
      const displayText = glossaryMatch[1]
      const glossaryKey = resolveGlossaryKey(displayText)
      nodes.push(
        glossaryKey
          ? <JargonTerm key={i} term={glossaryKey}>{displayText}</JargonTerm>
          : displayText
      )
      return
    }
    const boldMatch = part.match(/^\*\*(.+)\*\*$/)
    if (boldMatch) {
      nodes.push(<strong key={i}>{renderTextWithAutoGlossary(boldMatch[1], `bold-${i}`)}</strong>)
      return
    }
    nodes.push(renderTextWithAutoGlossary(part, `text-${i}`))
  })

  return nodes
}
