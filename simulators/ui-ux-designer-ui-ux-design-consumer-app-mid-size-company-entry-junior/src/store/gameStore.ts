import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ChatMessage, GradingResult } from '../types/game'
import { storyline } from '../data/storyline'

// Persist key is set per-job at scaffold time via STORE_PERSIST_KEY constant.
// In dev/non-scaffolded contexts it falls back to a generic name.
declare const STORE_PERSIST_KEY: string | undefined

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
  gradingResult: GradingResult | null
  gradingError: string | null

  // Actions — navigation
  navigateTo: (nodeId: string) => void
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
  setGradingResult: (result: GradingResult) => void
  setGradingError: (error: string | null) => void

  resetGame: () => void
}

const initialState: Omit<GameState,
  | 'navigateTo' | 'goBack' | 'setPlayerName' | 'setMcSelection' | 'setBranchFlag'
  | 'setFreeTextResponse' | 'appendNpcMessage' | 'resetNpcConversation' | 'markZoneVisited'
  | 'setSceneCompleted' | 'markSectionSubmitted' | 'setCurrentSection' | 'trackDefinitionClick'
  | 'setGradingStatus' | 'setGradingResult' | 'setGradingError' | 'resetGame'
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

const removedSceneIds = new Set([
  'scene_01_standup',
  'scene_01b_hifi_redirect',
  'scene_01b_meeting_redirect',
  'scene_01b_wait_redirect',
])

function freshInitialState() {
  return {
    ...initialState,
    visitedNodes: [...initialState.visitedNodes],
    sectionsSubmitted: [...initialState.sectionsSubmitted],
    mcSelections: {},
    freeTextResponses: {},
    npcConversations: {},
    branchFlags: {},
    interactiveCanvasState: {},
    definitionClicks: {},
  }
}

function isValidActiveNodeId(nodeId: unknown): nodeId is string {
  return typeof nodeId === 'string' && Boolean(storyline.nodes[nodeId]) && !removedSceneIds.has(nodeId)
}

function sanitizeHydratedState(state: Partial<GameState>) {
  if (!isValidActiveNodeId(state.currentNodeId)) {
    return freshInitialState()
  }

  const visitedNodes = Array.isArray(state.visitedNodes)
    ? state.visitedNodes.filter(isValidActiveNodeId)
    : []

  return {
    ...state,
    visitedNodes: visitedNodes.length ? visitedNodes : [state.currentNodeId],
    currentSection: storyline.nodes[state.currentNodeId]?.section ?? initialState.currentSection,
  }
}

const persistKey =
  typeof STORE_PERSIST_KEY !== 'undefined' && STORE_PERSIST_KEY
    ? STORE_PERSIST_KEY
    : 'job-simulator-storage'

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      ...initialState,

      navigateTo: (nodeId) =>
        set((state) => {
          const next = storyline.nodes[nodeId]
          if (!next) return freshInitialState()
          const newSection = next?.section ?? state.currentSection
          // Mark section submitted when crossing into a new section
          let sectionsSubmitted = state.sectionsSubmitted
          const prev = storyline.nodes[state.currentNodeId]
          if (prev && next && prev.section !== newSection && prev.section > 0) {
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
    }),
    {
      name: persistKey,
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizeHydratedState((persistedState || {}) as Partial<GameState>),
      }),
    }
  )
)

// Helper hook for reading the current node
export function useCurrentNode() {
  const id = useGameStore((s) => s.currentNodeId)
  return storyline.nodes[id]
}
