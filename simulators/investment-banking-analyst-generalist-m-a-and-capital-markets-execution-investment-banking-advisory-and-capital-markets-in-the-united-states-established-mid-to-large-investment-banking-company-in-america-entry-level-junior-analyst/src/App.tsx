import SceneEngine from './engine/SceneEngine'
import ProgressBar from './components/layout/ProgressBar'
import { useGameStore } from './store/gameStore'
import { storyline, sampleAnswers } from './data/storyline'
import { showDevControls } from './lib/devControls'
import { resolveNext } from './engine/resolveNext'

const devButtonColors = ['#A7F3D0', '#FDE68A', '#BFDBFE']

const devButtonStyle = (backgroundColor: string, disabled = false) => ({
  backgroundColor,
  border: '1px solid #000',
  boxShadow: disabled ? 'none' : '2px 2px 0 #000',
  padding: '0.375rem 0.75rem',
  fontSize: '0.6875rem',
  fontWeight: 600,
  color: '#333',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.45 : 1,
  fontFamily: 'Inter, system-ui, sans-serif',
})

export default function App() {
  const currentNodeId = useGameStore((s) => s.currentNodeId)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const resetGame = useGameStore((s) => s.resetGame)
  const currentNode = storyline.nodes[currentNodeId]
  const currentNextId = currentNode ? resolveNext(currentNode, branchFlags) : null

  const handleDevSkip = (targetNodeId: string, prefillKey?: string) => {
    const store = useGameStore.getState()
    if (prefillKey && (sampleAnswers as any)[prefillKey]) {
      const block = (sampleAnswers as any)[prefillKey]
      if (typeof block === 'object' && block !== null) {
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
      }
    }
    store.setGradingError(null)
    store.setGradingStatus('idle')
    store.navigateTo(targetNodeId)
  }

  const handleSkipCurrentTask = () => {
    const store = useGameStore.getState()
    const node = storyline.nodes[store.currentNodeId]
    if (!node) return

    const nextId = resolveNext(node, store.branchFlags)
    if (!nextId) return

    store.setGradingError(null)
    store.setGradingStatus('idle')
    store.navigateTo(nextId)
  }

  const devSkips = (storyline.devSkips || []).slice(0, 3)

  return (
    <>
      <ProgressBar />
      <div style={{ paddingTop: '28px' }}>
        <SceneEngine />
      </div>

      {showDevControls && (
        <div
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            zIndex: 200,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            gap: '0.5rem',
            maxWidth: 'min(760px, calc(100vw - 2rem))',
          }}
        >
          <button
            onClick={handleSkipCurrentTask}
            disabled={!currentNextId}
            title={currentNextId ? 'Advance to the next scene' : 'No next scene'}
            style={devButtonStyle('#F2EBD9', !currentNextId)}
          >
            Skip (dev)
          </button>
          <button onClick={resetGame} style={devButtonStyle('#E8DCC8')}>
            Restart (dev)
          </button>
          {devSkips.map((skip, i) => (
            <button
              key={skip.targetNodeId}
              onClick={() => handleDevSkip(skip.targetNodeId, skip.prefillKey)}
              style={devButtonStyle(devButtonColors[i] || '#E8DCC8')}
            >
              {skip.label} (dev)
            </button>
          ))}
        </div>
      )}
    </>
  )
}
