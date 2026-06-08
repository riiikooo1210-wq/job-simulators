import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { CheckIcon } from '../components/ui/Icons'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { intro, storyline } from '../data/storyline'
import type { IntroNode } from '../types/game'

interface Props { node: IntroNode }

const introCardStyle = {
  border: '1px solid #000',
  boxShadow: '4px 4px 0 #000',
  backgroundColor: '#F2EBD9',
  padding: '1.5rem',
}

export default function IntroScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const setPlayerName = useGameStore((s) => s.setPlayerName)
  const setCurrentSection = useGameStore((s) => s.setCurrentSection)
  const goNext = useGoNext()
  const [step, setStep] = useState(0)
  const [nameEntered, setNameEntered] = useState(playerName.trim().length > 0)

  const handleNameSubmit = () => {
    if (playerName.trim().length > 0) setNameEntered(true)
  }

  const handleStart = () => {
    setCurrentSection(storyline.sections[0]?.num ?? 1)
    goNext(node)
  }

  const steps = intro.steps
  const isLastStep = step === steps.length - 1

  if (!nameEntered) {
    return (
      <SceneWrapper illustration={node.illustration} hideIllustration>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#000', lineHeight: 1.2 }}>
            {intro.welcomeTitle}
          </h1>

          {node.illustration && (
            <div style={{ width: 'calc(100% + 6rem)', marginLeft: '-3rem', marginRight: '-3rem', aspectRatio: '16 / 9', overflow: 'hidden', borderTop: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: '#E8DCC8' }}>
              <img src={node.illustration} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          <div style={introCardStyle}>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333' }}>
              {renderContentWithGlossary(intro.welcomeBody)}
            </div>
          </div>

          <div style={introCardStyle}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>What should we call you?</h2>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.7, marginBottom: '1rem', color: '#333' }}>
              Enter the name you'd like to go by in this office.
            </p>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNameSubmit() }}
              placeholder="Your name"
              autoFocus
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                fontSize: '0.9375rem',
                fontFamily: 'Inter, system-ui, sans-serif',
                border: '1px solid #000',
                backgroundColor: '#fff',
                color: '#000',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <ActionButton
            text="Continue"
            onClick={handleNameSubmit}
            variant={playerName.trim().length > 0 ? 'primary' : 'secondary'}
          />
          {import.meta.env.DEV && (
            <ActionButton text="Skip (dev)" onClick={handleStart} variant="secondary" fullWidth={false} />
          )}
        </motion.div>
      </SceneWrapper>
    )
  }

  return (
    <SceneWrapper illustration={node.illustration} hideIllustration>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#000', lineHeight: 1.2 }}>
          {intro.welcomeTitle}
        </h1>

        {node.illustration && (
          <div style={{ width: 'calc(100% + 6rem)', marginLeft: '-3rem', marginRight: '-3rem', aspectRatio: '16 / 9', overflow: 'hidden', borderTop: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: '#E8DCC8' }}>
            <img src={node.illustration} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {steps.length > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: i <= step ? '#B87D6B' : '#ddd',
                    color: i <= step ? '#fff' : '#999',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    transition: 'all 0.3s',
                  }}
                >
                  {i < step ? <CheckIcon size={12} color="#fff" /> : i + 1}
                </div>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: i === step ? '#000' : '#999',
                    fontWeight: i === step ? 600 : 400,
                    display: i === step ? 'inline' : 'none',
                  }}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div style={{ width: '20px', height: '1px', backgroundColor: '#ccc', marginLeft: '0.25rem' }} />
                )}
              </div>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            style={{
              border: '1px solid #000',
              boxShadow: '4px 4px 0 #000',
              backgroundColor: '#F2EBD9',
              padding: '1.5rem',
            }}
          >
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.75rem' }}>{steps[step].label}</h2>
            <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
              {renderContentWithGlossary(steps[step].content)}
            </div>
          </motion.div>
        </AnimatePresence>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {step > 0 && (
            <ActionButton text="Back" onClick={() => setStep(step - 1)} variant="secondary" />
          )}
          {isLastStep ? (
            <ActionButton text="Begin Assessment" onClick={handleStart} />
          ) : (
            <ActionButton text="Next" onClick={() => setStep(step + 1)} variant="secondary" />
          )}
        </div>
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={handleStart} variant="secondary" fullWidth={false} />
        )}
      </motion.div>
    </SceneWrapper>
  )
}
