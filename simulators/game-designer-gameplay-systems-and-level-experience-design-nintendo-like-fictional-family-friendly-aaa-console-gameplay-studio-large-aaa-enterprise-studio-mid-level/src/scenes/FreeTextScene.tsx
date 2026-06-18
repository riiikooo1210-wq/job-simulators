import { useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame, {
  hasWorkSurfaceVisual,
  mergeWorkSurfaceTabs,
  resolveWorkSurfaceVariant,
} from '../components/layout/WorkSurfaceFrame'
import ActionButton from '../components/ui/ActionButton'
import EmailCompose from '../components/ui/EmailCompose'
import LongFormEditor from '../components/ui/LongFormEditor'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
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
  const [activeAppTab, setActiveAppTab] = useState('editor')
  const interpolationContext = { playerName, branchFlags, mcSelections, freeTextResponses: responses }

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = resolveWorkSurfaceVariant(node, 'notion') as LaptopFrameVariant
  const isEmailCompose = appWindow === 'email'
  const appTabs = mergeWorkSurfaceTabs(node, node.appTabs || [])
  const titleTabs = appTabs.length > 0
    ? [{ id: 'editor', label: node.workSurface?.title || node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined

  const emailHeaders = {
    from: interpolate(node.emailHeaders?.from || '{{playerName}}', interpolationContext),
    to: interpolate(node.emailHeaders?.to || '', interpolationContext),
    subject: interpolate(node.emailHeaders?.subject || node.windowTitle || node.title, interpolationContext),
  }

  const editorContent = isEmailCompose ? (
    <EmailCompose
      value={value}
      onChange={(v) => setFreeTextResponse(node.id, v)}
      placeholder={node.placeholder}
      minWords={node.minWords}
      maxWords={node.maxWords}
      from={emailHeaders.from}
      to={emailHeaders.to}
      subject={emailHeaders.subject}
      onSend={() => goNext(node)}
      sendDisabled={!canSubmit}
    />
  ) : (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', minHeight: '100%' }}>
        <div
          style={{
            border: '1px solid #CDBF94',
            background: '#FBF7EA',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase' }}>
            {node.workSurface?.kind ? node.workSurface.kind.replace(/_/g, ' ') : 'Work draft'}
          </div>
          <LongFormEditor
            value={value}
            onChange={(v) => setFreeTextResponse(node.id, v)}
            placeholder={node.placeholder}
            maxWords={node.maxWords}
            minRows={8}
          />
          <div style={{ fontSize: '0.75rem', color: '#666' }}>
            {node.minWords ? `Min ${node.minWords} words. ` : ''}
            {node.maxWords ? `Max ${node.maxWords} words. ` : ''}
            Currently {wordCount} word{wordCount === 1 ? '' : 's'}.
          </div>
        </div>
        <ActionButton
          text="Submit"
          onClick={() => goNext(node)}
          disabled={!canSubmit}
          variant={canSubmit ? 'primary' : 'secondary'}
        />
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
      </div>
    </>
  )

  const tabbedWindowContent = activeAppTab === 'editor' ? (
    editorContent
  ) : (
    appTabs.map((tab) => (
      activeAppTab === tab.id && (
        <div
          key={tab.id}
          style={{
            background: '#F7F1E3',
            border: '1px solid #CDBF94',
            padding: '1rem',
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: '#1E1E1A',
            whiteSpace: 'pre-wrap',
            minHeight: '100%',
          }}
        >
          {renderContentWithGlossary(interpolate(tab.content, interpolationContext))}
        </div>
      )
    ))
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={hasWorkSurfaceVisual(node)}>
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
            {renderContentWithGlossary(interpolate(node.content, interpolationContext))}
          </div>
        )}
        <div
          style={{
            backgroundColor: '#F7F1E3',
            border: '1px solid #CDBF94',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1E1E1A',
          }}
        >
          {renderContentWithGlossary(interpolate(node.prompt, interpolationContext))}
        </div>

        <WorkSurfaceFrame
          node={node}
          variant={appWindow}
          title={node.workSurface?.title || node.windowTitle}
          titleTabs={titleTabs}
          activeTitleTabId={activeAppTab}
          onTitleTabChange={setActiveAppTab}
        >
          {appTabs.length > 0 ? tabbedWindowContent : editorContent}
        </WorkSurfaceFrame>
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
