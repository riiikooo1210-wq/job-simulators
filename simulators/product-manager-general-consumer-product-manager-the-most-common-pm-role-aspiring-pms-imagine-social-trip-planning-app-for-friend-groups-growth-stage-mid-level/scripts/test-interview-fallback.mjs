import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { build } from 'esbuild'

const projectRoot = process.cwd()
const tempDir = await mkdtemp(path.join(tmpdir(), 'nina-backup-'))
const entryFile = path.join(tempDir, 'entry.ts')
const outFile = path.join(tempDir, 'bundle.cjs')
const require = createRequire(import.meta.url)

const voiceSource = await readFile(new URL('../src/scenes/VoiceMeetingScene.tsx', import.meta.url), 'utf8')

assert.doesNotMatch(voiceSource, /Gemini API key not configured/, 'voice scene should not expose API-key setup text to students')
assert.doesNotMatch(voiceSource, /setTypedError\(error/, 'typed fallback should not print raw provider errors')
assert.match(voiceSource, /localNinaReply/, 'voice scene should use local Nina backup replies')
assert.match(voiceSource, /typedBackupNotice/, 'voice scene should show a student-safe backup notice')

await writeFile(
  entryFile,
  `
    import { localNinaReply, typedBackupNotice } from ${JSON.stringify(path.join(projectRoot, 'src/services/ninaInterviewBackup.ts'))}
    export const notice = typedBackupNotice
    export const savedPlaces = localNinaReply('How did saved places and voting work?', 2)
    export const budget = localNinaReply('What happened when budget came up?', 3)
    export const broad = localNinaReply('Tell me about the trip planning', 5)
  `,
)

try {
  await build({
    entryPoints: [entryFile],
    outfile: outFile,
    bundle: true,
    format: 'cjs',
    platform: 'node',
    absWorkingDir: projectRoot,
    logLevel: 'silent',
  })

  const { notice, savedPlaces, budget, broad } = require(outFile)

  assert.match(notice, /backup typed response/, 'notice should explain the fallback in student-safe language')
  assert.doesNotMatch(notice, /Gemini|API|quota|429|model/i, 'notice should not mention provider internals')
  assert.match(savedPlaces, /18 places/, 'saved-place backup should disclose 18 places')
  assert.match(savedPlaces, /3 of 7/, 'saved-place backup should disclose vote count')
  assert.match(budget, /Budget felt awkward/, 'budget backup should disclose budget pressure')
  assert.match(broad, /one small decision/, 'ordered fallback should eventually disclose the core need')
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
