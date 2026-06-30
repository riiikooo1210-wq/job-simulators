import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import SlackMessageEnhanced from '../components/ui/SlackMessageEnhanced'
import { useNarrowViewport } from '../components/hooks/useNarrowViewport'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext, useSectionBriefing } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { BriefingDrawerContent } from './BriefingScene'
import type { LaptopFrameVariant } from '../components/ui/LaptopFrame'
import type { MultipleChoiceNode } from '../types/game'

interface Props { node: MultipleChoiceNode }

function getPlayerInitial(playerName: string): string {
  return playerName.trim().charAt(0).toUpperCase() || 'Y'
}

function toPlainMessage(text: string): string {
  return text.replace(/\{\{([^}]+)\}\}/g, '$1')
}

function SentMessagePreview({
  appWindow,
  playerName,
  content,
  messageKey,
}: {
  appWindow?: LaptopFrameVariant
  playerName: string
  content: string
  messageKey: string
}) {
  const displayName = playerName.trim() || 'You'
  if (appWindow === 'email') {
    return (
      <div
        key={messageKey}
        style={{
          backgroundColor: '#fff',
          border: '1px solid #d8d8d8',
          borderRadius: '6px',
          padding: '0.55rem 0.6rem',
          display: 'flex',
          gap: '0.5rem',
        }}
      >
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            backgroundColor: '#B87D6B',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.68rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getPlayerInitial(playerName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{displayName}</span>
            <span style={{ fontSize: '0.625rem', color: '#777', marginLeft: 'auto' }}>Now</span>
          </div>
          <div style={{ fontSize: '0.78rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{content}</div>
        </div>
      </div>
    )
  }

  return (
    <SlackMessageEnhanced
      key={messageKey}
      message={{
        sender: displayName,
        role: 'You',
        timestamp: 'Now',
        content,
        avatarInitials: getPlayerInitial(playerName),
      }}
      initialExpanded
      density="compact"
    />
  )
}

export default function MultipleChoiceScene({ node }: Props) {
  const setMcSelection = useGameStore((s) => s.setMcSelection)
  const setBranchFlag = useGameStore((s) => s.setBranchFlag)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const briefing = useSectionBriefing()
  const [refOpen, setRefOpen] = useState(false)
  const isNarrow = useNarrowViewport()
  const appWindow = node.appWindow as LaptopFrameVariant | undefined
  const isMessageReplyScene = appWindow === 'slack' || appWindow === 'email' || !!node.slackMessages?.length
  const [selectedOptionId, setSelectedOptionId] = useState(mcSelections[node.id] ?? '')
  const promptText = node.prompt
    ? renderContentWithGlossary(interpolate(node.prompt, { playerName, branchFlags, mcSelections }))
    : null
  const selectedOption = node.options.find((opt) => opt.id === selectedOptionId)
  const selectedMessage = selectedOption
    ? toPlainMessage(interpolate(selectedOption.label, { playerName, branchFlags, mcSelections }))
    : ''
  const optionGap = isMessageReplyScene ? '0.45rem' : '0.625rem'
  const optionPadding = isMessageReplyScene ? '0.625rem 0.8rem' : '1rem 1.25rem'
  const selectedOptionPadding = isMessageReplyScene
    ? 'calc(0.625rem - 1px) calc(0.8rem - 1px)'
    : 'calc(1rem - 1px) calc(1.25rem - 1px)'
  const optionFontSize = isMessageReplyScene ? '0.8125rem' : '0.9375rem'
  const optionBodyFontSize = isMessageReplyScene ? '0.75rem' : '0.8125rem'
  const optionLineHeight = isMessageReplyScene ? 1.45 : 1.5
  const optionBodyLineHeight = isMessageReplyScene ? 1.45 : 1.6
  const optionInnerGap = isMessageReplyScene ? '0.2rem' : '0.25rem'

  const commitSelection = (option: MultipleChoiceNode['options'][number]) => {
    setMcSelection(node.id, option.id)
    if (option.branchFlag !== undefined) {
      setBranchFlag(node.id, option.branchFlag)
    } else if (node.isPivot) {
      // pivot scene without explicit branchFlag — use option id as the flag
      setBranchFlag(node.id, option.id)
    }
    goNext(node)
  }

  const handleOptionClick = (option: MultipleChoiceNode['options'][number]) => {
    if (isMessageReplyScene) {
      setSelectedOptionId(option.id)
      return
    }
    commitSelection(option)
  }

  const handleSubmit = () => {
    if (!selectedOption) return
    commitSelection(selectedOption)
  }

  const choiceContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: appWindow ? '1rem' : 0 }}>
      {appWindow === 'slack' && (
        <div
          style={{
            border: '1px solid #D8D1C1',
            background: '#F7F1E3',
            borderRadius: 8,
            padding: '0.65rem 0.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ fontSize: '0.86rem', fontWeight: 900, color: '#1D1C1D' }}>{node.windowTitle ?? node.title}</div>
            <div style={{ marginTop: '0.12rem', fontSize: '0.68rem', lineHeight: 1.35, color: '#616061', fontWeight: 650 }}>
              Maple Street project channel - Maya, Owen, Riley, and you
            </div>
          </div>
          <span style={{ border: '1px solid #CDBF94', borderRadius: 999, background: '#FFFDF8', padding: '0.18rem 0.48rem', fontSize: '0.66rem', fontWeight: 850, color: '#3F605C' }}>
            client call in 35 min
          </span>
        </div>
      )}
      {appWindow === 'slack' && node.slackMessages && node.slackMessages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {node.slackMessages.map((message, index) => (
            <SlackMessageEnhanced
              key={`${message.sender}-${index}`}
              message={{
                ...message,
                content: interpolate(message.content, { playerName, branchFlags, mcSelections }),
              }}
              initialExpanded
              density="emphasis"
            />
          ))}
        </div>
      )}
      {selectedOption && isMessageReplyScene && (
        <SentMessagePreview
          appWindow={appWindow}
          playerName={playerName}
          content={selectedMessage}
          messageKey={`${node.id}-${selectedOption.id}-sent`}
        />
      )}
      {promptText && (
        <div
          style={{
            padding: isMessageReplyScene ? '0 0.25rem' : '0.75rem 1rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            lineHeight: 1.5,
            ...(isMessageReplyScene
              ? {}
              : {
                  backgroundColor: '#fff',
                  border: '1px solid #000',
                  borderRadius: appWindow ? '6px' : 0,
                }),
          }}
        >
          {promptText}
        </div>
      )}
      {node.content && !appWindow && (
        <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
          {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: optionGap,
          ...(appWindow === 'slack'
            ? {
                border: '1px solid #D8D1C1',
                borderRadius: 8,
                background: '#FFFDF8',
                padding: '0.58rem',
                boxShadow: '0 1px 2px rgba(60,64,67,0.12)',
              }
            : {}),
        }}
      >
        {appWindow === 'slack' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0 0.1rem 0.35rem', color: '#616061', fontSize: '0.68rem', fontWeight: 750 }}>
            <span>Reply composer</span>
            <span>Choose one draft</span>
          </div>
        )}
        {node.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleOptionClick(opt)}
            style={{
              background: selectedOptionId === opt.id ? '#E8DCC8' : isMessageReplyScene ? '#fff' : '#F2EBD9',
              color: '#000',
              border: selectedOptionId === opt.id ? '2px solid #000' : '1px solid #000',
              boxShadow: appWindow ? 'none' : '4px 4px 0 #000',
              borderRadius: appWindow ? '6px' : 0,
              padding: selectedOptionId === opt.id ? selectedOptionPadding : optionPadding,
              fontSize: optionFontSize,
              lineHeight: optionLineHeight,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'Inter, system-ui, sans-serif',
              display: 'flex',
              flexDirection: 'column',
              gap: optionInnerGap,
              transition: 'all 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#E8DCC8'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = selectedOptionId === opt.id ? '#E8DCC8' : isMessageReplyScene ? '#fff' : '#F2EBD9'
            }}
          >
            <span style={{ fontWeight: 700 }}>{renderContentWithGlossary(opt.label)}</span>
            {opt.body && (
              <span style={{ fontSize: optionBodyFontSize, color: '#555', lineHeight: optionBodyLineHeight }}>
                {renderContentWithGlossary(opt.body)}
              </span>
            )}
          </button>
        ))}
        {isMessageReplyScene && (
          <ActionButton text="Submit" onClick={handleSubmit} disabled={!selectedOption} />
        )}
        {import.meta.env.DEV && (
          <ActionButton text="Skip (dev)" onClick={() => commitSelection(node.options[0])} variant="secondary" fullWidth={false} />
        )}
      </div>
    </div>
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, lineHeight: 1.3, margin: 0 }}>{node.title}</h1>
          {briefing && <ReferenceButton onClick={() => setRefOpen(true)} label="View Briefing" />}
        </div>
        {node.content && appWindow && (
          <div style={{ fontSize: '0.875rem', lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
            {renderContentWithGlossary(interpolate(node.content, { playerName, branchFlags, mcSelections }))}
          </div>
        )}
        {appWindow ? (
          <MultipleChoiceToolShell isNarrow={isNarrow}>
            <LaptopFrame variant={appWindow} title={node.windowTitle ?? node.title} fill={!isNarrow} scrollable>
              {choiceContent}
            </LaptopFrame>
          </MultipleChoiceToolShell>
        ) : (
          choiceContent
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

function MultipleChoiceToolShell({ isNarrow, children }: { isNarrow: boolean; children: ReactNode }) {
  if (isNarrow) {
    return (
      <div style={{ width: '100%', minHeight: 520 }}>
        {children}
      </div>
    )
  }

  return (
    <DesktopOverlay>
      {children}
    </DesktopOverlay>
  )
}
