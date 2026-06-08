// Replaces tokens like {{playerName}}, {{branchFlag.scene-3}}, {{mc.scene-3.label}} in any string.
import { storyline } from '../data/storyline'
import type { MultipleChoiceNode } from '../types/game'

interface InterpState {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
}

const TOKEN_RE = /\{\{([a-zA-Z]+)(?:\.([a-zA-Z0-9_-]+))?(?:\.([a-zA-Z0-9_-]+))?\}\}/g

export function interpolate(text: string | undefined, state: InterpState): string {
  if (!text) return ''
  return text.replace(TOKEN_RE, (match, root, a, b) => {
    if (root === 'playerName') {
      return state.playerName || 'you'
    }
    if (root === 'branchFlag' && a) {
      return state.branchFlags[a] || ''
    }
    if (root === 'mc' && a) {
      const optId = state.mcSelections[a]
      if (!optId) return ''
      if (b === 'id' || !b) return optId
      if (b === 'label') {
        const node = storyline.nodes[a]
        if (node && node.type === 'multiple_choice') {
          const opt = (node as MultipleChoiceNode).options.find((o) => o.id === optId)
          return opt?.label || optId
        }
        return optId
      }
    }
    return match
  })
}
