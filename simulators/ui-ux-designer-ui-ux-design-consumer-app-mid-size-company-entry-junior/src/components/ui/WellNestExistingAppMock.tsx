import { useState, type ReactNode } from 'react'

type WellNestHabitId = 'hydration' | 'movement' | 'sleep'
type WellNestProfileDetailId = 'profile_goals' | 'profile_streaks' | 'profile_privacy'
type WellNestScreen = 'home' | WellNestHabitId | 'profile' | WellNestProfileDetailId
interface WellNestExistingAppMockProps {
  onHintChange?: (message: string) => void
  showReset?: boolean
  maxPhoneWidth?: number
}

const wellNestHomeInstruction = 'Tap any card to explore.'
export const wellNestTaskHint = 'Explore first, then write: tap habit cards, compare Home with detail screens, check Profile, then fill both note boxes. Friend Streaks is not in the app yet.'
export const wellNestFlowReferenceHint = 'Use the current WellNest app as your reference while you build the flow. Friend Streaks is not in the app yet.'
export const wellNestWorkspaceMaxHeight = 720

const wellNestHabits = [
  { id: 'hydration', label: 'Hydration', detail: '6 of 8 glasses', progress: 75, streak: 'Personal 7-day streak', color: '#0EA5E9', unitLabel: 'glasses', goalText: 'Goal: 8 glasses', actionLabel: 'Mark Complete', insight: 'Hydration already has habit details, progress, and a clear completion action.' },
  { id: 'movement', label: 'Movement', detail: '22 min today', progress: 48, streak: 'Personal 4-day streak', color: '#84CC16', unitLabel: 'minutes', goalText: 'Goal: 45 minutes', actionLabel: 'Mark Complete', insight: 'Movement shows another habit card pattern students can compare with Hydration.' },
  { id: 'sleep', label: 'Sleep', detail: '7 hr 20 min', progress: 82, streak: 'Personal 12-day streak', color: '#6366F1', unitLabel: 'sleep', goalText: 'Goal: 8 hours', actionLabel: 'Mark Complete', insight: 'Sleep shows how a different habit still uses the same progress and streak pattern.' },
] as const

type WellNestHabit = typeof wellNestHabits[number]

const profileSections = [
  {
    id: 'profile_goals',
    title: 'Daily goals',
    body: 'Hydration, Movement, and Sleep are tracked on Home.',
    detail: 'This page shows the habits Ava is already tracking. A shared feature should still make the habit clear, because Friend Streaks is about one habit at a time.',
  },
  {
    id: 'profile_streaks',
    title: 'Streaks',
    body: 'Personal streaks are already in the app. Friend Streaks has not been added yet.',
    detail: 'This page reminds you that WellNest already uses personal streaks. Friend Streaks would need to explain how a shared streak is different from a personal streak.',
  },
  {
    id: 'profile_privacy',
    title: 'Privacy',
    body: 'Shared features should make it clear which habit and friend are involved.',
    detail: 'This page shows why sharing needs clear labels. Users should understand what they are sharing, who they are sharing it with, and what stays personal.',
  },
] as const

type WellNestProfileSection = typeof profileSections[number]

function ProgressRing({ value, color }: { value: number; color: string }) {
  return (
    <div
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: `conic-gradient(${color} ${value * 3.6}deg, #E5E7EB 0deg)`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        boxShadow: 'inset 0 0 0 1px rgba(15, 23, 42, 0.08)',
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: '#FFFFFF',
          display: 'grid',
          placeItems: 'center',
          fontSize: '0.58rem',
          fontWeight: 900,
          color: '#111827',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.12)',
        }}
      >
        {value}%
      </div>
    </div>
  )
}

