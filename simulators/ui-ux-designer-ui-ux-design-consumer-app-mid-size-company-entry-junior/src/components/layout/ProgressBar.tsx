import type { ReactNode } from 'react'
import { useGameStore } from '../../store/gameStore'
import { storyline } from '../../data/storyline'
import { CheckIcon } from '../ui/Icons'

export default function ProgressBar() {
  const currentNodeId = useGameStore((s) => s.currentNodeId)
  const currentSection = useGameStore((s) => s.currentSection)
  const visitedNodes = useGameStore((s) => s.visitedNodes)
  const submitted = useGameStore((s) => s.sectionsSubmitted)
  const progressTasks = storyline.progressTasks || []
  const sections = storyline.sections

  if (currentSection === 0) return null

  if (progressTasks.length > 0) {
    const activeTaskIndex = progressTasks.findIndex((task) => task.nodeIds.includes(currentNodeId))
    const latestVisitedTaskIndex = progressTasks.reduce((latest, task, idx) => (
      task.nodeIds.some((nodeId) => visitedNodes.includes(nodeId)) ? idx : latest
    ), -1)

    return (
      <ProgressShell>
        {progressTasks.map((task, idx) => {
          const isCurrent = activeTaskIndex === idx
          const isComplete = activeTaskIndex >= 0 ? idx < activeTaskIndex : idx <= latestVisitedTaskIndex
          const isFuture = !isComplete && !isCurrent

          return (
            <ProgressSegment
              key={task.id}
              label={task.label}
              isComplete={isComplete}
              isCurrent={isCurrent}
              isFuture={isFuture}
              hasDivider={idx < progressTasks.length - 1}
            />
          )
        })}
      </ProgressShell>
    )
  }

  if (sections.length === 0) return null

  return (
    <ProgressShell>
      {sections.map((s, idx) => {
        const isComplete = submitted.includes(s.num)
        const isCurrent = currentSection === s.num
        const isFuture = !isComplete && !isCurrent

        return (
          <ProgressSegment
            key={s.num}
            label={s.label}
            isComplete={isComplete}
            isCurrent={isCurrent}
            isFuture={isFuture}
            hasDivider={idx < sections.length - 1}
          />
        )
      })}
    </ProgressShell>
  )
}

function ProgressShell({ children }: { children: ReactNode }) {
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
      {children}
    </div>
  )
}

function ProgressSegment({
  label,
  isComplete,
  isCurrent,
  isFuture,
  hasDivider,
}: {
  label: string
  isComplete: boolean
  isCurrent: boolean
  isFuture: boolean
  hasDivider: boolean
}) {
  let bg = '#E8DCC8'
  let color = '#999'
  if (isComplete) { bg = '#3A6B5E'; color = '#F2EBD9' }
  else if (isCurrent) { bg = '#B87D6B'; color = '#F2EBD9' }

  return (
    <div
      title={label}
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        color,
        fontSize: '0.625rem',
        fontWeight: 600,
        letterSpacing: '0.01em',
        borderRight: hasDivider ? '1px solid rgba(0,0,0,0.2)' : undefined,
        opacity: isFuture ? 0.5 : 1,
        transition: 'all 0.3s ease',
        gap: '0.2rem',
        padding: '0 0.25rem',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {isComplete && <CheckIcon size={10} color="currentColor" />}
    </div>
  )
}
