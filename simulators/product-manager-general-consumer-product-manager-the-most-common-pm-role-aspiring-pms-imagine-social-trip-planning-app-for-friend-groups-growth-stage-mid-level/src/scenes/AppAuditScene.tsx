import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import AppAuditCompanionPanel from '../components/ui/AppAuditCompanionPanel'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { storyline } from '../data/storyline'
import type { AppAuditAction, AppAuditInteraction, AppAuditNode, AppAuditObservation, AppAuditScreen, SourceWorkspaceApp } from '../types/game'

interface Props {
  node: AppAuditNode
}

type AuditNotes = Record<string, string>
type PhoneInputs = Record<string, string>

interface PhoneSheetState {
  id: string
  title: string
  body?: string
  inputKey?: string
  inputLabel?: string
  inputPlaceholder?: string
  buttonLabel?: string
  successMessage?: string
  successBody?: string
}

const statusStyles = {
  complete: { bg: '#DCE6D2', fg: '#315D50', label: 'Complete' },
  pending: { bg: '#EFE8D2', fg: '#6A604B', label: 'Pending' },
  quiet: { bg: '#F2EBD9', fg: '#6A604B', label: 'No response' },
  warning: { bg: '#E8D0C7', fg: '#7B3D32', label: 'Needs attention' },
}

const phoneTabItems = [
  { label: 'Trip', targetScreenId: 'create_trip', activeFor: ['create_trip', 'date_budget'] },
  { label: 'Friends', targetScreenId: 'invite_status', activeFor: ['invite_status'] },
  { label: 'Places', targetScreenId: 'saved_places', activeFor: ['saved_places'] },
  { label: 'Plan', targetScreenId: 'itinerary_empty', activeFor: ['itinerary_empty'] },
]

