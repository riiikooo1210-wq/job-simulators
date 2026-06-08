import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import { useScrollToTopOnChange } from '../components/hooks/useScrollToTopOnChange'
import ActionButton from '../components/ui/ActionButton'
import SlackMessageEnhanced from '../components/ui/SlackMessageEnhanced'
import EmailBlock from '../components/ui/EmailBlock'
import MetricsTable from '../components/ui/MetricsTable'
import QuoteBlock from '../components/ui/QuoteBlock'
import LaptopFrame, { type LaptopFrameVariant } from '../components/ui/LaptopFrame'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { ChartIcon } from '../components/ui/Icons'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevTools } from '../lib/devTools'
import type { ReactNode } from 'react'
import type { BriefingNode, BriefingSubStep, QuoteData } from '../types/game'
import DesktopOverlay from '../components/layout/DesktopOverlay'

interface Props { node: BriefingNode }
type MorningAppId = 'mail' | 'messages'

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
            <SlackMessageEnhanced key={i} message={{ ...msg, content: interpolate(msg.content, ctx) }} delay={0} initialExpanded />
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
            <SlackMessageEnhanced key={j} message={{ ...msg, content: interpolate(msg.content, ctx) }} delay={0} initialExpanded />
          ))}
          {s.slackMessages && <MayaAttachmentStack step={s} ctx={ctx} />}
          {s.emails?.map((email, j) => (
            <EmailBlock key={j} email={{ ...email, content: interpolate(email.content, ctx) }} delay={0} initialExpanded={j === 0} />
          ))}
          {!s.slackMessages && s.quotes?.map((q, j) => (
            <QuoteBlock key={j} quote={{ ...q, text: interpolate(q.text, ctx) }} delay={0} />
          ))}
          {!s.slackMessages && s.metrics && s.metrics.length > 0 && <MetricsTable metrics={s.metrics} />}
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

function BriefingLaptopWindow({
  variant,
  title,
  children,
  width = '66%',
  height = '70%',
}: {
  variant: LaptopFrameVariant
  title: string
  children: ReactNode
  width?: string
  height?: string
}) {
  return (
    <DesktopOverlay
      width={width}
      height={height}
    >
      <LaptopFrame variant={variant} title={title} scrollable fill>
        {children}
      </LaptopFrame>
    </DesktopOverlay>
  )
}

