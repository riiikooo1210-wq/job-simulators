import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = path.resolve(import.meta.dirname, '..')

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(projectRoot, relativePath), 'utf8'))
}

function allNextReferences(config) {
  const refs = []
  for (const node of Object.values(config.storyline.nodes)) {
    if (!node.next) continue
    if (typeof node.next === 'string') {
      refs.push({ from: node.id, to: node.next })
      continue
    }
    for (const to of Object.values(node.next.cases || {})) refs.push({ from: node.id, to })
    if (node.next.default) refs.push({ from: node.id, to: node.next.default })
  }
  return refs
}

function redlineNode() {
  const config = readJson('src/data/scene-config.json')
  return config.storyline.nodes.redline_note
}

function publicImageFiles(dir = path.join(projectRoot, 'public')) {
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...publicImageFiles(absolute))
      continue
    }
    if (/\.(png|jpg|jpeg)$/i.test(entry.name)) files.push(absolute)
  }
  return files
}

test('redline pickup guidance is built around the six real cards', () => {
  const node = redlineNode()
  const fixIds = node.callouts
    .filter((callout) => callout.correctCategoryId === 'fix')
    .map((callout) => callout.id)
    .sort()
  const verifyIds = node.callouts
    .filter((callout) => callout.correctCategoryId === 'verify')
    .map((callout) => callout.id)
    .sort()
  const guide = node.decisionGuideContent.toLowerCase()

  assert.equal(node.callouts.length, 6)
  assert.deepEqual(fixIds, ['schedule_shell', 'window_tag'])
  assert.deepEqual(verifyIds, ['foundation_existing', 'lot_coverage', 'privacy_window', 'rear_setback'])
  assert.ok(node.inlineBriefingContent.includes("Dana and Luis want a brighter kitchen"))
  assert.match(node.content, /Do not choose Fix just because a card shows a rule problem/)
  assert.match(node.inlineBriefingContent, /wrong or missing window tags/)
  assert.doesNotMatch(node.inlineBriefingContent, /Dana prefers|translucent glass/i)

  for (const phrase of [
    'south-left window tag',
    'missing w-10 tag',
    'rear setback short',
    'lot coverage over max',
    'west bedroom privacy',
    'existing utilities',
  ]) {
    assert.ok(guide.includes(phrase), `decision guide does not mention ${phrase}`)
  }
  assert.match(node.decisionGuideContent, /problem but not one exact safe drawing change/i)
  assert.match(node.decisionGuideContent, /measurement breaks a zoning or permit rule/i)
  assert.match(node.decisionGuideContent, /Rule violation, permit math, site condition, or client choice = Verify/i)
})

test('redline Owen notes explain why each card is Fix or Verify', () => {
  const node = redlineNode()

  assert.match(node.reviewerIntro, /obvious drawing problem with one exact update/i)
  assert.match(node.reviewerIntro, /rule problem, permit math, site condition, or client choice/i)

  for (const callout of node.callouts) {
    const expectedLead = callout.correctCategoryId === 'fix' ? 'This is Fix.' : 'This is Verify.'
    assert.ok(callout.owenNote.startsWith(expectedLead), `${callout.id} note should start with ${expectedLead}`)
    assert.ok(callout.owenNote.length >= 90, `${callout.id} note is too thin`)
    assert.ok(callout.owenNote.length <= 240, `${callout.id} note is too long`)
  }
})

