import { useEffect, useRef, useState } from 'react'
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
import { npcs } from '../data/npcs'
import type { ReactNode } from 'react'
import type { BriefingNode, BriefingSubStep, CmsSidebarRuleData, EmailData, SlackMessageData, SocialPostData } from '../types/game'
import DesktopOverlay from '../components/layout/DesktopOverlay'

interface Props { node: BriefingNode }
type AssignmentAppId = 'messages' | 'email' | 'stats' | 'sns' | 'cms'
type BriefingContext = {
  playerName: string
  branchFlags: Record<string, string>
  mcSelections: Record<string, string>
}

function resolveSlackMessage(
  msg: SlackMessageData,
  ctx: BriefingContext,
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

function MemoryCard({ node, ctx }: { node: BriefingNode; ctx: BriefingContext }) {
  if (!node.memoryCard?.bullets.length) return null

  return (
    <div
      style={{
        border: '1px solid #000',
        backgroundColor: '#F7F1E3',
        boxShadow: '4px 4px 0 rgba(0,0,0,0.18)',
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
        {node.memoryCard.title || 'You already know'}
      </div>
      <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {node.memoryCard.bullets.slice(0, 3).map((bullet, i) => (
          <li key={i} style={{ fontSize: '0.8rem', lineHeight: 1.45, color: '#1E1E1A' }}>
            {renderContentWithGlossary(interpolate(bullet, ctx))}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CoworkerRecap({ node, ctx }: { node: BriefingNode; ctx: BriefingContext }) {
  const recap = node.coworkerRecap
  const npc = recap?.npcId ? npcs[recap.npcId] : undefined
  const speakerName = recap?.speakerName || npc?.name || 'Your coworker'
  const speakerRole = recap?.speakerRole || npc?.role
  const turns = recap?.turns || []
  const [turnIndex, setTurnIndex] = useState(0)
  const [messages, setMessages] = useState<{ role: 'assistant' | 'user'; content: string }[]>([])
  const messagesRef = useRef<HTMLDivElement | null>(null)
  const complete = turns.length > 0 && turnIndex >= turns.length

  useEffect(() => {
    setTurnIndex(0)
    setMessages(turns[0] ? [{ role: 'assistant', content: turns[0].coworkerLine }] : [])
  }, [node.id])

  useEffect(() => {
    const messagesEl = messagesRef.current
    if (!messagesEl) return
    messagesEl.scrollTop = messagesEl.scrollHeight
  }, [messages])

  if (!recap || turns.length === 0) return null

  const advanceTurn = (nextMessages: { role: 'assistant' | 'user'; content: string }[]) => {
    const nextIndex = turnIndex + 1
    if (nextIndex < turns.length) {
      setTurnIndex(nextIndex)
      setMessages([...nextMessages, { role: 'assistant', content: turns[nextIndex].coworkerLine }])
    } else {
      setTurnIndex(nextIndex)
      setMessages([...nextMessages, { role: 'assistant', content: 'Great. That is enough context for the first newsroom decision.' }])
    }
  }

  const acknowledge = () => {
    if (complete) return
    advanceTurn([...messages, { role: 'user' as const, content: 'Okay' }])
  }

  return (
    <div
      style={{
        border: '1px solid #000',
        backgroundColor: '#EFE8D2',
        boxShadow: '4px 4px 0 rgba(0,0,0,0.24)',
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.7rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#1E1E1A' }}>{speakerName}</div>
          {speakerRole && <div style={{ fontSize: '0.68rem', color: '#6f6758' }}>{speakerRole}</div>}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#3A6B5E', fontWeight: 800 }}>
          Context {Math.min(turnIndex + 1, turns.length)}/{turns.length}
        </div>
      </div>
      <div ref={messagesRef} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '15rem', overflowY: 'auto' }}>
        {messages.map((message, i) => (
          <div
            key={i}
            style={{
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '86%',
              border: '1px solid #CDBF94',
              backgroundColor: message.role === 'user' ? '#DCE6D2' : '#F7F1E3',
              padding: '0.55rem 0.65rem',
              fontSize: '0.8rem',
              lineHeight: 1.45,
              color: '#1E1E1A',
              whiteSpace: 'pre-wrap',
            }}
          >
            {renderContentWithGlossary(interpolate(message.content, ctx))}
          </div>
        ))}
      </div>
      {!complete && (
        <button
          type="button"
          onClick={acknowledge}
          style={{
            alignSelf: 'flex-end',
            border: '1px solid #000',
            backgroundColor: '#F7F1E3',
            color: '#1E1E1A',
            boxShadow: '2px 2px 0 #000',
            padding: '0.55rem 0.9rem',
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          Okay
        </button>
      )}
    </div>
  )
}

function BriefingLeadIn({ node, ctx }: { node: BriefingNode; ctx: BriefingContext }) {
  if (!node.memoryCard && !node.coworkerRecap) return null
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <MemoryCard node={node} ctx={ctx} />
      <CoworkerRecap node={node} ctx={ctx} />
    </div>
  )
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

function resolveSocialPost(
  post: SocialPostData,
  ctx: { playerName: string; branchFlags: Record<string, string>; mcSelections: Record<string, string> },
): SocialPostData {
  return {
    ...post,
    handle: interpolate(post.handle, ctx),
    displayName: post.displayName ? interpolate(post.displayName, ctx) : undefined,
    timestamp: post.timestamp ? interpolate(post.timestamp, ctx) : undefined,
    content: interpolate(post.content, ctx),
    badge: post.badge ? interpolate(post.badge, ctx) : undefined,
    verification: post.verification ? interpolate(post.verification, ctx) : undefined,
    engagement: post.engagement ? interpolate(post.engagement, ctx) : undefined,
  }
}

function resolveCmsRule(
  rule: CmsSidebarRuleData,
  ctx: { playerName: string; branchFlags: Record<string, string>; mcSelections: Record<string, string> },
): CmsSidebarRuleData {
  return {
    ...rule,
    label: interpolate(rule.label, ctx),
    detail: interpolate(rule.detail, ctx),
  }
}

export function SocialFeed({ posts }: { posts: SocialPostData[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {posts.map((post, i) => (
        <div
          key={`${post.handle}-${i}`}
          style={{
            border: '1px solid rgba(0,0,0,0.18)',
            backgroundColor: '#FFFDF6',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', minWidth: 0 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#1E1E1A' }}>
              {post.displayName || post.handle}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#6F6A5B' }}>{post.handle}</span>
            {post.timestamp && <span style={{ fontSize: '0.7rem', color: '#8A8373', marginLeft: 'auto' }}>{post.timestamp}</span>}
          </div>
          <div style={{ fontSize: '0.875rem', lineHeight: 1.55, color: '#1E1E1A', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(post.content)}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {post.badge && (
              <span style={{ border: '1px solid #B87D6B', color: '#7A3E2E', backgroundColor: '#F8E4D8', padding: '0.15rem 0.45rem', fontSize: '0.68rem', fontWeight: 800 }}>
                {post.badge}
              </span>
            )}
            {post.verification && (
              <span style={{ border: '1px solid #000', color: '#1E1E1A', backgroundColor: '#F2EBD9', padding: '0.15rem 0.45rem', fontSize: '0.68rem', fontWeight: 700 }}>
                {post.verification}
              </span>
            )}
            {post.engagement && (
              <span style={{ color: '#6F6A5B', fontSize: '0.68rem', marginLeft: 'auto' }}>
                {post.engagement}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const cmsSeverityColors: Record<NonNullable<CmsSidebarRuleData['severity']>, { bg: string; border: string; color: string }> = {
  rule: { bg: '#F7F1E3', border: '#3A6B5E', color: '#234A42' },
  warning: { bg: '#F8E4D8', border: '#B87D6B', color: '#7A3E2E' },
  hold: { bg: '#F9DADA', border: '#c0392b', color: '#81261f' },
}

export function CmsSidebarRules({ rules }: { rules: CmsSidebarRuleData[] }) {
  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {rules.map((rule, i) => {
        const colors = cmsSeverityColors[rule.severity || 'rule']
        return (
          <div
            key={`${rule.label}-${i}`}
            style={{
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bg,
              padding: '0.7rem 0.8rem',
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 900, color: colors.color, textTransform: 'uppercase', letterSpacing: 0 }}>
              {rule.label}
            </div>
            <div style={{ marginTop: '0.3rem', fontSize: '0.8125rem', lineHeight: 1.55, color: '#1E1E1A' }}>
              {renderContentWithGlossary(rule.detail)}
            </div>
          </div>
        )
      })}
    </aside>
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
          {node.socialPosts && node.socialPosts.length > 0 && <SocialFeed posts={node.socialPosts.map((post) => resolveSocialPost(post, ctx))} />}
          {node.cmsSidebarRules && node.cmsSidebarRules.length > 0 && <CmsSidebarRules rules={node.cmsSidebarRules.map((rule) => resolveCmsRule(rule, ctx))} />}
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
          {s.socialPosts && s.socialPosts.length > 0 && <SocialFeed posts={s.socialPosts.map((post) => resolveSocialPost(post, ctx))} />}
          {s.cmsSidebarRules && s.cmsSidebarRules.length > 0 && <CmsSidebarRules rules={s.cmsSidebarRules.map((rule) => resolveCmsRule(rule, ctx))} />}
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

function AppGlyph({ id, color = '#3A6B5E' }: { id: AssignmentAppId; color?: string }) {
  if (id === 'messages') {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 6.5a3 3 0 013-3h8a3 3 0 013 3v5.5a3 3 0 01-3 3h-4.25L7 19v-4H8a3 3 0 01-3-3V6.5z" />
        <path d="M8 8h8M8 11h5" />
      </svg>
    )
  }
  if (id === 'email') {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3.5" y="5" width="17" height="14" rx="2" />
        <path d="M4 7l8 6 8-6" />
        <path d="M7.5 9.5v5M5 12h5" />
      </svg>
    )
  }
  if (id === 'stats') {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19h16M7 16V9M12 16V5M17 16v-4" />
        <path d="M6 9h2M11 5h2M16 12h2" />
      </svg>
    )
  }
  if (id === 'sns') {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 7h14M5 12h10M5 17h8" />
        <circle cx="18" cy="16" r="2" />
        <path d="M16.6 14.6l-2.2-2.2M19.4 17.4l1.6 1.6" />
      </svg>
    )
  }
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}

function AssignmentAppButton({
  id,
  label,
  badge,
  active,
  opened,
  onClick,
}: {
  id: AssignmentAppId
  label: string
  badge?: string
  active: boolean
  opened: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={`Open ${label}`}
      onClick={onClick}
      style={{
        position: 'relative',
        width: 84,
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
        <AppGlyph id={id} />
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
          maxWidth: 82,
          color: '#000',
          fontSize: '0.7rem',
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

function AssignmentDesktopBriefing({ node, onAdvance }: { node: BriefingNode; onAdvance: () => void }) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const [activeApp, setActiveApp] = useState<AssignmentAppId | null>(null)
  const [openedApps, setOpenedApps] = useState<Record<AssignmentAppId, boolean>>({
    messages: false,
    email: false,
    stats: false,
    sns: false,
    cms: false,
  })
  const ctx = { playerName, branchFlags, mcSelections }
  const injuryEmail = node.emails?.find((email) => email.subject.toLowerCase().includes('injury'))
  const scheduleEmail = node.emails?.find((email) => email.subject.toLowerCase().includes('schedule'))
  const sourceEmails = [injuryEmail, scheduleEmail].filter((email): email is EmailData => Boolean(email))
  const apps = [
    { id: 'messages' as const, label: 'Messages', badge: String(node.slackMessages?.length || 0), available: Boolean(node.slackMessages?.length) },
    { id: 'email' as const, label: 'Email', badge: String(sourceEmails.length), available: sourceEmails.length > 0 },
    { id: 'stats' as const, label: 'Stats Dashboard', badge: '1', available: Boolean(node.metrics?.length) },
    { id: 'sns' as const, label: 'Social Media Feed', badge: String(node.socialPosts?.length || 0), available: Boolean(node.socialPosts?.length) },
    { id: 'cms' as const, label: 'CMS Sidebar', badge: String(node.cmsSidebarRules?.length || 0), available: Boolean(node.cmsSidebarRules?.length) },
  ].filter((app) => app.available)

  const openApp = (id: AssignmentAppId) => {
    setActiveApp(id)
    setOpenedApps((prev) => ({ ...prev, [id]: true }))
  }
  const openedCount = apps.filter((app) => openedApps[app.id]).length
  const allOpened = apps.length > 0 && openedCount === apps.length

  const activeWindow = (() => {
    if (activeApp === 'messages' && node.slackMessages?.length) {
      return (
        <LaptopFrame variant="slack" title="Messages - #nba-cyclones" scrollable fill>
          <div style={{ padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {node.slackMessages.map((msg, i) => (
              <SlackMessageEnhanced
                key={i}
                message={resolveSlackMessage(msg, ctx)}
                delay={i * 0.12}
                initialExpanded
                showUnreadDot={false}
              />
            ))}
          </div>
        </LaptopFrame>
      )
    }
    if (activeApp === 'email' && sourceEmails.length > 0) {
      return (
        <LaptopFrame variant="email" title="Email inbox - work materials" scrollable fill>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.875rem' }}>
            {sourceEmails.map((email, i) => (
              <EmailBlock
                key={email.subject}
                email={{ ...email, content: interpolate(email.content, ctx) }}
                initialExpanded={i === 0}
              />
            ))}
          </div>
        </LaptopFrame>
      )
    }
    if (activeApp === 'stats' && node.metrics?.length) {
      return (
        <LaptopFrame variant="spreadsheet" title="Stats dashboard" scrollable fill>
          <MetricsTable metrics={node.metrics} />
        </LaptopFrame>
      )
    }
    if (activeApp === 'sns' && node.socialPosts?.length) {
      return (
        <LaptopFrame variant="doc" title="Social media feed" scrollable fill>
          <SocialFeed posts={node.socialPosts.map((post) => resolveSocialPost(post, ctx))} />
        </LaptopFrame>
      )
    }
    if (activeApp === 'cms' && node.cmsSidebarRules?.length) {
      return (
        <LaptopFrame variant="doc" title="CMS sidebar - publishability checks" scrollable fill>
          <CmsSidebarRules rules={node.cmsSidebarRules.map((rule) => resolveCmsRule(rule, ctx))} />
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

      <DesktopOverlay>
        <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
          <div
            style={{
              position: 'absolute',
              left: '1rem',
              top: '0.45rem',
              zIndex: 2,
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 84px)',
              columnGap: '0.15rem',
              rowGap: '0.45rem',
              alignContent: 'start',
            }}
          >
            {apps.map((app) => (
              <AssignmentAppButton
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
                inset: '0.5rem 1.25rem 1rem 190px',
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
                inset: '0.5rem 1.25rem 1rem 190px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(0,0,0,0.18)',
                backgroundColor: 'rgba(247, 241, 227, 0.72)',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3A6B5E', textAlign: 'center', maxWidth: 290, lineHeight: 1.45 }}>
                Open the materials you need before replying to Tessa.
              </div>
            </div>
          )}
        </div>
      </DesktopOverlay>

      <div style={{ fontSize: '0.75rem', color: '#555', textAlign: 'center' }}>
        {openedCount} of {apps.length} sources reviewed
      </div>

      <ActionButton text={node.actionLabel || 'Continue'} onClick={onAdvance} disabled={!allOpened} variant={allOpened ? 'primary' : 'secondary'} />
      {import.meta.env.DEV && (
        <ActionButton text="Skip (dev)" onClick={onAdvance} variant="secondary" fullWidth={false} />
      )}
    </>
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
        <LaptopFrame variant="spreadsheet" title="Stats dashboard">
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
      {s.socialPosts && s.socialPosts.length > 0 && (
        <DesktopOverlay>
          <LaptopFrame variant="doc" title="Social media feed" scrollable fill>
            <SocialFeed posts={s.socialPosts.map((post) => resolveSocialPost(post, { playerName, branchFlags, mcSelections }))} />
          </LaptopFrame>
        </DesktopOverlay>
      )}
      {s.cmsSidebarRules && s.cmsSidebarRules.length > 0 && (
        <DesktopOverlay width="48%" height="82%">
          <LaptopFrame variant="doc" title="CMS sidebar - publishability checks" scrollable fill>
            <CmsSidebarRules rules={s.cmsSidebarRules.map((rule) => resolveCmsRule(rule, { playerName, branchFlags, mcSelections }))} />
          </LaptopFrame>
        </DesktopOverlay>
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

        {node.id === 'assignment_brief' ? (
          <AssignmentDesktopBriefing node={node} onAdvance={onAdvance} />
        ) : mode === 'sequential' ? (
          <SequentialBriefing node={node} onAdvance={onAdvance} />
        ) : mode === 'paginated' ? (
          <PaginatedBriefing node={node} onAdvance={onAdvance} />
        ) : (
          <>
            <BriefingLeadIn node={node} ctx={{ playerName, branchFlags, mcSelections }} />
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
            {node.metrics && (
              <DesktopOverlay>
                <LaptopFrame variant="spreadsheet" title="Stats dashboard" scrollable fill>
                  <MetricsTable metrics={node.metrics} />
                </LaptopFrame>
              </DesktopOverlay>
            )}
            {node.socialPosts && node.socialPosts.length > 0 && (
              <DesktopOverlay>
                <LaptopFrame variant="doc" title="Social media feed" scrollable fill>
                  <SocialFeed posts={node.socialPosts.map((post) => resolveSocialPost(post, { playerName, branchFlags, mcSelections }))} />
                </LaptopFrame>
              </DesktopOverlay>
            )}
            {node.cmsSidebarRules && node.cmsSidebarRules.length > 0 && (
              <DesktopOverlay width="48%" height="82%">
                <LaptopFrame variant="doc" title="CMS sidebar - publishability checks" scrollable fill>
                  <CmsSidebarRules rules={node.cmsSidebarRules.map((rule) => resolveCmsRule(rule, { playerName, branchFlags, mcSelections }))} />
                </LaptopFrame>
              </DesktopOverlay>
            )}
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
