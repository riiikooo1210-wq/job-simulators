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

interface ToolWorkspaceProps {
  node: FreeTextNode
  value: string
  onChange: (value: string) => void
  wordCount: number
  canSubmit: boolean
  onSubmit: () => void
  activeTabId: string
  onTabChange: (id: string) => void
}

type SourceTabVariant = 'doc' | 'code' | 'canvas'
type SpeedGraderWorkspaceTab = 'speedgrader' | 'support_doc'

interface SpeedGraderWorkspaceProps extends ToolWorkspaceProps {
  activeWorkspaceTab: SpeedGraderWorkspaceTab
}

function renderTextBlock(block: string) {
  const lines = block.split('\n').filter(Boolean)
  const isList = lines.every((line) => line.trim().startsWith('- '))

  if (isList) {
    return (
      <ul style={{ margin: 0, paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {lines.map((line, index) => (
          <li key={index}>{renderContentWithGlossary(line.replace(/^- /, ''))}</li>
        ))}
      </ul>
    )
  }

  return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{renderContentWithGlossary(block)}</p>
}

function SourceTabContent({ content, title, variant = 'doc' }: { content: string; title?: string; variant?: SourceTabVariant }) {
  const segments = content.split(/```[a-zA-Z0-9_-]*\n([\s\S]*?)```/g)
  const codeLike = variant === 'code'
  const surfaceColor = codeLike ? '#2A332F' : variant === 'canvas' ? '#FFFFFF' : '#F7F1E3'

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        backgroundColor: surfaceColor,
        color: codeLike ? '#EFE8D2' : '#1E1E1A',
        padding: codeLike ? '0.875rem' : 0,
      }}
    >
      {title && (
        <div
          style={{
            fontSize: codeLike ? '0.72rem' : '0.68rem',
            color: codeLike ? '#D8C99F' : '#3A6B5E',
            fontWeight: 850,
            textTransform: 'uppercase',
            letterSpacing: 0,
          }}
        >
          {title}
        </div>
      )}
      {segments.map((segment, index) => {
        if (!segment.trim()) return null
        const isCode = index % 2 === 1
        return isCode ? (
          <div
            key={index}
            style={{
              border: '1px solid #000',
              backgroundColor: '#222A27',
              boxShadow: '3px 3px 0 #000',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                borderBottom: '1px solid rgba(239,232,210,0.24)',
                backgroundColor: '#2F3A36',
                color: '#D8C99F',
                padding: '0.35rem 0.55rem',
                fontSize: '0.68rem',
                fontWeight: 800,
              }}
            >
              projected_warmup.py
            </div>
            <pre
              style={{
                margin: 0,
                padding: '0.75rem',
                color: '#EFE8D2',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.8125rem',
                lineHeight: 1.55,
                overflowX: 'auto',
                whiteSpace: 'pre',
              }}
            >
              {segment.trim()}
            </pre>
          </div>
        ) : (
          <div
            key={index}
            style={{
              border: codeLike ? '1px solid rgba(216,201,159,0.32)' : 'none',
              backgroundColor: codeLike ? 'rgba(247,241,227,0.06)' : 'transparent',
              padding: codeLike ? '0.65rem' : 0,
              color: codeLike ? '#EFE8D2' : '#1E1E1A',
              fontSize: '0.8125rem',
              lineHeight: 1.6,
            }}
          >
            {segment.trim().split(/\n{2,}/).map((block, blockIndex) => (
              <div key={blockIndex} style={{ marginTop: blockIndex === 0 ? 0 : '0.65rem' }}>
                {renderTextBlock(block.trim())}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function LessonPlanWorkspace({ node, value, onChange, wordCount, canSubmit, onSubmit, activeTabId, onTabChange }: ToolWorkspaceProps) {
  const tabs = node.appTabs || []
  const selectedTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0]
  const selectedVariant: SourceTabVariant = selectedTab?.id.includes('code') ? 'code' : 'doc'

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'grid',
        gridTemplateColumns: 'minmax(15rem, 0.86fr) minmax(0, 1.14fr)',
        backgroundColor: '#F7F1E3',
        color: '#1E1E1A',
      }}
    >
      <aside style={{ borderRight: '1px solid #CDBF94', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '0.75rem 0.875rem', borderBottom: '1px solid #CDBF94', backgroundColor: '#EFE8D2' }}>
          <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0 }}>
            Source Tabs
          </div>
          <div style={{ marginTop: '0.15rem', fontSize: '0.84rem', color: '#1E1E1A', fontWeight: 850 }}>
            Lab 4 evidence
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', padding: '0.625rem', borderBottom: '1px solid #CDBF94', flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <ToolTabButton key={tab.id} active={selectedTab?.id === tab.id} onClick={() => onTabChange(tab.id)}>
              {tab.label}
            </ToolTabButton>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: selectedVariant === 'code' ? 0 : '0.875rem', fontSize: '0.8125rem', lineHeight: 1.6 }}>
          {selectedTab && <SourceTabContent content={selectedTab.content} title={selectedTab.label} variant={selectedVariant} />}
        </div>
      </aside>

      <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#F7F1E3' }}>
        <div style={{ padding: '0.75rem 0.875rem', borderBottom: '1px solid #CDBF94', backgroundColor: '#EFE8D2' }}>
          <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0 }}>
            Notion Draft
          </div>
          <div style={{ marginTop: '0.15rem', fontSize: '0.84rem', fontWeight: 850 }}>{node.windowTitle || node.title}</div>
        </div>
        <div style={{ padding: '1rem 1.15rem 1.15rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1, minHeight: 0 }}>
          <div style={{ fontSize: '1.05rem', fontWeight: 900, lineHeight: 1.25 }}>First 15 minutes reset</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.45rem', color: '#6D624C', fontSize: '0.75rem', lineHeight: 1.45 }}>
            <div><strong style={{ color: '#3A6B5E' }}>1.</strong> Diagnostic prompt or code example</div>
            <div><strong style={{ color: '#3A6B5E' }}>2.</strong> Guided practice move</div>
            <div><strong style={{ color: '#3A6B5E' }}>3.</strong> Evidence for moving on</div>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={node.placeholder}
            rows={12}
            style={{
              flex: 1,
              minHeight: 220,
              border: '1px solid #CDBF94',
              backgroundColor: '#FFF9EB',
              color: '#1E1E1A',
              padding: '0.85rem',
              resize: 'none',
              outline: 'none',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.875rem',
              lineHeight: 1.65,
              borderRadius: 4,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#6f6a60' }}>
              {node.minWords ? `Min ${node.minWords}. ` : ''}
              {node.maxWords ? `Max ${node.maxWords}. ` : ''}
              {wordCount} word{wordCount === 1 ? '' : 's'}.
            </span>
            <div style={{ minWidth: 160 }}>
              <ActionButton text="Submit plan" onClick={onSubmit} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
            </div>
          </div>
          {import.meta.env.DEV && (
            <ActionButton text="Skip (dev)" onClick={onSubmit} variant="secondary" fullWidth={false} />
          )}
        </div>
      </section>
    </div>
  )
}

function ToolTabButton({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: '1px solid #CDBF94',
        backgroundColor: active ? '#3A6B5E' : '#F7F1E3',
        color: active ? '#F7F1E3' : '#1E1E1A',
        padding: '0.45rem 0.6rem',
        fontSize: '0.75rem',
        fontWeight: 700,
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left',
        cursor: 'pointer',
        borderRadius: 4,
      }}
    >
      {children}
    </button>
  )
}

