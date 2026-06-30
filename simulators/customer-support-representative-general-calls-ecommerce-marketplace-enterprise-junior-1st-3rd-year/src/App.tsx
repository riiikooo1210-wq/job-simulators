import SceneEngine from './engine/SceneEngine'
import ProgressBar from './components/layout/ProgressBar'
import { useGameStore } from './store/gameStore'
import { storyline, sampleAnswers } from './data/storyline'

export default function App() {
  const resetGame = useGameStore((s) => s.resetGame)
  const isDev = import.meta.env.DEV

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

  const devSkips = (storyline.devSkips || []).slice(0, 3)
  const devSkipColors = ['#A7F3D0', '#FDE68A', '#BFDBFE']

  return (
    <div className="app-shell">
      <ProgressBar />
      <div style={{ paddingTop: '28px' }}>
        <SceneEngine />
      </div>

      <div className="dev-controls" aria-label="Development controls">
        {isDev && devSkips.map((skip, i) => (
          <button
            key={skip.targetNodeId}
            className="dev-control-button"
            onClick={() => handleDevSkip(skip.targetNodeId, skip.prefillKey)}
            style={{ backgroundColor: devSkipColors[i] || '#E8DCC8' }}
          >
            {skip.label} (Dev)
          </button>
        ))}

        <button
          className="dev-control-button"
          onClick={resetGame}
        >
          Restart
        </button>
      </div>
    </div>
  )
}
