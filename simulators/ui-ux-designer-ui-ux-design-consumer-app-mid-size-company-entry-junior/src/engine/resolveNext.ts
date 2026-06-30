import type { SceneNode, BriefingNode } from '../types/game'
import { useGameStore } from '../store/gameStore'

export function resolveNext(node: SceneNode, branchFlags: Record<string, string>): string | null {
  const rule = node.next
  if (rule == null) return null
  if (typeof rule === 'string') return rule
  const flagValue = branchFlags[rule.branchOn]
  return rule.cases[flagValue] ?? rule.default
}

export function useSectionBriefing(): BriefingNode | null {
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