function PhoneFrame({ children, maxWidth }: { children: ReactNode; maxWidth?: number }) {
  return (
    <div
      style={{
        width: maxWidth ? `min(100%, ${maxWidth}px)` : undefined,
        height: maxWidth ? 'auto' : '100%',
        maxHeight: wellNestWorkspaceMaxHeight,
        aspectRatio: '9 / 19.5',
        border: '1px solid #111827',
        borderRadius: 34,
        background: '#0F172A',
        padding: '0.45rem',
        boxSizing: 'border-box',
        flexShrink: 0,
        boxShadow: '0 18px 44px rgba(15, 23, 42, 0.28)',
      }}
    >
      <div
        style={{
          height: '100%',
          background: '#F8FAFC',
          border: '1px solid rgba(255,255,255,0.14)',
          borderRadius: 28,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ position: 'absolute', top: 7, left: '50%', transform: 'translateX(-50%)', width: 48, height: 4, borderRadius: 99, background: '#111827', zIndex: 2 }} />
        <div style={{ height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.7rem', color: '#111827', fontSize: '0.52rem', fontWeight: 800 }}>
          <span>9:30</span>
          <span style={{ letterSpacing: 1 }}>LTE</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function BottomNav({
  active,
  onNavigateHome,
  onNavigateProfile,
}: {
  active: 'home' | 'profile'
  onNavigateHome: () => void
  onNavigateProfile: () => void
}) {
  const items: { id: 'home' | 'profile'; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'profile', label: 'Profile' },
  ]

  return (
    <div
      style={{
        borderTop: '1px solid #E5E7EB',
        background: 'rgba(255,255,255,0.92)',
        padding: '0.42rem 0.5rem 0.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.42rem',
        flexShrink: 0,
        boxShadow: '0 -8px 24px rgba(15, 23, 42, 0.05)',
      }}
    >
      {items.map((item) => {
        const selected = item.id === active
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.id === 'home' ? onNavigateHome : onNavigateProfile}
            style={{
              border: '1px solid transparent',
              borderRadius: 12,
              background: selected ? '#E0F2FE' : 'transparent',
              color: selected ? '#0369A1' : '#64748B',
              padding: '0.32rem 0.2rem',
              font: 'inherit',
              fontSize: '0.6rem',
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
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        border: '1px solid #DBEAFE',
        borderRadius: 18,
        background: '#FFFFFF',
        padding: '0.68rem',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '0.5rem',
        alignItems: 'center',
        cursor: 'pointer',
        font: 'inherit',
        color: '#111827',
        boxShadow: '0 8px 22px rgba(15, 23, 42, 0.08)',
      }}
    >
      {children}
    </button>
  )
}

function HomeScreen({
  onNavigate,
  completedHabits,
}: {
  onNavigate: (screen: WellNestScreen) => void
  completedHabits: Record<WellNestHabitId, boolean>
}) {
  return (
    <>
      <div style={{ padding: '0.7rem 0.75rem 0.8rem', background: 'linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 100%)', flexShrink: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #BAE6FD', borderRadius: 999, padding: '0.18rem 0.5rem', background: '#FFFFFF', fontSize: '0.56rem', lineHeight: 1.25, color: '#0369A1', fontWeight: 900, marginBottom: '0.45rem' }}>
          {wellNestHomeInstruction}
        </div>
        <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#0F766E', textTransform: 'uppercase' }}>
          WellNest
        </div>
        <div style={{ fontSize: '1.08rem', fontWeight: 900, color: '#111827', lineHeight: 1.1 }}>Today</div>
        <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: 3 }}>Your daily habit check-in</div>
      </div>
      <div style={{ padding: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.58rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {wellNestHabits.map((habit) => {
          const completed = completedHabits[habit.id]
          return (
            <ClickableCard
              key={habit.label}
              onClick={() => onNavigate(habit.id)}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#111827' }}>{habit.label}</div>
                <div style={{ fontSize: '0.66rem', color: '#64748B', marginTop: 2 }}>{habit.detail}</div>
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.58rem', color: '#0369A1', fontWeight: 900 }}>{habit.streak}</span>
                  <span style={{ borderRadius: 999, background: '#EFF6FF', color: '#1D4ED8', padding: '0.08rem 0.32rem', fontSize: '0.52rem', fontWeight: 900 }}>
                    Tap to open
                  </span>
                  {completed && (
                    <span style={{ borderRadius: 999, background: '#DCFCE7', color: '#166534', padding: '0.08rem 0.32rem', fontSize: '0.52rem', fontWeight: 900 }}>
                      Done
                    </span>
                  )}
                </div>
              </div>
              <ProgressRing value={habit.progress} color={habit.color} />
            </ClickableCard>
          )
        })}
      </div>
      <BottomNav active="home" onNavigateHome={() => onNavigate('home')} onNavigateProfile={() => onNavigate('profile')} />
    </>
  )
}

function HabitDetailScreen({
  habit,
  completed,
  onMarkComplete,
  onNavigate,
}: {
  habit: WellNestHabit
  completed: boolean
  onMarkComplete: (habitId: WellNestHabitId) => void
  onNavigate: (screen: WellNestScreen) => void
}) {
  const isHydration = habit.id === 'hydration'

  return (
    <>
      <div style={{ padding: '0.7rem 0.75rem 0.75rem', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FAFC 100%)', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onNavigate('home')}
          style={{
            border: 0,
            background: 'transparent',
            color: '#0369A1',
            padding: 0,
            font: 'inherit',
            fontSize: '0.62rem',
            fontWeight: 900,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Back to Home
        </button>
        <div style={{ fontSize: '1.08rem', fontWeight: 900, color: '#111827', marginTop: 4 }}>{habit.label}</div>
        <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: 2 }}>{habit.goalText}</div>
      </div>
      <div style={{ padding: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.62rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <section style={{ border: '1px solid #DBEAFE', background: '#FFFFFF', padding: '0.72rem', borderRadius: 18, boxShadow: '0 8px 22px rgba(15, 23, 42, 0.08)' }}>
          <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#0F766E', textTransform: 'uppercase' }}>
            Today
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.65rem', alignItems: 'center', marginTop: 4 }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#111827' }}>{completed ? 'Done today' : habit.detail}</div>
              <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: 2 }}>{habit.unitLabel}</div>
            </div>
            <ProgressRing value={completed ? 100 : habit.progress} color={habit.color} />
          </div>
          {isHydration ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '0.25rem', marginTop: '0.55rem' }}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  style={{
                    aspectRatio: '1 / 1',
                    border: '1px solid #BAE6FD',
                    borderRadius: 7,
                    background: completed || index < 6 ? 'linear-gradient(180deg, #7DD3FC 0%, #0EA5E9 100%)' : '#F8FAFC',
                  }}
                />
              ))}
            </div>
          ) : (
            <div style={{ height: 7, borderRadius: 99, background: '#E2E8F0', overflow: 'hidden', marginTop: '0.6rem' }}>
              <div style={{ width: `${completed ? 100 : habit.progress}%`, height: '100%', background: habit.color }} />
            </div>
          )}
        </section>
        <section style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', padding: '0.72rem', borderRadius: 18 }}>
          <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#EA580C', textTransform: 'uppercase' }}>
            Personal streak
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.55rem', alignItems: 'center', marginTop: '0.45rem' }}>
            <div
              style={{
                border: '1px solid #FED7AA',
                background: '#FFF7ED',
                borderRadius: '50%',
                width: 46,
                height: 46,
                display: 'grid',
                placeItems: 'center',
                color: '#C2410C',
                fontWeight: 900,
                fontSize: '0.72rem',
              }}
            >
              {habit.streak.match(/\d+/)?.[0] ?? '1'}
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: '#111827' }}>{habit.streak.replace('Personal ', '')}</div>
              <div style={{ fontSize: '0.64rem', lineHeight: 1.35, color: '#64748B' }}>Personal progress only</div>
            </div>
          </div>
        </section>
        <section style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', padding: '0.72rem', borderRadius: 18 }}>
          <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase' }}>
            Design clue
          </div>
          <div style={{ marginTop: 4, fontSize: '0.66rem', lineHeight: 1.45, color: '#475569' }}>
            {habit.insight}
          </div>
        </section>
        <button
          type="button"
          onClick={() => onMarkComplete(habit.id)}
          style={{
            border: 'none',
            borderRadius: 16,
            background: completed ? '#166534' : '#0F766E',
            color: '#FFFFFF',
            boxShadow: '0 10px 24px rgba(15, 118, 110, 0.24)',
            padding: '0.65rem',
            font: 'inherit',
            fontSize: '0.78rem',
            fontWeight: 900,
          }}
        >
          {completed ? 'Completed Today' : habit.actionLabel}
        </button>
      </div>
      <BottomNav active="home" onNavigateHome={() => onNavigate('home')} onNavigateProfile={() => onNavigate('profile')} />
    </>
  )
}

