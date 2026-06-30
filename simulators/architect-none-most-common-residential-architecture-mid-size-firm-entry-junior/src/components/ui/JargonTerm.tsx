import { useState, useRef, useEffect, useLayoutEffect, createContext } from 'react'
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
  const rootRef = useRef<HTMLDivElement>(null)
  const seen = useRef(new Set<string>())

  useLayoutEffect(() => {
    seen.current = new Set<string>()

    const glossaryTerms = rootRef.current?.querySelectorAll<HTMLElement>('[data-glossary-term]') ?? []
    glossaryTerms.forEach((termElement) => {
      const glossaryKey = termElement.dataset.glossaryTerm
      const help = termElement.querySelector<HTMLElement>('[data-glossary-help]')
      if (!glossaryKey || !help) return

      const isFirstUse = !seen.current.has(glossaryKey)
      if (isFirstUse) seen.current.add(glossaryKey)

      termElement.dataset.glossaryFirstUse = isFirstUse ? 'true' : 'false'
      help.style.display = isFirstUse ? 'inline-flex' : 'none'
      help.tabIndex = isFirstUse ? 0 : -1
      help.setAttribute('aria-hidden', isFirstUse ? 'false' : 'true')
    })
  }, [children, nodeId])

  return (
    <JargonSeenContext.Provider value={seen.current}>
      <div ref={rootRef} style={{ display: 'contents' }}>{children}</div>
    </JargonSeenContext.Provider>
  )
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
  if (!glossaryKey) return <>{children || term}</>
  const definition = glossary[glossaryKey]
  if (!definition) return <>{children || term}</>
  const normalizedGlossaryKey = glossaryKey.toLowerCase()
  const displayLabel = typeof children === 'string' ? children : term

  const toggleDefinition = () => {
    if (!isOpen) trackDefinitionClick(glossaryKey)
    setIsOpen(!isOpen)
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleDefinition()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    e.stopPropagation()
    toggleDefinition()
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
    <span ref={ref} data-glossary-term={normalizedGlossaryKey} style={{ position: 'relative', display: 'inline' }}>
      {children || term}
      <span
        data-glossary-help
        role="button"
        tabIndex={0}
        aria-label={`Explain ${displayLabel}`}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
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
        title={`What does ${displayLabel} mean?`}
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
            {displayLabel}
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
