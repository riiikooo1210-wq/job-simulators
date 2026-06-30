import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { CheckIcon } from '../components/ui/Icons'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { isDevtoolsEnabled } from '../lib/devtools'
import { gradeResponses } from '../services/gemini'
import type { GradingNode } from '../types/game'

interface Props { node: GradingNode }

export default function GradingScene({ node }: Props) {
  const resetGame = useGameStore((s) => s.resetGame)
  const goNext = useGoNext()
  const gradingStatus = useGameStore((s) => s.gradingStatus)
  const gradingError = useGameStore((s) => s.gradingError)
  const showDevtools = isDevtoolsEnabled()
  const setGradingStatus = useGameStore((s) => s.setGradingStatus)
  const setGradingResult = useGameStore((s) => s.setGradingResult)
  const setGradingError = useGameStore((s) => s.setGradingError)

  const playerName = useGameStore((s) => s.playerName)
  const visitedNodes = useGameStore((s) => s.visitedNodes)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const freeTextResponses = useGameStore((s) => s.freeTextResponses)
  const npcConversations = useGameStore((s) => s.npcConversations)

  const hasStarted = useRef(false)

  const startGrading = async () => {
    setGradingStatus('loading')
    setGradingError(null)
    try {
      const result = await gradeResponses({
        playerName,
        visitedNodes,
        branchFlags,
        mcSelections,
        freeTextResponses,
        npcConversations,
      })
      setGradingResult(result)
    } catch (err) {
      setGradingError(err instanceof Error ? err.message : 'An unexpected error occurred')
    }
  }

  useEffect(() => {
    if (!hasStarted.current && gradingStatus !== 'complete') {
      hasStarted.current = true
      startGrading()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showLoading = gradingStatus === 'loading' || gradingStatus === 'idle'

  return (
    <SceneWrapper illustration={node.illustration}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center', padding: '2rem 0' }}
      >
        {showLoading && (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}>
                Evaluating...
              </motion.span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Your responses are being evaluated</h2>
            <p style={{ fontSize: '0.875rem', color: '#555', lineHeight: 1.6 }}>
              The AI reviewer is turning your decisions, conversations, and written work into a career exploration report.
              This typically takes 30–60 seconds.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  style={{ width: '10px', height: '10px', backgroundColor: '#B87D6B', borderRadius: '50%' }}
                />
              ))}
            </div>
          </>
        )}

        {gradingStatus === 'error' && (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c0392b' }}>Assessment Unavailable</h2>
            <p style={{ fontSize: '0.875rem', color: '#555', lineHeight: 1.6 }}>{gradingError}</p>
            <ActionButton text="Try Again" onClick={startGrading} />
            <div style={{ marginTop: '0.5rem' }}>
              <ActionButton text="Restart" onClick={resetGame} variant="secondary" />
            </div>
          </>
        )}

        {gradingStatus === 'complete' && (
          <>
            <div
              style={{
                width: '3rem',
                height: '3rem',
                backgroundColor: '#3A6B5E',
                color: '#F2EBD9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <CheckIcon size={20} color="#F2EBD9" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Evaluation Complete</h2>
            <p style={{ fontSize: '0.875rem', color: '#555' }}>Your career exploration report is ready.</p>
            <ActionButton text="View Results" onClick={() => goNext(node)} />
          </>
        )}
          {showDevtools && <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />}
      </motion.div>
    </SceneWrapper>
  )
}
