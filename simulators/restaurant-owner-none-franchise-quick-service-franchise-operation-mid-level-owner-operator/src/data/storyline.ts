import type { Storyline, Section, NPC, DevSkip } from '../types/game'
import config from './scene-config.json'

export const storyline = config.storyline as Storyline
export const npcs = config.npcs as Record<string, NPC>
export const intro = config.intro as {
  welcomeTitle: string
  welcomeBody: string
  steps: { label: string; content: string }[]
}
export const glossary = (config.glossary || {}) as Record<string, string>
export const sampleAnswers = (config.sample_answers || {}) as Record<string, unknown>

export type { Storyline, Section, NPC, DevSkip }
