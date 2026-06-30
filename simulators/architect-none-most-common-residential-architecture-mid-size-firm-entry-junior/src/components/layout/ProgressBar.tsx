import { useGameStore } from '../../store/gameStore'
import { storyline } from '../../data/storyline'
import { CheckIcon } from '../ui/Icons'
import { useNarrowViewport } from '../hooks/useNarrowViewport'

export default function ProgressBar() {
  const currentSection = useGameStore((s) => s.currentSection)
  const submitted = useGameStore((s) => s.sectionsSubmitted)
  const isNarrow = useNarrowViewport(520)
  const sections = storyline.sections

  if (currentSection === 0 || sections.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        height: '28px',
        backgroundColor: '#E8DCC8',
        borderBottom: '1px solid #000',
      }}
    >
      {sections.map((s, idx) => {
        const isComplete = submitted.includes(s.num)
        const isCurrent = currentSection === s.num
        const isFuture = !isComplete && !isCurrent

        let bg = '#E8DCC8'
        let color = '#999'
        if (isComplete) { bg = '#3A6B5E'; color = '#F2EBD9' }
        else if (isCurrent) { bg = '#B87D6B'; color = '#F2EBD9' }
        const label = isNarrow
          ? s.num === 1
            ? 'Read'
            : s.num === 2
              ? 'Coordinate'
              : 'Design'
          : s.label

        return (
          <div
            key={s.num}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: bg,
              color,
              fontSize: isNarrow ? '0.58rem' : '0.6875rem',
              fontWeight: 600,
              letterSpacing: 0,
              borderRight: idx < sections.length - 1 ? '1px solid rgba(0,0,0,0.2)' : undefined,
              opacity: isFuture ? 0.5 : 1,
              transition: 'all 0.3s ease',
              gap: '0.25rem',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '0 0.25rem',
            }}
          >
            {label} {isComplete && <CheckIcon size={10} color="currentColor" />}
          </div>
        )
      })}
    </div>
  )
}
