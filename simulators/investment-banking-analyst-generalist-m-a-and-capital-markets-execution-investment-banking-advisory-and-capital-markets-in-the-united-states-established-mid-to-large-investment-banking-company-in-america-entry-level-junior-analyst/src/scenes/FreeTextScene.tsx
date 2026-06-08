import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import EmailCompose from '../components/ui/EmailCompose'
import LaptopFrame from '../components/ui/LaptopFrame'
import LongFormEditor from '../components/ui/LongFormEditor'
import SlackCompose from '../components/ui/SlackCompose'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevControls } from '../lib/devControls'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { FreeTextNode } from '../types/game'

interface Props { node: FreeTextNode }

type AuditFinding = {
  priority?: string
  issue?: string
  why_it_matters?: string
  next_action?: string
}

function parseAuditFindings(raw: string | undefined): AuditFinding[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function PriorAuditFindings({ findings }: { findings: AuditFinding[] }) {
  return (
    <div
      style={{
        border: '1px solid #000',
        backgroundColor: '#FFFDF7',
        boxShadow: '3px 3px 0 #000',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800, color: '#24483F' }}>
          Your Valuation Audit Log
        </h3>
        <p style={{ margin: 0, fontSize: '0.78rem', lineHeight: 1.55, color: '#555' }}>
          Use these findings as the source for Priya's Slack update. Keep the message shorter than the log.
        </p>
      </div>
      {findings.length > 0 ? (
        findings.map((finding, idx) => (
          <div
            key={idx}
            style={{
              borderTop: idx > 0 ? '1px solid #D6D0BE' : 'none',
              paddingTop: idx > 0 ? '0.75rem' : 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
              fontSize: '0.8rem',
              lineHeight: 1.5,
              color: '#222',
            }}
          >
            <strong style={{ fontSize: '0.8125rem' }}>Audit Finding #{idx + 1}</strong>
            {finding.priority && <div><strong>Priority:</strong> {finding.priority}</div>}
            {finding.issue && <div><strong>Issue:</strong> {finding.issue}</div>}
            {finding.why_it_matters && <div><strong>Why it matters:</strong> {finding.why_it_matters}</div>}
            {finding.next_action && <div><strong>Next action:</strong> {finding.next_action}</div>}
          </div>
        ))
      ) : (
        <p style={{ margin: 0, fontSize: '0.8rem', lineHeight: 1.55, color: '#555' }}>
          No audit findings are saved yet. Go back to the valuation audit and create the four review flags before writing Priya.
        </p>
      )}
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

  const value = responses[node.id] || ''
  const auditFindings = useMemo(() => parseAuditFindings(responses.model_audit), [responses.model_audit])
  const showPriorAudit = node.id === 'associate_update'
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const isSlackCompose = appWindow === 'slack'
  const isEmailCompose = appWindow === 'email'
  const emailHeaders = {
    from: interpolate(node.emailHeaders?.from || '{{playerName}}', { playerName, branchFlags, mcSelections }),
    to: interpolate(node.emailHeaders?.to || '', { playerName, branchFlags, mcSelections }),
    subject: interpolate(node.emailHeaders?.subject || node.windowTitle || node.title, { playerName, branchFlags, mcSelections }),
  }

  const submit = () => goNext(node)

  const editorContent = isSlackCompose ? (
    <>
      <SlackCompose
        channel={node.windowTitle || '#channel'}
        value={value}
        onChange={(v) => setFreeTextResponse(node.id, v)}
        placeholder={node.placeholder}
        maxWords={node.maxWords}
        minWords={node.minWords}
        onSend={submit}
        sendDisabled={!canSubmit}
        showChannelHeader={false}
      />
      {showDevControls && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <ActionButton text="Skip (dev)" onClick={submit} variant="secondary" fullWidth={false} />
        </div>
      )}
    </>
  ) : isEmailCompose ? (
    <>
      <EmailCompose
        from={emailHeaders.from}
        to={emailHeaders.to}
        subject={emailHeaders.subject}
        value={value}
        onChange={(v) => setFreeTextResponse(node.id, v)}
        placeholder={node.placeholder}
        minWords={node.minWords}
        maxWords={node.maxWords}
        onSend={submit}
        sendDisabled={!canSubmit}
      />
      {showDevControls && (
        <div style={{ padding: '0 1rem 1rem' }}>
          <ActionButton text="Skip (dev)" onClick={submit} variant="secondary" fullWidth={false} />
        </div>
      )}
    </>
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
          onClick={submit}
          disabled={!canSubmit}
          variant={canSubmit ? 'primary' : 'secondary'}
        />
        {showDevControls && (
          <ActionButton text="Skip (dev)" onClick={submit} variant="secondary" fullWidth={false} />
        )}
      </div>
    </>
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
          {interpolate(node.prompt, { playerName, branchFlags, mcSelections })}
        </div>

        {appWindow ? (
          <DesktopOverlay>
            <LaptopFrame variant={appWindow} title={node.windowTitle} fill scrollable contentPadding={isEmailCompose ? '0' : undefined}>
              {editorContent}
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
          {showPriorAudit && (
            <div style={{ marginBottom: '1rem' }}>
              <PriorAuditFindings findings={auditFindings} />
            </div>
          )}
          <BriefingDrawerContent node={briefing} />
        </ReferenceDrawer>
      )}
    </SceneWrapper>
  )
}
