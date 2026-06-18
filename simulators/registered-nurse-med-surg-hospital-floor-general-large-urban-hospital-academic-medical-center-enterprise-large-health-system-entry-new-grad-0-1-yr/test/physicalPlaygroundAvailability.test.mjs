import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'

async function importTypeScriptModule(relativePath) {
  const result = await build({
    entryPoints: [path.resolve(relativePath)],
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    sourcemap: false,
  })
  const dir = await mkdtemp(path.join(tmpdir(), 'room512-availability-'))
  const bundledPath = path.join(dir, 'module.mjs')
  await writeFile(bundledPath, result.outputFiles[0].text)
  return import(pathToFileURL(bundledPath))
}

const { getRoom512TaskAvailability, getSequencedTaskAvailability } = await importTypeScriptModule(
  './src/scenes/physicalPlaygroundAvailability.ts',
)

const room512TaskIds = [
  'hand_hygiene',
  'confirm_patient',
  'bed_low_locked',
  'place_call_light',
  'pain_score',
  'surgical_site',
  'neurovascular',
  'mobility_breathing',
  'review_orders',
]

function availabilityFor(completedTaskIds) {
  return Object.fromEntries(
    room512TaskIds.map((taskId) => [
      taskId,
      getRoom512TaskAvailability({
        sceneId: 'scene2_assessment',
        taskId,
        completedTaskIds,
      }).state,
    ]),
  )
}

test('Room 512 starts with only hand hygiene available', () => {
  assert.deepEqual(availabilityFor([]), {
    hand_hygiene: 'available',
    confirm_patient: 'locked',
    bed_low_locked: 'locked',
    place_call_light: 'locked',
    pain_score: 'locked',
    surgical_site: 'locked',
    neurovascular: 'locked',
    mobility_breathing: 'locked',
    review_orders: 'locked',
  })
})

test('Room 512 unlocks only the wristband scan after hand hygiene', () => {
  assert.deepEqual(availabilityFor(['hand_hygiene']), {
    hand_hygiene: 'completed',
    confirm_patient: 'available',
    bed_low_locked: 'locked',
    place_call_light: 'locked',
    pain_score: 'locked',
    surgical_site: 'locked',
    neurovascular: 'locked',
    mobility_breathing: 'locked',
    review_orders: 'locked',
  })
})

test('Room 512 exposes only the next unfinished assessment task after the wristband scan', () => {
  assert.deepEqual(availabilityFor(['hand_hygiene', 'confirm_patient']), {
    hand_hygiene: 'completed',
    confirm_patient: 'completed',
    bed_low_locked: 'available',
    place_call_light: 'locked',
    pain_score: 'locked',
    surgical_site: 'locked',
    neurovascular: 'locked',
    mobility_breathing: 'locked',
    review_orders: 'locked',
  })
})

test('Room 512 advances assessment tasks one at a time after identity checks', () => {
  assert.deepEqual(availabilityFor(['hand_hygiene', 'confirm_patient', 'bed_low_locked']), {
    hand_hygiene: 'completed',
    confirm_patient: 'completed',
    bed_low_locked: 'completed',
    place_call_light: 'available',
    pain_score: 'locked',
    surgical_site: 'locked',
    neurovascular: 'locked',
    mobility_breathing: 'locked',
    review_orders: 'locked',
  })

  assert.deepEqual(availabilityFor(['hand_hygiene', 'confirm_patient', 'bed_low_locked', 'place_call_light']), {
    hand_hygiene: 'completed',
    confirm_patient: 'completed',
    bed_low_locked: 'completed',
    place_call_light: 'completed',
    pain_score: 'available',
    surgical_site: 'locked',
    neurovascular: 'locked',
    mobility_breathing: 'locked',
    review_orders: 'locked',
  })

  assert.deepEqual(availabilityFor([
    'hand_hygiene',
    'confirm_patient',
    'bed_low_locked',
    'place_call_light',
    'pain_score',
    'surgical_site',
    'neurovascular',
    'mobility_breathing',
  ]), {
    hand_hygiene: 'completed',
    confirm_patient: 'completed',
    bed_low_locked: 'completed',
    place_call_light: 'completed',
    pain_score: 'completed',
    surgical_site: 'completed',
    neurovascular: 'completed',
    mobility_breathing: 'completed',
    review_orders: 'available',
  })
})

const medPassTaskIds = [
  'hand_hygiene',
  'review_mar',
  'check_allergies',
  'scan_wristband',
  'assess_swallow',
  'supply_drawer',
  'scan_medications',
  'explain_meds',
  'administer_meds',
  'reassessment_reminder',
]

function medPassAvailabilityFor(completedTaskIds) {
  return Object.fromEntries(
    medPassTaskIds.map((taskId) => [
      taskId,
      getSequencedTaskAvailability({
        sceneId: 'scene2_med_pass',
        taskId,
        completedTaskIds,
      }).state,
    ]),
  )
}

test('Med Pass starts with only hand hygiene available', () => {
  assert.deepEqual(medPassAvailabilityFor([]), {
    hand_hygiene: 'available',
    review_mar: 'locked',
    check_allergies: 'locked',
    scan_wristband: 'locked',
    assess_swallow: 'locked',
    supply_drawer: 'locked',
    scan_medications: 'locked',
    explain_meds: 'locked',
    administer_meds: 'locked',
    reassessment_reminder: 'locked',
  })
})