function parseNotes(raw: string | undefined): AuditNotes {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function ActionResultCard({ action }: { action: AppAuditAction }) {
  return (
    <section
      style={{
        border: '1px solid #D8E0E8',
        background: '#FFFFFF',
        borderRadius: 8,
        padding: '0.72rem',
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}
    >
      <div style={{ fontSize: '0.72rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>
        {action.resultTitle}
      </div>
      <div style={{ fontSize: '0.78rem', lineHeight: 1.45, color: '#1E1E1A' }}>{action.resultBody}</div>
      {action.resultItems && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {action.resultItems.map((item) => {
            const style = statusStyles[item.status ?? 'pending']
            return (
              <div
                key={`${action.id}-${item.label}`}
                style={{
                  border: '1px solid #E2E8F0',
                  background: '#F8FAFC',
                  borderRadius: 6,
                  padding: '0.45rem',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: '0.35rem',
                  alignItems: 'start',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#1E1E1A' }}>{item.label}</div>
                  {item.detail && <div style={{ fontSize: '0.68rem', color: '#6A604B', marginTop: 1 }}>{item.detail}</div>}
                </div>
                <span
                  style={{
                    background: style.bg,
                    color: style.fg,
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    borderRadius: 999,
                    padding: '0.12rem 0.35rem',
                    fontSize: '0.56rem',
                    fontWeight: 900,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {style.label}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function chipLabel(chip: NonNullable<AppAuditScreen['chips']>[number]) {
  return typeof chip === 'string' ? chip : chip.label
}

function chipInteraction(chip: NonNullable<AppAuditScreen['chips']>[number]): AppAuditInteraction | undefined {
  return typeof chip === 'string' ? undefined : chip.interaction
}

function defaultSheetInteraction(title: string, body?: string): AppAuditInteraction {
  return { kind: 'sheet', title, body }
}

function PhoneSheet({
  sheet,
  phoneInputs,
  onInputChange,
  onSubmit,
  onClose,
}: {
  sheet: PhoneSheetState
  phoneInputs: PhoneInputs
  onInputChange: (key: string, value: string) => void
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <section
      data-testid="app-audit-phone-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={sheet.title}
      style={{
        border: '1px solid #D8E0E8',
        background: '#FFFFFF',
        borderRadius: 8,
        padding: '0.7rem',
        boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          alignSelf: 'center',
          width: '2.6rem',
          height: 4,
          borderRadius: 999,
          background: '#CBD5E1',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#1E1E1A' }}>{sheet.title}</div>
          {sheet.body && <div style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: 1.4, marginTop: 3 }}>{sheet.body}</div>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close phone sheet"
          style={{
            width: '1.65rem',
            height: '1.65rem',
            border: '1px solid #E2E8F0',
            background: '#F8FAFC',
            color: '#1E1E1A',
            fontSize: '1rem',
            lineHeight: 1,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          x
        </button>
      </div>
      {sheet.inputKey && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 900, color: '#0F766E' }}>
          {sheet.inputLabel || 'Type here'}
          <input
            data-testid="app-audit-phone-sheet-input"
            value={phoneInputs[sheet.inputKey] || ''}
            onChange={(event) => onInputChange(sheet.inputKey || '', event.target.value)}
            placeholder={sheet.inputPlaceholder}
            style={{
              border: '1px solid #CBD5E1',
              borderRadius: 6,
              background: '#F8FAFC',
              color: '#0F172A',
              padding: '0.55rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.78rem',
            }}
          />
        </label>
      )}
      {sheet.buttonLabel && (
        <button
          type="button"
          onClick={onSubmit}
          style={{
            border: '1px solid #0F766E',
            background: '#0F766E',
            color: '#FFFFFF',
            borderRadius: 8,
            padding: '0.58rem',
            fontSize: '0.76rem',
            fontWeight: 900,
            cursor: 'pointer',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {sheet.buttonLabel}
        </button>
      )}
    </section>
  )
}

function PhonePreview({
  appName,
  screen,
  activeAction,
  phoneSheet,
  phoneInputs,
  savedPlaces,
  budgetRequestSent,
  onAction,
  onInteraction,
  onPhoneInputChange,
  onSubmitPhoneSheet,
  onClosePhoneSheet,
}: {
  appName: string
  screen: AppAuditScreen
  activeAction?: AppAuditAction
  phoneSheet?: PhoneSheetState
  phoneInputs: PhoneInputs
  savedPlaces: string[]
  budgetRequestSent: boolean
  onAction: (action: AppAuditAction) => void
  onInteraction: (interaction: AppAuditInteraction, fallbackTitle: string, action?: AppAuditAction) => void
  onPhoneInputChange: (key: string, value: string) => void
  onSubmitPhoneSheet: () => void
  onClosePhoneSheet: () => void
}) {
  const visibleListItems = (screen.listItems || []).map((item) => {
    if (screen.id === 'create_trip' && item.label === 'Saved places' && savedPlaces.length > 0) {
      return { ...item, detail: `${savedPlaces.length} place${savedPlaces.length === 1 ? '' : 's'} saved`, status: 'complete' as const }
    }
    if (screen.id === 'date_budget' && budgetRequestSent && (item.label === 'Ari' || item.label === 'Sam')) {
      return { ...item, detail: `${item.detail}; request sent`, status: 'pending' as const }
    }
    return item
  })

  return (
    <div
      data-testid="app-audit-iphone-shell"
      style={{
        width: 'min(100%, 300px)',
        height: '100%',
        maxHeight: 560,
        minHeight: 0,
        position: 'relative',
        background: 'linear-gradient(145deg, #111827, #020617)',
        border: '1px solid #020617',
        borderRadius: 42,
        padding: '0.72rem 0.62rem',
        boxShadow: '0 24px 44px rgba(15, 23, 42, 0.28), inset 0 0 0 2px rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        data-testid="app-audit-mobile-app-surface"
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          background: '#F8FAFC',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          borderRadius: 32,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          data-testid="app-audit-iphone-notch"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '1.02rem',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '5.4rem',
            height: '1.45rem',
            borderRadius: 999,
            background: '#020617',
            boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.08)',
            zIndex: 3,
          }}
        />
        <div
          data-testid="app-audit-iphone-status-bar"
          style={{
            height: '2.2rem',
            padding: '0.55rem 1.05rem 0',
            background: '#FFFFFF',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.7rem',
            color: '#0F172A',
            fontSize: '0.68rem',
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          <span>9:41</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.34rem' }}>
            <span>5G</span>
            <span
              aria-hidden="true"
              style={{
                width: '1.3rem',
                height: '0.62rem',
                border: '1.4px solid #0F172A',
                borderRadius: 3,
                display: 'inline-flex',
                alignItems: 'center',
                padding: 1,
              }}
            >
              <span style={{ display: 'block', width: '72%', height: '100%', background: '#0F172A', borderRadius: 2 }} />
            </span>
          </div>
        </div>

        <div
          data-testid="app-audit-mobile-nav-bar"
          style={{
            padding: '0.62rem 0.92rem 0.7rem',
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.65rem',
            flexShrink: 0,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.68rem', color: '#0F766E', fontWeight: 900 }}>{appName}</div>
            <div style={{ fontSize: '1rem', color: '#0F172A', fontWeight: 900, lineHeight: 1.12 }}>{screen.title}</div>
          </div>
          <span
            aria-hidden="true"
            style={{
              width: '1.9rem',
              height: '1.9rem',
              border: '1px solid #E2E8F0',
              borderRadius: 999,
              background: '#F8FAFC',
              color: '#475569',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 900,
              letterSpacing: 0,
            }}
          >
            ...
          </span>
        </div>

        <div
          style={{
            padding: '0.85rem 0.82rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
          }}
        >
          {screen.chips && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {screen.chips.map((chip) => (
                <button
                  key={chipLabel(chip)}
                  type="button"
                  data-testid="app-audit-phone-chip"
                  onClick={() => onInteraction(chipInteraction(chip) || defaultSheetInteraction(chipLabel(chip), 'Trip detail.'), chipLabel(chip))}
                  style={{
                    border: '1px solid #BAE6FD',
                    background: '#F0F9FF',
                    borderRadius: 999,
                    padding: '0.34rem 0.52rem',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    color: '#075985',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  {chipLabel(chip)}
                </button>
              ))}
            </div>
          )}

          {visibleListItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {visibleListItems.map((item) => {
                const style = statusStyles[item.status ?? 'pending']
                return (
                  <button
                    key={`${screen.id}-${item.label}`}
                    type="button"
                    data-testid="app-audit-phone-list-item"
                    onClick={() => onInteraction(item.interaction || defaultSheetInteraction(item.label, item.detail), item.label)}
                    style={{
                      border: '1px solid #E2E8F0',
                      background: '#FFFFFF',
                      borderRadius: 8,
                      padding: '0.68rem',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: '0.5rem',
                      alignItems: 'start',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: 'Inter, system-ui, sans-serif',
                      width: '100%',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0F172A' }}>{item.label}</div>
                      {item.detail && <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: 2 }}>{item.detail}</div>}
                    </div>
                    <span
                      style={{
                        background: style.bg,
                        color: style.fg,
                        border: '1px solid rgba(15, 23, 42, 0.08)',
                        borderRadius: 999,
                        padding: '0.18rem 0.4rem',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {style.label}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {screen.emptyStateTitle && (
            <div
              style={{
                marginTop: 'auto',
                border: '1px dashed #CBD5E1',
                background: '#FFFFFF',
                borderRadius: 8,
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.35rem', marginBottom: '0.3rem', color: '#2563EB' }}>+</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0F172A' }}>{screen.emptyStateTitle}</div>
              {screen.emptyStateBody && (
                <div style={{ fontSize: '0.76rem', color: '#64748B', lineHeight: 1.45, marginTop: '0.35rem' }}>
                  {screen.emptyStateBody}
                </div>
              )}
            </div>
          )}

          {screen.phoneTextInput ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.7rem', fontWeight: 900, color: '#0F766E' }}>
              {screen.phoneTextInput.label}
              <textarea
                data-testid="app-audit-phone-text-input"
                value={phoneInputs[screen.phoneTextInput.id] || ''}
                onChange={(event) => onPhoneInputChange(screen.phoneTextInput?.id || '', event.target.value)}
                placeholder={screen.phoneTextInput.placeholder}
                rows={5}
                style={{
                  resize: 'vertical',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  borderRadius: 8,
                  minHeight: 118,
                  padding: '0.7rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.78rem',
                  lineHeight: 1.45,
                  boxSizing: 'border-box',
                }}
              />
            </label>
          ) : screen.textBoxPlaceholder && (
            <div
              style={{
                border: '1px solid #CBD5E1',
                background: '#FFFFFF',
                borderRadius: 8,
                minHeight: 118,
                padding: '0.7rem',
                color: '#64748B',
                fontSize: '0.78rem',
                lineHeight: 1.45,
                boxSizing: 'border-box',
              }}
            >
              {screen.textBoxPlaceholder}
            </div>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {screen.primaryAction && (
              <button
                type="button"
                data-testid="app-audit-phone-primary-action"
                onClick={() => onInteraction(screen.primaryInteraction || defaultSheetInteraction(screen.primaryAction || ''), screen.primaryAction || '')}
                style={{
                  border: '1px solid #0F766E',
                  background: '#0F766E',
                  color: '#FFFFFF',
                  borderRadius: 8,
                  padding: '0.72rem',
                  fontSize: '0.82rem',
                  fontWeight: 900,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  cursor: 'pointer',
                }}
              >
                {screen.primaryAction}
              </button>
            )}
            {screen.actions?.map((action) => {
              const selected = activeAction?.id === action.id
              return (
                <button
                  key={action.id}
                  type="button"
                  data-testid="app-audit-phone-action"
                  onClick={() => onAction(action)}
                  style={{
                    border: `1px solid ${selected ? '#0F766E' : '#2563EB'}`,
                    background: selected ? '#ECFDF5' : '#2563EB',
                    color: selected ? '#0F766E' : '#FFFFFF',
                    borderRadius: 8,
                    padding: '0.72rem',
                    fontSize: '0.82rem',
                    fontWeight: 900,
                    fontFamily: 'Inter, system-ui, sans-serif',
                    cursor: 'pointer',
                    boxShadow: selected ? 'none' : '0 8px 18px rgba(37, 99, 235, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.55rem',
                  }}
                >
                  {action.label}
                </button>
              )
            })}
            {screen.secondaryAction && (
              <button
                type="button"
                data-testid="app-audit-phone-secondary-action"
                onClick={() => onInteraction(screen.secondaryInteraction || defaultSheetInteraction(screen.secondaryAction || ''), screen.secondaryAction || '')}
                style={{
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  borderRadius: 8,
                  padding: '0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  cursor: 'pointer',
                }}
              >
                {screen.secondaryAction}
              </button>
            )}
            {activeAction && <ActionResultCard action={activeAction} />}
          </div>
        </div>
        <div
          data-testid="app-audit-mobile-bottom-tabs"
          style={{
            borderTop: '1px solid #E2E8F0',
            background: '#FFFFFF',
            padding: '0.38rem 0.48rem 0.28rem',
            display: 'grid',
            gridTemplateColumns: `repeat(${phoneTabItems.length}, minmax(0, 1fr))`,
            gap: '0.24rem',
            flexShrink: 0,
          }}
        >
          {phoneTabItems.map((tab) => {
            const active = tab.activeFor.includes(screen.id)
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => onInteraction({ kind: 'navigate', targetScreenId: tab.targetScreenId }, tab.label)}
                aria-current={active ? 'page' : undefined}
                style={{
                  minWidth: 0,
                  border: '1px solid transparent',
                  background: active ? '#ECFDF5' : '#FFFFFF',
                  color: active ? '#0F766E' : '#64748B',
                  borderRadius: 8,
                  padding: '0.34rem 0.18rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.62rem',
                  fontWeight: 900,
                  lineHeight: 1.1,
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <div
          data-testid="app-audit-iphone-home-indicator"
          aria-hidden="true"
          style={{
            height: '0.88rem',
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: '7.6rem',
              maxWidth: '44%',
              height: 4,
              borderRadius: 999,
              background: '#111827',
              display: 'block',
            }}
          />
        </div>
        {phoneSheet && (
          <div
            data-testid="app-audit-phone-modal-backdrop"
            onClick={onClosePhoneSheet}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 6,
              background: 'rgba(15, 23, 42, 0.38)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.7rem',
            }}
          >
            <div
              onClick={(event) => event.stopPropagation()}
              style={{
                width: 'min(100%, 17rem)',
                maxHeight: 'calc(100% - 1.4rem)',
                overflowY: 'auto',
              }}
            >
              <PhoneSheet
                sheet={phoneSheet}
                phoneInputs={phoneInputs}
                onInputChange={onPhoneInputChange}
                onSubmit={onSubmitPhoneSheet}
                onClose={onClosePhoneSheet}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FocusedObservationCard({
  item,
  value,
  onChange,
}: {
  item: AppAuditObservation
  value: string
  onChange: (value: string) => void
}) {
  return (
    <section
      data-testid="app-audit-focused-note"
      style={{
        border: '1px solid #000',
        boxShadow: '3px 3px 0 #000',
        background: '#FBF7EA',
        borderRadius: 8,
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}
    >
      <div>
        <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1E1E1A' }}>{item.label}</div>
        {item.metricLink && (
          <div style={{ fontSize: '0.7rem', color: '#3A6B5E', fontWeight: 800, marginTop: 3 }}>
            {renderContentWithGlossary(item.metricLink)}
          </div>
        )}
      </div>
      <div style={{ fontSize: '0.84rem', lineHeight: 1.5, color: '#4B4538' }}>
        {renderContentWithGlossary(item.prompt)}
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={item.placeholder}
        rows={4}
        style={{
          resize: 'vertical',
          border: '1px solid #000',
          background: '#F7F1E3',
          color: '#1E1E1A',
          borderRadius: 6,
          padding: '0.65rem',
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '0.82rem',
          lineHeight: 1.45,
        }}
      />
    </section>
  )
}

function formatAnalyticsColumnLabel(column: string) {
  return column.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatAnalyticsCell(value: string | undefined) {
  return value ? value.replace(/_/g, ' ') : ''
}

function findKickoffAnalyticsApp(): SourceWorkspaceApp | undefined {
  const kickoff = storyline.nodes.briefing_kickoff
  if (!kickoff || kickoff.type !== 'briefing') return undefined
  return kickoff.sourceWorkspace?.apps.find((app) => app.id === 'analytics' || app.title === 'Trip planning funnel')
}

function AnalyticsDisclosure({ app }: { app?: SourceWorkspaceApp }) {
  if (!app) return null
  const rows = app.rows || []
  const columns = app.columns || (rows[0] ? Object.keys(rows[0]).filter(Boolean) : [])
  if (!rows.length || !columns.length) return null

  return (
    <details
      data-testid="app-audit-analytics-reference"
      style={{
        border: '1px solid #000',
        background: '#FBF7EA',
        borderRadius: 8,
        boxShadow: '2px 2px 0 #000',
        overflow: 'hidden',
      }}
    >
      <summary
        role="button"
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          padding: '0.55rem 0.7rem',
          background: '#DCE6D2',
          color: '#1E1E1A',
          fontSize: '0.72rem',
          fontWeight: 900,
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        View numbers
      </summary>
      <div style={{ padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        <div>
          <div style={{ fontSize: '0.62rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase' }}>
            {app.label || app.kind}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 900, color: '#1E1E1A', marginTop: 2 }}>
            {app.title || 'Trip planning funnel'}
          </div>
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid #000' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.68rem', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: '#E8DCC8' }}>
                {columns.map((column) => (
                  <th
                    key={column}
                    style={{
                      borderBottom: '1px solid #000',
                      borderRight: '1px solid #CDBF94',
                      padding: '0.35rem 0.4rem',
                      textAlign: 'left',
                      color: '#315D50',
                      fontWeight: 900,
                    }}
                  >
                    {formatAnalyticsColumnLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} style={{ background: index % 2 === 0 ? '#F7F1E3' : '#F2EBD9' }}>
                  {columns.map((column) => {
                    const isStatus = column.toLowerCase() === 'status'
                    return (
                      <td
                        key={column}
                        style={{
                          borderTop: '1px solid #E4D8B9',
                          borderRight: '1px solid #E4D8B9',
                          padding: '0.35rem 0.4rem',
                          color: isStatus ? '#3A6B5E' : '#1E1E1A',
                          fontWeight: isStatus ? 900 : 500,
                          lineHeight: 1.25,
                        }}
                      >
                        {formatAnalyticsCell(row[column])}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  )
}

export default function AppAuditScene({ node }: Props) {
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const setSceneCompleted = useGameStore((s) => s.setSceneCompleted)
  const goNext = useGoNext()

  const firstAuditScreenId = node.screens[0]?.id ?? node.observations[0]?.screenId ?? ''
  const [activeScreenId, setActiveScreenId] = useState(firstAuditScreenId)
  const [actionByScreen, setActionByScreen] = useState<Record<string, string>>({})
  const [phoneSheets, setPhoneSheets] = useState<Record<string, PhoneSheetState | undefined>>({})
  const [phoneInputs, setPhoneInputs] = useState<PhoneInputs>({})
  const [savedPlaces, setSavedPlaces] = useState<string[]>([])
  const [budgetRequestSent, setBudgetRequestSent] = useState(false)
  const [generatedItinerary, setGeneratedItinerary] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  const notes = useMemo(() => parseNotes(responses[node.bindingKey]), [responses, node.bindingKey])
  const activeScreen = node.screens.find((screen) => screen.id === activeScreenId) ?? node.screens[0]
  const activeAction = activeScreen?.actions?.find((action) => action.id === actionByScreen[activeScreen.id])
  const activePhoneSheet = activeScreen ? phoneSheets[activeScreen.id] : undefined
  const activeObservation = node.observations.find((item) => item.screenId === activeScreen?.id)
  const completedCount = node.observations.filter((item) => (notes[item.id] || '').trim().length > 0).length
  const requiredCount = node.minCompleted ?? node.observations.length
  const canContinue = completedCount >= requiredCount
  const analyticsApp = useMemo(() => findKickoffAnalyticsApp(), [])
  const activeScreenIndex = Math.max(0, node.screens.findIndex((screen) => screen.id === activeScreen?.id))
  const hasPreviousScreen = activeScreenIndex > 0
  const hasNextScreen = activeScreenIndex < node.screens.length - 1

  useEffect(() => {
    if (!helpOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setHelpOpen(false)
        window.requestAnimationFrame(() => helpButtonRef.current?.focus())
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [helpOpen])

  const saveNote = (id: string, value: string) => {
    setFreeTextResponse(node.bindingKey, JSON.stringify({ ...notes, [id]: value }, null, 2))
  }

  const closeHelp = () => {
    setHelpOpen(false)
    window.requestAnimationFrame(() => helpButtonRef.current?.focus())
  }

  const openPhoneSheet = (screenId: string, sheet: PhoneSheetState) => {
    setPhoneSheets((current) => ({ ...current, [screenId]: sheet }))
  }

  const closePhoneSheet = () => {
    if (!activeScreen) return
    setPhoneSheets((current) => ({ ...current, [activeScreen.id]: undefined }))
  }

  const handlePhoneInputChange = (key: string, value: string) => {
    if (!key) return
    setPhoneInputs((current) => ({ ...current, [key]: value }))
  }

  const handlePhoneInteraction = (interaction: AppAuditInteraction, fallbackTitle: string, action?: AppAuditAction) => {
    if (!activeScreen) return
    if (interaction.kind === 'navigate' && interaction.targetScreenId) {
      setActiveScreenId(interaction.targetScreenId)
      return
    }
    if (interaction.kind === 'generate') {
      setGeneratedItinerary(action?.resultBody || interaction.body || '')
      return
    }
    if (interaction.kind === 'share') {
      const shareText = phoneInputs.manual_itinerary || generatedItinerary || activeAction?.resultBody || ''
      openPhoneSheet(activeScreen.id, {
        id: interaction.id || `${activeScreen.id}-share`,
        title: interaction.title || fallbackTitle,
        body: shareText
          ? interaction.body || 'Ready to share with the group.'
          : 'Add a plan before sharing.',
        buttonLabel: shareText ? interaction.buttonLabel || 'Done' : undefined,
      })
      return
    }
    openPhoneSheet(activeScreen.id, {
      id: interaction.id || `${activeScreen.id}-${fallbackTitle}`,
      title: interaction.title || fallbackTitle,
      body: interaction.body,
      inputKey: interaction.kind === 'input_sheet' ? interaction.inputKey || interaction.id : undefined,
      inputLabel: interaction.inputLabel,
      inputPlaceholder: interaction.inputPlaceholder,
      buttonLabel: interaction.buttonLabel || (interaction.kind === 'copy' ? 'Done' : undefined),
      successMessage: interaction.successMessage,
      successBody: interaction.successBody,
    })
  }

  const submitPhoneSheet = () => {
    if (!activeScreen || !activePhoneSheet) return
    if (activePhoneSheet.id === 'add_saved_place') {
      const value = (phoneInputs.add_saved_place || '').trim()
      if (value && !savedPlaces.includes(value)) {
        setSavedPlaces((current) => [...current, value])
      }
    }
    if (activePhoneSheet.id === 'budget_request') {
      setBudgetRequestSent(true)
    }
    if (activePhoneSheet.successMessage) {
      openPhoneSheet(activeScreen.id, {
        id: `${activePhoneSheet.id}_success`,
        title: activePhoneSheet.successMessage,
        body: activePhoneSheet.successBody || (activePhoneSheet.inputKey ? phoneInputs[activePhoneSheet.inputKey] : undefined),
        buttonLabel: 'Done',
      })
      return
    }
    closePhoneSheet()
  }

  const handlePhoneAction = (action: AppAuditAction) => {
    setActionByScreen((cur) => ({ ...cur, [activeScreen.id]: action.id }))
    handlePhoneInteraction(action.interaction || { kind: 'sheet', title: action.resultTitle, body: action.resultBody }, action.label, action)
  }

  const goToRelativeScreen = (offset: number) => {
    const nextScreen = node.screens[activeScreenIndex + offset]
    if (nextScreen) setActiveScreenId(nextScreen.id)
  }

  return (
    <SceneWrapper illustration={undefined} hideIllustration showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div>
          <span style={{ fontSize: '0.7rem', color: '#555' }}>Section {node.section}</span>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, marginTop: '0.2rem' }}>{node.title}</h1>
        </div>
        {node.content && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
        <div
          data-testid="app-audit-instruction-bar"
          style={{
            backgroundColor: '#FBF7EA',
            border: '1px solid #CDBF94',
            padding: '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            lineHeight: 1.55,
          }}
        >
          Look at this Roamly screen like a real user. Try any button on the phone, then write one short note: what is clear, and what is confusing?
        </div>

        <DesktopOverlay
          width="78%"
          height="78%"
          className="app-audit-desktop-overlay"
          contentClassName="app-audit-desktop-content"
        >
          <div
            className="app-audit-laptop"
            data-testid="app-audit-laptop"
            style={{
              position: 'relative',
              height: '100%',
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 0.82fr) minmax(0, 1fr)',
              gap: '1rem',
              alignItems: 'stretch',
              padding: '0.6rem',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <main
              className="app-audit-phone-window"
              data-testid="app-audit-phone-window"
              style={{
                minHeight: 0,
                minWidth: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
              }}
            >
              <PhonePreview
                appName={node.appName || 'Roamly'}
                screen={activeScreen}
                activeAction={activeAction}
                phoneSheet={activePhoneSheet}
                phoneInputs={phoneInputs}
                savedPlaces={savedPlaces}
                budgetRequestSent={budgetRequestSent}
                onAction={handlePhoneAction}
                onInteraction={handlePhoneInteraction}
                onPhoneInputChange={handlePhoneInputChange}
                onSubmitPhoneSheet={submitPhoneSheet}
                onClosePhoneSheet={closePhoneSheet}
              />
            </main>

            <div
              className="app-audit-work-window"
              data-testid="app-audit-work-window"
              data-scrollable="true"
              style={{ minHeight: 0, minWidth: 0, display: 'flex', overflow: 'hidden' }}
            >
              <LaptopFrame variant="notion" title="Roamly screen check" fill scrollable>
                <div className="app-audit-review-console" data-testid="app-audit-review-console">
                  <header className="app-audit-console-header">
                    <div>
                      <div className="app-audit-console-kicker">Roamly QA review</div>
                      <h2>{activeScreen.title}</h2>
                      <p>Watch the phone like a trip organizer, then save one observation for the product team.</p>
                    </div>
                    <div className="app-audit-console-status">
                      <span>Prototype live</span>
                      <strong>{completedCount}/{requiredCount}</strong>
                    </div>
                  </header>

                  <div className="app-audit-metric-strip" aria-label="Audit context">
                    <div>
                      <span>Current screen</span>
                      <strong>{activeScreen.stepLabel || `Screen ${activeScreenIndex + 1}`}</strong>
                    </div>
                    <div>
                      <span>Funnel clue</span>
                      <strong>{activeObservation?.metricLink || 'Use the trip numbers'}</strong>
                    </div>
                    <div>
                      <span>Review mode</span>
                      <strong>Observation only</strong>
                    </div>
                  </div>

                  <section style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.18rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase' }}>
                          Screen {activeScreenIndex + 1} of {node.screens.length}
                        </div>
                        <div style={{ fontSize: '0.86rem', color: '#1E1E1A', fontWeight: 900 }}>
                          {activeScreen.title}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6A604B', fontWeight: 800 }}>
                        Notes {completedCount}/{requiredCount}
                      </div>
                    </div>
                    <div
                      aria-label="Roamly screen progress"
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}
                    >
                      {node.screens.map((screen, index) => {
                        const active = screen.id === activeScreen.id
                        const observation = node.observations.find((item) => item.screenId === screen.id)
                        const done = observation ? Boolean((notes[observation.id] || '').trim()) : false
                        return (
                          <span
                            key={screen.id}
                            style={{
                              width: '1.85rem',
                              height: '1.85rem',
                              border: `1px solid ${active ? '#000' : '#CDBF94'}`,
                              background: done ? '#3A6B5E' : active ? '#DCE6D2' : '#EFE8D2',
                              color: done ? '#F2EBD9' : '#1E1E1A',
                              borderRadius: 999,
                              fontFamily: 'Inter, system-ui, sans-serif',
                              fontSize: '0.72rem',
                              fontWeight: 900,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            aria-current={active ? 'step' : undefined}
                            aria-label={`${screen.stepLabel || screen.title}${done ? ', note written' : ''}`}
                          >
                            {index + 1}
                          </span>
                        )
                      })}
                    </div>
                  </section>

                  <AnalyticsDisclosure app={analyticsApp} />

                  {activeObservation && (
                    <FocusedObservationCard
                      item={activeObservation}
                      value={notes[activeObservation.id] || ''}
                      onChange={(value) => saveNote(activeObservation.id, value)}
                    />
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                    <button
                      type="button"
                      onClick={() => goToRelativeScreen(-1)}
                      disabled={!hasPreviousScreen}
                      style={{
                        border: '1px solid #CDBF94',
                        background: '#FBF7EA',
                        color: '#1E1E1A',
                        borderRadius: 6,
                        padding: '0.6rem',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        cursor: hasPreviousScreen ? 'pointer' : 'not-allowed',
                        opacity: hasPreviousScreen ? 1 : 0.45,
                      }}
                    >
                      Back screen
                    </button>
                    <button
                      type="button"
                      onClick={() => goToRelativeScreen(1)}
                      disabled={!hasNextScreen}
                      style={{
                        border: '1px solid #000',
                        background: hasNextScreen ? '#3A6B5E' : '#EFE8D2',
                        color: hasNextScreen ? '#F2EBD9' : '#6A604B',
                        borderRadius: 6,
                        padding: '0.6rem',
                        fontSize: '0.78rem',
                        fontWeight: 900,
                        fontFamily: 'Inter, system-ui, sans-serif',
                        cursor: hasNextScreen ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Next screen
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                    <ActionButton
                      text="Save audit notes"
                      onClick={() => {
                        setSceneCompleted(node.id)
                        goNext(node)
                      }}
                      disabled={!canContinue}
                      variant={canContinue ? 'primary' : 'secondary'}
                    />
                    <ActionButton
                      text="Skip (dev)"
                      onClick={() => {
                        setSceneCompleted(node.id)
                        goNext(node)
                      }}
                      variant="secondary"
                      fullWidth={false}
                    />
                  </div>
                </div>
              </LaptopFrame>
            </div>

            {node.companion && (
              <>
                <button
                  ref={helpButtonRef}
                  type="button"
                  className="app-audit-help-button"
                  data-testid="app-audit-help-button"
                  onClick={() => setHelpOpen(true)}
                  style={{
                    position: 'fixed',
                    right: '1rem',
                    bottom: '5.6rem',
                    zIndex: 250,
                    border: '1px solid #000',
                    background: '#3A6B5E',
                    color: '#F2EBD9',
                    borderRadius: 999,
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    boxShadow: '2px 2px 0 #000',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  Need help?
                </button>
                {helpOpen && (
                  <div
                    data-testid="app-audit-help-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Ask Jordan for help"
                    onClick={closeHelp}
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 300,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(30, 30, 26, 0.55)',
                      padding: '1rem',
                    }}
                  >
                    <div
                      onClick={(event) => event.stopPropagation()}
                      style={{
                        width: 'min(560px, 100%)',
                        maxHeight: 'min(720px, calc(100dvh - 2rem))',
                        overflow: 'auto',
                        border: '1px solid #000',
                        boxShadow: '8px 8px 0 #000',
                        background: '#F7F1E3',
                        color: '#1E1E1A',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '0.75rem',
                          borderBottom: '1px solid #000',
                          background: '#EFE8D2',
                          padding: '0.75rem 0.875rem',
                        }}
                      >
                        <h2 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.2 }}>Ask Jordan</h2>
                        <button
                          type="button"
                          onClick={closeHelp}
                          aria-label="Close Jordan help"
                          style={{
                            border: '1px solid #000',
                            background: '#F2EBD9',
                            color: '#1E1E1A',
                            width: '2rem',
                            height: '2rem',
                            fontSize: '1.3rem',
                            lineHeight: 1,
                            cursor: 'pointer',
                            fontFamily: 'Inter, system-ui, sans-serif',
                          }}
                        >
                          x
                        </button>
                      </div>
                      <AppAuditCompanionPanel
                        node={node}
                        companion={node.companion}
                        screen={activeScreen}
                        action={activeAction}
                        observation={activeObservation}
                        note={activeObservation ? notes[activeObservation.id] || '' : ''}
                        chrome="plain"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DesktopOverlay>
      </motion.div>
    </SceneWrapper>
  )
}
