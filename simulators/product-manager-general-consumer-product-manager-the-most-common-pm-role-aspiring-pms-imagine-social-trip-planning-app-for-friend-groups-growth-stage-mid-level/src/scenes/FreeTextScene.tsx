import { useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import WorkSurfaceFrame, {
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
import { organizeSourceTabs, renderSourceTab } from './sourceTabs'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { FreeTextNode } from '../types/game'

interface Props { node: FreeTextNode }

const productPlanParts = [
  'Problem',
  'Who it helps',
  'My idea',
  'Why it should work',
]

const researchQuestionSlots = [
  'Recent trip moment',
  'Group decision',
  'Dates or budget',
  'Outside workaround',
  'AI plan reaction',
]

export default function FreeTextScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const npcConversations = useGameStore((s) => s.npcConversations) || {}
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const [activeAppTab, setActiveAppTab] = useState('editor')
  const isGuidedPrd = node.presentation === 'guided_prd_slice'
  const isResearchPrep = node.id === 'scene_03_research_prep'

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax
  const wordStatusText = !meetsMin && node.minWords
    ? `${node.minWords - wordCount} more words to submit`
    : !underMax && node.maxWords
      ? `${wordCount - node.maxWords} words too long`
      : 'Ready to submit'

  const appWindow = resolveWorkSurfaceVariant(node, 'notion') as LaptopFrameVariant
  const isEmailCompose = appWindow === 'email'
  const sourceTabContext = { playerName, branchFlags, mcSelections, freeTextResponses: responses, npcConversations }
  const appTabs = organizeSourceTabs(mergeWorkSurfaceTabs(node, node.appTabs || []))
  const titleTabs = !isGuidedPrd && !isResearchPrep && appTabs.length > 0
    ? [{ id: 'editor', label: node.workSurface?.title || node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined
  const profileTab = appTabs.find((tab) => tab.id === 'profile')
  const guardrailsTab = appTabs.find((tab) => tab.id === 'research_guardrails')
  const appAuditNotesTab = appTabs.find((tab) => tab.id === 'app_audit_notes' || tab.id === 'app_audit_evidence')

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

  const guidedPrdContent = (
    <div className="prd-plan-workspace" data-testid="guided-prd-workspace">
      <div className="prd-plan-toolbar" data-testid="prd-plan-toolbar">
        <div>
          <div className="prd-plan-app-name">Roamly Docs</div>
          <div className="prd-plan-file-name">{node.windowTitle || node.title}</div>
        </div>
        <div className="prd-plan-toolbar-actions" aria-hidden="true">
          <span>Saved</span>
          <span>Comment</span>
          <span>Share</span>
          <span>Aa</span>
        </div>
      </div>

      <div className="prd-plan-layout">
        <aside className="prd-plan-evidence" data-testid="prd-evidence-rail" aria-label="Quick evidence">
          <div className="prd-plan-panel-heading">Evidence Rail</div>
          {appTabs.map((tab) => (
            <section className="prd-plan-evidence-card" key={tab.id}>
              <div className="prd-plan-evidence-source">Source</div>
              <h2>{tab.label}</h2>
              <div className="prd-plan-evidence-card-body">
                {renderSourceTab(tab, sourceTabContext)}
              </div>
            </section>
          ))}
        </aside>

        <main className="prd-plan-document" data-testid="guided-prd-editor-panel">
          <div className="prd-plan-page">
            <div className="prd-plan-doc-header">
              <div>
                <div className="prd-plan-doc-kicker">Roamly product workspace</div>
                <h2>One small next improvement</h2>
              </div>
              <div className="prd-plan-doc-status">Owner: {playerName || 'Student'} · Draft</div>
            </div>
            <div className="prd-plan-page-meta">
              <span>Product plan</span>
              <span>{wordCount} / {node.maxWords || 260} words</span>
            </div>
            <div className="prd-plan-section-strip" aria-label="Product plan sections">
              {productPlanParts.map((part) => (
                <span key={part}>{part}</span>
              ))}
            </div>
            <textarea
              className="prd-plan-textarea"
              data-testid="guided-prd-editor"
              aria-label="Write your product plan"
              value={value}
              onChange={(event) => setFreeTextResponse(node.id, event.target.value)}
              placeholder={node.placeholder}
            />
          </div>
        </main>

        <aside className="prd-plan-guide" data-testid="prd-plan-guide" aria-label="Product plan guide">
          <div className="prd-plan-panel-heading">Four Short Parts</div>
          <ol>
            {productPlanParts.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ol>
          <p>Use one or two sentences for each part.</p>
          <div className="prd-plan-submit-area">
            <div className={canSubmit ? 'prd-plan-word-status is-ready' : 'prd-plan-word-status'}>
              {wordStatusText}
            </div>
            <ActionButton
              text="Submit"
              onClick={() => goNext(node)}
              disabled={!canSubmit}
              variant={canSubmit ? 'primary' : 'secondary'}
            />
            <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
          </div>
        </aside>
      </div>
    </div>
  )

  const researchPrepContent = (
    <div className="research-prep-workspace" data-testid="research-prep-workspace">
      <header className="research-prep-toolbar">
        <div>
          <div className="research-prep-app-name">Roamly Research Hub</div>
          <div className="research-prep-file-name">{node.windowTitle || node.title}</div>
        </div>
        <div className="research-prep-toolbar-meta" aria-label="Research prep status">
          <span>Prep doc</span>
          <span>{wordCount} / {node.maxWords || 220} words</span>
          <span>{canSubmit ? 'Ready' : 'Drafting'}</span>
        </div>
      </header>

      <div className="research-prep-layout">
        <aside className="research-prep-context" aria-label="Research context">
          <section className="research-prep-panel" data-testid="research-prep-profile-card">
            <div className="research-prep-panel-heading">Participant Profile</div>
            <div className="research-prep-panel-body">
              {profileTab ? renderSourceTab(profileTab, sourceTabContext) : 'Nina Brooks is the target customer for this call.'}
            </div>
          </section>
          <section className="research-prep-panel research-prep-saved-notes" data-testid="research-prep-saved-audit-notes">
            <div className="research-prep-panel-heading">Your App Audit Notes</div>
            <div className="research-prep-panel-body">
              {appAuditNotesTab ? renderSourceTab(appAuditNotesTab, sourceTabContext) : 'No audit notes are available yet.'}
            </div>
          </section>
        </aside>

        <main className="research-prep-editor" data-testid="research-prep-editor-panel">
          <div className="research-prep-doc-header">
            <div>
              <div className="research-prep-doc-kicker">Interview guide</div>
              <h2>Five questions for Nina</h2>
            </div>
            <div className="research-prep-doc-status">Do not pitch a solution</div>
          </div>
          <div className="research-prep-question-list" aria-label="Question focus areas">
            {researchQuestionSlots.map((slot, index) => (
              <div className="research-prep-question-row" key={slot}>
                <span>{index + 1}</span>
                <strong>{slot}</strong>
              </div>
            ))}
          </div>
          <textarea
            className="research-prep-textarea"
            data-testid="research-prep-editor"
            aria-label="Write exactly five user interview questions and one learning goal"
            value={value}
            onChange={(event) => setFreeTextResponse(node.id, event.target.value)}
            placeholder={node.placeholder}
          />
        </main>

        <aside className="research-prep-guardrails" aria-label="Research guardrails">
          <section className="research-prep-panel">
            <div className="research-prep-panel-heading">Research Guardrails</div>
            <div className="research-prep-panel-body">
              {guardrailsTab ? renderSourceTab(guardrailsTab, sourceTabContext) : 'Ask about what happened. Avoid leading Nina toward a feature.'}
            </div>
          </section>
          <section className="research-prep-submit-card">
            <div className={canSubmit ? 'research-prep-word-status is-ready' : 'research-prep-word-status'}>
              {wordStatusText}
            </div>
            <ActionButton
              text="Submit"
              onClick={() => goNext(node)}
              disabled={!canSubmit}
              variant={canSubmit ? 'primary' : 'secondary'}
            />
            <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
          </section>
        </aside>
      </div>
    </div>
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
          {renderSourceTab(tab, sourceTabContext)}
        </div>
      )
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

        <WorkSurfaceFrame
          node={node}
          variant={appWindow}
          title={node.workSurface?.title || node.windowTitle}
          titleTabs={titleTabs}
          activeTitleTabId={activeAppTab}
          onTitleTabChange={setActiveAppTab}
        >
          {isGuidedPrd ? guidedPrdContent : isResearchPrep ? researchPrepContent : appTabs.length > 0 ? tabbedWindowContent : editorContent}
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
