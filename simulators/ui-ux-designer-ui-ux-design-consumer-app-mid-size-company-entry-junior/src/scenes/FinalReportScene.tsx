import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import GradingCard from '../components/ui/GradingCard'
import { useGameStore } from '../store/gameStore'
import type { FinalReportNode } from '../types/game'

interface Props { node: FinalReportNode }

const recommendationColors: Record<string, string> = {
  'Strong Hire': '#3A6B5E',
  'Hire': '#6B9EA6',
  'Lean No Hire': '#B87D6B',
  'No Hire': '#c0392b',
}

export default function FinalReportScene({ node }: Props) {
  const gradingResult = useGameStore((s) => s.gradingResult)
  const resetGame = useGameStore((s) => s.resetGame)

  if (!gradingResult) {
    return (
      <SceneWrapper illustration={node.illustration}>
        <p style={{ textAlign: 'center', color: '#555' }}>No grading results available.</p>
      </SceneWrapper>
    )
  }

  const pctDisplay = Math.round(gradingResult.score_percentage * 100)
  const recColor = recommendationColors[gradingResult.recommendation] || '#555'

  return (
    <SceneWrapper illustration={node.illustration}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, textAlign: 'center' }}>
          Assessment Results
        </h2>

        {/* Recommendation Badge */}
        <div style={{ textAlign: 'center' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: 'inline-block',
              backgroundColor: recColor,
              color: '#F2EBD9',
              padding: '0.75rem 2rem',
              fontWeight: 800,
              fontSize: '1.125rem',
              letterSpacing: '0.03em',
              border: '1px solid #000',
              boxShadow: '4px 4px 0 #000',
            }}
          >
            {gradingResult.recommendation}
          </motion.div>
        </div>

        {/* Score Summary */}
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
          }}
        >
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#000' }}>
            {gradingResult.total_score} / {gradingResult.max_score}
          </span>
          <span style={{ fontSize: '0.875rem', color: '#555' }}>
            {pctDisplay}% overall score
          </span>
        </div>

        {/* Overall Assessment */}
        <div
          style={{
            backgroundColor: '#E8DCC8',
            border: '1px solid rgba(0,0,0,0.2)',
            padding: '1rem 1.25rem',
            fontSize: '0.875rem',
            lineHeight: 1.7,
            fontStyle: 'italic',
            color: '#333',
          }}
        >
          {gradingResult.overall_assessment}
        </div>

        {/* Scenario-by-scenario breakdown */}
        {gradingResult.scenarios.map((scenario, sIdx) => (
          <div key={sIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid rgba(0,0,0,0.2)', paddingBottom: '0.5rem' }}>
              Scenario {scenario.scenario_number}: {scenario.scenario_title}
            </h3>
            {scenario.criteria.map((criterion, cIdx) => (
              <GradingCard
                key={cIdx}
                result={criterion}
                delay={sIdx * 0.2 + cIdx * 0.1}
              />
            ))}
          </div>
        ))}

        <div style={{ marginTop: '1.5rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <ActionButton text="Restart" onClick={resetGame} />
          {import.meta.env.DEV && (
            <ActionButton text="Skip (dev)" onClick={resetGame} variant="secondary" fullWidth={false} />
          )}
        </div>
      </motion.div>
    </SceneWrapper>
  )
}
