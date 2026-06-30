import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AssessmentResult, ChatMessage } from '../types/game'
import { SIMULATOR_STORAGE_KEY } from '../data/simulatorIdentity'
import { storyline } from '../data/storyline'

interface GameState {
  // Navigation
  currentNodeId: string
  visitedNodes: string[]
  currentSection: number
  sectionsSubmitted: number[]

  // Identity
  playerName: string

  // Generic answer surfaces
  mcSelections: Record<string, string> // sceneId -> optionId
  freeTextResponses: Record<string, string> // sceneId or bindingKey -> text
  npcConversations: Record<string, ChatMessage[]> // npcId -> history
  branchFlags: Record<string, string> // pivotSceneId -> chosen option id
  interactiveCanvasState: Record<string, { visited: string[]; completed: boolean }>

  // Glossary tracking (analytics only)
  definitionClicks: Record<string, number>

  // Grading
  gradingStatus: 'idle' | 'loading' | 'complete' | 'error'
  gradingResult: AssessmentResult | null
  gradingError: string | null

  // Actions — navigation
  navigateTo: (nodeId: string, options?: { markSectionSubmitted?: boolean }) => void
  goBack: () => void

  // Actions — identity
  setPlayerName: (name: string) => void

  // Actions — answers
  setMcSelection: (sceneId: string, optionId: string) => void
  setBranchFlag: (sceneId: string, value: string) => void
  setFreeTextResponse: (key: string, text: string) => void
  appendNpcMessage: (npcId: string, msg: ChatMessage) => void
  resetNpcConversation: (npcId: string) => void
  markZoneVisited: (sceneId: string, zoneId: string) => void
  setSceneCompleted: (sceneId: string) => void
  markSectionSubmitted: (s: number) => void
  setCurrentSection: (s: number) => void

  // Glossary
  trackDefinitionClick: (term: string) => void

  // Grading
  setGradingStatus: (status: 'idle' | 'loading' | 'complete' | 'error') => void
  setGradingResult: (result: AssessmentResult) => void
  setGradingError: (error: string | null) => void

  resetGame: () => void
  recoverInvalidRoute: () => void
}

const initialState: Omit<GameState,
  | 'navigateTo' | 'goBack' | 'setPlayerName' | 'setMcSelection' | 'setBranchFlag'
  | 'setFreeTextResponse' | 'appendNpcMessage' | 'resetNpcConversation' | 'markZoneVisited'
  | 'setSceneCompleted' | 'markSectionSubmitted' | 'setCurrentSection' | 'trackDefinitionClick'
  | 'setGradingStatus' | 'setGradingResult' | 'setGradingError' | 'resetGame' | 'recoverInvalidRoute'
> = {
  currentNodeId: storyline.startNode,
  visitedNodes: [storyline.startNode],
  currentSection: 0,
  sectionsSubmitted: [],
  playerName: '',
  mcSelections: {},
  freeTextResponses: {},
  npcConversations: {},
  branchFlags: {},
  interactiveCanvasState: {},
  definitionClicks: {},
  gradingStatus: 'idle',
  gradingResult: null,
  gradingError: null,
}

export const GAME_STORE_VERSION = 2

const validNodeIds = new Set(Object.keys(storyline.nodes))
const validGradingStatuses = new Set<GameState['gradingStatus']>(['idle', 'loading', 'complete', 'error'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function sanitizeStringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {}
  return Object.entries(value).reduce<Record<string, string>>((acc, [key, item]) => {
    if (typeof item === 'string') acc[key] = item
    return acc
  }, {})
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function sanitizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is number => Number.isFinite(item)))]
}

function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item): ChatMessage[] => {
    if (!isRecord(item)) return []
    if (item.role !== 'npc' && item.role !== 'user') return []
    if (typeof item.content !== 'string') return []
    return [{
      role: item.role,
      content: item.content,
      ...(typeof item.ts === 'string' ? { ts: item.ts } : {}),
      ...(typeof item.npcName === 'string' ? { npcName: item.npcName } : {}),
    }]
  })
}

function sanitizeConversationRecord(value: unknown): Record<string, ChatMessage[]> {
  if (!isRecord(value)) return {}
  return Object.entries(value).reduce<Record<string, ChatMessage[]>>((acc, [key, item]) => {
    const messages = sanitizeMessages(item)
    if (messages.length) acc[key] = messages
    return acc
  }, {})
}

function sanitizeInteractiveCanvasState(value: unknown): GameState['interactiveCanvasState'] {
  if (!isRecord(value)) return {}
  return Object.entries(value).reduce<GameState['interactiveCanvasState']>((acc, [sceneId, item]) => {
    if (!isRecord(item)) return acc
    acc[sceneId] = {
      visited: sanitizeStringArray(item.visited),
      completed: item.completed === true,
    }
    return acc
  }, {})
}

