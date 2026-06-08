import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import { useScrollToTopOnChange } from '../components/hooks/useScrollToTopOnChange'
import ActionButton from '../components/ui/ActionButton'
import SlackMessageEnhanced from '../components/ui/SlackMessageEnhanced'
import EmailBlock from '../components/ui/EmailBlock'
import MetricsTable from '../components/ui/MetricsTable'
import QuoteBlock from '../components/ui/QuoteBlock'
import LaptopFrame from '../components/ui/LaptopFrame'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { ChartIcon } from '../components/ui/Icons'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevControls } from '../lib/devControls'
import { storyline } from '../data/storyline'
import type { ReactNode } from 'react'
import type { BriefingNode, BriefingSubStep, MultipleChoiceNode, QuoteData } from '../types/game'
import DesktopOverlay from '../components/layout/DesktopOverlay'

interface Props { node: BriefingNode }

export function BriefingDrawerContent({ node }: { node: BriefingNode }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const ctx = { playerName, branchFlags, mcSelections }
  const allSteps = node.subSteps || node.pages || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {node.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', whiteSpace: 'pre-wrap', margin: 0 }}>
          {renderContentWithGlossary(interpolate(node.content, ctx))}
        </p>
      )}
      {allSteps.length === 0 && (
        <>
          {node.slackMessages?.map((msg, i) => (
            <SlackMessageEnhanced
              key={i}
              message={{ ...msg, content: interpolate(msg.content, ctx) }}
              delay={0}
              initialExpanded={node.id === 'briefing_morning'}
              showUnreadDot={i === (node.slackMessages?.length ?? 0) - 1}
            />
          ))}
          {node.emails?.map((email, i) => (
            <EmailBlock key={i} email={{ ...email, content: interpolate(email.content, ctx) }} delay={0} initialExpanded={i === 0} />
          ))}
          {node.quotes?.map((q, i) => (
            <QuoteBlock key={i} quote={{ ...q, text: interpolate(q.text, ctx) }} delay={0} />
          ))}
          {node.metrics && node.metrics.length > 0 && <MetricsTable metrics={node.metrics} />}
        </>
      )}
      {allSteps.map((s, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: i > 0 ? '0.75rem' : 0, borderTop: i > 0 ? '1px solid rgba(0,0,0,0.12)' : 'none' }}>
          {s.content && (
            <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', whiteSpace: 'pre-wrap', margin: 0 }}>
              {renderContentWithGlossary(interpolate(s.content, ctx))}
            </p>
          )}
          {s.slackMessages?.map((msg, j) => (
            <SlackMessageEnhanced
              key={j}
              message={{ ...msg, content: interpolate(msg.content, ctx) }}
              delay={0}
              showUnreadDot={j === (s.slackMessages?.length ?? 0) - 1}
            />
          ))}
          {s.emails?.map((email, j) => (
            <EmailBlock key={j} email={{ ...email, content: interpolate(email.content, ctx) }} delay={0} initialExpanded={j === 0} />
          ))}
          {s.quotes?.map((q, j) => (
            <QuoteBlock key={j} quote={{ ...q, text: interpolate(q.text, ctx) }} delay={0} />
          ))}
        </div>
      ))}
    </div>
  )
}


