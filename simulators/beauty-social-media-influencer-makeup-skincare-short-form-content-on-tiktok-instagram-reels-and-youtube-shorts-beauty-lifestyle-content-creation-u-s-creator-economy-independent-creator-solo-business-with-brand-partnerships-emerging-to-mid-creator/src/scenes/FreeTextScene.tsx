import { useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import EmailCompose from '../components/ui/EmailCompose'
import LaptopFrame from '../components/ui/LaptopFrame'
import LongFormEditor from '../components/ui/LongFormEditor'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevTools } from '../lib/devTools'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { FreeTextNode } from '../types/game'

interface Props { node: FreeTextNode }

export default function FreeTextScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const emailHeaders = node.emailHeaders
  const emailFrom = emailHeaders ? interpolate(emailHeaders.from, { playerName, branchFlags, mcSelections }) : ''
  const emailTo = emailHeaders ? interpolate(emailHeaders.to, { playerName, branchFlags, mcSelections }) : ''
  const emailSubject = emailHeaders ? interpolate(emailHeaders.subject, { playerName, branchFlags, mcSelections }) : ''

  const submit = () => goNext(node)

  const editorContent = (
    <>
      {emailHeaders ? (
        <EmailCompose
          from={emailFrom}
          to={emailTo}
          subject={emailSubject}
          value={value}
          onChange={(v) => setFreeTextResponse(node.id, v)}
          placeholder={node.placeholder}
          minWords={node.minWords}
          maxWords={node.maxWords}
          onSend={submit}
          sendDisabled={!canSubmit}
          compact={node.id === 'scene_04_counteroffer'}
        />
      ) : (
        <LongFormEditor
          value={value}
          onChange={(v) => setFreeTextResponse(node.id, v)}
          placeholder={node.placeholder}
          maxWords={node.maxWords}
          minRows={6}
        />
      )}
      {!emailHeaders && (
        <div style={{ fontSize: '0.75rem', color: appWindow ? '#555' : '#666', padding: appWindow ? '0.5rem 1rem' : '0' }}>
          {node.minWords ? `Min ${node.minWords} words. ` : ''}
          {node.maxWords ? `Max ${node.maxWords} words. ` : ''}
          Currently {wordCount} word{wordCount === 1 ? '' : 's'}.
        </div>
      )}
    </>
  )

  const submitControls = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <ActionButton
        text="Submit"
        onClick={submit}
        disabled={!canSubmit}
        variant={canSubmit ? 'primary' : 'secondary'}
      />
      {showDevTools && (
        <ActionButton text="Skip (dev)" onClick={submit} variant="secondary" fullWidth={false} />
      )}
    </div>
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={Boolean(appWindow && node.illustration)}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
        <div
          style={{
            backgroundColor: '#fff',
            border: '1px solid #000',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          {interpolate(node.prompt, { playerName, branchFlags, mcSelections })}
        </div>

        {appWindow ? (
          <DesktopOverlay
            width="70%"
            height={node.id === 'scene_04_counteroffer' ? '88%' : '74%'}
          >
            <LaptopFrame
              variant={appWindow}
              title={node.windowTitle}
              fill
              scrollable
              contentPadding={node.id === 'scene_04_counteroffer' ? '0.35rem' : undefined}
              contentFlex={node.id === 'scene_04_counteroffer'}
            >
              {editorContent}
            </LaptopFrame>
          </DesktopOverlay>
        ) : (
          <>
            {editorContent}
          </>
        )}
        {node.id !== 'scene_04_counteroffer' && submitControls}
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
