import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { SectionTransitionNode } from '../types/game'

interface Props { node: SectionTransitionNode }

export default function SectionTransitionScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const actionLabel = node.actionLabel || node.ctaLabel || 'Continue'

  return (
    <SceneWrapper illustration={node.illustration} hideIllustration>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center', padding: '2rem 0' }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 }}>{node.title}</h2>
        {node.illustration && (
          <div style={{ width: 'calc(100% + 6rem)', marginLeft: '-3rem', marginRight: '-3rem', aspectRatio: '16 / 9', overflow: 'hidden', borderTop: '1px solid #000', borderBottom: '1px solid #000', backgroundColor: '#E8DCC8' }}>
            <img src={node.illustration} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )}
        {node.content && (
          <div style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
        <ActionButton text={actionLabel} onClick={() => goNext(node)} />
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
        )}
      </motion.div>
    </SceneWrapper>
  )
}
