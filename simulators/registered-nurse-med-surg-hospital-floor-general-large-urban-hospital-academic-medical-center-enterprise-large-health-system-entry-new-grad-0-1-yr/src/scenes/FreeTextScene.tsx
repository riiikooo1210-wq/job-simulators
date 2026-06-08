import { useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import EmailCompose from '../components/ui/EmailCompose'
import LaptopFrame from '../components/ui/LaptopFrame'
import LongFormEditor from '../components/ui/LongFormEditor'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import SecureChatCompose from '../components/ui/SecureChatCompose'
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
  const [secureChatSent, setSecureChatSent] = useState(false)

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const isEmailCompose = appWindow === 'email'
  const isSecureChatCompose = appWindow === 'slack'
  const appTabs = node.appTabs || []
  const titleTabs = appTabs.length > 0
    ? [{ id: 'editor', label: node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined

  const emailHeaders = {
    from: interpolate(node.emailHeaders?.from || '{{playerName}} · Registered Nurse', { playerName, branchFlags, mcSelections }),
    to: interpolate(node.emailHeaders?.to || '', { playerName, branchFlags, mcSelections }),
    subject: interpolate(node.emailHeaders?.subject || node.windowTitle || node.title, { playerName, branchFlags, mcSelections }),
  }

  const secureChatCanSend = canSubmit && value.trim().length > 0
  const playerDisplayName = playerName.trim() || 'You'
  const playerInitial = (playerDisplayName[0] || 'Y').toUpperCase()

  const editorContent = isEmailCompose ? (
    <EmailCompose
      value={value}
      onChange={(v) => setFreeTextResponse(node.id, v)}
      placeholder={node.placeholder}
      maxWords={node.maxWords}
      from={emailHeaders.from}
      to={emailHeaders.to}
      subject={emailHeaders.subject}
      onSend={() => goNext(node)}
      sendDisabled={!canSubmit}
    />
  ) : isSecureChatCompose ? (
    <SecureChatCompose
      value={value}
      onChange={(v) => setFreeTextResponse(node.id, v)}
      placeholder={node.placeholder}
      minWords={node.minWords}
      maxWords={node.maxWords}
      wordCount={wordCount}
      senderName={playerDisplayName}
      senderInitial={playerInitial}
      sent={secureChatSent}
      sendDisabled={!secureChatCanSend}
      onSend={() => setSecureChatSent(true)}
      onContinue={() => goNext(node)}
    />
  ) : (
    <>
      <LongFormEditor
        value={value}
        onChange={(v) => setFreeTextResponse(node.id, v)}
        placeholder={node.placeholder}
        maxWords={node.maxWords}
        minRows={6}
      />
      <div style={{ fontSize: '0.75rem', color: appWindow ? '#888' : '#666', padding: appWindow ? '0.5rem 1rem' : '0' }}>
        {node.minWords ? `Min ${node.minWords} words. ` : ''}
        {node.maxWords ? `Max ${node.maxWords} words. ` : ''}
        Currently {wordCount} word{wordCount === 1 ? '' : 's'}.
      </div>
      <div style={{ padding: appWindow ? '0 1rem 1rem' : '0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <ActionButton
          text="Submit"
          onClick={() => goNext(node)}
          disabled={!canSubmit}
          variant={canSubmit ? 'primary' : 'secondary'}
        />
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
        )}
      </div>
    </>
  )

  const tabbedWindowContent = (
    activeAppTab === 'editor' ? (
      editorContent
    ) : (
      appTabs.map((tab) => (
        activeAppTab === tab.id && (
          <div
            key={tab.id}
            style={{
              background: '#fff',
              border: '1px solid #e4dfd3',
              padding: '1rem',
              fontSize: '0.875rem',
              lineHeight: 1.65,
              color: '#242424',
              whiteSpace: 'pre-wrap',
            }}
          >
            {renderContentWithGlossary(interpolate(tab.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )
      ))
    )
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
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
          {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
        </div>

        {appWindow ? (
          <DesktopOverlay
            width={isSecureChatCompose ? '64%' : '75%'}
            height={isSecureChatCompose ? '78%' : '80%'}
          >
            <LaptopFrame
              variant={appWindow}
              title={node.windowTitle}
              fill
              scrollable
              titleTabs={titleTabs}
              activeTitleTabId={activeAppTab}
              onTitleTabChange={setActiveAppTab}
            >
              {appTabs.length > 0 ? tabbedWindowContent : editorContent}
            </LaptopFrame>
          </DesktopOverlay>
        ) : (
          <>
            {editorContent}
          </>
        )}
      </motion.div>
      {briefing && (
        <ReferenceDrawer isOpen={refOpen} onClose={() => setRefOpen(false)} title={briefing.title}>
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