function InlineIllustration({ src }: { src: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      style={{
        width: 'calc(100% + 6rem)',
        marginLeft: '-3rem',
        marginRight: '-3rem',
        aspectRatio: '16 / 9',
        overflow: 'hidden',
        borderTop: '1px solid #000',
        borderBottom: '1px solid #000',
        backgroundColor: '#E8DCC8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {failed ? (
        <span style={{ fontSize: '0.8125rem', color: '#999', fontStyle: 'italic' }}>Image Placeholder</span>
      ) : (
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

function QuoteCardWithAvatar({ quote }: { quote: QuoteData }) {
  const initials = quote.speaker.split(' ').map((w) => w[0]).filter(Boolean).join('').toUpperCase().slice(0, 2)
  const colors = ['#E07A5F', '#3D405B', '#81B29A', '#F2CC8F', '#6A4C93', '#1982C4']
  let hash = 0
  for (let i = 0; i < quote.speaker.length; i++) hash = quote.speaker.charCodeAt(i) + ((hash << 5) - hash)
  const bgColor = colors[Math.abs(hash) % colors.length]

  return (
    <div
      style={{
        border: '1px solid #000',
        boxShadow: '4px 4px 0 #000',
        backgroundColor: '#F2EBD9',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 700 }}>{initials}</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#000' }}>{quote.speaker}</div>
          <div style={{ fontSize: '0.75rem', color: '#555' }}>{quote.role}</div>
        </div>
      </div>
      <div
        style={{
          fontSize: '0.875rem',
          lineHeight: 1.7,
          color: '#333',
          fontStyle: 'italic',
          borderLeft: '3px solid #B87D6B',
          paddingLeft: '0.75rem',
        }}
      >
        {renderContentWithGlossary(quote.text)}
      </div>
    </div>
  )
}

function renderSubStep(s: BriefingSubStep, playerName: string, branchFlags: Record<string, string>, mcSelections: Record<string, string>): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {s.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', whiteSpace: 'pre-wrap' }}>
          {renderContentWithGlossary(interpolate(s.content, { playerName, branchFlags, mcSelections }))}
        </p>
      )}
      {s.metrics && s.metrics.length > 0 && (
        <LaptopFrame variant="doc" title="Metrics">
          <MetricsTable metrics={s.metrics} />
        </LaptopFrame>
      )}
      {s.slackMessages && s.slackMessages.length > 0 && (
        <DesktopOverlay>
          <LaptopFrame variant="slack" title="#harborthread-live · channel" scrollable fill>
            {s.slackMessages.map((msg, i) => (
              <SlackMessageEnhanced
                key={i}
                message={{ ...msg, content: interpolate(msg.content, { playerName, branchFlags, mcSelections }) }}
                delay={i * 0.12}
                showUnreadDot={i === (s.slackMessages?.length ?? 0) - 1}
              />
            ))}
          </LaptopFrame>
        </DesktopOverlay>
      )}
      {s.emails && s.emails.length > 0 && (
        <DesktopOverlay>
          <LaptopFrame variant="email" title={s.emails[0].subject} scrollable fill>
            {s.emails.map((email, i) => (
              <EmailBlock
                key={i}
                email={{ ...email, content: interpolate(email.content, { playerName, branchFlags, mcSelections }) }}
                delay={i * 0.12}
                initialExpanded={i === 0}
              />
            ))}
          </LaptopFrame>
        </DesktopOverlay>
      )}
      {s.quotes?.map((q, i) => (
        <QuoteBlock
          key={i}
          quote={{ ...q, text: interpolate(q.text, { playerName, branchFlags, mcSelections }) }}
          delay={i * 0.1}
        />
      ))}
    </div>
  )
}

function SequentialBriefing({ node, onAdvance }: { node: BriefingNode; onAdvance: () => void }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const [step, setStep] = useState(0)
  const [showData, setShowData] = useState(false)
  useScrollToTopOnChange(step)

  const subSteps = node.subSteps || []
  const total = subSteps.length

  useEffect(() => {
    subSteps.forEach((s) => {
      if (s.illustration) {
        const img = new Image()
        img.src = s.illustration
      }
    })
  }, [subSteps])

  if (total === 0) return null
  const cur = subSteps[step]

  return (
    <>
      {node.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000' }}>
          {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
        </p>
      )}
      {renderSubStep(cur, playerName, branchFlags, mcSelections)}

      {(node.metrics && node.metrics.length > 0) && step > 0 && (
        <>
          <button
            onClick={() => setShowData(!showData)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
              backgroundColor: '#E8DCC8',
              border: '1px solid #000',
              boxShadow: '2px 2px 0 #000',
              padding: '0.375rem 0.75rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#333',
              cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
              alignSelf: 'flex-start',
            }}
          >
            {showData ? 'Hide Data' : <><ChartIcon size={14} /> View Data</>}
          </button>
          {showData && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}>
              <LaptopFrame variant="doc" title="Metrics">
                <MetricsTable metrics={node.metrics} />
              </LaptopFrame>
            </motion.div>
          )}
        </>
      )}

      <div style={{ fontSize: '0.6875rem', color: '#999', textAlign: 'center' }}>
        {step + 1} of {total}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {step > 0 && <ActionButton text="Back" onClick={() => setStep(step - 1)} variant="secondary" />}
        {step < total - 1 ? (
          <ActionButton text="Next" onClick={() => setStep(step + 1)} variant="secondary" />
        ) : (
          <ActionButton text="Start the Task" onClick={onAdvance} />
        )}
      </div>
      {showDevControls && (
        <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
      )}
    </>
  )
}

function PaginatedBriefing({ node, onAdvance }: { node: BriefingNode; onAdvance: () => void }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const [page, setPage] = useState(0)
  const pages = node.pages || []
  useScrollToTopOnChange(page)

  if (pages.length === 0) return null

  return (
    <>
      {page === 0 && node.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000' }}>
          {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
        </p>
      )}
      {renderSubStep(pages[page], playerName, branchFlags, mcSelections)}
      <div style={{ fontSize: '0.6875rem', color: '#999', textAlign: 'center' }}>
        {page + 1} of {pages.length}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {page > 0 && <ActionButton text="Back" onClick={() => setPage(page - 1)} variant="secondary" />}
        {page < pages.length - 1 ? (
          <ActionButton text="Next" onClick={() => setPage(page + 1)} variant="secondary" />
        ) : (
          <ActionButton text="Start the Task" onClick={onAdvance} />
        )}
      </div>
      {showDevControls && (
        <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
      )}
    </>
  )
}

