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
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { ChartIcon } from '../components/ui/Icons'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import type { ReactNode } from 'react'
import type { BriefingNode, BriefingSubStep, SlackMessageData } from '../types/game'
import DesktopOverlay from '../components/layout/DesktopOverlay'

interface Props { node: BriefingNode }

function resolveSlackMessage(
  msg: SlackMessageData,
  ctx: { playerName: string; branchFlags: Record<string, string>; mcSelections: Record<string, string> },
): SlackMessageData {
  return {
    ...msg,
    sender: interpolate(msg.sender, ctx),
    role: interpolate(msg.role, ctx),
    timestamp: interpolate(msg.timestamp, ctx),
    content: interpolate(msg.content, ctx),
    avatarInitials: msg.avatarInitials ? interpolate(msg.avatarInitials, ctx) : undefined,
  }
}

function BriefingReferenceCard({ title, content }: { title: string; content: string }) {
  return (
    <section
      style={{
        border: '1px solid #000',
        boxShadow: '4px 4px 0 #000',
        backgroundColor: '#F7F1E3',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}
    >
      <div style={{ fontSize: '0.6875rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0 }}>
        {title}
      </div>
      <div style={{ fontSize: '0.8125rem', lineHeight: 1.62, color: '#1E1E1A', whiteSpace: 'pre-wrap' }}>
        {renderContentWithGlossary(content)}
      </div>
    </section>
  )
}

function BriefingReferenceDocument({ title, content }: { title: string; content: string }) {
  return (
    <article
      style={{
        maxWidth: '46rem',
        margin: '0 auto',
        minHeight: '100%',
        backgroundColor: '#FFFDF6',
        border: '1px solid #D8CCAE',
        boxShadow: '0 6px 18px rgba(58, 47, 28, 0.12)',
        padding: '1.15rem 1.3rem',
        color: '#1E1E1A',
      }}
    >
      <div style={{ fontSize: '0.6875rem', color: '#3A6B5E', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.7rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '0.8125rem', lineHeight: 1.62, whiteSpace: 'pre-wrap' }}>
        {renderContentWithGlossary(content)}
      </div>
    </article>
  )
}

function BriefingReferenceWindow({ title, content, variant }: { title: string; content: string; variant: LaptopFrameVariant }) {
  return (
    <DesktopOverlay width="78%" height="80%">
      <LaptopFrame variant={variant} title={title} scrollable fill>
        <BriefingReferenceDocument title={title} content={content} />
      </LaptopFrame>
    </DesktopOverlay>
  )
}

export function BriefingDrawerContent({ node }: { node: BriefingNode }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const ctx = { playerName, branchFlags, mcSelections }
  const allSteps = node.subSteps || node.pages || []
  const referenceContent = node.referenceContent ? interpolate(node.referenceContent, ctx) : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {node.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', whiteSpace: 'pre-wrap', margin: 0 }}>
          {renderContentWithGlossary(interpolate(node.content, ctx))}
        </p>
      )}
      {referenceContent && (
        <BriefingReferenceCard title={node.referenceTitle || 'Reference'} content={referenceContent} />
      )}
      {allSteps.length === 0 && (
        <>
          {node.slackMessages?.map((msg, i) => (
            <SlackMessageEnhanced key={i} message={resolveSlackMessage(msg, ctx)} delay={0} showUnreadDot={i === (node.slackMessages?.length ?? 0) - 1} />
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
            <SlackMessageEnhanced key={j} message={resolveSlackMessage(msg, ctx)} delay={0} showUnreadDot={j === (s.slackMessages?.length ?? 0) - 1} />
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

function renderSubStep(s: BriefingSubStep, playerName: string, branchFlags: Record<string, string>, mcSelections: Record<string, string>): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {s.illustration && <InlineIllustration src={s.illustration} />}
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
          <LaptopFrame variant="slack" title="Slack" scrollable fill>
            {s.slackMessages.map((msg, i) => (
              <SlackMessageEnhanced
                key={i}
                message={resolveSlackMessage(msg, { playerName, branchFlags, mcSelections })}
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
  const actionLabel = node.actionLabel || 'Start the Task'

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
      {node.referenceContent && (
        <BriefingReferenceCard
          title={node.referenceTitle || 'Reference'}
          content={interpolate(node.referenceContent, { playerName, branchFlags, mcSelections })}
        />
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
          <ActionButton text={actionLabel} onClick={onAdvance} />
        )}
      </div>
      {import.meta.env.DEV && (
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
  const actionLabel = node.actionLabel || 'Start the Task'
  useScrollToTopOnChange(page)

  if (pages.length === 0) return null

  return (
    <>
      {page === 0 && node.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000' }}>
          {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
        </p>
      )}
      {page === 0 && node.referenceContent && (
        <BriefingReferenceCard
          title={node.referenceTitle || 'Reference'}
          content={interpolate(node.referenceContent, { playerName, branchFlags, mcSelections })}
        />
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
          <ActionButton text={actionLabel} onClick={onAdvance} />
        )}
      </div>
      {import.meta.env.DEV && (
        <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
      )}
    </>
  )
}

export default function BriefingScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()

  const onAdvance = () => goNext(node)
  const mode = node.briefingMode || 'simple'
  const actionLabel = node.actionLabel || 'Start the Task'
  const referenceWindowVariant = node.appWindow as LaptopFrameVariant | undefined

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
            {node.illustration && <InlineIllustration src={node.illustration} />}
            {node.content && (
              <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000' }}>
                {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
              </p>
            )}
            {node.referenceContent && referenceWindowVariant && (
              <BriefingReferenceWindow
                title={node.windowTitle || node.referenceTitle || 'Reference'}
                content={interpolate(node.referenceContent, { playerName, branchFlags, mcSelections })}
                variant={referenceWindowVariant}
              />
            )}
            {node.referenceContent && !referenceWindowVariant && (
              <BriefingReferenceCard
                title={node.referenceTitle || 'Reference'}
                content={interpolate(node.referenceContent, { playerName, branchFlags, mcSelections })}
              />
            )}
            {node.slackMessages && node.slackMessages.length > 0 && (
              <DesktopOverlay>
                <LaptopFrame variant="slack" title="Slack" scrollable fill>
                  {node.slackMessages.map((msg, i) => (
                    <SlackMessageEnhanced
                      key={i}
                      message={resolveSlackMessage(msg, { playerName, branchFlags, mcSelections })}
                      delay={i * 0.12}
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
            <ActionButton text={actionLabel} onClick={onAdvance} />
            {import.meta.env.DEV && (
              <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
            )}
          </>
        )}
      </motion.div>
    </SceneWrapper>
  )
}