function MayaSlackBriefing({ quotes }: { quotes: QuoteData[] }) {
  const maya = quotes.find((q) => q.speaker.toLowerCase().includes('maya')) ?? quotes[1] ?? quotes[0]
  const renee = quotes.find((q) => q.speaker.toLowerCase().includes('renee')) ?? quotes[0]

  return (
    <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '6px',
            backgroundColor: '#3A6B5E',
            color: '#F7F1E3',
            fontSize: '0.75rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          MC
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1d1c1d' }}>Maya</span>
            <span style={{ fontSize: '0.6875rem', color: '#616061' }}>8:17 AM</span>
          </div>
          <p style={{ margin: '0.125rem 0 0', fontSize: '0.875rem', lineHeight: 1.55, color: '#1d1c1d' }}>
            {maya.text}
          </p>

          {renee && (
            <div
              style={{
                marginTop: '0.625rem',
                border: '1px solid #d7cfbc',
                borderRadius: '6px',
                backgroundColor: '#fffaf0',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '0.45rem 0.625rem',
                  backgroundColor: '#EFE8D2',
                  borderBottom: '1px solid #d7cfbc',
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  color: '#3A6B5E',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Attached comment screenshot
              </div>
              <div style={{ padding: '0.625rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    backgroundColor: '#D2A39A',
                    color: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.6875rem',
                    fontWeight: 800,
                    flexShrink: 0,
                  }}
                >
                  R
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d1c1d' }}>{renee.speaker}</div>
                  <div style={{ fontSize: '0.6875rem', color: '#616061', marginBottom: '0.25rem' }}>{renee.role}</div>
                  <div style={{ fontSize: '0.75rem', lineHeight: 1.4, color: '#1d1c1d' }}>
                    "{renee.text}"
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MailGlyph({ color = '#3A6B5E' }: { color?: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  )
}

function MessageGlyph({ color = '#3A6B5E' }: { color?: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 6.5a3 3 0 013-3h8a3 3 0 013 3v5.5a3 3 0 01-3 3h-4.25L7 19v-4H8a3 3 0 01-3-3V6.5z" />
      <path d="M8 8h8M8 11h5" />
    </svg>
  )
}

function MorningAppButton({
  id,
  label,
  badge,
  active,
  opened,
  onClick,
}: {
  id: MorningAppId
  label: string
  badge?: string
  active: boolean
  opened: boolean
  onClick: () => void
}) {
  const glyph = id === 'mail' ? <MailGlyph /> : <MessageGlyph />

  return (
    <button
      type="button"
      aria-label={`Open ${label}`}
      onClick={onClick}
      style={{
        position: 'relative',
        width: 78,
        minHeight: 88,
        border: 'none',
        background: 'transparent',
        padding: 0,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.45rem',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <span
        style={{
          position: 'relative',
          width: 54,
          height: 54,
          borderRadius: '12px',
          border: '1px solid #000',
          boxShadow: active ? '2px 2px 0 #000' : '4px 4px 0 #000',
          backgroundColor: opened ? '#EFE8D2' : '#F7F1E3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: active ? 'translate(2px, 2px)' : 'none',
        }}
      >
        {glyph}
        {badge && !opened && (
          <span
            style={{
              position: 'absolute',
              top: -8,
              right: -8,
              minWidth: 22,
              height: 22,
              borderRadius: 999,
              border: '1px solid #000',
              backgroundColor: '#B87D6B',
              color: '#F7F1E3',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {badge}
          </span>
        )}
      </span>
      <span
        style={{
          maxWidth: 76,
          color: '#000',
          fontSize: '0.72rem',
          lineHeight: 1.2,
          fontWeight: 800,
          textAlign: 'center',
          textShadow: '0 1px 0 #F7F1E3',
          overflowWrap: 'anywhere',
        }}
      >
        {label}
      </span>
    </button>
  )
}

function MayaAttachmentStack({ step, ctx }: { step: BriefingSubStep; ctx: { playerName: string; branchFlags: Record<string, string>; mcSelections: Record<string, string> } }) {
  const quote = step.quotes?.[0]
  const hasMetrics = Boolean(step.metrics && step.metrics.length > 0)

  if (!quote && !hasMetrics) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0 0.875rem 0.875rem 3.5rem' }}>
      {quote && (
        <div
          style={{
            border: '1px solid #d7cfbc',
            borderRadius: '6px',
            backgroundColor: '#fffaf0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.45rem 0.625rem',
              backgroundColor: '#EFE8D2',
              borderBottom: '1px solid #d7cfbc',
              fontSize: '0.6875rem',
              fontWeight: 800,
              color: '#3A6B5E',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Attached comment screenshot
          </div>
          <div style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                backgroundColor: '#D2A39A',
                color: '#000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6875rem',
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              R
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d1c1d' }}>{quote.speaker}</div>
              <div style={{ fontSize: '0.6875rem', color: '#616061', marginBottom: '0.25rem' }}>{quote.role}</div>
              <div style={{ fontSize: '0.75rem', lineHeight: 1.4, color: '#1d1c1d' }}>
                "{interpolate(quote.text, ctx)}"
              </div>
            </div>
          </div>
        </div>
      )}

      {hasMetrics && (
        <div
          style={{
            border: '1px solid #d7cfbc',
            borderRadius: '6px',
            backgroundColor: '#fffaf0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '0.45rem 0.625rem',
              backgroundColor: '#EFE8D2',
              borderBottom: '1px solid #d7cfbc',
              fontSize: '0.6875rem',
              fontWeight: 800,
              color: '#3A6B5E',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Attached spreadsheet screenshot
          </div>
          <div style={{ padding: '0.75rem' }}>
            <MetricsTable metrics={step.metrics || []} />
          </div>
        </div>
      )}
    </div>
  )
}

function DesktopAppLauncherBriefing({ node, onAdvance }: { node: BriefingNode; onAdvance: () => void }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const [activeApp, setActiveApp] = useState<MorningAppId | null>(null)
  const [openedApps, setOpenedApps] = useState<Record<MorningAppId, boolean>>({
    mail: false,
    messages: false,
  })

  const ctx = { playerName, branchFlags, mcSelections }
  const subSteps = node.subSteps || []
  const mailStep = subSteps.find((s) => s.emails && s.emails.length > 0)
  const messageStep = subSteps.find((s) => s.slackMessages && s.slackMessages.length > 0)

  const apps = [
    { id: 'mail' as const, label: 'Mail', badge: '1', available: Boolean(mailStep) },
    { id: 'messages' as const, label: 'Messages', badge: '1', available: Boolean(messageStep) },
  ].filter((app) => app.available)

  const openApp = (id: MorningAppId) => {
    setActiveApp(id)
    setOpenedApps((prev) => ({ ...prev, [id]: true }))
  }
  const openedCount = apps.filter((app) => openedApps[app.id]).length
  const allOpened = apps.length > 0 && openedCount === apps.length

  const activeWindow = (() => {
    if (activeApp === 'mail' && mailStep?.emails) {
      return (
        <LaptopFrame variant="email" title="GlowDesk Mail" scrollable fill>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {mailStep.emails.map((email, i) => (
              <EmailBlock
                key={i}
                email={{ ...email, content: interpolate(email.content, ctx) }}
                delay={i * 0.12}
                initialExpanded
              />
            ))}
          </div>
        </LaptopFrame>
      )
    }

    if (activeApp === 'messages' && messageStep?.slackMessages) {
      return (
        <LaptopFrame variant="slack" title="creator-ops" scrollable fill>
          <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {messageStep.slackMessages.map((msg, i) => (
              <SlackMessageEnhanced
                key={i}
                message={{ ...msg, content: interpolate(msg.content, ctx) }}
                delay={i * 0.12}
                initialExpanded
              />
            ))}
            <MayaAttachmentStack step={messageStep} ctx={ctx} />
          </div>
        </LaptopFrame>
      )
    }

    return null
  })()

  return (
    <>
      {node.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000' }}>
          {renderContentWithGlossary(interpolate(node.content, ctx))}
        </p>
      )}

      <DesktopOverlay
        width="74%"
        height="72%"
        contentPaddingBottom="3%"
      >
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
          <div
            style={{
              position: 'absolute',
              left: '1.25rem',
              top: '0.5rem',
              zIndex: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            {apps.map((app) => (
              <MorningAppButton
                key={app.id}
                id={app.id}
                label={app.label}
                badge={app.badge}
                active={activeApp === app.id}
                opened={openedApps[app.id]}
                onClick={() => openApp(app.id)}
              />
            ))}
          </div>

          {activeWindow ? (
            <div
              style={{
                position: 'absolute',
                inset: '0.45rem 1.65rem 1.15rem 118px',
                display: 'flex',
                minHeight: 0,
              }}
            >
              {activeWindow}
            </div>
          ) : (
            <div
              style={{
                position: 'absolute',
                inset: '0.45rem 1.65rem 1.15rem 118px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0,0,0,0.18)',
                backgroundColor: 'rgba(247, 241, 227, 0.72)',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3A6B5E', textAlign: 'center', maxWidth: 260, lineHeight: 1.45 }}>
                Open your morning sources before replying to the brand.
              </div>
            </div>
          )}
        </div>
      </DesktopOverlay>

      <div style={{ fontSize: '0.75rem', color: '#555', textAlign: 'center' }}>
        {openedCount} of {apps.length} sources reviewed
      </div>

      <ActionButton text="Start the Task" onClick={onAdvance} disabled={!allOpened} variant={allOpened ? 'primary' : 'secondary'} />
      {showDevTools && (
        <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
      )}
    </>
  )
}

function renderSubStep(
  s: BriefingSubStep,
  playerName: string,
  branchFlags: Record<string, string>,
  mcSelections: Record<string, string>
): ReactNode {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {s.illustration && <InlineIllustration src={s.illustration} />}
      {s.content && (
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#000', whiteSpace: 'pre-wrap' }}>
          {renderContentWithGlossary(interpolate(s.content, { playerName, branchFlags, mcSelections }))}
        </p>
      )}
      {!s.slackMessages && s.metrics && s.metrics.length > 0 && (
        <BriefingLaptopWindow variant="doc" title="GlowDesk Analytics">
          <MetricsTable metrics={s.metrics} />
        </BriefingLaptopWindow>
      )}
      {s.slackMessages && s.slackMessages.length > 0 && (
        <BriefingLaptopWindow variant="slack" title="creator-ops">
          <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {s.slackMessages.map((msg, i) => (
              <SlackMessageEnhanced
                key={i}
                message={{ ...msg, content: interpolate(msg.content, { playerName, branchFlags, mcSelections }) }}
                delay={i * 0.12}
                initialExpanded
              />
            ))}
            <MayaAttachmentStack step={s} ctx={{ playerName, branchFlags, mcSelections }} />
          </div>
        </BriefingLaptopWindow>
      )}
      {s.emails && s.emails.length > 0 && (
        <BriefingLaptopWindow variant="email" title="GlowDesk Mail">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {s.emails.map((email, i) => (
              <EmailBlock
                key={i}
                email={{ ...email, content: interpolate(email.content, { playerName, branchFlags, mcSelections }) }}
                delay={i * 0.12}
                initialExpanded
              />
            ))}
          </div>
        </BriefingLaptopWindow>
      )}
      {!s.slackMessages && s.quotes && s.quotes.length > 0 && (
        <BriefingLaptopWindow variant="slack" title="creator-ops">
          <MayaSlackBriefing quotes={s.quotes.map((q) => ({ ...q, text: interpolate(q.text, { playerName, branchFlags, mcSelections }) }))} />
        </BriefingLaptopWindow>
      )}
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
      {showDevTools && (
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
      {showDevTools && (
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
  const advanceLabel = node.title === 'Immediate Consequence' ? 'View Assessment' : 'Start the Task'

  return (
    <SceneWrapper illustration={node.illustration} hideIllustration={mode === 'sequential' && Boolean(node.illustration)}>
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

        {mode === 'sequential' && node.id === 'scene_01_briefing' ? (
          <DesktopAppLauncherBriefing node={node} onAdvance={onAdvance} />
        ) : mode === 'sequential' ? (
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
                <LaptopFrame variant="slack" title="Slack" scrollable fill>
                  {node.slackMessages.map((msg, i) => (
                    <SlackMessageEnhanced
                      key={i}
                      message={{ ...msg, content: interpolate(msg.content, { playerName, branchFlags, mcSelections }) }}
                      delay={i * 0.12}
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
            <ActionButton text={advanceLabel} onClick={onAdvance} />
            {showDevTools && (
              <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
            )}
          </>
        )}
      </motion.div>
    </SceneWrapper>
  )
}
