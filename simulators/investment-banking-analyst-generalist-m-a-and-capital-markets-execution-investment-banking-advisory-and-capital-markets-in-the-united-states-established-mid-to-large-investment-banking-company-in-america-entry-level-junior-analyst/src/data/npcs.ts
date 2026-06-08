import type { NPC } from '../types/game'
import config from './scene-config.json'

export const npcs = config.npcs as Record<string, NPC>
