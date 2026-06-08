// Replaces tokens like {{playerName}}, {{branchFlag.scene-3}}, {{mc.scene-3.label}} in any string.
import { storyline } from '../data/storyline'
import type { MultipleChoiceNode } from '../types/game'

interface InterpState {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
  freeTextResponses?: Record<string, string>
}

const TOKEN_RE = /\{\{([a-zA-Z]+)(?:\.([a-zA-Z0-9_-]+))?(?:\.([a-zA-Z0-9_-]+))?\}\}/g

const OBSERVATION_LABELS: Record<string, string> = {
  hot_chicken_pan: 'Hot chicken pan',
  salsa_cold_pan: 'Salsa pan',
  sanitizer_bucket: 'Sanitizer bucket',
  drive_thru_timer: 'Drive-thru timer',
}

function labelFromId(id: string) {
  return OBSERVATION_LABELS[id] || id
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatPlaygroundObservations(raw: string | undefined) {
  const emptyMessage = '- No line-check notes recorded yet. Complete the playground observations first.'
  if (!raw) return emptyMessage

  try {
    const parsed = JSON.parse(raw) as { observations?: Record<string, unknown> }
    const observations = parsed.observations
    if (!observations || typeof observations !== 'object') return emptyMessage

    const lines = Object.entries(observations)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([id, value]) => `- ${labelFromId(id)}: ${String(value).trim().replace(/\s+/g, ' ')}`)

    return lines.length ? lines.join('\n') : emptyMessage
  } catch {
    return emptyMessage
  }
}

export function interpolate(text: string | undefined, state: InterpState): string {
  if (!text) return ''
  return text.replace(TOKEN_RE, (match, root, a, b) => {
    if (root === 'playerName') {
      return state.playerName || 'you'
    }
    if (root === 'playerInitial') {
      return state.playerName.trim().charAt(0).toUpperCase() || 'Y'
    }
    if (root === 'branchFlag' && a) {
      return state.branchFlags[a] || ''
    }
    if (root === 'response' && a) {
      if (b === 'observations') {
        return formatPlaygroundObservations(state.freeTextResponses?.[a])
      }
      return state.freeTextResponses?.[a] || ''
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
