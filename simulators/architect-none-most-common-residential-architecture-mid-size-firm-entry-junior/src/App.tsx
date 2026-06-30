import SceneEngine from './engine/SceneEngine'
import ProgressBar from './components/layout/ProgressBar'
import { useGameStore } from './store/gameStore'
import { storyline, sampleAnswers } from './data/storyline'
import { useNarrowViewport } from './components/hooks/useNarrowViewport'

export default function App() {
  const resetGame = useGameStore((s) => s.resetGame)
  const isDev = import.meta.env.DEV
  const isNarrow = useNarrowViewport()
  const showDevJumps = isDev && import.meta.env.VITE_HIDE_DEV_JUMPS !== 'true'

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
  const showDevPanel = showDevJumps && devSkips.length > 0
  const compactDevLabel = (label: string) => {
    if (label === 'Client Checklist') return 'Client'
    if (label === 'Dana Handoff') return 'Dana'
    if (label === 'Assessment') return 'Assess'
    return label
  }
  const devJumpButtons = (compact = false) => devSkips.map((skip, i) => (
    <button
      key={skip.targetNodeId}
      onClick={() => handleDevSkip(skip.targetNodeId, skip.prefillKey)}
      style={{
        backgroundColor: ['#A7F3D0', '#FDE68A', '#BFDBFE'][i] || '#E8DCC8',
        border: '1px solid #000',
        boxShadow: '2px 2px 0 #000',
        padding: compact ? '0.3rem 0.35rem' : '0.375rem 0.75rem',
        fontSize: compact ? '0.58rem' : '0.6875rem',
        fontWeight: 600,
        color: '#333',
        cursor: 'pointer',
        fontFamily: 'Inter, system-ui, sans-serif',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
        lineHeight: compact ? 1.1 : 1.2,
        width: compact ? '100%' : undefined,
        height: compact ? 28 : undefined,
        maxHeight: compact ? 28 : undefined,
        display: compact ? 'inline-flex' : undefined,
        alignItems: compact ? 'center' : undefined,
        justifyContent: compact ? 'center' : undefined,
        textAlign: compact ? 'center' : undefined,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {compact ? `${compactDevLabel(skip.label)} (Dev)` : `${skip.label} (Dev)`}
    </button>
  ))

  return (
    <div style={{ width: '100%', minHeight: '100dvh' }}>
      <ProgressBar />
      {showDevPanel && isNarrow && (
        <div
          style={{
            paddingTop: '28px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '0.25rem',
            alignItems: 'center',
            backgroundColor: '#6B9EA6',
            width: '100%',
            height: '64px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            paddingLeft: '0.25rem',
            paddingRight: '0.25rem',
            paddingBottom: '0.25rem',
            borderBottom: '1px solid #000',
            position: 'relative',
            zIndex: 150,
          }}
        >
          {devJumpButtons(true)}
        </div>
      )}
      <div style={{ paddingTop: showDevPanel && isNarrow ? '0' : '28px' }}>
        <SceneEngine />
      </div>

      {showDevPanel && !isNarrow && (
        <div
          style={{
            position: 'fixed',
            top: '2.5rem',
            right: '0.75rem',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.375rem',
            alignItems: 'flex-end',
            pointerEvents: 'none',
          }}
        >
          {devJumpButtons()}
        </div>
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
    </div>
  )
}
