import type { SceneNode, BriefingNode } from '../types/game'
import { useGameStore } from '../store/gameStore'
import { storyline } from '../data/storyline'

export function resolveNext(node: SceneNode, branchFlags: Record<string, string>): string | null {
  const rule = node.next
  if (rule == null) return null
  if (typeof rule === 'string') return rule
  const flagValue = branchFlags[rule.branchOn]
  return rule.cases[flagValue] ?? rule.default
}

export function useSectionBriefing(): BriefingNode | null {
  const currentNodeId = useGameStore((s) => s.currentNodeId)
  const node = storyline.nodes[currentNodeId] as SceneNode | undefined
  if (!node) return null
  const section = node.section
  for (const n of Object.values(storyline.nodes)) {
    const candidate = n as SceneNode
    if (candidate.section === section && candidate.type === 'briefing') {
      const briefing = candidate as BriefingNode
      if (briefing.referenceForSection === false) continue
      return briefing
    }
  }
  return null
}

export function useGoNext() {
  const navigateTo = useGameStore((s) => s.navigateTo)
  return (node: SceneNode) => {
    const branchFlags = useGameStore.getState().branchFlags
    const nextId = resolveNext(node, branchFlags)
    if (nextId) navigateTo(nextId)
  }
}