export default function BriefingScene({ node }: Props) {
  const setMcSelection = useGameStore((s) => s.setMcSelection)
  const setBranchFlag = useGameStore((s) => s.setBranchFlag)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()

  const onAdvance = () => goNext(node)
  const mode = node.briefingMode || 'simple'
  const inlineChoiceNode =
    node.id === 'briefing_morning' && storyline.nodes.first_move?.type === 'multiple_choice'
      ? (storyline.nodes.first_move as MultipleChoiceNode)
      : null

  const handleInlineChoice = (optionId: string, branchFlag?: string) => {
    if (!inlineChoiceNode) return
    setMcSelection(inlineChoiceNode.id, optionId)
    setBranchFlag(inlineChoiceNode.id, branchFlag ?? optionId)
    goNext(node)
  }

  return (
    <SceneWrapper illustration={node.illustration}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: '#555' }}>
            Section {node.section}
          </span>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#000', lineHeight: 1.3 }}>
            {node.title}
          </h2>
        </div>

        {mode === 'sequential' ? (
          <SequentialBriefing node={node} onAdvance={onAdvance} />
        ) : mode === 'paginated' ? (
          <PaginatedBriefing node={node} onAdvance={onAdvance} />
        ) : (
          <>
            {node.content && (
              <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000' }}>
                {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
              </p>
            )}
            {node.slackMessages && node.slackMessages.length > 0 && (
              <DesktopOverlay>
                <LaptopFrame variant="slack" title="#harborthread-live · channel" scrollable fill>
                  {node.slackMessages.map((msg, i) => (
                    <SlackMessageEnhanced
                      key={i}
                      message={{ ...msg, content: interpolate(msg.content, { playerName, branchFlags, mcSelections }) }}
                      delay={i * 0.12}
                      initialExpanded={node.id === 'briefing_morning'}
                      showUnreadDot={i === (node.slackMessages?.length ?? 0) - 1}
                    />
                  ))}
                </LaptopFrame>
              </DesktopOverlay>
            )}
            {node.emails && node.emails.length > 0 && (
              <DesktopOverlay>
                <LaptopFrame variant="email" title={node.emails[0].subject} scrollable fill>
                  {node.emails.map((email, i) => (
                    <EmailBlock
                      key={i}
                      email={{ ...email, content: interpolate(email.content, { playerName, branchFlags, mcSelections }) }}
                      delay={i * 0.12}
                      initialExpanded={i === 0}
                    />
                  ))}
                </LaptopFrame>
              </DesktopOverlay>
            )}
            {node.metrics && <MetricsTable metrics={node.metrics} />}
            {node.quotes?.map((q, i) => (
              <QuoteBlock
                key={i}
                quote={{ ...q, text: interpolate(q.text, { playerName, branchFlags, mcSelections }) }}
                delay={i * 0.1}
              />
            ))}
            {inlineChoiceNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#000', lineHeight: 1.3, margin: 0 }}>
                    {inlineChoiceNode.title}
                  </h3>
                  {inlineChoiceNode.content && (
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', margin: '0.375rem 0 0' }}>
                      {renderContentWithGlossary(interpolate(inlineChoiceNode.content, { playerName, branchFlags, mcSelections }))}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {inlineChoiceNode.options.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleInlineChoice(opt.id, opt.branchFlag)}
                      style={{
                        background: '#F2EBD9',
                        color: '#000',
                        border: '1px solid #000',
                        boxShadow: '4px 4px 0 #000',
                        padding: '1rem 1.25rem',
                        fontSize: '0.9375rem',
                        lineHeight: 1.5,
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#E8DCC8'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#F2EBD9'
                      }}
                    >
                      <span style={{ fontWeight: 700 }}>
                        {renderContentWithGlossary(interpolate(opt.label, { playerName, branchFlags, mcSelections }))}
                      </span>
                      {opt.body && (
                        <span style={{ fontSize: '0.8125rem', color: '#555', lineHeight: 1.6 }}>
                          {renderContentWithGlossary(interpolate(opt.body, { playerName, branchFlags, mcSelections }))}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {showDevControls && (
                  <ActionButton
                    text="Skip (dev)"
                    onClick={() => handleInlineChoice(inlineChoiceNode.options[0].id, inlineChoiceNode.options[0].branchFlag)}
                    variant="secondary"
                    fullWidth={false}
                  />
                )}
              </div>
            ) : (
              <>
                <ActionButton text="Start the Task" onClick={onAdvance} />
                {showDevControls && (
                  <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
                )}
              </>
            )}
          </>
        )}
      </motion.div>
    </SceneWrapper>
  )
}
