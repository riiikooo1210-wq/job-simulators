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
import { getSlackAvatarColor, getSlackInitials } from '../components/ui/SlackMessageEnhanced'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import { npcs } from '../data/npcs'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { ChatMessage, FreeTextNode } from '../types/game'

interface Props { node: FreeTextNode }

type AppTab = NonNullable<FreeTextNode['appTabs']>[number]
type AppTabResponseSource = NonNullable<AppTab['responseSources']>[number]
type CmsRequirement = NonNullable<FreeTextNode['cmsRequirements']>[number]
type CmsSourceTabId = 'results' | 'notes' | 'rules'

const cmsSourceTabs: { id: CmsSourceTabId; label: string }[] = [
  { id: 'results', label: 'Results' },
  { id: 'notes', label: 'Player Notes' },
  { id: 'rules', label: 'Safe Rules' },
]

interface SourceSection {
  title?: string
  content: string
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function cmsSourceElementId(key: string) {
  return `cms-source-${key.replace(/[^a-z0-9_-]/gi, '-')}`
}

function readTextField(item: Record<string, unknown>, key: string) {
  const value = item[key]
  return typeof value === 'string' ? value.trim() : ''
}

function possessionCategoryLabel(categoryId: string) {
  const labels: Record<string, string> = {
    confirmed_fact: 'Fact I can use',
    ask_reed: 'Ask Reed',
    ask_coach: 'Ask Coach',
    scene_color: 'Scene detail',
    hold_verify: 'Hold/check later',
  }
  return labels[categoryId] || ''
}

const structuredPlanLabels: Record<string, Record<string, string>> = {
  'Coach availability question': {
    need: 'Topic',
    question: 'Question for Coach Harris',
    risk: 'Why it matters',
  },
  'Reed postgame question': {
    need: 'Topic',
    question: 'Question for Reed',
    risk: 'Why it matters',
  },
  'Confirmed fact from the given sources': {
    need: 'Fact',
    source: 'Given source',
    question: 'Supports angle',
  },
  'Unconfirmed claim to leave out': {
    need: 'Claim to avoid',
    risk: 'Why not reportable',
  },
  'Proof and publish limits': {
    need: 'Confirmed fact',
    source: 'Source',
    question: 'Claim to leave out',
    risk: 'Why left out',
  },
  'Question for Coach Harris before the game': {
    need: 'Topic',
    question: 'Question for Coach Harris',
    risk: 'Why it matters',
  },
  'Question for Reed after the game': {
    need: 'Topic',
    question: 'Question for Reed',
    risk: 'Why it matters',
  },
  'Safe fact and unsafe claim': {
    need: 'Safe fact',
    source: 'Source',
    question: 'Unsafe claim to leave out',
    risk: 'Why left out',
  },
}

function formatStructuredPlanField(item: Record<string, unknown>, key: string, fallbackLabel: string) {
  const value = readTextField(item, key)
  if (!value) return ''
  const rowTitle = readTextField(item, 'rowTitle')
  const label = structuredPlanLabels[rowTitle]?.[key] || fallbackLabel
  return `${label}: ${value}`
}

function formatStructuredPlan(items: Array<Record<string, unknown>>) {
  return items
    .map((item, index) => {
      const lines = [
        readTextField(item, 'rowTitle') || `Plan Item #${index + 1}`,
        formatStructuredPlanField(item, 'need', 'Need'),
        formatStructuredPlanField(item, 'source', 'Source'),
        formatStructuredPlanField(item, 'question', 'Question or verification'),
        formatStructuredPlanField(item, 'risk', 'Risk'),
      ].filter(Boolean)
      return lines.join('\n')
    })
    .filter(Boolean)
    .join('\n\n')
}

function formatPhysicalMemo(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object') return ''
  const record = parsed as {
    observations?: Record<string, unknown>
  }
  const observations = record.observations && typeof record.observations === 'object'
    ? record.observations
    : {}
  return typeof observations.__running_reporter_notes === 'string'
    ? observations.__running_reporter_notes.trim()
    : ''
}

function formatPossessionTimelineNotes(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object') return ''
  const record = parsed as { viewedEventIds?: unknown; notes?: unknown; reedQuestions?: unknown; followUp?: unknown; summary?: unknown }
  const notes = record.notes && typeof record.notes === 'object' && !Array.isArray(record.notes)
    ? record.notes as Record<string, unknown>
    : {}
  const preferredOrder = Array.isArray(record.viewedEventIds)
    ? record.viewedEventIds.filter((id): id is string => typeof id === 'string')
    : []
  const orderedIds = [...preferredOrder, ...Object.keys(notes).filter((id) => !preferredOrder.includes(id))]
  const noteLines = orderedIds
    .map((id) => {
      const note = notes[id]
      if (!note || typeof note !== 'object' || Array.isArray(note)) return ''
      const record = note as Record<string, unknown>
      const text = readTextField(record, 'note')
      if (!text) return ''
      const category = possessionCategoryLabel(readTextField(record, 'categoryId'))
      return `${humanizeKey(id)}${category ? ` [${category}]` : ''}: ${text}`
    })
    .filter(Boolean)
  const questionLines = Array.isArray(record.reedQuestions)
    ? record.reedQuestions
      .filter((question): question is string => typeof question === 'string' && Boolean(question.trim()))
      .map((question, index) => `Reed question ${index + 1}: ${question.trim()}`)
    : []
  const followUp = typeof record.followUp === 'string' && record.followUp.trim()
    ? `Follow-up / verification: ${record.followUp.trim()}`
    : ''
  const summary = typeof record.summary === 'string' && record.summary.trim()
    ? `Summary:\n${record.summary.trim()}`
    : ''
  return [
    noteLines.length ? `Possession timeline:\n${noteLines.join('\n')}` : '',
    questionLines.length ? `Prepared Reed questions:\n${questionLines.join('\n')}` : '',
    followUp,
    summary && !questionLines.length ? summary : '',
  ].filter(Boolean).join('\n\n')
}

function formatPossessionTimelineArticleNotes(parsed: unknown) {
  if (!parsed || typeof parsed !== 'object') return ''
  const record = parsed as { viewedEventIds?: unknown; notes?: unknown }
  const notes = record.notes && typeof record.notes === 'object' && !Array.isArray(record.notes)
    ? record.notes as Record<string, unknown>
    : {}
  const preferredOrder = Array.isArray(record.viewedEventIds)
    ? record.viewedEventIds.filter((id): id is string => typeof id === 'string')
    : []
  const orderedIds = [...preferredOrder, ...Object.keys(notes).filter((id) => !preferredOrder.includes(id))]
  const usableLines = orderedIds
    .map((id) => {
      if (id === 'final_score_board') return ''
      const note = notes[id]
      if (!note || typeof note !== 'object' || Array.isArray(note)) return ''
      const noteRecord = note as Record<string, unknown>
      const categoryId = readTextField(noteRecord, 'categoryId')
      if (categoryId !== 'confirmed_fact' && categoryId !== 'scene_color') return ''
      const text = readTextField(noteRecord, 'note')
      return text ? `${humanizeKey(id)}: ${text}` : ''
    })
    .filter(Boolean)
  const caution = 'Caution: Leave out rumors and any medical claim stronger than your named sources support.'
  return [
    usableLines.length ? `Verified facts and usable observations:\n${usableLines.join('\n')}` : '',
    caution,
  ].filter(Boolean).join('\n\n')
}

function formatStoredResponse(raw: string, key: string, responseFormat?: AppTab['responseFormat']) {
  if (!raw.trim()) return ''
  try {
    const parsed = JSON.parse(raw)
    const format = responseFormat
    if ((format === 'structuredPlan' || (!format && key === 'pregame_plan')) && Array.isArray(parsed)) {
      return formatStructuredPlan(parsed)
    }
    if (format === 'physicalMemo' || (!format && key === 'warmup_observation')) {
      return formatPhysicalMemo(parsed)
    }
    if (format === 'possessionTimelineNotes' || (!format && key === 'possession_timeline_notes')) {
      return formatPossessionTimelineNotes(parsed)
    }
    if (format === 'possessionTimelineArticleNotes') {
      return formatPossessionTimelineArticleNotes(parsed)
    }
  } catch {
    // Plain text responses do not need special formatting.
    if (
      responseFormat === 'possessionTimelineNotes'
      || responseFormat === 'possessionTimelineArticleNotes'
      || key === 'possession_timeline_notes'
    ) return ''
  }
  return raw.trim()
}

function formatConversation(messages: ChatMessage[], npcName: string) {
  return messages
    .map((message) => {
      const speaker = message.role === 'user' ? 'You' : message.npcName || npcName
      return `${speaker}: ${message.content.trim()}`
    })
    .filter(Boolean)
    .join('\n\n')
}

function formatSlackTime(ts?: string): string {
  if (!ts) return ''
  const parsed = new Date(ts)
  if (!Number.isNaN(parsed.getTime()) && /\d{4}-\d{2}-\d{2}T/.test(ts)) {
    return parsed.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }
  return ts
}

function NoteSections({ sections }: { sections: SourceSection[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {sections.map((section, index) => (
        <section
          key={`${section.title || 'note'}-${index}`}
          style={{
            background: '#FFFBF1',
            border: '1px solid #D8CFBE',
            borderRadius: '6px',
            padding: '0.875rem 1rem',
          }}
        >
          {section.title && (
            <div
              style={{
                color: '#2F6F55',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontSize: '0.75rem',
                marginBottom: '0.5rem',
              }}
            >
              {section.title.toUpperCase()}
            </div>
          )}
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(section.content)}
          </div>
        </section>
      ))}
    </div>
  )
}

function SlackHistory({
  messages,
  npcName,
  npcRole,
  playerName,
  emptyText,
}: {
  messages: ChatMessage[]
  npcName: string
  npcRole: string
  playerName: string
  emptyText?: string
}) {
  if (!messages.length) {
    return (
      <div style={{ padding: '1rem', color: '#616061', fontSize: '0.875rem', fontStyle: 'italic' }}>
        {emptyText || 'No Slack history is saved yet.'}
      </div>
    )
  }

  return (
    <div style={{ background: '#F7F1E3', minHeight: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '0.75rem 0.875rem',
          borderBottom: '1px solid #D8CFBE',
          backgroundColor: '#EFE8D2',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: getSlackAvatarColor(npcName),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>
            {getSlackInitials(npcName) || 'DM'}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1d1c1d' }}>{npcName}</div>
          <div style={{ fontSize: '0.6875rem', color: '#616061', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Direct message - {npcRole}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', padding: '0.5rem 0' }}>
        {messages.map((message, index) => {
          const isUser = message.role === 'user'
          const sender = isUser ? playerName || 'You' : message.npcName || npcName
          const speakerRole = isUser ? 'NBA Beat Reporter' : npcRole
          return (
            <div
              key={`${message.role}-${index}`}
              style={{
                display: 'flex',
                gap: '0.625rem',
                padding: '0.625rem 0.875rem',
                borderRadius: '4px',
                backgroundColor: isUser ? '#EFE8D2' : '#F7F1E3',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '6px',
                  backgroundColor: getSlackAvatarColor(sender),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                  border: '1px solid rgba(0,0,0,0.12)',
                }}
              >
                <span style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                  {getSlackInitials(sender) || (isUser ? 'Y' : 'T')}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1d1c1d' }}>{sender}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#616061' }}>{speakerRole}</span>
                  <span style={{ fontSize: '0.6875rem', color: '#8A8176', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {formatSlackTime(message.ts)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    color: '#1d1c1d',
                    whiteSpace: 'pre-wrap',
                    marginTop: '0.125rem',
                  }}
                >
                  {renderContentWithGlossary(message.content)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CmsBoxScore({ content }: { content: string }) {
  const finalScore = content.match(/Final:\s*Harbor City Cyclones\s+(\d+),\s*Denver Altitude\s+(\d+)/i)
  const reedLine = content.match(/Malik Reed finished with\s+([^.]*)\./i)
  const cyclonesScore = finalScore?.[1] || '112'
  const altitudeScore = finalScore?.[2] || '107'
  const reedStats = reedLine?.[1] || '24 points, 6 assists, and 2 steals'

  return (
    <div className="cms-box-score" id={cmsSourceElementId('results')}>
      <div className="cms-source-card-header">
        <div>
          <div className="cms-source-kind">Official box score</div>
          <h3>Results desk</h3>
        </div>
        <span className="cms-source-state cms-source-state--saved">Verified</span>
      </div>
      <div className="cms-scoreboard">
        <div className="cms-score-row cms-score-row--winner">
          <span>Harbor City Cyclones</span>
          <strong>{cyclonesScore}</strong>
        </div>
        <div className="cms-score-row">
          <span>Denver Altitude</span>
          <strong>{altitudeScore}</strong>
        </div>
      </div>
      <div className="cms-stat-card">
        <span>Malik Reed official line</span>
        <strong>{reedStats}</strong>
      </div>
    </div>
  )
}

function CmsSourceCard({
  source,
  content,
  isSaved,
}: {
  source: AppTabResponseSource
  content: string
  isSaved: boolean
}) {
  return (
    <article
      className={isSaved ? 'cms-source-card' : 'cms-source-card cms-source-card--missing'}
      id={cmsSourceElementId(source.key)}
    >
      <div className="cms-source-card-header">
        <div>
          <div className="cms-source-kind">{source.sourceKind || 'Source note'}</div>
          <h3>{source.title || humanizeKey(source.key)}</h3>
        </div>
        <span className={isSaved ? 'cms-source-state cms-source-state--saved' : 'cms-source-state'}>
          {isSaved ? 'Saved' : 'Missing'}
        </span>
      </div>

      {source.articleUses?.length && (
        <p className="cms-source-use-summary">
          <strong>Use for:</strong> {source.articleUses.join(', ')}
        </p>
      )}

      <div className="cms-source-card-body">
        {renderContentWithGlossary(content)}
      </div>

      {source.caution && (
        <details className="cms-source-care">
          <summary>Use carefully</summary>
          <p>{renderContentWithGlossary(source.caution)}</p>
        </details>
      )}
    </article>
  )
}

function CmsRequirementStrip({ requirements }: { requirements?: CmsRequirement[] }) {
  if (!requirements?.length) return null

  const includeItems = requirements.filter((item) => item.kind !== 'avoid')
  const avoidItems = requirements.filter((item) => item.kind === 'avoid')

  return (
    <section className="cms-requirements" aria-label="Article requirements">
      <div className="cms-requirements-heading">
        <span className="cms-source-eyebrow">Article requirements</span>
        <strong>Use the evidence guide, then write in your own words.</strong>
      </div>
      <div className="cms-requirement-groups">
        {includeItems.length > 0 && (
          <div className="cms-requirement-group">
            <span>Include</span>
            <div className="cms-requirement-list">
              {includeItems.map((item) => (
                <div className="cms-requirement-chip" key={item.id}>
                  <strong>{item.label}</strong>
                  <small>{item.sourceHint}</small>
                </div>
              ))}
            </div>
          </div>
        )}
        {avoidItems.length > 0 && (
          <div className="cms-requirement-group">
            <span>Avoid</span>
            <div className="cms-requirement-list">
              {avoidItems.map((item) => (
                <div className="cms-requirement-chip cms-requirement-chip--avoid" key={item.id}>
                  <strong>{item.label}</strong>
                  <small>{item.sourceHint}</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function CmsStoryFrame({ guidance }: { guidance: NonNullable<AppTab['cmsGuidance']> }) {
  const items = guidance.items || []
  if (!items.length && !guidance.summary) return null

  return (
    <details className="cms-story-frame">
      <summary>
        <span>{guidance.title || 'Optional story frame'}</span>
        <strong>Open help</strong>
      </summary>
      {guidance.summary && <p>{renderContentWithGlossary(guidance.summary)}</p>}
      {items.length > 0 && (
        <ol>
          {items.map((item) => (
            <li key={item.label}>
              <strong>{item.label}</strong>
              <span>{renderContentWithGlossary(item.detail)}</span>
            </li>
          ))}
        </ol>
      )}
    </details>
  )
}

function CmsPublishChecks({ savedSourceCount, totalSourceCount }: { savedSourceCount: number; totalSourceCount: number }) {
  const checks = [
    'Final score and Reed stat line come from Results.',
    'Health language needs Team PR, Reed, or another named source.',
    'Final-minutes lineup claims need notes from the game or Coach Harris.',
    'Trade-rumor language stays out unless a named source confirms it.',
  ]

  return (
    <div className="cms-publish-checks">
      <div>
        <div className="cms-source-eyebrow">Safe rules</div>
        <strong>Check these before you submit</strong>
        <p className="cms-rule-note">{savedSourceCount}/{totalSourceCount || 0} note groups saved in Player Notes.</p>
      </div>
      <div className="cms-check-list">
        {checks.map((check) => (
          <div key={check} className="cms-check-row">
            <span aria-hidden="true" />
            <p>{check}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function FreeTextScene({ node }: Props) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const npcConversations = useGameStore((s) => s.npcConversations)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const [activeAppTab, setActiveAppTab] = useState('editor')
  const [activeCmsSourceTab, setActiveCmsSourceTab] = useState<CmsSourceTabId>('notes')

  const value = responses[node.id] || ''
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const isEmailCompose = appWindow === 'email'
  const isCmsWindow = appWindow === 'cms'
  const appTabs = node.appTabs || []
  const titleTabs = appTabs.length > 0 && !isCmsWindow
    ? [{ id: 'editor', label: node.windowTitle || node.title }, ...appTabs.map((tab) => ({ id: tab.id, label: tab.label }))]
    : undefined

  const resolveTabSections = (tab: AppTab): SourceSection[] => {
    const sections: SourceSection[] = []
    const staticContent = interpolate(tab.content || '', { playerName, branchFlags, mcSelections }).trim()
    if (staticContent) sections.push({ content: staticContent })

    let dynamicSourceFound = false
    let dynamicSourceRequested = false

    const addResponseSection = (
      key: string,
      title?: string,
      responseFormat?: AppTab['responseFormat'],
      emptyText?: string,
    ) => {
      dynamicSourceRequested = true
      const formatted = formatStoredResponse(responses[key] || '', key, responseFormat)
      if (formatted) {
        dynamicSourceFound = true
        sections.push({ title: title || humanizeKey(key), content: formatted })
      } else if (emptyText) {
        sections.push({ title: title || humanizeKey(key), content: emptyText })
      }
    }

    if (tab.responseKey) {
      addResponseSection(tab.responseKey, tab.responseTitle, tab.responseFormat)
    }

    tab.responseSources?.forEach((source) => {
      addResponseSection(source.key, source.title, source.responseFormat, source.emptyText)
    })

    if (tab.conversationKey) {
      dynamicSourceRequested = true
      const npcName = tab.conversationNpcId ? npcs[tab.conversationNpcId]?.name : undefined
      const formatted = formatConversation(npcConversations[tab.conversationKey] || [], npcName || 'Source')
      if (formatted) {
        dynamicSourceFound = true
        sections.push({ title: tab.conversationTitle || 'Interview transcript', content: formatted })
      }
    }

    tab.conversationSources?.forEach((source) => {
      dynamicSourceRequested = true
      const npcName = source.npcId ? npcs[source.npcId]?.name : undefined
      const formatted = formatConversation(npcConversations[source.key] || [], npcName || 'Source')
      if (formatted) {
        dynamicSourceFound = true
        sections.push({ title: source.title || 'Conversation history', content: formatted })
      } else if (source.emptyText) {
        sections.push({ title: source.title || 'Conversation history', content: source.emptyText })
      }
    })

    if (dynamicSourceRequested && !dynamicSourceFound && tab.emptyText) {
      sections.push({ content: tab.emptyText })
    }

    return sections.length ? sections : tab.emptyText ? [{ content: tab.emptyText }] : []
  }

  const resolveTabContent = (tab: AppTab) => {
    return resolveTabSections(tab)
      .map((section) => [section.title, section.content].filter(Boolean).join('\n\n'))
      .join('\n\n')
  }

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

  const renderAppTab = (tab: AppTab) => {
    if (tab.layout === 'boxScore' || (isCmsWindow && tab.id === 'results')) {
      return <CmsBoxScore content={resolveTabContent(tab)} />
    }

    if (tab.layout === 'slackHistory') {
      const source = tab.conversationSources?.find((candidate) => (npcConversations[candidate.key] || []).length > 0)
        || tab.conversationSources?.[0]
      const npc = source?.npcId ? npcs[source.npcId] : undefined
      const messages = source ? npcConversations[source.key] || [] : []
      return (
        <SlackHistory
          messages={messages}
          npcName={npc?.name || source?.title || 'Slack'}
          npcRole={npc?.role || 'Editor'}
          playerName={playerName}
          emptyText={source?.emptyText || tab.emptyText}
        />
      )
    }

    if (isCmsWindow && tab.layout === 'notes' && tab.responseSources?.length) {
      return (
        <div className="cms-source-card-list">
          {tab.responseSources.map((source) => {
            const formatted = formatStoredResponse(responses[source.key] || '', source.key, source.responseFormat)
            const isSaved = Boolean(formatted)
            const content = formatted || `${source.emptyText || 'No note saved.'} Use only the sources that are shown.`
            return (
              <CmsSourceCard
                key={source.key}
                source={source}
                content={content}
                isSaved={isSaved}
              />
            )
          })}
        </div>
      )
    }

    const sections = resolveTabSections(tab)
    return (
      <div
        style={{
          background: '#F7F1E3',
          border: '1px solid #CDBF94',
          padding: '1rem',
          fontSize: '0.875rem',
          lineHeight: 1.65,
          color: '#1E1E1A',
          whiteSpace: tab.layout === 'notes' ? 'normal' : 'pre-wrap',
          minHeight: '100%',
        }}
      >
        {tab.layout === 'notes'
          ? <NoteSections sections={sections} />
          : renderContentWithGlossary(resolveTabContent(tab))}
      </div>
    )
  }

  const tabbedWindowContent = activeAppTab === 'editor'
    ? editorContent
    : appTabs.map((tab) => activeAppTab === tab.id && <div key={tab.id}>{renderAppTab(tab)}</div>)

  const cmsPlayerNotesTab = appTabs.find((tab) => tab.id === 'all_player_notes') || appTabs.find((tab) => tab.responseSources?.length)
  const cmsResultsTab = appTabs.find((tab) => tab.id === 'results')
  const cmsResponseSources = cmsPlayerNotesTab?.responseSources || []
  const cmsTotalSources = appTabs.reduce((count, tab) => count + (tab.responseSources?.length || 0), 0)
  const cmsSavedSources = appTabs.reduce((count, tab) => (
    count + (tab.responseSources || []).filter((source) => (
      Boolean(formatStoredResponse(responses[source.key] || '', source.key, source.responseFormat))
    )).length
  ), 0)
  const cmsGuidance = appTabs.find((tab) => tab.cmsGuidance)?.cmsGuidance
  const targetMin = node.minWords || 0
  const targetMax = node.maxWords || 0
  const targetProgress = targetMin ? Math.min(100, Math.round((wordCount / targetMin) * 100)) : 0
  const cmsStatus = !wordCount
    ? 'Draft not started'
    : canSubmit
      ? 'Ready to submit'
      : !meetsMin && node.minWords
        ? `${node.minWords - wordCount} words short`
        : node.maxWords
          ? `${wordCount - node.maxWords} words over`
          : 'Keep drafting'

  const cmsWindowContent = (
    <div className="cms-deadline-shell">
      <div className="cms-deadline-status">
        <div>
          <span>Slug</span>
          <strong>cyclones-altitude-gamer</strong>
        </div>
        <div>
          <span>Due</span>
          <strong>11:10 PM ET</strong>
        </div>
        <div>
          <span>Target</span>
          <strong>{targetMin && targetMax ? `${targetMin}-${targetMax} words` : 'Deadline copy'}</strong>
        </div>
        <div>
          <span>Draft</span>
          <strong>{cmsStatus}</strong>
        </div>
      </div>

      <div className="cms-deadline-grid">
        <section className="cms-copy-panel">
          <div className="cms-panel-header">
            <div>
              <span className="cms-source-eyebrow">Article editor</span>
              <h2>{node.windowTitle || 'Deadline Draft'}</h2>
            </div>
            <span className="cms-deadline-pill">Autosaved 10:34 PM</span>
          </div>

          <div className="cms-editor-brief">
            {renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))}
          </div>

          <CmsRequirementStrip requirements={node.cmsRequirements} />

          {cmsGuidance && <CmsStoryFrame guidance={cmsGuidance} />}

          <LongFormEditor
            value={value}
            onChange={(v) => setFreeTextResponse(node.id, v)}
            placeholder={node.placeholder}
            maxWords={node.maxWords}
            minRows={7}
            label="Article copy"
            variant="cms"
          />

          <div className="cms-word-meter" aria-label={`Draft is ${wordCount} words`}>
            <div>
              <strong>{wordCount}</strong>
              <span>words</span>
            </div>
            <div className="cms-word-bar">
              <span style={{ width: `${targetProgress}%` }} />
            </div>
            <p>{targetMin ? `Minimum ${targetMin}. ` : ''}{targetMax ? `Maximum ${targetMax}. ` : ''}Current draft: {cmsStatus}.</p>
          </div>

          <div className="cms-submit-row">
            <ActionButton
              text="Submit Draft"
              onClick={() => goNext(node)}
              disabled={!canSubmit}
              variant={canSubmit ? 'primary' : 'secondary'}
            />
            {import.meta.env.DEV && (
              <ActionButton text="Skip (dev)" onClick={() => goNext(node)} variant="secondary" fullWidth={false} />
            )}
          </div>
        </section>

        <aside className="cms-source-panel" aria-label="Deadline source tray">
          <div className="cms-panel-header">
            <div>
              <span className="cms-source-eyebrow">Source tray</span>
              <h2>Player Notes and Results</h2>
            </div>
          </div>

          <div className="cms-source-summary">
            <span>{cmsSavedSources}/{cmsTotalSources || 0} note groups saved</span>
            <span>Results tab verified</span>
          </div>

          <div className="cms-source-tabs" role="tablist" aria-label="Source tray sections">
            {cmsSourceTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeCmsSourceTab === tab.id}
                className={activeCmsSourceTab === tab.id ? 'cms-source-tab cms-source-tab--active' : 'cms-source-tab'}
                onClick={() => setActiveCmsSourceTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="cms-source-content cms-source-content--tabbed" role="tabpanel">
            {activeCmsSourceTab === 'results' && (
              cmsResultsTab
                ? <CmsBoxScore content={resolveTabContent(cmsResultsTab)} />
                : <div className="cms-source-empty">No official results are configured for this draft.</div>
            )}

            {activeCmsSourceTab === 'notes' && (
              cmsResponseSources.length ? (
                <div className="cms-source-card-list">
                  {cmsResponseSources.map((source) => {
                    const formatted = formatStoredResponse(responses[source.key] || '', source.key, source.responseFormat)
                    const isSaved = Boolean(formatted)
                    const content = formatted || `${source.emptyText || 'No note saved.'} Use only the sources that are shown.`
                    return (
                      <CmsSourceCard
                        key={source.key}
                        source={source}
                        content={content}
                        isSaved={isSaved}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="cms-source-empty">No Player Notes are configured for this draft.</div>
              )
            )}

            {activeCmsSourceTab === 'rules' && (
              <CmsPublishChecks savedSourceCount={cmsSavedSources} totalSourceCount={cmsTotalSources} />
            )}
          </div>
        </aside>
      </div>
    </div>
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
        {!isCmsWindow && <div
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
        </div>}

        {appWindow ? (
          <DesktopOverlay fitToScreen={isCmsWindow}>
            <LaptopFrame
              variant={appWindow}
              title={node.windowTitle}
              fill
              scrollable
              titleTabs={titleTabs}
              activeTitleTabId={activeAppTab}
              onTitleTabChange={setActiveAppTab}
            >
              {isCmsWindow ? cmsWindowContent : appTabs.length > 0 ? tabbedWindowContent : editorContent}
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
