import { useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevControls } from '../lib/devControls'
import { BriefingDrawerContent } from './BriefingScene'
import type { MultipleChoiceNode } from '../types/game'

interface Props { node: MultipleChoiceNode }

export default function MultipleChoiceScene({ node }: Props) {
  const setMcSelection = useGameStore((s) => s.setMcSelection)
  const setBranchFlag = useGameStore((s) => s.setBranchFlag)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)

  const handleSelect = (optionId: string, branchFlag?: string) => {
    setMcSelection(node.id, optionId)
    if (branchFlag !== undefined) {
      setBranchFlag(node.id, branchFlag)
    } else if (node.isPivot) {
      // pivot scene without explicit branchFlag — use option id as the flag
      setBranchFlag(node.id, optionId)
    }
    goNext(node)
  }

  return (
    <SceneWrapper showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {node.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id, opt.branchFlag)}
              style={{
                background: '#F2EBD9',
                color: '#000',
                border: '1px solid #000',
                boxShadow: '4px 4px 0 #000',
                padding: '1rem 1.25rem',
                fontSize: '0.9375rem',
                lineHeight: 1.5,
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'Inter, system-ui, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                transition: 'all 0.1s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E8DCC8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F2EBD9'
              }}
            >
              <span style={{ fontWeight: 700 }}>{renderContentWithGlossary(opt.label)}</span>
              {opt.body && (
                <span style={{ fontSize: '0.8125rem', color: '#555', lineHeight: 1.6 }}>
                  {renderContentWithGlossary(opt.body)}
                </span>
              )}
            </button>
          ))}
          {showDevControls && (
            <ActionButton text="Skip (dev)" onClick={() => handleSelect(node.options[0].id, node.options[0].branchFlag)} variant="secondary" fullWidth={false} />
          )}
        </div>
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
