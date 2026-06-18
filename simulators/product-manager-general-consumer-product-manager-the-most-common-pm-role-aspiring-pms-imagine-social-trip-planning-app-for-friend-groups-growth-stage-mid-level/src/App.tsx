import SceneEngine from './engine/SceneEngine'
import ProgressBar from './components/layout/ProgressBar'
import { useGameStore } from './store/gameStore'
import { storyline, sampleAnswers } from './data/storyline'

export default function App() {
  const resetGame = useGameStore((s) => s.resetGame)
  const isDev = import.meta.env.DEV

  const applyPrefillBlock = (block: any) => {
    const store = useGameStore.getState()
    if (typeof block.playerName === 'string') store.setPlayerName(block.playerName)
    if (block.mcSelections) {
      for (const [k, v] of Object.entries(block.mcSelections)) store.setMcSelection(k, v as string)
    }
    if (block.branchFlags) {
      for (const [k, v] of Object.entries(block.branchFlags)) store.setBranchFlag(k, v as string)
    }
    if (block.freeTextResponses) {
      for (const [k, v] of Object.entries(block.freeTextResponses)) store.setFreeTextResponse(k, v as string)
    }
    if (block.npcConversations) {
      for (const [conversationId, messages] of Object.entries(block.npcConversations)) {
        if (!Array.isArray(messages)) continue
        for (const message of messages) {
          if (!message || typeof message !== 'object') continue
          const msg = message as { role?: 'npc' | 'user'; content?: string; npcName?: string }
          if ((msg.role === 'npc' || msg.role === 'user') && typeof msg.content === 'string') {
            store.appendNpcMessage(conversationId, { role: msg.role, content: msg.content, npcName: msg.npcName })
          }
        }
      }
    }
  }

  const handleDevSkip = (targetNodeId: string, prefillKey?: string) => {
    const store = useGameStore.getState()
    if (prefillKey && (sampleAnswers as any)[prefillKey]) {
      const block = (sampleAnswers as any)[prefillKey]
      if (typeof block === 'object' && block !== null) {
        applyPrefillBlock(block)
      }
    }
    store.setGradingError(null)
    store.setGradingStatus('idle')
    store.navigateTo(targetNodeId)
  }

  const handleSampleReport = () => {
    const block = (sampleAnswers as any).career_report_sample
    if (!block || typeof block !== 'object') return
    const store = useGameStore.getState()
    store.resetGame()
    applyPrefillBlock(block)
    store.setGradingError(null)
    store.setGradingStatus('idle')

    const path = Array.isArray(block.visitedNodes) && block.visitedNodes.length
      ? block.visitedNodes
      : [block.targetNodeId || 'grading']
    for (const nodeId of path.slice(1)) store.navigateTo(nodeId)
  }

  const devSkips = (storyline.devSkips || []).filter((skip) => !["assessment_gate", "grading"].includes(skip.targetNodeId) && !/assessment|grading/i.test(skip.label)).slice(0, 3)
  const hasSampleReport = Boolean((sampleAnswers as any).career_report_sample)

  return (
    <>
      <ProgressBar />
      <div style={{ paddingTop: '28px' }}>
        <SceneEngine />
      </div>

      {isDev && devSkips.map((skip, i) => (
        <button
          key={skip.targetNodeId}
          onClick={() => handleDevSkip(skip.targetNodeId, skip.prefillKey)}
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: `${5.5 + i * 9.5}rem`,
            zIndex: 200,
            backgroundColor: ['#A7F3D0', '#FDE68A', '#BFDBFE'][i] || '#E8DCC8',
            border: '1px solid #000',
            boxShadow: '2px 2px 0 #000',
            padding: '0.375rem 0.75rem',
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: '#333',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {skip.label} (Dev)
        </button>
      ))}

      {isDev && hasSampleReport && (
        <button
          onClick={handleSampleReport}
          style={{
            position: 'fixed',
            bottom: '3.25rem',
            right: '1rem',
            zIndex: 200,
            backgroundColor: '#D9F99D',
            border: '1px solid #000',
            boxShadow: '2px 2px 0 #000',
            padding: '0.375rem 0.75rem',
            fontSize: '0.6875rem',
            fontWeight: 700,
            color: '#1E1E1A',
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          Sample Report (Dev)
        </button>
      )}

      <button
        onClick={resetGame}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 200,
          backgroundColor: '#E8DCC8',
          border: '1px solid #000',
          boxShadow: '2px 2px 0 #000',
          padding: '0.375rem 0.75rem',
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: '#333',
          cursor: 'pointer',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        Restart
      </button>
    </>
  )
}
