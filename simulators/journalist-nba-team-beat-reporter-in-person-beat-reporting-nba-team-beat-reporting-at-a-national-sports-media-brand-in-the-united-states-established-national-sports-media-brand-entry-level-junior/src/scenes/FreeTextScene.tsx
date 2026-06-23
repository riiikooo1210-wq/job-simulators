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

interface SourceSection {
  title?: string
  content: string
}

function humanizeKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function readTextField(item: Record<string, unknown>, key: string) {
  const value = item[key]
  return typeof value === 'string' ? value.trim() : ''
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
      const text = readTextField(note as Record<string, unknown>, 'note')
      if (!text) return ''
      return `${humanizeKey(id)}: ${text}`
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
    noteLines.length ? `Possession notes:\n${noteLines.join('\n')}` : '',
    questionLines.length ? `Prepared Reed questions:\n${questionLines.join('\n')}` : '',
    followUp,
    summary && !questionLines.length ? summary : '',
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
      return formatPossessionTimelineNotes(parsed) || raw
    }
  } catch {
    // Plain text responses do not need special formatting.
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
