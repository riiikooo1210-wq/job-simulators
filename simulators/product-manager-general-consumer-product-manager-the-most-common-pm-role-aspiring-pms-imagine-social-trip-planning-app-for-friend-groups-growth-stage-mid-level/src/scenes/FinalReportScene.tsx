import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import GradingCard from '../components/ui/GradingCard'
import { displayTitleForRubricName } from '../services/assessment'
import { useGameStore } from '../store/gameStore'
import type { CareerProfileItem, FinalReportNode } from '../types/game'

interface Props { node: FinalReportNode }

function studentFacingCopy(text: string): string {
  return text
    .replace(/\bcandidate's responses\b/gi, 'your responses')
    .replace(/\bcandidate responses\b/gi, 'your responses')
    .replace(/\bthe candidate's\b/gi, 'your')
    .replace(/\bcandidate's\b/gi, 'your')
    .replace(/\bthe candidate\b/gi, 'you')
    .replace(/\bcandidate\b/gi, 'you')
}

function ProfileCard({ item }: { item: CareerProfileItem }) {
  return (
    <div
      style={{
        border: '1px solid #000',
        backgroundColor: '#F2EBD9',
        boxShadow: '4px 4px 0 #000',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E1E1A' }}>{studentFacingCopy(item.title)}</h4>
      <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#333' }}>{studentFacingCopy(item.body)}</p>
      <p style={{ fontSize: '0.78rem', lineHeight: 1.55, color: '#5B5146', fontStyle: 'italic' }}>
        {studentFacingCopy(item.evidence)}
      </p>
    </div>
  )
}

function TextList({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '1.1rem', margin: 0 }}>
      {items.map((item, index) => (
        <li key={index} style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#333' }}>
          {studentFacingCopy(item)}
        </li>
      ))}
    </ul>
  )
}

export default function FinalReportScene({ node }: Props) {
  const assessment = useGameStore((s) => s.gradingResult)
  const resetGame = useGameStore((s) => s.resetGame)

  if (!assessment) {
    return (
      <SceneWrapper illustration={node.illustration}>
        <p style={{ textAlign: 'center', color: '#555' }}>No assessment results available.</p>
      </SceneWrapper>
    )
  }

  const { career_profile: profile, task_feedback } = assessment
  const displayTaskFeedback = task_feedback.map((item) => ({
    ...item,
          task: displayTitleForRubricName(item.task),
          section_title: displayTitleForRubricName(item.section_title),
          evidence: studentFacingCopy(item.evidence),
        }))
  const feedbackBySection = displayTaskFeedback.reduce((acc, item) => {
    acc[item.section_title] = [...(acc[item.section_title] || []), item]
    return acc
  }, {} as Record<string, typeof displayTaskFeedback>)

  return (
    <SceneWrapper illustration={node.illustration}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800 }}>
            Career Exploration Report
          </h2>
          <p style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#333' }}>
            {studentFacingCopy(profile.headline)}
          </p>
        </div>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Strengths you showed</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.85rem' }}>
            {profile.strengths.map((item) => (
              <ProfileCard key={item.signal_id} item={item} />
            ))}
          </div>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Ways to grow next</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.85rem' }}>
            {profile.growth_edges.map((item) => (
              <ProfileCard key={item.signal_id} item={item} />
            ))}
          </div>
        </section>

        <section
          style={{
            backgroundColor: '#E8DCC8',
            border: '1px solid rgba(0,0,0,0.2)',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Patterns you can reuse</h3>
          <TextList items={profile.transferable_patterns} />
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Small practice moves</h3>
          <TextList items={profile.practice_suggestions} />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid rgba(0,0,0,0.2)', paddingBottom: '0.5rem' }}>
            Task feedback
          </h3>
          {Object.entries(feedbackBySection).map(([sectionTitle, feedbackItems]) => (
            <div key={sectionTitle} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#3A6B5E' }}>{sectionTitle}</h4>
              {feedbackItems.map((item, index) => (
                <GradingCard
                  key={`${item.task}-${index}`}
                  result={item}
                  delay={index * 0.05}
                />
              ))}
            </div>
          ))}
        </section>

        <div style={{ marginTop: '1.5rem', paddingBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <ActionButton text="Restart" onClick={resetGame} />
          <ActionButton text="Skip (dev)" onClick={resetGame} variant="secondary" fullWidth={false} />
        </div>
      </motion.div>
    </SceneWrapper>
  )
}