export function repairPersistedGameState(persistedState: unknown): typeof initialState {
  if (!isRecord(persistedState)) return initialState

  const requestedNodeId = typeof persistedState.currentNodeId === 'string' ? persistedState.currentNodeId : ''
  const hasValidCurrentNode = validNodeIds.has(requestedNodeId)
  const currentNodeId = hasValidCurrentNode ? requestedNodeId : storyline.startNode
  const visitedNodes = hasValidCurrentNode
    ? sanitizeStringArray(persistedState.visitedNodes).filter((nodeId) => validNodeIds.has(nodeId))
    : [storyline.startNode]
  if (!visitedNodes.length) visitedNodes.push(storyline.startNode)
  if (!visitedNodes.includes(currentNodeId)) visitedNodes.push(currentNodeId)

  return {
    ...initialState,
    currentNodeId,
    visitedNodes,
    currentSection: storyline.nodes[currentNodeId]?.section ?? initialState.currentSection,
    sectionsSubmitted: sanitizeNumberArray(persistedState.sectionsSubmitted),
    playerName: typeof persistedState.playerName === 'string' ? persistedState.playerName : '',
    mcSelections: sanitizeStringRecord(persistedState.mcSelections),
    freeTextResponses: sanitizeStringRecord(persistedState.freeTextResponses),
    npcConversations: sanitizeConversationRecord(persistedState.npcConversations),
    branchFlags: sanitizeStringRecord(persistedState.branchFlags),
    interactiveCanvasState: sanitizeInteractiveCanvasState(persistedState.interactiveCanvasState),
    definitionClicks: isRecord(persistedState.definitionClicks)
      ? Object.entries(persistedState.definitionClicks).reduce<Record<string, number>>((acc, [key, value]) => {
          if (Number.isFinite(value)) acc[key] = value as number
          return acc
        }, {})
      : {},
    gradingStatus: validGradingStatuses.has(persistedState.gradingStatus as GameState['gradingStatus'])
      ? persistedState.gradingStatus as GameState['gradingStatus']
      : initialState.gradingStatus,
    gradingResult: isRecord(persistedState.gradingResult) ? persistedState.gradingResult as unknown as AssessmentResult : null,
    gradingError: typeof persistedState.gradingError === 'string' ? persistedState.gradingError : null,
  }
}

function routeResetState() {
  return {
    currentNodeId: storyline.startNode,
    visitedNodes: [storyline.startNode],
    currentSection: storyline.nodes[storyline.startNode]?.section ?? initialState.currentSection,
    sectionsSubmitted: [],
  }
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      ...initialState,

      navigateTo: (nodeId, options) =>
        set((state) => {
          const next = storyline.nodes[nodeId]
          const newSection = next?.section ?? state.currentSection
          // Mark section submitted when crossing into a new section
          let sectionsSubmitted = state.sectionsSubmitted
          const prev = storyline.nodes[state.currentNodeId]
          const shouldMarkSectionSubmitted = options?.markSectionSubmitted !== false
          if (shouldMarkSectionSubmitted && prev && next && newSection > prev.section && prev.section > 0) {
            if (!sectionsSubmitted.includes(prev.section)) {
              sectionsSubmitted = [...sectionsSubmitted, prev.section]
            }
          }
          return {
            currentNodeId: nodeId,
            visitedNodes: [...state.visitedNodes, nodeId],
            currentSection: newSection,
            sectionsSubmitted,
          }
        }),

      goBack: () =>
        set((state) => {
          if (state.visitedNodes.length <= 1) return state
          const newVisited = state.visitedNodes.slice(0, -1)
          const newId = newVisited[newVisited.length - 1]
          return {
            currentNodeId: newId,
            visitedNodes: newVisited,
            currentSection: storyline.nodes[newId]?.section ?? state.currentSection,
          }
        }),

      setPlayerName: (name) => set({ playerName: name }),

      setMcSelection: (sceneId, optionId) =>
        set((state) => ({
          mcSelections: { ...state.mcSelections, [sceneId]: optionId },
        })),

      setBranchFlag: (sceneId, value) =>
        set((state) => ({
          branchFlags: { ...state.branchFlags, [sceneId]: value },
        })),

      setFreeTextResponse: (key, text) =>
        set((state) => ({
          freeTextResponses: { ...state.freeTextResponses, [key]: text },
        })),

      appendNpcMessage: (npcId, msg) =>
        set((state) => ({
          npcConversations: {
            ...state.npcConversations,
            [npcId]: [...(state.npcConversations[npcId] || []), msg],
          },
        })),

      resetNpcConversation: (npcId) =>
        set((state) => {
          const { [npcId]: _drop, ...rest } = state.npcConversations
          return { npcConversations: rest }
        }),

      markZoneVisited: (sceneId, zoneId) =>
        set((state) => {
          const cur = state.interactiveCanvasState[sceneId] || { visited: [], completed: false }
          if (cur.visited.includes(zoneId)) return state
          return {
            interactiveCanvasState: {
              ...state.interactiveCanvasState,
              [sceneId]: { ...cur, visited: [...cur.visited, zoneId] },
            },
          }
        }),

      setSceneCompleted: (sceneId) =>
        set((state) => ({
          interactiveCanvasState: {
            ...state.interactiveCanvasState,
            [sceneId]: {
              visited: state.interactiveCanvasState[sceneId]?.visited || [],
              completed: true,
            },
          },
        })),

      markSectionSubmitted: (s) =>
        set((state) => ({
          sectionsSubmitted: state.sectionsSubmitted.includes(s)
            ? state.sectionsSubmitted
            : [...state.sectionsSubmitted, s],
        })),

      setCurrentSection: (s) => set({ currentSection: s }),

      trackDefinitionClick: (term) =>
        set((state) => ({
          definitionClicks: {
            ...state.definitionClicks,
            [term]: (state.definitionClicks[term] || 0) + 1,
          },
        })),

      setGradingStatus: (status) => set({ gradingStatus: status }),
      setGradingResult: (result) => set({ gradingResult: result, gradingStatus: 'complete' }),
      setGradingError: (error) =>
        set(error != null ? { gradingError: error, gradingStatus: 'error' } : { gradingError: null }),

      resetGame: () => set(initialState),
      recoverInvalidRoute: () => set(routeResetState()),
    }),
    {
      name: SIMULATOR_STORAGE_KEY,
      version: GAME_STORE_VERSION,
      migrate: (persistedState) => repairPersistedGameState(persistedState),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...repairPersistedGameState(persistedState),
      }),
    }
  )
)

// Helper hook for reading the current node
export function useCurrentNode() {
  const id = useGameStore((s) => s.currentNodeId)
  return storyline.nodes[id]
}
