import { useState } from 'react'
import type { FreeTextNode } from '../types/game'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

interface SlideTextElement {
  id: string
  text: string
  x: number
  y: number
  w: number
  h: number
  fontSize: number
  fontWeight: number
}

interface Slide {
  id: string
  speakerNotes: string
  elements: SlideTextElement[]
}

interface SlideDeckState {
  version: 1
  activeSlideId: string
  slides: Slide[]
}

interface Props {
  node: FreeTextNode
  value: string
  setValue: (value: string) => void
}

const maxSlides = 5
const editorScale = 0.88

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
}

function createBlankSlide(index = 1): Slide {
  return {
    id: makeId(`slide_${index}`),
    speakerNotes: '',
    elements: [],
  }
}

function parseLegacyText(raw: string): SlideDeckState {
  const headlineMatch = raw.match(/Headline:\s*([^\n]+)/i)
  const noteMatch = raw.match(/Speaker note:\s*([\s\S]*)/i)
  const slide = createBlankSlide(1)
  slide.elements = headlineMatch?.[1]
    ? [{
      id: makeId('text'),
      text: headlineMatch[1].trim(),
      x: 7,
      y: 9,
      w: 82,
      h: 18,
      fontSize: 30,
      fontWeight: 800,
    }]
    : []
  slide.speakerNotes = noteMatch?.[1]?.trim() || ''
  return { version: 1, activeSlideId: slide.id, slides: [slide] }
}

function parseDeck(raw: string): SlideDeckState {
  if (!raw.trim()) {
    const slide = createBlankSlide(1)
    return { version: 1, activeSlideId: slide.id, slides: [slide] }
  }

  try {
    const parsed = JSON.parse(raw)
    const slides: Slide[] = Array.isArray(parsed.slides)
      ? parsed.slides.slice(0, maxSlides).map((slide: Partial<Slide>, index: number) => ({
        id: typeof slide.id === 'string' ? slide.id : makeId(`slide_${index + 1}`),
        speakerNotes: typeof slide.speakerNotes === 'string' ? slide.speakerNotes : '',
        elements: Array.isArray(slide.elements)
          ? slide.elements.map((item: Partial<SlideTextElement>) => ({
            id: typeof item.id === 'string' ? item.id : makeId('text'),
            text: typeof item.text === 'string' ? item.text : '',
            x: clamp(Number(item.x), 0, 96),
            y: clamp(Number(item.y), 0, 92),
            w: clamp(Number(item.w), 4, 100),
            h: clamp(Number(item.h), 4, 100),
            fontSize: clamp(Number(item.fontSize), 10, 72),
            fontWeight: clamp(Number(item.fontWeight), 300, 900),
          }))
          : [],
      }))
      : []

    return {
      version: 1,
      activeSlideId: slides.some((slide) => slide.id === parsed.activeSlideId)
        ? parsed.activeSlideId
        : slides[0]?.id || '',
      slides,
    }
  } catch {
    return parseLegacyText(raw)
  }
}

function serializeDeck(deck: SlideDeckState) {
  return JSON.stringify(deck, null, 2)
}

function slideSummary(slide: Slide, index: number) {
  const firstText = slide.elements.find((item) => item.text.trim())?.text.trim()
  return firstText || `Slide ${index + 1}`
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable
}

const toolbarButtonStyle: CSSProperties = {
  border: '1px solid #BFC8B7',
  background: '#FFFFFF',
  color: '#163B32',
  borderRadius: 6,
  padding: '0.42rem 0.62rem',
  fontSize: '0.74rem',
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'Inter, system-ui, sans-serif',
}

const inspectorLabelStyle: CSSProperties = {
  fontSize: '0.68rem',
  color: '#46645D',
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: 0,
}

const numberInputStyle: CSSProperties = {
  width: '100%',
  border: '1px solid #CDBF94',
  borderRadius: 5,
  background: '#FFFFFF',
  color: '#1E1E1A',
  padding: '0.42rem',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: '0.78rem',
}

const textBoxMoveEdgeStyle: CSSProperties = {
  position: 'absolute',
  border: 0,
  background: 'transparent',
  padding: 0,
  cursor: 'move',
  zIndex: 4,
}

