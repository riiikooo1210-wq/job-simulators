import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
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
type NoteSection = NonNullable<FreeTextNode['noteSections']>[number]

type WellNestScreen = 'home' | 'hydration'

const wellNestHomeInstruction = 'Click the Hydration card.'
const wellNestWorkspaceMaxHeight = 500

const wellNestHabits = [
  { label: 'Hydration', detail: '6 of 8 glasses', progress: 75, streak: 'Personal 7-day streak', color: '#4F8F9A' },
  { label: 'Movement', detail: '22 min today', progress: 48, streak: 'Personal 4-day streak', color: '#8BA45F' },
  { label: 'Sleep', detail: '7 hr 20 min', progress: 82, streak: 'Personal 12-day streak', color: '#B98068' },
]

function parseSectionedResponse(value: string, sections: NoteSection[]): Record<string, string> {
  const parsed = Object.fromEntries(sections.map((section) => [section.key, ''])) as Record<string, string>
  if (!value) return parsed

  const matches = sections
    .map((section) => {
      const marker = `${section.label}\n`
      const start = value.indexOf(marker)
      return start >= 0 ? { section, start, contentStart: start + marker.length } : null
    })
    .filter((match): match is { section: NoteSection; start: number; contentStart: number } => Boolean(match))
    .sort((a, b) => a.start - b.start)

  if (!matches.length) {
    parsed[sections[0].key] = value
    return parsed
  }

  matches.forEach((match, index) => {
    const nextStart = matches[index + 1]?.start ?? value.length
    let content = value.slice(match.contentStart, nextStart)
    if (matches[index + 1] && content.endsWith('\n\n')) {
      content = content.slice(0, -2)
    }
    parsed[match.section.key] = content
  })

  return parsed
}

function serializeSectionedResponse(sections: NoteSection[], values: Record<string, string>): string {
  return sections
    .map((section) => {
      const body = values[section.key] || ''
      return body ? `${section.label}\n${body}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function ProgressRing({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        border: '1px solid #CDBF94',
        background: `conic-gradient(${color} ${value * 3.6}deg, #E9E2D1 0deg)`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 31,
          height: 31,
          borderRadius: '50%',
          background: '#FBF7EA',
          display: 'grid',
          placeItems: 'center',
          fontSize: '0.58rem',
          fontWeight: 900,
          color: '#1E1E1A',
        }}
      >
        {value}%
      </div>
    </div>
  )
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: '100%',
        maxHeight: wellNestWorkspaceMaxHeight,
        aspectRatio: '9 / 19.5',
        border: '2px solid #1E1E1A',
        borderRadius: 28,
        background: '#1E1E1A',
        padding: '0.5rem',
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          height: '100%',
          background: '#FBF7EA',
          border: '1px solid #CDBF94',
          borderRadius: 22,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </div>
  )
}

