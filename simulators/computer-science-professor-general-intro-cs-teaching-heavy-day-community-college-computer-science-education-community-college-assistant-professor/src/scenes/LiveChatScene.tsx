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

function parseReferenceTabs(referenceContent?: string) {
  if (!referenceContent?.trim()) return []
  return referenceContent
    .split(/\n\s*\n/)
    .map((section, idx) => {
      const lines = section.split('\n')
      const label = lines.shift()?.trim() || `Source ${idx + 1}`
      return {
        id: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `source_${idx + 1}`,
        label,
        content: lines.join('\n').trim(),
      }
    })
    .filter((tab) => tab.content)
}

export default function LiveChatScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const sourceTabs = node.appTabs?.length ? node.appTabs : parseReferenceTabs(node.referenceContent)
  const [refOpen, setRefOpen] = useState(false)
  const [activeSourceTab, setActiveSourceTab] = useState(sourceTabs[0]?.id || '')

  const channel = channelMap[node.type]
  const appWindow = (node.appWindow ?? (node.type === 'slack_thread' ? 'slack' : node.type === 'email_thread' ? 'email' : undefined)) as LaptopFrameVariant | undefined
  const activeSource = sourceTabs.find((tab) => tab.id === activeSourceTab) ?? sourceTabs[0]

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
      threadTitle={node.windowTitle}
    />
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={!!appWindow}>
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

        {appWindow && sourceTabs.length ? (
          <DesktopOverlay>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.45fr) minmax(260px, 0.9fr)',
                gap: '0.75rem',
                height: '100%',
                minHeight: 0,
              }}
            >
              <LaptopFrame variant={appWindow} title={node.windowTitle} fill scrollable>
                {chatPanel}
              </LaptopFrame>
              <LaptopFrame variant="notion" title="Context Sources" fill scrollable>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#FBF7EA' }}>
                  <div style={{ display: 'flex', gap: '0.375rem', padding: '0.625rem', borderBottom: '1px solid #D8CFBE', background: '#EFE8D2', flexShrink: 0 }}>
                    {sourceTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveSourceTab(tab.id)}
                        style={{
                          border: '1px solid #B9AB8D',
                          background: (activeSource?.id === tab.id) ? '#F7F1E3' : '#E8DCC8',
                          color: '#1E1E1A',
                          borderRadius: 4,
                          padding: '0.4rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: (activeSource?.id === tab.id) ? 'inset 0 -2px 0 #B87D6B' : 'none',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  {activeSource && (
                    <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div
                        style={{
                          border: '1px solid #CDBF94',
                          background: '#FFFFFF',
                          borderRadius: 6,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '0.625rem 0.75rem',
                            background: activeSource.id === 'canvas_summary' ? '#E8F0F1' : '#F1E8D7',
                            borderBottom: '1px solid #CDBF94',
                          }}
                        >
                          <div style={{ fontSize: '0.8125rem', fontWeight: 800 }}>{activeSource.label}</div>
                          <div style={{ fontSize: '0.65rem', color: '#6F675B', textTransform: 'uppercase', letterSpacing: 0 }}>
                            {activeSource.id === 'canvas_summary' ? 'Canvas report' : 'Scheduling note'}
                          </div>
                        </div>
                        <div
                          style={{
                            padding: '0.75rem',
                            fontSize: '0.8125rem',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            color: '#1E1E1A',
                          }}
                        >
                          {renderContentWithGlossary(interpolate(activeSource.content, { playerName, branchFlags, mcSelections }))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </LaptopFrame>
            </div>
          </DesktopOverlay>
        ) : appWindow ? (
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
