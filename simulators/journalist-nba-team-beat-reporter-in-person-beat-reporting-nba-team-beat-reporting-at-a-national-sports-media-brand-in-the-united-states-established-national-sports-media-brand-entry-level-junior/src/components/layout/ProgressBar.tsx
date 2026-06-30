import { useGameStore } from '../../store/gameStore'
import { storyline } from '../../data/storyline'
import { CheckIcon } from '../ui/Icons'

export default function ProgressBar() {
  const currentSection = useGameStore((s) => s.currentSection)
  const currentNodeId = useGameStore((s) => s.currentNodeId)
  const visitedNodes = useGameStore((s) => s.visitedNodes)
  const submitted = useGameStore((s) => s.sectionsSubmitted)
  const tasks = storyline.progressTasks || []
  const sections = storyline.sections

  if (currentSection === 0) return null

  if (tasks.length > 0) {
    const taskIndexForNode = (nodeId: string) => tasks.findIndex((task) => task.nodeIds.includes(nodeId))
    const currentTaskIndex = taskIndexForNode(currentNodeId)
    const latestVisitedTaskIndex = visitedNodes.reduce((latest, nodeId) => {
      const index = taskIndexForNode(nodeId)
      return index > latest ? index : latest
    }, -1)
    const activeTaskIndex = currentTaskIndex >= 0 ? currentTaskIndex : latestVisitedTaskIndex

    return (
      <div
        aria-label="Simulation progress"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          minHeight: '34px',
          backgroundColor: '#E8DCC8',
          borderBottom: '1px solid #000',
          overflowX: 'auto',
        }}
      >
        {tasks.map((task, idx) => {
          const isCurrent = currentTaskIndex === idx
          const taskVisited = task.nodeIds.some((nodeId) => visitedNodes.includes(nodeId))
          const isComplete = taskVisited && !isCurrent && (idx < activeTaskIndex || currentTaskIndex === -1)
          const isFuture = !isComplete && !isCurrent

          let bg = '#E8DCC8'
          let color = '#6B6258'
          if (isComplete) { bg = '#3A6B5E'; color = '#F2EBD9' }
          else if (isCurrent) { bg = '#B87D6B'; color = '#F2EBD9' }

          return (
            <div
              key={task.id}
              style={{
                flex: '1 0 96px',
                minWidth: 88,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: bg,
                color,
                fontSize: '0.625rem',
                fontWeight: 700,
                letterSpacing: 0,
                lineHeight: 1.15,
                textAlign: 'center',
                borderRight: idx < tasks.length - 1 ? '1px solid rgba(0,0,0,0.2)' : undefined,
                opacity: isFuture ? 0.62 : 1,
                transition: 'all 0.3s ease',
                gap: '0.25rem',
                padding: '0.25rem 0.35rem',
                boxSizing: 'border-box',
              }}
            >
              <span>{task.label}</span>
              {isComplete && <CheckIcon size={10} color="currentColor" />}
            </div>
          )
        })}
      </div>
    )
  }

  if (sections.length === 0) return null

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

        return (
          <div
            key={s.num}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: bg,
              color,
              fontSize: '0.6875rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              borderRight: idx < sections.length - 1 ? '1px solid rgba(0,0,0,0.2)' : undefined,
              opacity: isFuture ? 0.5 : 1,
              transition: 'all 0.3s ease',
              gap: '0.25rem',
            }}
          >
            {s.label} {isComplete && <CheckIcon size={10} color="currentColor" />}
          </div>
        )
      })}
    </div>
  )
}
