import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import InteractiveCanvas from '../components/ui/InteractiveCanvas'
import LongFormEditor from '../components/ui/LongFormEditor'
import NPCChatPanel from '../components/ui/NPCChatPanel'
import EmailBlock from '../components/ui/EmailBlock'
import SlackMessageEnhanced from '../components/ui/SlackMessageEnhanced'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevTools } from '../lib/devTools'
import type { InteractiveCanvasNode, CanvasZone } from '../types/game'

interface Props { node: InteractiveCanvasNode }

export default function InteractiveCanvasScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const canvasState = useGameStore((s) => s.interactiveCanvasState[node.id]) || { visited: [], completed: false }
  const markZoneVisited = useGameStore((s) => s.markZoneVisited)
  const setSceneCompleted = useGameStore((s) => s.setSceneCompleted)
  const goNext = useGoNext()

  const [activeZone, setActiveZone] = useState<CanvasZone | null>(null)

  const handleZone = (zone: CanvasZone) => {
    if (zone.action.type === 'complete_scene') {
      setSceneCompleted(node.id)
      goNext(node)
      return
    }
    setActiveZone(zone)
    markZoneVisited(node.id, zone.id)
  }

  const closeOverlay = () => setActiveZone(null)

  const visitedCount = canvasState.visited.length
  const requiredCount = node.requireMin ?? (node.requireAllZones ? node.zones.length : 1)
  const canFinish = visitedCount >= requiredCount

  return (
    <SceneWrapper illustration={undefined} hideIllustration showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3 }}>{node.title}</h1>
        {node.headerPrompt && (
          <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#000' }}>
            {interpolate(node.headerPrompt, { playerName, branchFlags, mcSelections })}
          </div>
        )}
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}

        <InteractiveCanvas
          imageUrl={node.illustration || `/scenes/${node.id}.png`}
          zones={node.zones}
          visited={canvasState.visited}
          onZoneTrigger={handleZone}
          alt={node.title}
        />

        <div style={{ fontSize: '0.75rem', color: '#666' }}>
          Visited {visitedCount}/{node.zones.length} ·
          {' '}{canFinish ? 'You can finish whenever you\'re ready.' : `Visit ${requiredCount - visitedCount} more to continue.`}
        </div>

        <ActionButton
          text="Done — continue"
          onClick={() => {
            setSceneCompleted(node.id)
            goNext(node)
          }}
          disabled={!canFinish}
          variant={canFinish ? 'primary' : 'secondary'}
        />
        {showDevTools && (
          <ActionButton text="Skip (dev)" onClick={() => { setSceneCompleted(node.id); goNext(node) }} variant="secondary" fullWidth={false} />
        )}
      </motion.div>

      <AnimatePresence>
        {activeZone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={closeOverlay}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 300,
              padding: '1rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#F2EBD9',
                border: '1px solid #000',
                boxShadow: '6px 6px 0 #000',
                width: 'min(720px, calc(100vw - 2rem))',
                maxHeight: 'calc(100vh - 2rem)',
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.9375rem' }}>{activeZone.label || activeZone.id}</strong>
                <button onClick={closeOverlay} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#666' }}>
                  ✕ close
                </button>
              </div>
              {renderZoneAction(activeZone, {
                value: responses[activeZone.action.payload?.bindingKey || ''] || '',
                setValue: (v) => activeZone.action.payload?.bindingKey && setFreeTextResponse(activeZone.action.payload.bindingKey, v),
                onClose: closeOverlay,
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SceneWrapper>
  )
}

interface ZoneRenderArgs {
  value: string
  setValue: (v: string) => void
  onClose: () => void
}

function renderZoneAction(zone: CanvasZone, args: ZoneRenderArgs) {
  const a = zone.action
  if (a.type === 'open_chat' && a.payload?.npcId && a.payload?.goalPrompt) {
    return (
      <NPCChatPanel
        npcId={a.payload.npcId}
        goalPrompt={a.payload.goalPrompt}
        channel="chat"
        maxTurns={a.payload.maxTurns ?? 6}
        presetReplies={a.payload.presetReplies}
        presetsOnly={a.payload.presetsOnly}
        sceneId={zone.id}
        onComplete={args.onClose}
        completeLabel="End conversation"
      />
    )
  }
  if (a.type === 'open_email' && a.payload?.thread) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {a.payload.thread.map((m, i) => (
          <EmailBlock
            key={i}
            email={{
              from: m.role === 'user' ? 'You' : (a.payload?.from || 'sender'),
              to: m.role === 'user' ? (a.payload?.from || 'recipient') : 'You',
              subject: a.payload?.subject || '(no subject)',
              content: m.content,
            }}
            initialExpanded={i === a.payload!.thread!.length - 1}
            delay={i * 0.05}
          />
        ))}
        <ActionButton text="Close" onClick={args.onClose} variant="secondary" />
      </div>
    )
  }
  if (a.type === 'open_slack' && a.payload?.thread) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {a.payload.thread.map((m, i) => (
          <SlackMessageEnhanced
            key={i}
            message={{
              sender: m.role === 'user' ? 'You' : (a.payload?.channel || 'sender'),
              role: '',
              timestamp: m.ts || '',
              content: m.content,
            }}
            initialExpanded={i === a.payload!.thread!.length - 1}
            delay={i * 0.05}
          />
        ))}
        <ActionButton text="Close" onClick={args.onClose} variant="secondary" />
      </div>
    )
  }
  if (a.type === 'open_editor' && a.payload?.bindingKey) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {a.payload.prompt && (
          <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{a.payload.prompt}</div>
        )}
        <LongFormEditor
          value={args.value}
          onChange={args.setValue}
          maxWords={a.payload.maxWords}
          minRows={6}
        />
        <ActionButton text="Save & close" onClick={args.onClose} />
      </div>
    )
  }
  return <div>Unknown zone action: {a.type}</div>
}