function BottomNav({
  onNavigateHome,
  onInactive,
}: {
  onNavigateHome: () => void
  onInactive: (message: string) => void
}) {
  const items: { id: 'home' | 'profile'; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'profile', label: 'Profile' },
  ]

  return (
    <div
      style={{
        borderTop: '1px solid #CDBF94',
        background: '#EFE8D2',
        padding: '0.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.35rem',
        flexShrink: 0,
      }}
    >
      {items.map((item) => {
        const selected = item.id === 'home'
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              if (item.id === 'profile') {
                onInactive('Profile is not needed for this task. Focus on Home and Hydration.')
                return
              }
              onNavigateHome()
            }}
            style={{
              border: selected ? '1px solid #000' : '1px solid transparent',
              background: selected ? '#DCE6D2' : 'transparent',
              color: selected ? '#1E1E1A' : '#6A604B',
              padding: '0.35rem 0.2rem',
              font: 'inherit',
              fontSize: '0.62rem',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function ClickableCard({
  children,
  onClick,
  inactive = false,
}: {
  children: ReactNode
  onClick: () => void
  inactive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        border: '1px solid #CDBF94',
        background: inactive ? '#EFE8D2' : '#F7F1E3',
        padding: '0.62rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '0.5rem',
        alignItems: 'center',
        cursor: 'pointer',
        font: 'inherit',
        color: '#1E1E1A',
        opacity: inactive ? 0.72 : 1,
      }}
    >
      {children}
    </button>
  )
}

function HomeScreen({ onNavigate, onInactive }: { onNavigate: (screen: WellNestScreen) => void; onInactive: (label: string) => void }) {
  return (
    <>
      <div style={{ padding: '0.75rem', borderBottom: '1px solid #CDBF94', background: '#EFE8D2', flexShrink: 0 }}>
        <div style={{ fontSize: '0.62rem', lineHeight: 1.25, color: '#8A513E', fontWeight: 800, marginBottom: '0.35rem' }}>
          {wellNestHomeInstruction}
        </div>
        <div style={{ fontSize: '0.66rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
          WellNest
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1E1E1A' }}>Today</div>
      </div>
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.58rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {wellNestHabits.map((habit) => {
          const isHydration = habit.label === 'Hydration'
          return (
            <ClickableCard
              key={habit.label}
              onClick={() => isHydration ? onNavigate('hydration') : onInactive(`${habit.label} is visible for context; use Hydration for this task.`)}
              inactive={!isHydration}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 900 }}>{habit.label}</div>
                <div style={{ fontSize: '0.68rem', color: '#6A604B' }}>{habit.detail}</div>
                <div style={{ marginTop: 4, fontSize: '0.64rem', color: '#8A513E', fontWeight: 800 }}>
                  {habit.streak}
                </div>
              </div>
              <ProgressRing value={habit.progress} color={habit.color} />
            </ClickableCard>
          )
        })}
      </div>
      <BottomNav onNavigateHome={() => onNavigate('home')} onInactive={onInactive} />
    </>
  )
}

function HydrationDetailScreen({
  onNavigate,
  onInactive,
}: {
  onNavigate: (screen: WellNestScreen) => void
  onInactive: (message: string) => void
}) {
  return (
    <>
      <div style={{ padding: '0.75rem', borderBottom: '1px solid #CDBF94', background: '#EFE8D2', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          style={{
            border: 0,
            background: 'transparent',
            color: '#3A6B5E',
            padding: 0,
            font: 'inherit',
            fontSize: '0.66rem',
            fontWeight: 900,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Back to Home
        </button>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1E1E1A', marginTop: 2 }}>Hydration</div>
      </div>
      <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.62rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <section style={{ border: '1px solid #CDBF94', background: '#F7F1E3', padding: '0.7rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
            Today
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 900, color: '#1E1E1A', marginTop: 2 }}>6 of 8 glasses</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.25rem', marginTop: '0.55rem' }}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                style={{
                  aspectRatio: '1 / 1',
                  border: '1px solid #4F8F9A',
                  background: index < 6 ? '#B8D8DD' : '#FFFDF5',
                }}
              />
            ))}
          </div>
        </section>
        <section style={{ border: '1px solid #CDBF94', background: '#F7F1E3', padding: '0.7rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#8A513E', textTransform: 'uppercase' }}>
            Personal streak
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.55rem', alignItems: 'center', marginTop: '0.45rem' }}>
            <div
              style={{
                border: '1px solid #B98068',
                background: '#F4E2D9',
                borderRadius: '50%',
                width: 46,
                height: 46,
                display: 'grid',
                placeItems: 'center',
                color: '#8A513E',
                fontWeight: 900,
                fontSize: '0.72rem',
              }}
            >
              7
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#1E1E1A' }}>7-day streak</div>
              <div style={{ fontSize: '0.67rem', lineHeight: 1.35, color: '#6A604B' }}>Personal progress only</div>
            </div>
          </div>
        </section>
        <button
          type="button"
          style={{
            border: '1px solid #000',
            background: '#3A6B5E',
            color: '#F7F1E3',
            boxShadow: '2px 2px 0 #000',
            padding: '0.65rem',
            font: 'inherit',
            fontSize: '0.78rem',
            fontWeight: 900,
          }}
        >
          Mark Complete
        </button>
      </div>
      <BottomNav onNavigateHome={() => onNavigate('home')} onInactive={onInactive} />
    </>
  )
}

function WellNestExistingAppMock({ onHintChange }: { onHintChange: (message: string) => void }) {
  const [screen, setScreen] = useState<WellNestScreen>('home')

  const navigate = (next: WellNestScreen) => {
    setScreen(next)
    onHintChange(next === 'hydration' ? 'Hydration Detail shows personal progress only. Friend Streaks has not been added yet.' : '')
  }

  const inactive = (message: string) => onHintChange(message)

  return (
    <section
      aria-label="Existing WellNest app screens"
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 0,
        flex: '0 0 auto',
      }}
    >
      <PhoneFrame>
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {screen === 'home' && <HomeScreen onNavigate={navigate} onInactive={inactive} />}
          {screen === 'hydration' && <HydrationDetailScreen onNavigate={navigate} onInactive={inactive} />}
        </div>
      </PhoneFrame>
    </section>
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
  const [wellNestHint, setWellNestHint] = useState('')

  const value = responses[node.id] || ''
  const noteSections = node.noteSections || []
  const sectionValues = noteSections.length ? parseSectionedResponse(value, noteSections) : {}
  const responseText = noteSections.length ? noteSections.map((section) => sectionValues[section.key]).join(' ') : value
  const wordCount = countWords(responseText)
  const meetsMin = !node.minWords || wordCount >= node.minWords
  const underMax = !node.maxWords || wordCount <= node.maxWords
  const canSubmit = meetsMin && underMax

  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const renderedPrompt = node.prompt ? interpolate(node.prompt, { playerName, branchFlags, mcSelections }) : ''

  const updateNoteSection = (sectionKey: string, nextValue: string) => {
    const nextValues = { ...sectionValues, [sectionKey]: nextValue }
    setFreeTextResponse(node.id, serializeSectionedResponse(noteSections, nextValues))
  }

  const editorContent = (
    <>
      {noteSections.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {noteSections.map((section) => (
            <section
              key={section.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.84rem', lineHeight: 1.55, fontWeight: 700, color: '#1E1E1A' }}>
                {section.guidance}
              </div>
              <LongFormEditor
                value={sectionValues[section.key] || ''}
                onChange={(v) => updateNoteSection(section.key, v)}
                placeholder={section.placeholder}
                minRows={section.minRows ?? 5}
              />
            </section>
          ))}
        </div>
      ) : (
        <LongFormEditor
          value={value}
          onChange={(v) => setFreeTextResponse(node.id, v)}
          placeholder={node.placeholder}
          maxWords={node.maxWords}
          minRows={6}
        />
      )}
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
        {renderedPrompt.trim() && (
          <div
            style={{
              backgroundColor: '#F7F1E3',
              border: '1px solid #000',
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {renderedPrompt}
          </div>
        )}

        {node.wellNestAppMock && (
          <div
            style={{
              border: '1px solid #000',
              background: '#F7F1E3',
              boxShadow: '2px 2px 0 #000',
              padding: '0.7rem 0.85rem',
              display: 'grid',
              gap: '0.25rem',
              fontSize: '0.78rem',
              lineHeight: 1.45,
              color: '#4B4538',
            }}
          >
            <div style={{ color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>
              Explore the current WellNest app before writing.
            </div>
            <div style={{ color: '#8A513E', fontWeight: 800 }}>Friend Streaks has not been added yet.</div>
            {wellNestHint && (
              <div aria-live="polite" style={{ borderTop: '1px solid #CDBF94', marginTop: '0.25rem', paddingTop: '0.35rem' }}>
                {wellNestHint}
              </div>
            )}
          </div>
        )}

        {appWindow ? (
          <DesktopOverlay>
            {node.wellNestAppMock ? (
              <div style={{ display: 'flex', alignItems: 'stretch', gap: '0.85rem', width: '100%', height: '100%', maxHeight: wellNestWorkspaceMaxHeight, minWidth: 0, margin: 'auto 0' }}>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <LaptopFrame variant={appWindow} title={node.windowTitle} fill scrollable>
                    {editorContent}
                  </LaptopFrame>
                </div>
                <WellNestExistingAppMock onHintChange={setWellNestHint} />
              </div>
            ) : (
              <LaptopFrame variant={appWindow} title={node.windowTitle} fill scrollable>
                {editorContent}
              </LaptopFrame>
            )}
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
