import { useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import DesktopOverlay from '../components/layout/DesktopOverlay'
import ActionButton from '../components/ui/ActionButton'
import LaptopFrame from '../components/ui/LaptopFrame'
import ReferenceDrawer, { ReferenceButton } from '../components/ui/ReferenceDrawer'
import SlackMessageEnhanced from '../components/ui/SlackMessageEnhanced'
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
          padding: '0.75rem',
          display: 'flex',
          gap: '0.625rem',
        }}
      >
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: '#B87D6B',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.75rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {getPlayerInitial(playerName)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{displayName}</span>
            <span style={{ fontSize: '0.6875rem', color: '#777', marginLeft: 'auto' }}>Now</span>
          </div>
          <div style={{ fontSize: '0.875rem', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{content}</div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
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
              padding: selectedOptionId === opt.id ? 'calc(1rem - 1px) calc(1.25rem - 1px)' : '1rem 1.25rem',
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
              e.currentTarget.style.background = selectedOptionId === opt.id ? '#E8DCC8' : isMessageReplyScene ? '#fff' : '#F2EBD9'
            }}
          >
            <span style={{ fontWeight: 700 }}>{renderContentWithGlossary(opt.label)}</span>
            {opt.body && (
              <span style={{ fontSize: '0.8125rem', color: '#555', lineHeight: 1.6 }}>
                {renderContentWithGlossary(opt.body)}
              </span>
            )}
          </button>
        ))}
        {isMessageReplyScene && (
          <ActionButton text="Submit" onClick={handleSubmit} disabled={!selectedOption} />
        )}
          <ActionButton text="Skip (dev)" onClick={() => commitSelection(node.options[0])} variant="secondary" fullWidth={false} />
      </div>
    </div>
  )

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back" hideIllustration={Boolean(appWindow)}>
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
          <DesktopOverlay>
            <LaptopFrame variant={appWindow} title={node.windowTitle ?? node.title} fill scrollable>
              {choiceContent}
            </LaptopFrame>
          </DesktopOverlay>
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
