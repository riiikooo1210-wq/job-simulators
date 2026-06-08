import { useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import NPCChatPanel from '../components/ui/NPCChatPanel'
import LaptopFrame from '../components/ui/LaptopFrame'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { ChatNode } from '../types/game'

interface Props { node: ChatNode }

const channelMap = {
  slack_thread: 'slack',
  email_thread: 'email',
  live_chat: 'chat',
} as const

export default function LiveChatScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)

  const channel = channelMap[node.type]
  const appWindow = (node.appWindow ?? (node.type === 'slack_thread' ? 'slack' : node.type === 'email_thread' ? 'email' : undefined)) as LaptopFrameVariant | undefined

  const chatPanel = (
    <NPCChatPanel
      npcId={node.npcId}
      goalPrompt={node.goalPrompt}
      playerGoal={node.playerGoal}
      channel={channel}
      maxTurns={node.maxTurns ?? 8}
      initialMessages={node.initialMessages}
      presetReplies={node.presetReplies}
      presetsOnly={node.presetsOnly}
      sceneId={node.id}
      onComplete={() => goNext(node)}
      completeLabel="Submit & continue"
      embedded={!!appWindow}
    />
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
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
        {node.playerGoal && (
          <div
            style={{
              backgroundColor: '#fff',
              border: '1px solid #000',
              padding: '0.75rem 1rem',
              fontSize: '0.8125rem',
              color: '#444',
            }}
          >
            <strong>Your goal: </strong>
            {interpolate(node.playerGoal, { playerName, branchFlags, mcSelections })}
          </div>
        )}

        {appWindow ? (
          <DesktopOverlay>
            <LaptopFrame variant={appWindow} title={node.windowTitle} fill scrollable>
              {chatPanel}
            </LaptopFrame>
          </DesktopOverlay>
        ) : (
          chatPanel
        )}
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
        )}
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