function ProfileScreen({ onNavigate }: { onNavigate: (screen: WellNestScreen) => void }) {
  return (
    <>
      <div style={{ padding: '0.7rem 0.75rem 0.75rem', background: 'linear-gradient(180deg, #F5F3FF 0%, #F8FAFC 100%)', flexShrink: 0 }}>
        <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#6D28D9', textTransform: 'uppercase' }}>Profile</div>
        <div style={{ fontSize: '1.08rem', fontWeight: 900, color: '#111827', marginTop: 4 }}>Ava Lee</div>
        <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: 2 }}>Healthy habits, one day at a time</div>
      </div>
      <div style={{ padding: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.62rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {profileSections.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            style={{
              width: '100%',
              border: '1px solid #E2E8F0',
              background: '#FFFFFF',
              padding: '0.72rem',
              borderRadius: 18,
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '0.5rem',
              alignItems: 'center',
              textAlign: 'left',
              font: 'inherit',
              cursor: 'pointer',
              boxShadow: '0 7px 18px rgba(15, 23, 42, 0.05)',
            }}
          >
            <span>
              <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 900, color: '#111827' }}>{item.title}</span>
              <span style={{ display: 'block', marginTop: 4, fontSize: '0.64rem', lineHeight: 1.4, color: '#64748B' }}>{item.body}</span>
            </span>
            <span aria-hidden="true" style={{ color: '#94A3B8', fontSize: '0.95rem', fontWeight: 900 }}>›</span>
          </button>
        ))}
      </div>
      <BottomNav active="profile" onNavigateHome={() => onNavigate('home')} onNavigateProfile={() => onNavigate('profile')} />
    </>
  )
}

