import { useGameStore } from '../store/gameStore'
import { storyline } from '../data/storyline'
import type { SceneNode, SceneType } from '../types/game'
import SceneTransition from './SceneTransition'
import { useScrollToTopOnChange } from '../components/hooks/useScrollToTopOnChange'

import IntroScene from '../scenes/IntroScene'
import BriefingScene from '../scenes/BriefingScene'
import MultipleChoiceScene from '../scenes/MultipleChoiceScene'
import FreeTextScene from '../scenes/FreeTextScene'
import StructuredEntryScene from '../scenes/StructuredEntryScene'
import LiveChatScene from '../scenes/LiveChatScene'
import VoiceMeetingScene from '../scenes/VoiceMeetingScene'
import InteractiveCanvasScene from '../scenes/InteractiveCanvasScene'
import SectionTransitionScene from '../scenes/ScenarioTransitionScene'
import GradingScene from '../scenes/GradingScene'
import FinalReportScene from '../scenes/FinalReportScene'
import FlowDiagramScene from '../scenes/FlowDiagramScene'
import ScreenDesignStudioScene from '../scenes/ScreenDesignStudioScene'
import KanbanBoardScene from '../scenes/KanbanBoardScene'
import PriorityMatrixScene from '../scenes/PriorityMatrixScene'

const SCENE_MAP: Record<SceneType, React.ComponentType<{ node: any }>> = {
  intro: IntroScene,
  briefing: BriefingScene,
  multiple_choice: MultipleChoiceScene,
  free_text: FreeTextScene,
  structured_entry: StructuredEntryScene,
  slack_thread: LiveChatScene,
  email_thread: LiveChatScene,
  live_chat: LiveChatScene,
  voice_meeting: VoiceMeetingScene,
  interactive_canvas: InteractiveCanvasScene,
  npc_group_canvas: InteractiveCanvasScene,
  section_transition: SectionTransitionScene,
  grading: GradingScene,
  final_report: FinalReportScene,
  flow_diagram: FlowDiagramScene,
  screen_design_studio: ScreenDesignStudioScene,
  kanban_board: KanbanBoardScene,
  priority_matrix: PriorityMatrixScene,
}

export default function SceneEngine() {
  const currentNodeId = useGameStore((s) => s.currentNodeId)
  useScrollToTopOnChange(currentNodeId)
  const node = storyline.nodes[currentNodeId] as SceneNode | undefined

  if (!node) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] text-game-danger">
        Error: Node "{currentNodeId}" not found in storyline.
      </div>
    )
  }

  const Scene = SCENE_MAP[node.type]
  if (!Scene) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh] text-game-danger">
        Error: No renderer for scene type "{node.type}".
      </div>
    )
  }

  return (
    <SceneTransition nodeId={currentNodeId}>
      <Scene node={node} />
    </SceneTransition>
  )
}
