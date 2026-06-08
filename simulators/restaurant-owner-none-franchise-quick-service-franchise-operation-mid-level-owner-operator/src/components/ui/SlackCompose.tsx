import { countWords } from './LongFormEditor'
import type { SlackPromptSection } from '../../types/game'

interface SlackComposeProps {
  channel: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  sections?: SlackPromptSection[]
  minWords?: number
  maxWords?: number
  disabled?: boolean
  onSend: () => void
  sendDisabled?: boolean
}

function sectionMarker(section: SlackPromptSection) {
  return `### ${section.label}`
}

function parseSectionAnswers(value: string, sections: SlackPromptSection[]) {
  const answers: Record<string, string> = Object.fromEntries(sections.map((section) => [section.id, '']))
  let activeId: string | null = null

  value.split('\n').forEach((line) => {
    const matched = sections.find((section) => line.trim() === sectionMarker(section))
    if (matched) {
      activeId = matched.id
      return
    }
    if (!activeId) return
    answers[activeId] = answers[activeId] ? `${answers[activeId]}\n${line}` : line
  })

  return answers
}

function buildSectionedValue(sections: SlackPromptSection[], answers: Record<string, string>) {
  return sections
    .map((section) => `${sectionMarker(section)}\n${(answers[section.id] || '').trim()}`)
    .join('\n\n')
    .trim()
}

export default function SlackCompose({
  value,
  onChange,
  placeholder = 'Type a message...',
  sections = [],
  minWords,
  maxWords,
  disabled = false,
  onSend,
  sendDisabled = false,
}: SlackComposeProps) {
  const wordCount = minWords || maxWords ? countWords(value) : 0
  const underMinimum = minWords ? wordCount < minWords : false
  const overLimit = maxWords ? wordCount > maxWords : false
  const wordRuleText = minWords && maxWords
    ? `${wordCount} words · min ${minWords} · max ${maxWords}`
    : minWords
      ? `${wordCount}/${minWords} words minimum`
      : maxWords
        ? `${wordCount}/${maxWords} words maximum`
        : ''
  const hasSections = sections.length > 0
  const sectionAnswers = hasSections ? parseSectionAnswers(value, sections) : {}
  const allSectionsAnswered = !hasSections || sections.every((section) => (sectionAnswers[section.id] || '').trim().length > 0)
  const effectiveSendDisabled = sendDisabled || disabled || !allSectionsAnswered

  const updateSection = (sectionId: string, nextValue: string) => {
    const nextAnswers = { ...sectionAnswers, [sectionId]: nextValue }
    onChange(buildSectionedValue(sections, nextAnswers))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {hasSections && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '0.8rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem',
            backgroundColor: '#F7F1E3',
          }}
        >
          {sections.map((section, index) => (
            <section
              key={section.id}
              style={{
                border: '1px solid #D7D0C5',
                backgroundColor: '#FFFFFF',
                borderRadius: '8px',
                padding: '0.7rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: '#616061', fontWeight: 800, textTransform: 'uppercase' }}>
                {section.label || `Box ${index + 1}`}
              </div>
              <div style={{ fontSize: '0.86rem', color: '#1d1c1d', fontWeight: 800, lineHeight: 1.35 }}>
                {section.question}
              </div>
              {section.helper && (
                <div style={{ fontSize: '0.74rem', color: '#616061', lineHeight: 1.45 }}>
                  {section.helper}
                </div>
              )}
              <textarea
                value={sectionAnswers[section.id] || ''}
                onChange={(e) => updateSection(section.id, e.target.value)}
                placeholder={section.placeholder}
                disabled={disabled}
                rows={section.rows ?? 2}
                style={{
                  width: '100%',
                  border: '1px solid #D7D0C5',
                  borderRadius: '6px',
                  outline: 'none',
                  resize: 'vertical',
                  padding: '0.55rem',
                  fontSize: '0.8rem',
                  lineHeight: 1.5,
                  fontFamily: 'Inter, system-ui, sans-serif',
                  color: '#1d1c1d',
                  backgroundColor: disabled ? '#EDE5D3' : '#FBF7EA',
                }}
              />
            </section>
          ))}
        </div>
      )}

      {/* Compose area */}
      <div
        style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid #e0e0e0',
        }}
      >
        <div
          style={{
            border: overLimit ? '2px solid #c0392b' : '1px solid #ccc',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {!hasSections && (
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              rows={5}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                resize: 'none',
                padding: '0.75rem',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: '#1d1c1d',
                backgroundColor: disabled ? '#EDE5D3' : '#F7F1E3',
                opacity: disabled ? 0.6 : 1,
              }}
            />
          )}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.375rem 0.75rem',
              backgroundColor: '#f8f8f8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {(minWords || maxWords) && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    color: overLimit || underMinimum ? '#c0392b' : '#999',
                    fontWeight: overLimit || underMinimum ? 600 : 400,
                  }}
                >
                  {wordRuleText}
                </span>
              )}
            </div>
            <button
              onClick={onSend}
              disabled={effectiveSendDisabled}
              style={{
                backgroundColor: effectiveSendDisabled ? '#9bb59b' : '#007a5a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '0.375rem 1rem',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: effectiveSendDisabled ? 'not-allowed' : 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!effectiveSendDisabled) e.currentTarget.style.backgroundColor = '#005e47'
              }}
              onMouseLeave={(e) => {
                if (!effectiveSendDisabled) e.currentTarget.style.backgroundColor = '#007a5a'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