export default function SlideDeckEditor({ node, value, setValue }: Props) {
  const [selectedElementId, setSelectedElementId] = useState('')
  const deck = parseDeck(value)
  const activeSlide = deck.slides.find((slide) => slide.id === deck.activeSlideId) || deck.slides[0]
  const selectedElement = activeSlide?.elements.find((item) => item.id === selectedElementId)

  const save = (next: SlideDeckState) => {
    setValue(serializeDeck(next))
  }

  const setActiveSlide = (slideId: string) => {
    setSelectedElementId('')
    save({ ...deck, activeSlideId: slideId })
  }

  const addSlide = () => {
    if (deck.slides.length >= maxSlides) return
    const slide = createBlankSlide(deck.slides.length + 1)
    save({ ...deck, slides: [...deck.slides, slide], activeSlideId: slide.id })
    setSelectedElementId('')
  }

  const duplicateSlide = () => {
    if (!activeSlide || deck.slides.length >= maxSlides) return
    const copy: Slide = {
      ...activeSlide,
      id: makeId('slide_copy'),
      elements: activeSlide.elements.map((item) => ({ ...item, id: makeId('text') })),
    }
    save({ ...deck, slides: [...deck.slides, copy], activeSlideId: copy.id })
    setSelectedElementId('')
  }

  const removeSlide = () => {
    if (!activeSlide) return
    const slides = deck.slides.filter((slide) => slide.id !== activeSlide.id)
    save({ ...deck, slides, activeSlideId: slides[0]?.id || '' })
    setSelectedElementId('')
  }

  const updateSlide = (slideId: string, updater: (slide: Slide) => Slide) => {
    save({
      ...deck,
      slides: deck.slides.map((slide) => (slide.id === slideId ? updater(slide) : slide)),
    })
  }

  const addTextBox = () => {
    if (!activeSlide) {
      const slide = createBlankSlide(1)
      const element: SlideTextElement = {
        id: makeId('text'),
        text: '',
        x: 8,
        y: 10,
        w: 66,
        h: 16,
        fontSize: 28,
        fontWeight: 800,
      }
      slide.elements = [element]
      save({ ...deck, slides: [slide], activeSlideId: slide.id })
      setSelectedElementId(element.id)
      return
    }

    const element: SlideTextElement = {
      id: makeId('text'),
      text: '',
      x: 8,
      y: clamp(10 + activeSlide.elements.length * 12, 8, 78),
      w: 70,
      h: 14,
      fontSize: activeSlide.elements.length ? 19 : 30,
      fontWeight: activeSlide.elements.length ? 500 : 800,
    }
    updateSlide(activeSlide.id, (slide) => ({ ...slide, elements: [...slide.elements, element] }))
    setSelectedElementId(element.id)
  }

  const updateElement = (elementId: string, patch: Partial<SlideTextElement>) => {
    if (!activeSlide) return
    updateSlide(activeSlide.id, (slide) => ({
      ...slide,
      elements: slide.elements.map((item) => (item.id === elementId ? { ...item, ...patch } : item)),
    }))
  }

  const removeElement = () => {
    if (!activeSlide || !selectedElement) return
    updateSlide(activeSlide.id, (slide) => ({
      ...slide,
      elements: slide.elements.filter((item) => item.id !== selectedElement.id),
    }))
    setSelectedElementId('')
  }

  const updateNotes = (speakerNotes: string) => {
    if (!activeSlide) return
    updateSlide(activeSlide.id, (slide) => ({ ...slide, speakerNotes }))
  }

  const updateMetric = (key: keyof Pick<SlideTextElement, 'x' | 'y' | 'w' | 'h' | 'fontSize'>, raw: string) => {
    if (!selectedElement) return
    const bounds = key === 'fontSize' ? [10, 72] : key === 'w' || key === 'h' ? [4, 100] : [0, 96]
    updateElement(selectedElement.id, { [key]: clamp(Number(raw), bounds[0], bounds[1]) } as Partial<SlideTextElement>)
  }

  const startCanvasEdit = (event: ReactPointerEvent<HTMLElement>, item: SlideTextElement, mode: 'move' | 'resize') => {
    const canvas = event.currentTarget.closest('[aria-label="Slide canvas"]') as HTMLElement | null
    if (!canvas) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedElementId(item.id)

    const rect = canvas.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const start = { ...item }

    const move = (moveEvent: PointerEvent) => {
      const dx = ((moveEvent.clientX - startX) / rect.width) * 100
      const dy = ((moveEvent.clientY - startY) / rect.height) * 100
      if (mode === 'move') {
        updateElement(item.id, {
          x: clamp(start.x + dx, 0, 100 - start.w),
          y: clamp(start.y + dy, 0, 100 - start.h),
        })
      } else {
        updateElement(item.id, {
          w: clamp(start.w + dx, 4, 100 - start.x),
          h: clamp(start.h + dy, 4, 100 - start.y),
        })
      }
    }

    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isEditableTarget(event.target)) return

    const key = event.key.toLowerCase()
    if ((event.metaKey || event.ctrlKey) && key === 'c') {
      event.preventDefault()
      duplicateSlide()
      return
    }

    if (key === 'delete' || key === 'backspace') {
      event.preventDefault()
      removeSlide()
    }
  }

  return (
    <div
      tabIndex={0}
      onMouseDown={(event) => {
        if (!isEditableTarget(event.target)) event.currentTarget.focus()
      }}
      onKeyDown={handleKeyDown}
      style={{ height: '100%', minHeight: 0, overflow: 'hidden', background: '#E8E1CF', outline: 'none' }}
    >
      <div
        style={{
          width: `${100 / editorScale}%`,
          height: `${100 / editorScale}%`,
          transform: `scale(${editorScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '150px minmax(480px, 1fr) 230px',
            height: '100%',
            minHeight: 0,
            background: '#E8E1CF',
            overflow: 'hidden',
          }}
        >
      <aside style={{ borderRight: '1px solid #CDBF94', background: '#F2EBD9', padding: '0.7rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', minHeight: 0, overflowY: 'auto' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>Slides</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          {deck.slides.map((slide, index) => {
            const active = slide.id === activeSlide?.id
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => setActiveSlide(slide.id)}
                title={slideSummary(slide, index)}
                style={{
                  border: active ? '2px solid #3A6B5E' : '1px solid #CDBF94',
                  background: '#FFFFFF',
                  borderRadius: 6,
                  padding: '0.35rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                <div style={{ aspectRatio: '16 / 9', background: 'linear-gradient(135deg, #FBF7EA 0%, #FBF7EA 68%, #E2EBDD 100%)', border: '1px solid #D8CEAE', position: 'relative', overflow: 'hidden', marginBottom: '0.3rem' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, width: '3%', height: '100%', background: '#3A6B5E', opacity: 0.7 }} />
                  {slide.elements.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      style={{
                        position: 'absolute',
                        left: `${item.x}%`,
                        top: `${item.y}%`,
                        width: `${item.w}%`,
                        height: `${item.h}%`,
                        background: item.text.trim() ? '#7C958E' : '#D8CEAE',
                        opacity: 0.75,
                      }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#1E1E1A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {index + 1}. {slideSummary(slide, index)}
                </div>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={addSlide} disabled={deck.slides.length >= maxSlides} style={{ ...toolbarButtonStyle, opacity: deck.slides.length >= maxSlides ? 0.45 : 1 }}>
          + Slide
        </button>
        <div style={{ marginTop: 'auto', fontSize: '0.68rem', color: '#6A604B', lineHeight: 1.4 }}>
          {deck.slides.length}/{maxSlides} slides
        </div>
      </aside>

      <main style={{ minWidth: 0, minHeight: 0, padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.7rem', overflowX: 'hidden', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.7rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={addTextBox} style={toolbarButtonStyle}>+ Text</button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <div style={{ width: 'min(100%, 900px)' }}>
            <div
              aria-label="Slide canvas"
              style={{
                aspectRatio: '16 / 9',
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #FBF7EA 0%, #FBF7EA 64%, #E7EFE4 100%)',
                border: '1px solid #BFC8B7',
                boxShadow: '0 10px 24px rgba(30,30,26,0.16)',
              }}
              onClick={() => setSelectedElementId('')}
            >
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(58,107,94,0.13) 0 1.2%, transparent 1.2%), linear-gradient(180deg, rgba(205,191,148,0.18) 0 11%, transparent 11%)' }} />
              <div style={{ position: 'absolute', left: '7%', right: '7%', bottom: '7%', height: 1, background: '#CDBF94', opacity: 0.65 }} />
              {activeSlide?.elements.map((item) => {
                const selected = item.id === selectedElementId
                return (
                  <div
                    key={item.id}
                    style={{
                      position: 'absolute',
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.w}%`,
                      height: `${item.h}%`,
                      outline: selected ? '2px solid #3A6B5E' : '1px solid transparent',
                      background: selected ? 'rgba(255,255,255,0.34)' : 'transparent',
                      zIndex: selected ? 3 : 2,
                    }}
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedElementId(item.id)
                    }}
                  >
                    <textarea
                      value={item.text}
                      onChange={(event) => updateElement(item.id, { text: event.target.value })}
                      onFocus={() => setSelectedElementId(item.id)}
                      placeholder="Text"
                      style={{
                        width: '100%',
                        height: '100%',
                        resize: 'none',
                        border: 0,
                        outline: 0,
                        background: 'transparent',
                        color: '#163B32',
                        padding: '0.22rem',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: item.fontSize,
                        lineHeight: 1.12,
                        fontWeight: item.fontWeight,
                        overflow: 'hidden',
                      }}
                    />
                    {selected && (
                      <>
                        <button
                          type="button"
                          aria-label="Move text box from top edge"
                          onPointerDown={(event) => startCanvasEdit(event, item, 'move')}
                          style={{ ...textBoxMoveEdgeStyle, left: -6, right: -6, top: -6, height: 12 }}
                        />
                        <button
                          type="button"
                          aria-label="Move text box from bottom edge"
                          onPointerDown={(event) => startCanvasEdit(event, item, 'move')}
                          style={{ ...textBoxMoveEdgeStyle, left: -6, right: -6, bottom: -6, height: 12 }}
                        />
                        <button
                          type="button"
                          aria-label="Move text box from left edge"
                          onPointerDown={(event) => startCanvasEdit(event, item, 'move')}
                          style={{ ...textBoxMoveEdgeStyle, left: -6, top: -6, bottom: -6, width: 12 }}
                        />
                        <button
                          type="button"
                          aria-label="Move text box from right edge"
                          onPointerDown={(event) => startCanvasEdit(event, item, 'move')}
                          style={{ ...textBoxMoveEdgeStyle, right: -6, top: -6, bottom: -6, width: 12 }}
                        />
                        <button
                          type="button"
                          aria-label="Move text box"
                          onPointerDown={(event) => startCanvasEdit(event, item, 'move')}
                          style={{
                            position: 'absolute',
                            left: -9,
                            top: -9,
                            width: 16,
                            height: 16,
                            borderRadius: 999,
                            border: '2px solid #FFFFFF',
                            background: '#3A6B5E',
                            cursor: 'move',
                            padding: 0,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                          }}
                        />
                        <button
                          type="button"
                          aria-label="Resize text box"
                          onPointerDown={(event) => startCanvasEdit(event, item, 'resize')}
                          style={{
                            position: 'absolute',
                            right: -9,
                            bottom: -9,
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            border: '2px solid #FFFFFF',
                            background: '#3A6B5E',
                            cursor: 'nwse-resize',
                            padding: 0,
                            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                          }}
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: '0.65rem', background: '#FFFFFF', border: '1px solid #CDBF94', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ padding: '0.45rem 0.62rem', background: '#EFE8D2', borderBottom: '1px solid #CDBF94', fontSize: '0.72rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>
                Speaker notes
              </div>
              <textarea
                value={activeSlide?.speakerNotes || ''}
                onChange={(event) => updateNotes(event.target.value)}
                placeholder="Speaker notes"
                rows={4}
                disabled={!activeSlide}
                style={{
                  width: '100%',
                  resize: 'vertical',
                  border: 0,
                  outline: 0,
                  padding: '0.75rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '0.86rem',
                  lineHeight: 1.55,
                  color: '#1E1E1A',
                  background: '#FFFFFF',
                }}
              />
            </div>
          </div>
        </div>

      </main>

      <aside style={{ borderLeft: '1px solid #CDBF94', background: '#F2EBD9', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 0, overflowY: 'auto' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 900, color: '#3A6B5E', textTransform: 'uppercase', letterSpacing: 0 }}>Text settings</div>
        {selectedElement ? (
          <>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
              <span style={inspectorLabelStyle}>Size</span>
              <input type="number" min={10} max={72} value={Math.round(selectedElement.fontSize)} onChange={(event) => updateMetric('fontSize', event.target.value)} style={numberInputStyle} />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {(['x', 'y', 'w', 'h'] as const).map((key) => (
                <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
                  <span style={inspectorLabelStyle}>{key.toUpperCase()}</span>
                  <input type="number" value={Math.round(selectedElement[key])} onChange={(event) => updateMetric(key, event.target.value)} style={numberInputStyle} />
                </label>
              ))}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.28rem' }}>
              <span style={inspectorLabelStyle}>Weight</span>
              <select
                value={selectedElement.fontWeight}
                onChange={(event) => updateElement(selectedElement.id, { fontWeight: Number(event.target.value) })}
                style={numberInputStyle}
              >
                <option value={400}>Regular</option>
                <option value={600}>Semi bold</option>
                <option value={800}>Bold</option>
              </select>
            </label>
            <button type="button" onClick={removeElement} style={{ ...toolbarButtonStyle, color: '#8F3E32' }}>
              Delete text
            </button>
          </>
        ) : (
          <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 6, padding: '0.7rem', fontSize: '0.75rem', lineHeight: 1.45, color: '#6A604B' }}>
            Select a text box.
          </div>
        )}

        <div style={{ marginTop: 'auto', border: '1px solid #CDBF94', background: '#FBF7EA', borderRadius: 6, padding: '0.7rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#3A6B5E', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0, marginBottom: '0.35rem' }}>
            Task
          </div>
          <div style={{ fontSize: '0.75rem', lineHeight: 1.45, color: '#1E1E1A' }}>
            {node.prompt}
          </div>
        </div>
      </aside>
        </div>
      </div>
    </div>
  )
}