function ProfileDetailScreen({
  section,
  onNavigate,
}: {
  section: WellNestProfileSection
  onNavigate: (screen: WellNestScreen) => void
}) {
  return (
    <>
      <div style={{ padding: '0.7rem 0.75rem 0.75rem', background: 'linear-gradient(180deg, #F5F3FF 0%, #F8FAFC 100%)', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => onNavigate('profile')}
          style={{
            border: 0,
            background: 'transparent',
            color: '#6D28D9',
            padding: 0,
            font: 'inherit',
            fontSize: '0.62rem',
            fontWeight: 900,
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Back to Profile
        </button>
        <div style={{ fontSize: '1.08rem', fontWeight: 900, color: '#111827', marginTop: 4 }}>{section.title}</div>
        <div style={{ fontSize: '0.62rem', color: '#64748B', marginTop: 2 }}>Profile setting</div>
      </div>
      <div style={{ padding: '0.72rem', display: 'flex', flexDirection: 'column', gap: '0.62rem', flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <section style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', padding: '0.78rem', borderRadius: 18 }}>
          <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#6D28D9', textTransform: 'uppercase' }}>
            Summary
          </div>
          <div style={{ marginTop: 5, fontSize: '0.72rem', lineHeight: 1.45, color: '#334155', fontWeight: 800 }}>
            {section.body}
          </div>
        </section>
        <section style={{ border: '1px solid #E2E8F0', background: '#FFFFFF', padding: '0.78rem', borderRadius: 18 }}>
          <div style={{ fontSize: '0.58rem', fontWeight: 900, color: '#475569', textTransform: 'uppercase' }}>
            Design note
          </div>
          <div style={{ marginTop: 5, fontSize: '0.66rem', lineHeight: 1.45, color: '#475569' }}>
            {section.detail}
          </div>
        </section>
      </div>
      <BottomNav active="profile" onNavigateHome={() => onNavigate('home')} onNavigateProfile={() => onNavigate('profile')} />
    </>
  )
}

export default function WellNestExistingAppMock({ onHintChange = () => {}, showReset = false, maxPhoneWidth }: WellNestExistingAppMockProps) {
  const [screen, setScreen] = useState<WellNestScreen>('home')
  const [completedHabits, setCompletedHabits] = useState<Record<WellNestHabitId, boolean>>({
    hydration: false,
    movement: false,
    sleep: false,
  })

  const navigate = (next: WellNestScreen) => {
    setScreen(next)
    if (next === 'home') {
      onHintChange('')
      return
    }
    if (next === 'profile') {
      onHintChange('Profile shows personal settings and reminds you that Friend Streaks has not been added yet.')
      return
    }
    const profileSection = profileSections.find((item) => item.id === next)
    if (profileSection) {
      onHintChange(`${profileSection.title} shows profile context. Use it as background, not as an extra required answer.`)
      return
    }
    const habit = wellNestHabits.find((item) => item.id === next)
    onHintChange(habit ? `${habit.label} Detail is a habit detail screen. A starting place for Friend Streaks should connect to a habit like this.` : '')
  }

  const markComplete = (habitId: WellNestHabitId) => {
    setCompletedHabits((current) => ({ ...current, [habitId]: true }))
    const habit = wellNestHabits.find((item) => item.id === habitId)
    onHintChange(habit ? `${habit.label} is marked complete. Notice how the app already has a clear habit action that Friend Streaks could build on.` : '')
  }

  const resetApp = () => {
    setScreen('home')
    setCompletedHabits({
      hydration: false,
      movement: false,
      sleep: false,
    })
    onHintChange('App reset. Try tapping Hydration, marking it complete, or checking Profile.')
  }

  const selectedHabit = wellNestHabits.find((habit) => habit.id === screen)
  const selectedProfileSection = profileSections.find((item) => item.id === screen)

  return (
    <section
      aria-label="Existing WellNest app screens"
      style={{
        height: '100%',
        display: 'grid',
        gridTemplateRows: showReset ? 'auto minmax(0, 1fr)' : 'minmax(0, 1fr)',
        gap: '0.45rem',
        minHeight: 0,
        flex: '0 0 auto',
      }}
    >
      {showReset && (
        <button
          type="button"
          data-ui-action="wellnest-reset-app"
          onClick={resetApp}
          style={{
            justifySelf: 'end',
            border: '1px solid #BAE6FD',
            borderRadius: 999,
            background: '#EFF6FF',
            color: '#0369A1',
            padding: '0.28rem 0.58rem',
            font: 'inherit',
            fontSize: '0.66rem',
            fontWeight: 900,
            cursor: 'pointer',
          }}
        >
          Reset app
        </button>
      )}
      <div style={{ minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PhoneFrame maxWidth={maxPhoneWidth}>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {screen === 'home' && <HomeScreen onNavigate={navigate} completedHabits={completedHabits} />}
            {selectedHabit && (
              <HabitDetailScreen
                habit={selectedHabit}
                completed={completedHabits[selectedHabit.id]}
                onMarkComplete={markComplete}
                onNavigate={navigate}
              />
            )}
            {screen === 'profile' && <ProfileScreen onNavigate={navigate} />}
            {selectedProfileSection && (
              <ProfileDetailScreen
                section={selectedProfileSection}
                onNavigate={navigate}
              />
            )}
          </div>
        </PhoneFrame>
      </div>
    </section>
  )
}