test('student route skips review summary and goes from Dana handoff to design studio', () => {
  const config = readJson('src/data/scene-config.json')
  const nodes = config.storyline.nodes
  const refs = allNextReferences(config)

  assert.equal(nodes.client_prep.type, 'client_question_checklist')
  assert.equal(nodes.client_prep.next, 'client_call')
  assert.equal(nodes.client_call.type, 'briefing')
  assert.equal(nodes.client_call.actionLabel, 'Continue to design studio')
  assert.equal(nodes.client_call.next, 'schematic_option_study')
  assert.equal(nodes.schematic_option_study.next, 'assessment_gate')
  assert.equal('review_verify_replies' in nodes, false)
  assert.equal(refs.some((ref) => ref.to === 'review_verify_replies'), false)
  assert.match(nodes.client_call.content, /design studio/)
  assert.doesNotMatch(nodes.client_call.content, /review the team's replies/i)
})

test('stale saved review-summary state redirects to the design studio', () => {
  const source = readFileSync(path.join(projectRoot, 'src/engine/SceneEngine.tsx'), 'utf8')

  assert.match(source, /currentNodeId === 'review_verify_replies'/)
  assert.match(source, /navigateTo\('schematic_option_study'\)/)
})

test('client question checklist defaults to Checklist and keeps merged Project Notes source tab', () => {
  const config = readJson('src/data/scene-config.json')
  const node = config.storyline.nodes.client_prep
  const tabIds = node.appTabs.map((tab) => tab.id).sort()

  assert.equal(node.defaultAppTabId, 'builder')
  assert.deepEqual(tabIds, ['project_notes'])
  assert.equal(node.appTabs[0].label, 'Project Notes')
  assert.match(node.appTabs[0].content, /Dana and Luis priorities/)
  assert.match(node.appTabs[0].content, /Open redline notes/)
})

test('client question checklist requires two Dana-facing question types', () => {
  const config = readJson('src/data/scene-config.json')
  const node = config.storyline.nodes.client_prep
  const valid = node.options.filter((option) => option.validForClient)
  const teamChecks = node.options.filter((option) => !option.validForClient)

  assert.equal(node.requiredSelections, 2)
  assert.deepEqual(node.requiredFocusGroups.sort(), ['daily_life', 'privacy'])
  assert.ok(valid.some((option) => option.focusGroup === 'privacy'))
  assert.ok(valid.some((option) => option.focusGroup === 'daily_life'))
  assert.ok(teamChecks.length >= 3)
  assert.ok(teamChecks.every((option) => option.teamCheckReason))
})

test('Maple Street briefing inbox exposes source-folder files before first move', () => {
  const config = readJson('src/data/scene-config.json')
  const inbox = config.storyline.nodes.maple_street_inbox.sourceInbox
  const fileIds = inbox.folder.files.map((file) => file.id)

  assert.equal(inbox.entryMessage.channel, 'slack')
  assert.match(inbox.folder.path, /Maple_Street_Addition/)
  assert.deepEqual(inbox.requiredFileIds.sort(), fileIds.sort())
  assert.ok(inbox.folder.files.length >= 4)
})

test('design studio carries Dana choices and team rules without requiring written notes', () => {
  const config = readJson('src/data/scene-config.json')
  const node = config.storyline.nodes.schematic_option_study
  const tabs = node.referenceTabs

  assert.deepEqual(tabs.map((tab) => tab.id), ['dana_handoff', 'team_rules'])
  assert.deepEqual(tabs.map((tab) => tab.label), ['Dana Choices', 'Team Rules'])
  assert.equal(node.minNotesWords, 0)
  assert.match(node.content, /Dana Choices tells you what the client wants/)
  assert.match(node.content, /Team Rules tells you the limits/)
  assert.match(node.content, /Rules Check panel/)
  assert.match(node.content, /Dana Choices/)
  assert.match(node.content, /Team Rules/)
  assert.match(node.prompt, /Open Dana Choices/)
  assert.match(node.prompt, /Open Team Rules/)
  assert.match(node.prompt, /Return to Design Tool/)
  assert.match(node.prompt, /Fix the footprint until Rules Check is clear/)
  assert.match(node.prompt, /Add room labels/)
  assert.match(node.prompt, /Open West Elevation and choose Translucent glass/)
  assert.match(node.prompt, /Your Checklist/)
  assert.doesNotMatch(node.prompt, /write|summary|note/i)

  const danaTab = tabs.find((tab) => tab.id === 'dana_handoff')
  const teamTab = tabs.find((tab) => tab.id === 'team_rules')

  assert.match(danaTab.content, /Translucent glass or privacy glazing/)
  assert.match(danaTab.content, /Kitchen and mudroom/)
  assert.match(danaTab.content, /Daily routine/)
  assert.match(danaTab.content, /Do not promise timing or cost/)
  assert.match(teamTab.content, /25 ft minimum/)
  assert.match(teamTab.content, /45%/)
  assert.match(teamTab.content, /right-rear utility clear zone/)
  assert.match(teamTab.content, /Window-tag fixes/)
  assert.match(teamTab.content, /not final city approval/)
})

test('design studio submit copy is drawing-only when notes are disabled', () => {
  const source = readFileSync(path.join(projectRoot, 'src/scenes/ArchitectDesignStudioScene.tsx'), 'utf8')

  assert.match(source, /const notesRequired = minNotesWords > 0/)
  assert.match(source, /const notesReady = !notesRequired \|\| noteWordCount >= minNotesWords/)
  assert.match(source, /\{notesRequired && \(/)
  assert.match(source, /Cannot submit yet: Level 1 still needs Kitchen area and Mudroom area labels\./)
  assert.match(source, /Cannot submit yet: Level 2 still needs the Bedroom suite label\./)
  assert.match(source, /Cannot submit yet: West Elevation still needs Translucent glass\./)
  assert.match(source, /Ready to submit\. Your option meets Dana\\'s choices and the team rules\./)
  assert.doesNotMatch(source, /To submit:.*write design notes/)
})

test('design studio canvas exposes a real hit layer for room-label placement', () => {
  const source = readFileSync(path.join(projectRoot, 'src/scenes/ArchitectDesignStudioScene.tsx'), 'utf8')

  assert.match(source, /const handleCanvasPointerDown = \(event: ReactPointerEvent<SVGSVGElement>\)/)
  assert.match(source, /onPointerDown=\{handleCanvasPointerDown\}/)
  assert.match(source, /data-testid="design-canvas"/)
  assert.match(source, /data-testid="design-canvas-hit-layer"/)
  assert.match(source, /pointerEvents="all"/)
  assert.match(source, /event\.currentTarget\.setPointerCapture\?\.\(event\.pointerId\)/)
  assert.match(source, /data-testid=\{`room-tool-\$\{tool\.id\}`\}/)
  assert.match(source, /aria-pressed=\{activeTool === tool\.id\}/)
  assert.match(source, /data-testid=\{`design-view-\$\{view\.id\}`\}/)
})

test('design studio gives directional tool guidance without exact answer values', () => {
  const source = readFileSync(path.join(projectRoot, 'src/scenes/ArchitectDesignStudioScene.tsx'), 'utf8')

  assert.match(source, /Your Checklist/)
  assert.match(source, /Footprint passes Rules Check/)
  assert.match(source, /Level 1 kitchen and mudroom labels placed/)
  assert.match(source, /Level 2 bedroom suite label placed/)
  assert.match(source, /West Elevation uses Translucent glass/)
  assert.match(source, /Done/)
  assert.match(source, /Still needed/)
  assert.match(source, /Next: place Kitchen area and Mudroom area\./)
  assert.match(source, /Next: place Bedroom suite\./)
  assert.match(source, /Next: choose Translucent glass\./)
  assert.match(source, /Ready to submit\. Your option meets Dana\\'s choices and the team rules\./)

  assert.match(source, /Try this first: lower Depth\. Watch this rule until it reaches 25 ft or more\./)
  assert.match(source, /Try this first: lower Width or Depth\. Watch this rule until it is 45% or less\./)
  assert.match(source, /Try this first: move sideways away from the tree\. If it still overlaps, lower Width\./)
  assert.match(source, /Try this first: move sideways to keep the addition out of the right-rear utility clear zone\. If it still overlaps, lower Width\./)
  assert.match(source, /Use Depth for rear setback\. Use Width or Depth for lot coverage\. Use Width or Move sideways to keep the right-rear utility clear zone open\./)
  assert.match(source, /RangeControl label="Move sideways"/)
  assert.doesNotMatch(source, /Move east/)
  assert.doesNotMatch(source, /Width 28|Depth 16/)
})

test('design studio keeps glossary help available on architectural labels', () => {
  const source = readFileSync(path.join(projectRoot, 'src/scenes/ArchitectDesignStudioScene.tsx'), 'utf8')

  assert.match(source, /renderContentWithGlossary\(view\.label\)/)
  assert.match(source, /\{tool\.label\}/)
  assert.match(source, /renderContentWithGlossary\(strategy\.label\)/)
  assert.match(source, /renderContentWithGlossary\(check\.label\)/)
  assert.match(source, /renderContentWithGlossary\(check\.message\)/)
})

test('west elevation strategy assets use existing case-sensitive PNG paths', () => {
  const source = readFileSync(path.join(projectRoot, 'src/scenes/ArchitectDesignStudioScene.tsx'), 'utf8')
  const assetPaths = [
    '/action-assets/revit/higher_sill.PNG',
    '/action-assets/revit/translucent_glass.PNG',
    '/action-assets/revit/smaller_window.PNG',
    '/action-assets/revit/landscape_screen.PNG',
  ]

  for (const assetPath of assetPaths) {
    assert.match(source, new RegExp(assetPath.replace(/[/.]/g, '\\$&')))
    assert.equal(existsSync(path.join(projectRoot, 'public', assetPath.replace('/action-assets/', 'action-assets/'))), true, `${assetPath} is missing`)
  }
  assert.doesNotMatch(source, /`\/action-assets\/revit\/\$\{strategyId\}\.png`/)
})

test('west elevation selected window is constrained to the W-12 opening', () => {
  const source = readFileSync(path.join(projectRoot, 'src/scenes/ArchitectDesignStudioScene.tsx'), 'utf8')

  assert.match(source, /const selectedWindowStrategy = windowStrategies\.find/)
  assert.match(source, /<WestElevationCanvas selectedWindowStrategy=\{selectedWindowStrategy\}/)
  assert.match(source, /const target = \{ x: 61\.4, y: 22\.8, w: 12\.4, h: 12\.75 \}/)
  assert.match(source, /<clipPath id=\{clipId\}>/)
  assert.match(source, /<g clipPath=\{`url\(#\$\{clipId\}\)`\}>/)
  assert.match(source, /href=\{placedWindowHref\}/)
  assert.match(source, /width=\{target\.w\}/)
  assert.match(source, /height=\{target\.h\}/)
  assert.match(source, /preserveAspectRatio="none"/)
})

test('public image extensions match file signatures', () => {
  for (const file of publicImageFiles()) {
    const bytes = readFileSync(file).subarray(0, 12)
    const relative = path.relative(projectRoot, file)
    const expected = /\.(jpe?g)$/i.test(file) ? 'jpeg' : 'png'
    const actual = bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      ? 'png'
      : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        ? 'jpeg'
        : 'unknown'

    assert.equal(actual, expected, `${relative} has .${expected} extension but ${actual} file bytes`)
  }
})

test('rubric grades four student-produced tasks and excludes removed summary writing', () => {
  const rubric = readJson('src/data/rubric.json')
  const criteria = rubric.sections.flatMap((section) => section.criteria)
  const evidenceIds = criteria.flatMap((criterion) => criterion.evidenceSceneIds)
  const designCriterion = criteria.find((criterion) => criterion.name === 'Creating the design option')

  assert.deepEqual(criteria.map((criterion) => criterion.name), [
    'Choosing the first step',
    'Sorting drawing changes',
    'Choosing client questions',
    'Creating the design option',
  ])
  assert.ok(evidenceIds.includes('client_prep'))
  assert.equal(evidenceIds.includes('client_call'), false)
  assert.equal(evidenceIds.includes('review_verify_replies'), false)
  assert.match(designCriterion.rubric_text, /places the needed room labels/)
  assert.doesNotMatch(designCriterion.rubric_text, /short note|explains the design/i)
})