test('Med Pass exposes only the next unfinished safety check', () => {
  assert.deepEqual(medPassAvailabilityFor(['hand_hygiene', 'review_mar', 'check_allergies']), {
    hand_hygiene: 'completed',
    review_mar: 'completed',
    check_allergies: 'completed',
    scan_wristband: 'available',
    assess_swallow: 'locked',
    supply_drawer: 'locked',
    scan_medications: 'locked',
    explain_meds: 'locked',
    administer_meds: 'locked',
    reassessment_reminder: 'locked',
  })
})

test('Med Pass unlocks supply drawer after bedside checks and medication scan after supplies', () => {
  assert.deepEqual(medPassAvailabilityFor(['hand_hygiene', 'review_mar', 'check_allergies', 'scan_wristband', 'assess_swallow']), {
    hand_hygiene: 'completed',
    review_mar: 'completed',
    check_allergies: 'completed',
    scan_wristband: 'completed',
    assess_swallow: 'completed',
    supply_drawer: 'available',
    scan_medications: 'locked',
    explain_meds: 'locked',
    administer_meds: 'locked',
    reassessment_reminder: 'locked',
  })

  assert.deepEqual(medPassAvailabilityFor([
    'hand_hygiene',
    'review_mar',
    'check_allergies',
    'scan_wristband',
    'assess_swallow',
    'supply_drawer',
    'barcode_scanner',
    'acetaminophen_bag',
    'ibuprofen',
    'water_cup',
    'flush',
    'pain_scale',
  ]), {
    hand_hygiene: 'completed',
    review_mar: 'completed',
    check_allergies: 'completed',
    scan_wristband: 'completed',
    assess_swallow: 'completed',
    supply_drawer: 'completed',
    scan_medications: 'available',
    explain_meds: 'locked',
    administer_meds: 'locked',
    reassessment_reminder: 'locked',
  })
})

test('Med Pass exposes linked tasks one at a time after medication scans', () => {
  const throughMedScans = [
    'hand_hygiene',
    'review_mar',
    'check_allergies',
    'scan_wristband',
    'assess_swallow',
    'supply_drawer',
    'barcode_scanner',
    'acetaminophen_bag',
    'ibuprofen',
    'water_cup',
    'flush',
    'pain_scale',
    'scan_medications',
  ]

  assert.equal(medPassAvailabilityFor(throughMedScans).explain_meds, 'available')
  assert.equal(medPassAvailabilityFor([...throughMedScans, 'explain_meds']).administer_meds, 'available')
  assert.equal(medPassAvailabilityFor([...throughMedScans, 'explain_meds', 'administer_meds']).reassessment_reminder, 'available')
})

const statLabDrawTaskIds = [
  'hand_hygiene',
  'verify_order',
  'scan_wristband',
  'explain_draw',
  'lab_drawer',
  'perform_draw',
  'label_bedside',
  'dispose_send',
]

function statLabDrawAvailabilityFor(completedTaskIds) {
  return Object.fromEntries(
    statLabDrawTaskIds.map((taskId) => [
      taskId,
      getSequencedTaskAvailability({
        sceneId: 'scene3_lab_draw',
        taskId,
        completedTaskIds,
      }).state,
    ]),
  )
}

test('STAT Lab Draw starts with only hand hygiene available', () => {
  assert.deepEqual(statLabDrawAvailabilityFor([]), {
    hand_hygiene: 'available',
    verify_order: 'locked',
    scan_wristband: 'locked',
    explain_draw: 'locked',
    lab_drawer: 'locked',
    perform_draw: 'locked',
    label_bedside: 'locked',
    dispose_send: 'locked',
  })
})

test('STAT Lab Draw exposes only the next unfinished workflow task', () => {
  assert.deepEqual(statLabDrawAvailabilityFor(['hand_hygiene', 'verify_order']), {
    hand_hygiene: 'completed',
    verify_order: 'completed',
    scan_wristband: 'available',
    explain_draw: 'locked',
    lab_drawer: 'locked',
    perform_draw: 'locked',
    label_bedside: 'locked',
    dispose_send: 'locked',
  })

  assert.deepEqual(statLabDrawAvailabilityFor(['hand_hygiene', 'verify_order', 'scan_wristband', 'explain_draw']), {
    hand_hygiene: 'completed',
    verify_order: 'completed',
    scan_wristband: 'completed',
    explain_draw: 'completed',
    lab_drawer: 'available',
    perform_draw: 'locked',
    label_bedside: 'locked',
    dispose_send: 'locked',
  })
})

test('STAT Lab Draw exposes procedure links one at a time after drawer supplies', () => {
  const throughDrawer = [
    'hand_hygiene',
    'verify_order',
    'scan_wristband',
    'explain_draw',
    'lab_drawer',
    'gloves',
    'tourniquet',
    'alcohol_swab',
    'butterfly',
    'lavender_tube',
    'labels',
    'gauze',
    'specimen_bag',
  ]

  assert.equal(statLabDrawAvailabilityFor(throughDrawer).perform_draw, 'available')
  assert.equal(statLabDrawAvailabilityFor([...throughDrawer, 'perform_draw']).label_bedside, 'available')
  assert.equal(statLabDrawAvailabilityFor([...throughDrawer, 'perform_draw', 'label_bedside']).dispose_send, 'available')
})
