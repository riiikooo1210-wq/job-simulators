export type TaskAvailabilityState = 'available' | 'locked' | 'completed'

interface Room512TaskAvailabilityInput {
  sceneId: string
  taskId: string | undefined
  completedTaskIds: readonly string[]
}

interface TaskAvailability {
  state: TaskAvailabilityState
  lockedBy?: string
}

export const ROOM_512_ASSESSMENT_SCENE_ID = 'scene2_assessment'
export const ROOM_512_HAND_HYGIENE_TASK_ID = 'hand_hygiene'
export const ROOM_512_WRISTBAND_TASK_ID = 'confirm_patient'
export const MED_PASS_SAFETY_CHECKS_SCENE_ID = 'scene2_med_pass'
export const STAT_LAB_DRAW_SCENE_ID = 'scene3_lab_draw'

const SCENE_TASK_SEQUENCE: Record<string, readonly (readonly string[])[]> = {
  [ROOM_512_ASSESSMENT_SCENE_ID]: [
    [ROOM_512_HAND_HYGIENE_TASK_ID],
    [ROOM_512_WRISTBAND_TASK_ID],
    ['bed_low_locked'],
    ['place_call_light'],
    ['pain_score'],
    ['surgical_site'],
    ['neurovascular'],
    ['mobility_breathing'],
    ['review_orders'],
  ],
  [MED_PASS_SAFETY_CHECKS_SCENE_ID]: [
    ['hand_hygiene'],
    ['review_mar'],
    ['check_allergies'],
    ['scan_wristband'],
    ['assess_swallow'],
    [
      'supply_drawer',
      'barcode_scanner',
      'acetaminophen_bag',
      'ibuprofen',
      'water_cup',
      'flush',
      'pain_scale',
    ],
    ['scan_medications'],
    ['explain_meds'],
    ['administer_meds'],
    ['reassessment_reminder'],
  ],
  [STAT_LAB_DRAW_SCENE_ID]: [
    ['hand_hygiene'],
    ['verify_order'],
    ['scan_wristband'],
    ['explain_draw'],
    [
      'lab_drawer',
      'gloves',
      'tourniquet',
      'alcohol_swab',
      'butterfly',
      'lavender_tube',
      'labels',
      'gauze',
      'specimen_bag',
    ],
    ['perform_draw'],
    ['label_bedside'],
    ['dispose_send'],
  ],
}

export function getSequencedTaskAvailability({
  sceneId,
  taskId,
  completedTaskIds,
}: Room512TaskAvailabilityInput): TaskAvailability {
  if (!taskId) return { state: 'available' }

  const completed = new Set(completedTaskIds)
  if (completed.has(taskId)) return { state: 'completed' }
  const sequence = SCENE_TASK_SEQUENCE[sceneId]
  if (!sequence) return { state: 'available' }

  const taskGroupIndex = sequence.findIndex((group) => group.includes(taskId))
  if (taskGroupIndex === -1) return { state: 'available' }

  const firstIncompleteGroupIndex = sequence.findIndex((group) => group.some((id) => !completed.has(id)))
  if (firstIncompleteGroupIndex === -1) return { state: 'available' }
  if (taskGroupIndex === firstIncompleteGroupIndex) return { state: 'available' }
  if (taskGroupIndex > firstIncompleteGroupIndex) {
    return { state: 'locked', lockedBy: sequence[firstIncompleteGroupIndex][0] }
  }

  return { state: 'available' }
}

export function getRoom512TaskAvailability(input: Room512TaskAvailabilityInput): TaskAvailability {
  return getSequencedTaskAvailability(input)
}