type GradingStudentKey = 'maya' | 'luis'

const gradingStudentNames: Record<GradingStudentKey, string> = {
  maya: 'Maya R.',
  luis: 'Luis P.',
}

function getGradingStudentKey(tabId?: string): GradingStudentKey {
  return tabId === 'luis_submission' ? 'luis' : 'maya'
}

function parseGradingFeedback(value: string): Record<GradingStudentKey, string> {
  if (!value) return { maya: '', luis: '' }

  const mayaMatch = value.match(/(?:^|\n)\s*Maya\s*:\s*([\s\S]*?)(?=\n\s*Luis\s*:|$)/i)
  const luisMatch = value.match(/(?:^|\n)\s*Luis\s*:\s*([\s\S]*)/i)

  if (!mayaMatch && !luisMatch) {
    return { maya: value, luis: '' }
  }

  return {
    maya: mayaMatch?.[1] ?? '',
    luis: luisMatch?.[1] ?? '',
  }
}

function formatGradingFeedback(feedback: Record<GradingStudentKey, string>) {
  if (!feedback.maya && !feedback.luis) return ''
  return `Maya: ${feedback.maya}\n\nLuis: ${feedback.luis}`
}

function SpeedGraderWorkspace({ node, value, onChange, wordCount, canSubmit, onSubmit, activeTabId, onTabChange, activeWorkspaceTab }: SpeedGraderWorkspaceProps) {
  const tabs = node.appTabs || []
  const studentTabs = tabs.filter((tab) => tab.id === 'maya_submission' || tab.id === 'luis_submission')
  const supportTabs = tabs.filter((tab) => tab.id === 'beginner_hint' || tab.id === 'feedback_guide')
  const selectedStudentTab = studentTabs.find((tab) => tab.id === activeTabId) || studentTabs[0]
  const selectedStudentKey = getGradingStudentKey(selectedStudentTab?.id)
  const selectedStudentName = gradingStudentNames[selectedStudentKey]
  const feedback = parseGradingFeedback(value)
  const [activeSupportTabId, setActiveSupportTabId] = useState(supportTabs[0]?.id || '')
  const [postedStudents, setPostedStudents] = useState<Record<GradingStudentKey, boolean>>({ maya: false, luis: false })
  const [postStatus, setPostStatus] = useState('')
  const activeSupportTab = supportTabs.find((tab) => tab.id === activeSupportTabId) || supportTabs[0]
  const selectedComment = feedback[selectedStudentKey]
  const selectedHasComment = selectedComment.trim().length > 0
  const selectedIsPosted = postedStudents[selectedStudentKey]
  const overMax = !!node.maxWords && wordCount > node.maxWords

  const handleFeedbackChange = (nextComment: string) => {
    onChange(formatGradingFeedback({
      ...feedback,
      [selectedStudentKey]: nextComment,
    }))
    setPostStatus('')
    if (postedStudents[selectedStudentKey]) {
      setPostedStudents({
        ...postedStudents,
        [selectedStudentKey]: false,
      })
    }
  }

  const handlePost = () => {
    if (!selectedHasComment || selectedIsPosted || overMax) return

    const nextPosted = {
      ...postedStudents,
      [selectedStudentKey]: true,
    }
    const otherStudentKey: GradingStudentKey = selectedStudentKey === 'maya' ? 'luis' : 'maya'

    setPostedStudents(nextPosted)

    if (nextPosted.maya && nextPosted.luis) {
      if (canSubmit) {
        onSubmit()
      } else {
        const minText = node.minWords ? `at least ${node.minWords}` : 'more'
        setPostStatus(`Both comments are posted, but the combined feedback needs ${minText} words before you continue.`)
      }
      return
    }

    setPostStatus(`${selectedStudentName} posted. Click ${gradingStudentNames[otherStudentKey]} when ready.`)
  }

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#F7F1E3',
        color: '#1E1E1A',
        border: '1px solid #CDBF94',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
    >
      {activeWorkspaceTab === 'speedgrader' ? (
        <>
          <div style={{ padding: '0.75rem 0.875rem', borderBottom: '1px solid #CDBF94', backgroundColor: '#FBF7EA', flexShrink: 0 }}>
            <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 850, textTransform: 'uppercase', letterSpacing: 0 }}>
              Student
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
              {studentTabs.map((tab) => {
                const studentKey = getGradingStudentKey(tab.id)
                return (
                  <ToolTabButton key={tab.id} active={selectedStudentTab?.id === tab.id} onClick={() => onTabChange(tab.id)}>
                    {gradingStudentNames[studentKey]}
                  </ToolTabButton>
                )
              })}
            </div>
          </div>

          <div
            style={{
              flex: '0 0 auto',
              minHeight: '28rem',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.12fr) minmax(18rem, 0.88fr)',
            }}
          >
            <section style={{ borderRight: '1px solid #CDBF94', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '0.7rem 0.875rem', borderBottom: '1px solid #CDBF94', backgroundColor: '#F7F1E3', flexShrink: 0 }}>
                <div style={{ fontSize: '0.75rem', color: '#3A6B5E', fontWeight: 800 }}>SpeedGrader</div>
                <div style={{ fontSize: '0.8125rem', color: '#1E1E1A', fontWeight: 750 }}>
                  {selectedStudentName} - Lab 4 Loop Practice
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.875rem', fontSize: '0.8125rem', lineHeight: 1.6 }}>
                {selectedStudentTab && <SourceTabContent content={selectedStudentTab.content} />}
              </div>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ padding: '0.7rem 0.875rem', borderBottom: '1px solid #CDBF94', backgroundColor: '#F7F1E3', flexShrink: 0 }}>
                <div style={{ fontSize: '0.75rem', color: '#3A6B5E', fontWeight: 800 }}>Assignment Comments</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 750 }}>Feedback for {selectedStudentName}</div>
              </div>
              <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1, minHeight: 0 }}>
                <textarea
                  value={feedback[selectedStudentKey]}
                  onChange={(e) => handleFeedbackChange(e.target.value)}
                  placeholder={
                    selectedStudentKey === 'maya'
                      ? 'Tell Maya why the total is right here, clarify that range(1, 5) stops before 5, and give one tiny test to run next.'
                      : 'Tell Luis that the count update needs to be inside the if block, remove the unused passed flag, and give one tiny test to run next.'
                  }
                  rows={11}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    border: '1px solid #CDBF94',
                    backgroundColor: '#FBF7EA',
                    color: '#1E1E1A',
                    padding: '0.75rem',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    borderRadius: 4,
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#6f6a60' }}>
                  Combined feedback: {wordCount} word{wordCount === 1 ? '' : 's'}.
                  {node.minWords ? ` Min ${node.minWords}.` : ''}
                  {node.maxWords ? ` Max ${node.maxWords}.` : ''}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', fontSize: '0.72rem', color: '#6f6a60' }}>
                  {(['maya', 'luis'] as GradingStudentKey[]).map((studentKey) => (
                    <span
                      key={studentKey}
                      style={{
                        border: '1px solid #CDBF94',
                        background: postedStudents[studentKey] ? '#E8F0F1' : '#FBF7EA',
                        color: postedStudents[studentKey] ? '#315F57' : '#6f6a60',
                        borderRadius: 4,
                        padding: '0.25rem 0.4rem',
                        fontWeight: 750,
                      }}
                    >
                      {gradingStudentNames[studentKey]}: {postedStudents[studentKey] ? 'Posted' : 'Not posted'}
                    </span>
                  ))}
                </div>
                {postStatus && (
                  <div style={{ fontSize: '0.74rem', lineHeight: 1.4, color: postStatus.startsWith('Both comments') ? '#8A5B4E' : '#315F57' }}>
                    {postStatus}
                  </div>
                )}
                <ActionButton
                  text="Post"
                  onClick={handlePost}
                  disabled={!selectedHasComment || selectedIsPosted || overMax}
                  variant={selectedHasComment && !selectedIsPosted && !overMax ? 'primary' : 'secondary'}
                />
              </div>
            </section>
          </div>
        </>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#FBF7EA', color: '#1E1E1A' }}>
          <div style={{ display: 'flex', gap: '0.375rem', padding: '0.625rem', borderBottom: '1px solid #D8CFBE', background: '#FBF7EA', flexShrink: 0, flexWrap: 'wrap' }}>
            {supportTabs.map((tab) => (
              <ToolTabButton key={tab.id} active={activeSupportTab?.id === tab.id} onClick={() => setActiveSupportTabId(tab.id)}>
                {tab.label}
              </ToolTabButton>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '1rem' }}>
            {activeSupportTab && (
              <div
                style={{
                  border: '1px solid #CDBF94',
                  background: '#FFFFFF',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '0.75rem 0.875rem',
                    background: activeSupportTab.id === 'feedback_guide' ? '#E8F0F1' : '#F1E8D7',
                    borderBottom: '1px solid #CDBF94',
                    fontSize: '0.875rem',
                    fontWeight: 800,
                  }}
                >
                  {activeSupportTab.label}
                </div>
                <div style={{ padding: '0.875rem', fontSize: '0.875rem', lineHeight: 1.6, color: '#1E1E1A' }}>
                  <SourceTabContent content={activeSupportTab.content} variant="canvas" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CanvasAnnouncementWorkspace({ node, value, onChange, wordCount, canSubmit, onSubmit, activeTabId, onTabChange }: ToolWorkspaceProps) {
  const tabs = node.appTabs || []
  const selectedTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0]

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'grid',
        gridTemplateColumns: 'minmax(10rem, 0.72fr) minmax(0, 1.28fr)',
        backgroundColor: '#F7F1E3',
        color: '#1E1E1A',
      }}
    >
      <aside style={{ borderRight: '1px solid #CDBF94', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '0.75rem 0.875rem', borderBottom: '1px solid #CDBF94', backgroundColor: '#EFE8D2' }}>
          <div style={{ fontSize: '0.75rem', color: '#3A6B5E', fontWeight: 800 }}>CSC 101</div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Announcement sources</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', padding: '0.625rem', borderBottom: '1px solid #CDBF94' }}>
          {tabs.map((tab) => (
            <ToolTabButton key={tab.id} active={selectedTab?.id === tab.id} onClick={() => onTabChange(tab.id)}>
              {tab.label}
            </ToolTabButton>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0.875rem', fontSize: '0.8125rem', lineHeight: 1.6 }}>
          {selectedTab && <SourceTabContent content={selectedTab.content} />}
        </div>
      </aside>

      <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '0.75rem 0.875rem', borderBottom: '1px solid #CDBF94', backgroundColor: '#EFE8D2' }}>
          <div style={{ fontSize: '0.75rem', color: '#3A6B5E', fontWeight: 800 }}>Canvas Announcement</div>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{node.emailHeaders?.subject || node.windowTitle || node.title}</div>
        </div>
        <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '4rem 1fr', gap: '0.375rem 0.625rem', fontSize: '0.75rem', color: '#1E1E1A' }}>
            <span style={{ color: '#6f6a60', fontWeight: 700 }}>Post to</span>
            <span>{node.emailHeaders?.to || 'CSC 101'}</span>
            <span style={{ color: '#6f6a60', fontWeight: 700 }}>Title</span>
            <span>{node.emailHeaders?.subject || node.windowTitle || node.title}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', border: '1px solid #CDBF94', backgroundColor: '#EFE8D2', padding: '0.35rem', borderRadius: 4 }}>
            {['B', 'I', 'List', 'Link'].map((tool) => (
              <span key={tool} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3A6B5E', padding: '0.15rem 0.35rem' }}>{tool}</span>
            ))}
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={node.placeholder}
            rows={10}
            style={{
              flex: 1,
              minHeight: 180,
              border: '1px solid #CDBF94',
              backgroundColor: '#FBF7EA',
              color: '#1E1E1A',
              padding: '0.75rem',
              resize: 'none',
              outline: 'none',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              borderRadius: 4,
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#6f6a60' }}>
              {node.minWords ? `Min ${node.minWords}. ` : ''}
              {node.maxWords ? `Max ${node.maxWords}. ` : ''}
              {wordCount} word{wordCount === 1 ? '' : 's'}.
            </span>
            <div style={{ minWidth: 160 }}>
              <ActionButton text="Publish" onClick={onSubmit} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
            </div>
          </div>
        </div>
      </section>
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
  const [activeSpeedGraderTab, setActiveSpeedGraderTab] = useState<SpeedGraderWorkspaceTab>('speedgrader')

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const isEmailCompose = appWindow === 'email'
  const isSpeedGrader = node.id === 'grading_feedback'
  const isCanvasAnnouncement = node.id === 'lms_announcement'
  const isLessonPlan = node.id === 'lesson_plan'
  const appTabs = node.appTabs || []
  const titleTabs = appTabs.length > 0
    ? [...appTabs.map((tab) => ({ id: tab.id, label: tab.label })), { id: 'editor', label: node.windowTitle || node.title }]
    : undefined
  const speedGraderTitleTabs = [
    { id: 'speedgrader', label: 'SpeedGrader' },
    { id: 'support_doc', label: 'Support Doc' },
  ]
  const frameVariant = (isSpeedGrader || isCanvasAnnouncement ? 'doc' : appWindow) as LaptopFrameVariant | undefined

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
      activeAppTab === tab.id && (
        <div
          key={tab.id}
          style={{
            background: tab.id.includes('code') ? '#2A332F' : '#F7F1E3',
            border: tab.id.includes('code') ? 'none' : '1px solid #CDBF94',
            padding: tab.id.includes('code') ? 0 : '1rem',
            fontSize: '0.875rem',
            lineHeight: 1.65,
            color: tab.id.includes('code') ? '#EFE8D2' : '#1E1E1A',
            minHeight: '100%',
          }}
        >
          <SourceTabContent
            content={interpolate(tab.content, { playerName, branchFlags, mcSelections })}
            title={tab.label}
            variant={tab.id.includes('code') ? 'code' : 'doc'}
          />
        </div>
      )
    ))
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={!!appWindow}>
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
          <DesktopOverlay width={isSpeedGrader ? '79%' : undefined} height={isSpeedGrader ? '82%' : undefined}>
            <LaptopFrame
              variant={frameVariant}
              title={node.windowTitle}
              fill
              scrollable
              titleTabs={isSpeedGrader ? speedGraderTitleTabs : isCanvasAnnouncement || isLessonPlan ? undefined : titleTabs}
              activeTitleTabId={isSpeedGrader ? activeSpeedGraderTab : activeAppTab}
              onTitleTabChange={isSpeedGrader ? (id) => setActiveSpeedGraderTab(id === 'support_doc' ? 'support_doc' : 'speedgrader') : setActiveAppTab}
              hideMenuBar={isSpeedGrader}
            >
              {isSpeedGrader ? (
                <SpeedGraderWorkspace
                  node={node}
                  value={value}
                  onChange={(v) => setFreeTextResponse(node.id, v)}
                  wordCount={wordCount}
                  canSubmit={canSubmit}
                  onSubmit={() => goNext(node)}
                  activeTabId={activeAppTab}
                  onTabChange={setActiveAppTab}
                  activeWorkspaceTab={activeSpeedGraderTab}
                />
              ) : isCanvasAnnouncement ? (
                <CanvasAnnouncementWorkspace
                  node={node}
                  value={value}
                  onChange={(v) => setFreeTextResponse(node.id, v)}
                  wordCount={wordCount}
                  canSubmit={canSubmit}
                  onSubmit={() => goNext(node)}
                  activeTabId={activeAppTab}
                  onTabChange={setActiveAppTab}
                />
              ) : isLessonPlan ? (
                <LessonPlanWorkspace
                  node={node}
                  value={value}
                  onChange={(v) => setFreeTextResponse(node.id, v)}
                  wordCount={wordCount}
                  canSubmit={canSubmit}
                  onSubmit={() => goNext(node)}
                  activeTabId={activeAppTab}
                  onTabChange={setActiveAppTab}
                />
              ) : (
                appTabs.length > 0 ? tabbedWindowContent : editorContent
              )}
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
