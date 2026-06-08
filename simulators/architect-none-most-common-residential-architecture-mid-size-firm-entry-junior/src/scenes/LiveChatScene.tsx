import { useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame, { resolveWorkSurfaceVariant } from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import NPCChatPanel from '../components/ui/NPCChatPanel'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { ChatNode } from '../types/game'

interface Props { node: ChatNode }
type AppTab = NonNullable<ChatNode['appTabs']>[number]

const channelMap = {
  slack_thread: 'slack',
  email_thread: 'email',
  live_chat: 'chat',
} as const

function renderAppTab(tab: AppTab, ctx: { playerName: string; branchFlags: Record<string, string>; mcSelections: Record<string, string> }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        padding: '1rem',
        minHeight: '100%',
        background: '#F7F1E3',
      }}
    >
      <div
        style={{
          border: '1px solid #CDBF94',
          background: '#FBF7EA',
          padding: '0.85rem',
          fontSize: '0.875rem',
          lineHeight: 1.65,
          color: '#1E1E1A',
          whiteSpace: 'pre-wrap',
        }}
      >
        {renderContentWithGlossary(interpolate(tab.content, ctx))}
      </div>
      {tab.imagePath && (
        <div
          style={{
            border: '1px solid #000',
            background: '#EFE8D2',
            padding: '0.5rem',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.22)',
          }}
        >
          <img
            src={tab.imagePath}
            alt={tab.imageAlt || ''}
            style={{
              display: 'block',
              width: '100%',
              aspectRatio: '16 / 9',
              objectFit: 'cover',
              border: '1px solid #CDBF94',
              background: '#E8DCC8',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default function LiveChatScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const appTabs = node.appTabs || []
  const [activeAppTab, setActiveAppTab] = useState(() => node.defaultAppTabId || (appTabs[0]?.id ?? 'editor'))

  const channel = channelMap[node.type]
  const appWindow = (node.appWindow
    ? resolveWorkSurfaceVariant(node)
    : node.type === 'slack_thread'
      ? 'slack'
      : node.type === 'email_thread'
        ? 'email'
        : node.workSurface
          ? resolveWorkSurfaceVariant(node, 'slack')
          : undefined) as LaptopFrameVariant | undefined
  const titleTabs = appTabs.length > 0
    ? [...appTabs.map((tab) => ({ id: tab.id, label: tab.label })), { id: 'editor', label: node.editorTabLabel || node.windowTitle || node.title }]
    : undefined
  const activeSourceTab = appTabs.find((tab) => tab.id === activeAppTab)

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
          <WorkSurfaceFrame
            node={node}
            variant={appWindow}
            title={node.workSurface?.title || node.windowTitle}
            titleTabs={titleTabs}
            activeTitleTabId={activeAppTab}
            onTitleTabChange={setActiveAppTab}
          >
            {activeSourceTab
              ? renderAppTab(activeSourceTab, { playerName, branchFlags, mcSelections })
              : chatPanel}
          </WorkSurfaceFrame>
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
