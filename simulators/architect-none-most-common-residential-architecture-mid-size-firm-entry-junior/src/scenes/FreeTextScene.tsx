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
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { FreeTextNode } from '../types/game'

interface Props { node: FreeTextNode }

type AppTab = NonNullable<FreeTextNode['appTabs']>[number]
type FreeTextContext = {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
}

function RedlinePdfTab() {
  const comments = [
    {
      ref: 'A101',
      title: 'Rear yard dimension',
      body: 'Rear addition reads 24 ft 8 in; R-2 zoning note says rear setback minimum is 25 ft.',
      status: 'Verify before editing',
    },
    {
      ref: 'A101 / A201',
      title: 'Kitchen window tag',
      body: 'Plan marks W-12, elevation marks W-10. Coordinate schedule before updating either sheet.',
      status: 'Coordinate tags',
    },
    {
      ref: 'A201',
      title: 'West bedroom privacy',
      body: 'Second-floor west-facing bedroom window needs client preference before finalizing.',
      status: 'Ask client',
    },
    {
      ref: 'A401',
      title: 'Foundation detail',
      body: 'Detail is still generic where the addition ties into the existing basement condition.',
      status: 'Escalate detail',
    },
    {
      ref: 'Survey',
      title: 'Existing conditions',
      body: 'Basement window and utility meter sit near the proposed foundation line; do not remove until field condition is confirmed.',
      status: 'Field verify',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(11rem, 14rem) 1fr', gap: '0.85rem', minHeight: '100%' }}>
      <aside style={{ border: '1px solid #CDBF94', background: '#EFE8D2', minWidth: 0 }}>
        <div style={{ padding: '0.55rem 0.65rem', borderBottom: '1px solid #CDBF94', fontSize: '0.72rem', fontWeight: 800, color: '#3F605C' }}>
          Review Comments
        </div>
        {comments.map((comment) => (
          <div key={`${comment.ref}-${comment.title}`} style={{ padding: '0.65rem', borderBottom: '1px solid #D7CDBA', background: '#F7F1E3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'baseline' }}>
              <strong style={{ fontSize: '0.72rem', lineHeight: 1.2 }}>{comment.title}</strong>
              <span style={{ fontSize: '0.62rem', color: '#6f6758', whiteSpace: 'nowrap' }}>{comment.ref}</span>
            </div>
            <div style={{ fontSize: '0.66rem', color: '#8A4A32', fontWeight: 800, marginTop: '0.25rem' }}>{comment.status}</div>
          </div>
        ))}
      </aside>

      <section style={{ border: '1px solid #CDBF94', background: '#FBF7EA', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.55rem 0.75rem', borderBottom: '1px solid #CDBF94', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <strong style={{ fontSize: '0.8rem' }}>A101 Proposed Plan - Maya redlines.pdf</strong>
          <span style={{ fontSize: '0.68rem', color: '#6f6758' }}>Sheet markup view</span>
        </div>
        <div style={{ padding: '0.85rem', display: 'grid', gridTemplateRows: 'auto 1fr', gap: '0.75rem' }}>
          <div style={{ border: '1px solid #000', background: '#F7F1E3', padding: '0.75rem', boxShadow: '3px 3px 0 rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: '0.68rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase' }}>Marked plan note</div>
            <div style={{ marginTop: '0.35rem', fontSize: '0.9rem', fontWeight: 800 }}>Rear Addition Setback</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginTop: '0.65rem' }}>
              <div style={{ borderLeft: '3px solid #B87D6B', paddingLeft: '0.55rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#6f6758' }}>Drawing dimension</div>
                <strong>24 ft 8 in</strong>
              </div>
              <div style={{ borderLeft: '3px solid #3A6B5E', paddingLeft: '0.55rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#6f6758' }}>R-2 rear setback min.</div>
                <strong>25 ft</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.55rem' }}>
            {comments.map((comment) => (
              <div key={comment.title} style={{ borderLeft: '3px solid #B87D6B', background: '#F2EBD9', padding: '0.55rem 0.65rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <strong style={{ fontSize: '0.75rem' }}>{comment.ref}: {comment.title}</strong>
                  <span style={{ fontSize: '0.65rem', color: '#8A4A32', fontWeight: 800 }}>{comment.status}</span>
                </div>
                <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', lineHeight: 1.5 }}>{comment.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function ProjectFolderTab() {
  const files = [
    {
      name: 'A101 Proposed Plan - Maya redlines.pdf',
      type: 'PDF',
      updated: 'Today 8:48 AM',
      signal: 'Rear yard reads 24 ft 8 in; zoning minimum is 25 ft.',
    },
    {
      name: 'A201 Elevations - privacy note.pdf',
      type: 'PDF',
      updated: 'Today 8:51 AM',
      signal: 'West-facing bedroom window needs client preference before finalizing.',
    },
    {
      name: 'Site Survey - existing conditions.pdf',
      type: 'PDF',
      updated: 'Yesterday 4:12 PM',
      signal: 'Maple tree to preserve; basement window and utility meter near foundation line.',
    },
    {
      name: 'R-2 Zoning Notes.txt',
      type: 'TXT',
      updated: 'Yesterday 2:30 PM',
      signal: 'Rear setback 25 ft min; side setback 5 ft min; max lot coverage 45%.',
    },
    {
      name: 'Permit Readiness Open Items.xlsx',
      type: 'XLSX',
      updated: 'Today 9:02 AM',
      signal: 'Lot coverage is 46% before deck revision; A401 and door/window schedule still open.',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(15rem, 18rem) 1fr', gap: '0.85rem', minHeight: '100%' }}>
      <section style={{ border: '1px solid #CDBF94', background: '#EFE8D2', minWidth: 0 }}>
        <div style={{ padding: '0.55rem 0.65rem', borderBottom: '1px solid #CDBF94' }}>
          <div style={{ fontSize: '0.68rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase' }}>Project folder</div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, marginTop: '0.2rem' }}>/Projects/Maple_Street_Addition</div>
        </div>
        {files.map((file, index) => (
          <div key={file.name} style={{ display: 'grid', gridTemplateColumns: '2.4rem 1fr', gap: '0.55rem', padding: '0.6rem 0.65rem', borderBottom: '1px solid #D7CDBA', background: index === 0 ? '#DCE6D2' : '#F7F1E3' }}>
            <div style={{ border: '1px solid #000', background: file.type === 'XLSX' ? '#DCE6D2' : '#F2EBD9', height: '2.2rem', display: 'grid', placeItems: 'center', fontSize: '0.62rem', fontWeight: 800 }}>
              {file.type}
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: '0.72rem', lineHeight: 1.25 }}>{file.name}</strong>
              <span style={{ display: 'block', fontSize: '0.62rem', color: '#6f6758', marginTop: '0.15rem' }}>{file.updated}</span>
            </div>
          </div>
        ))}
      </section>

      <section style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.85rem', minWidth: 0 }}>
        <div style={{ fontSize: '0.68rem', color: '#3F605C', fontWeight: 800, textTransform: 'uppercase' }}>Selected file notes</div>
        <h3 style={{ margin: '0.25rem 0 0.75rem', fontSize: '1rem' }}>What matters for the pickup note</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {files.map((file) => (
            <div key={file.name} style={{ borderLeft: '3px solid #3A6B5E', background: '#F2EBD9', padding: '0.55rem 0.65rem' }}>
              <strong style={{ display: 'block', fontSize: '0.75rem', lineHeight: 1.25 }}>{file.name}</strong>
              <span style={{ display: 'block', fontSize: '0.78rem', lineHeight: 1.5, marginTop: '0.25rem' }}>{file.signal}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function renderAppTabContent(tab: AppTab, ctx: FreeTextContext) {
  if (tab.id === 'redlines') return <RedlinePdfTab />
  if (tab.id === 'shared_folder') return <ProjectFolderTab />

  return (
    <div
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
      {renderContentWithGlossary(interpolate(tab.content, ctx))}
    </div>
  )
}

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

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const isEmailCompose = appWindow === 'email'
  const appTabs = node.appTabs || []
  const titleTabs = appTabs.length > 0
    ? [{ id: 'editor', label: node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined

  const emailHeaders = {
    from: interpolate(node.emailHeaders?.from || '{{playerName}}', { playerName, branchFlags, mcSelections }),
    to: interpolate(node.emailHeaders?.to || '', { playerName, branchFlags, mcSelections }),
    subject: interpolate(node.emailHeaders?.subject || node.windowTitle || node.title, { playerName, branchFlags, mcSelections }),
  }

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

  const tabbedWindowContent = activeAppTab === 'editor' ? (
    editorContent
  ) : (
    appTabs.map((tab) => (
      activeAppTab === tab.id && <div key={tab.id}>{renderAppTabContent(tab, { playerName, branchFlags, mcSelections })}</div>
    ))
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
            backgroundColor: '#F7F1E3',
            border: '1px solid #CDBF94',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1E1E1A',
          }}
        >
          {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
        </div>

        {appWindow ? (
          <DesktopOverlay>
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
