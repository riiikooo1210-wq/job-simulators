import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import SceneWrapper from '../components/layout/SceneWrapper'
import ActionButton from '../components/ui/ActionButton'
import { renderContentWithGlossary } from '../components/ui/JargonTerm'
import { useGameStore } from '../store/gameStore'
import { useGoNext } from '../engine/resolveNext'
import { interpolate } from '../lib/interpolate'
import { showDevTools } from '../lib/devTools'
import type { CameraShootNode } from '../types/game'

type SlateItem = Record<string, string>
type ScriptMode = 'slate' | 'custom'

interface EditCut {
  id: string
  start: number
  end: number
}

interface TranscriptSegment {
  id: string
  start: number
  end: number
  text: string
}

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternativeLike | undefined
}

interface SpeechRecognitionResultListLike {
  length: number
  [index: number]: SpeechRecognitionResultLike | undefined
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultListLike
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

interface ShootState {
  recorded: boolean
  recordedSeconds: number
  selectedBeatIds: string[]
  caption: string
  scriptMode: ScriptMode
  selectedSlateIndex: number
  customSlate: SlateItem
  selectedScript?: SlateItem
  editCuts: EditCut[]
  recordingNotes: string
  rawTranscript: string
  editedTranscript: string
  editedTranscriptManuallyEdited: boolean
  editedTranscriptReviewed: boolean
  transcriptSegments: TranscriptSegment[]
  disclosureDetected: boolean
  disclosureSources: string[]
  finalEditedSeconds: number
  completedAt?: string
}

const emptyShootState: ShootState = {
  recorded: false,
  recordedSeconds: 0,
  selectedBeatIds: [],
  caption: '',
  scriptMode: 'slate',
  selectedSlateIndex: 0,
  customSlate: {},
  editCuts: [],
  recordingNotes: '',
  rawTranscript: '',
  editedTranscript: '',
  editedTranscriptManuallyEdited: false,
  editedTranscriptReviewed: false,
  transcriptSegments: [],
  disclosureDetected: false,
  disclosureSources: [],
  finalEditedSeconds: 0,
}

function parseShootState(raw: string | undefined): ShootState {
  if (!raw) return emptyShootState
  try {
    const parsed = JSON.parse(raw)
    return {
      recorded: Boolean(parsed.recorded),
      recordedSeconds: typeof parsed.recordedSeconds === 'number' ? parsed.recordedSeconds : 0,
      selectedBeatIds: Array.isArray(parsed.selectedBeatIds) ? parsed.selectedBeatIds : [],
      caption: typeof parsed.caption === 'string' ? parsed.caption : '',
      scriptMode: parsed.scriptMode === 'custom' ? 'custom' : 'slate',
      selectedSlateIndex: typeof parsed.selectedSlateIndex === 'number' ? parsed.selectedSlateIndex : 0,
      customSlate: parsed.customSlate && typeof parsed.customSlate === 'object' ? parsed.customSlate : {},
      selectedScript: parsed.selectedScript && typeof parsed.selectedScript === 'object' ? parsed.selectedScript : undefined,
      editCuts: normalizeCuts(parsed.editCuts, typeof parsed.recordedSeconds === 'number' ? parsed.recordedSeconds : 0),
      recordingNotes: typeof parsed.recordingNotes === 'string'
        ? parsed.recordingNotes
        : typeof parsed.transcript === 'string' && typeof parsed.rawTranscript !== 'string'
          ? parsed.transcript
          : '',
      rawTranscript: typeof parsed.rawTranscript === 'string' ? parsed.rawTranscript : '',
      editedTranscript: typeof parsed.editedTranscript === 'string' ? parsed.editedTranscript : '',
      editedTranscriptManuallyEdited: Boolean(parsed.editedTranscriptManuallyEdited),
      editedTranscriptReviewed: Boolean(parsed.editedTranscriptReviewed),
      transcriptSegments: normalizeTranscriptSegments(parsed.transcriptSegments, typeof parsed.recordedSeconds === 'number' ? parsed.recordedSeconds : 0),
      disclosureDetected: Boolean(parsed.disclosureDetected),
      disclosureSources: Array.isArray(parsed.disclosureSources) ? parsed.disclosureSources.filter((source: unknown) => typeof source === 'string') : [],
      finalEditedSeconds: typeof parsed.finalEditedSeconds === 'number' ? parsed.finalEditedSeconds : 0,
      completedAt: typeof parsed.completedAt === 'string' ? parsed.completedAt : undefined,
    }
  } catch {
    return emptyShootState
  }
}

function parseSlate(raw: string | undefined): SlateItem[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : []
  } catch {
    return []
  }
}

const scriptFields = [
  { key: 'platform', label: 'Platform + format', placeholder: 'TikTok 45-sec wear test' },
  { key: 'hook', label: 'Opening hook', placeholder: 'I wore this SPF tint for four hours on sensitive skin...' },
  { key: 'proof', label: 'Proof point', placeholder: 'Natural light check-in, shade oxidation, price comparison' },
  { key: 'trust', label: 'Disclosure / trust risk', placeholder: 'Paid partnership; say what was gifted and what is still untested' },
]

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatPreciseTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const mins = Math.floor(safeSeconds / 60)
  const secs = safeSeconds - mins * 60
  return `${mins}:${secs.toFixed(1).padStart(4, '0')}`
}

function roundTime(seconds: number) {
  return Math.round(seconds * 10) / 10
}

function clampTime(seconds: number, maxSeconds: number) {
  if (!Number.isFinite(seconds)) return 0
  return roundTime(Math.min(Math.max(seconds, 0), Math.max(0, maxSeconds)))
}

function normalizeCut(cut: Partial<EditCut>, maxSeconds: number, index: number): EditCut {
  const start = clampTime(typeof cut.start === 'number' ? cut.start : 0, maxSeconds)
  const fallbackEnd = Math.min(start + 1, maxSeconds)
  const end = clampTime(typeof cut.end === 'number' ? cut.end : fallbackEnd, maxSeconds)
  const safeEnd = Math.max(roundTime(start + 0.1), end)
  return {
    id: typeof cut.id === 'string' && cut.id ? cut.id : `cut-${index + 1}`,
    start,
    end: clampTime(safeEnd, maxSeconds),
  }
}

function normalizeCuts(cuts: unknown, maxSeconds: number): EditCut[] {
  if (!Array.isArray(cuts)) return []
  return cuts
    .map((cut, index) => normalizeCut(cut && typeof cut === 'object' ? cut as Partial<EditCut> : {}, maxSeconds, index))
    .filter((cut) => cut.end > cut.start)
    .sort((a, b) => a.start - b.start)
}

function normalizeTranscriptSegments(segments: unknown, maxSeconds: number): TranscriptSegment[] {
  if (!Array.isArray(segments)) return []
  return segments
    .map((segment, index) => {
      const raw = segment && typeof segment === 'object' ? segment as Partial<TranscriptSegment> : {}
      const start = clampTime(typeof raw.start === 'number' ? raw.start : 0, maxSeconds)
      const fallbackEnd = Math.min(start + 1, maxSeconds || start + 1)
      const end = clampTime(typeof raw.end === 'number' ? raw.end : fallbackEnd, maxSeconds || fallbackEnd)
      return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : `transcript-${index + 1}`,
        start,
        end: Math.max(end, roundTime(start + 0.1)),
        text: typeof raw.text === 'string' ? raw.text.trim() : '',
      }
    })
    .filter((segment) => segment.text && segment.end > segment.start)
    .sort((a, b) => a.start - b.start)
}

function transcriptText(segments: TranscriptSegment[]) {
  return segments.map((segment) => segment.text).join(' ').replace(/\s+/g, ' ').trim()
}

function wordsFromText(text: string) {
  return text.match(/\S+/g) || []
}

function timeIsCut(time: number, cuts: EditCut[]) {
  return cuts.some((cut) => time >= cut.start && time < cut.end)
}

function transcriptSegmentsCoverRecording(segments: TranscriptSegment[], recordedSeconds: number) {
  if (segments.length === 0 || recordedSeconds <= 0) return false
  const first = segments[0]
  const last = segments[segments.length - 1]
  if (!first || !last) return false
  return Math.max(0, last.end - first.start) >= recordedSeconds * 0.55
}

function editedTranscriptText(segments: TranscriptSegment[], cuts: EditCut[], recordedSeconds: number, fallbackRawTranscript = '') {
  const rawTranscript = transcriptText(segments) || fallbackRawTranscript
  const rawWords = wordsFromText(rawTranscript)
  if (rawWords.length === 0 || cuts.length === 0) return rawTranscript

  if (!transcriptSegmentsCoverRecording(segments, recordedSeconds)) {
    return rawWords
      .filter((_, index) => !timeIsCut(((index + 0.5) / rawWords.length) * Math.max(recordedSeconds, 1), cuts))
      .join(' ')
      .trim()
  }

  const keptWords: string[] = []
  segments.forEach((segment) => {
    const words = wordsFromText(segment.text)
    const duration = Math.max(segment.end - segment.start, 0.1)
    words.forEach((word, index) => {
      const wordTime = segment.start + ((index + 0.5) / Math.max(words.length, 1)) * duration
      if (!timeIsCut(wordTime, cuts)) keptWords.push(word)
    })
  })
  return keptWords.join(' ').trim()
}

function hasDisclosureLanguage(text: string) {
  return /\b(?:paid partnership|paid partner|sponsored|sponsor(?:ed)? by|ad\b|#ad\b|gifted|pr package|product provided|provided by|sent (?:to )?me|brand partner)\b/i.test(text)
}

function disclosureSourcesFor(editedTranscript: string, caption: string) {
  const sources: string[] = []
  if (hasDisclosureLanguage(editedTranscript)) sources.push('editedTranscript')
  if (hasDisclosureLanguage(caption)) sources.push('caption')
  return sources
}

function mergedCutSeconds(cuts: EditCut[]) {
  const merged: Array<{ start: number; end: number }> = []
  cuts.forEach((cut) => {
    const last = merged[merged.length - 1]
    if (!last || cut.start > last.end) {
      merged.push({ start: cut.start, end: cut.end })
    } else {
      last.end = Math.max(last.end, cut.end)
    }
  })
  return roundTime(merged.reduce((total, cut) => total + Math.max(0, cut.end - cut.start), 0))
}

function recorderMimeType(hasAudio: boolean) {
  if (typeof MediaRecorder === 'undefined') return undefined
  const video = typeof document !== 'undefined' ? document.createElement('video') : null
  const options = [
    ...(hasAudio ? ['video/webm;codecs=vp8,opus'] : []),
    'video/webm;codecs=vp8',
    ...(hasAudio ? ['video/webm;codecs=vp9,opus'] : []),
    'video/webm;codecs=vp9',
    'video/webm',
    ...(hasAudio ? ['video/mp4;codecs=avc1.42E01E,mp4a.40.2'] : ['video/mp4;codecs=avc1.42E01E']),
    'video/mp4',
  ]
  return options.find((type) => MediaRecorder.isTypeSupported(type) && (!video || video.canPlayType(type))) ||
    options.find((type) => MediaRecorder.isTypeSupported(type))
}

export default function CameraShootScene({ node }: { node: CameraShootNode }) {
  const responses = useGameStore((s) => s.freeTextResponses)
  const setFreeTextResponse = useGameStore((s) => s.setFreeTextResponse)
  const playerName = useGameStore((s) => s.playerName)
  const branchFlags = useGameStore((s) => s.branchFlags)
  const mcSelections = useGameStore((s) => s.mcSelections)
  const goNext = useGoNext()
  const context = { playerName, branchFlags, mcSelections }
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playbackRef = useRef<HTMLVideoElement | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordedUrlRef = useRef<string | null>(null)
  const recordedBlobRef = useRef<Blob | null>(null)
  const previewSkippingRef = useRef(false)
  const lastPlaybackTimeRef = useRef(0)
  const transcriptionRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptSegmentsRef = useRef<TranscriptSegment[]>([])
  const shouldTranscribeRef = useRef(false)
  const pendingRecordingFinalizeRef = useRef<(() => void) | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const timerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null)
  const [cameraError, setCameraError] = useState('')
  const [playbackError, setPlaybackError] = useState('')
  const [playheadSeconds, setPlayheadSeconds] = useState(0)
  const [cutStartMark, setCutStartMark] = useState<number | null>(null)
  const [previewSkipping, setPreviewSkipping] = useState(false)
  const [playbackPlaying, setPlaybackPlaying] = useState(false)
  const [latestCutId, setLatestCutId] = useState('')
  const [editNotice, setEditNotice] = useState('')
  const [transcriptionStatus, setTranscriptionStatus] = useState('Transcript not started.')
  const [liveTranscript, setLiveTranscript] = useState('')
  const [editingEditedTranscript, setEditingEditedTranscript] = useState(false)

  const shootState = useMemo(() => parseShootState(responses[node.bindingKey]), [responses, node.bindingKey])
  const slateItems = useMemo(() => parseSlate(node.sourceBindingKey ? responses[node.sourceBindingKey] : undefined), [node.sourceBindingKey, responses])
  const selectedSlateIndex = slateItems.length > 0
    ? Math.min(Math.max(shootState.selectedSlateIndex, 0), slateItems.length - 1)
    : 0
  const scriptMode: ScriptMode = slateItems.length === 0 || shootState.scriptMode === 'custom' ? 'custom' : 'slate'
  const customSlate = shootState.customSlate || {}
  const selectedSlate = scriptMode === 'custom' ? customSlate : slateItems[selectedSlateIndex] || {}
  const scriptReady = scriptMode === 'custom'
    ? scriptFields.every((field) => (customSlate[field.key] || '').trim().length > 0)
    : Boolean(slateItems[selectedSlateIndex])
  const maxSeconds = node.maxSeconds ?? 120
  const beatSeconds = node.beatSeconds ?? Math.max(15, Math.floor(maxSeconds / Math.max(1, node.beats.length)))
  const minSelectedBeats = node.minSelectedBeats ?? 3
  const activeBeatIndex = Math.min(node.beats.length - 1, Math.floor(elapsed / beatSeconds))
  const activeBeat = node.beats[activeBeatIndex] || node.beats[0]
  const wordCount = shootState.caption.trim() ? shootState.caption.trim().split(/\s+/).length : 0
  const notesWordCount = shootState.recordingNotes.trim() ? shootState.recordingNotes.trim().split(/\s+/).length : 0
  const editCuts = useMemo(
    () => normalizeCuts(shootState.editCuts, shootState.recordedSeconds),
    [shootState.editCuts, shootState.recordedSeconds]
  )
  const removedSeconds = mergedCutSeconds(editCuts)
  const finalEditedSeconds = Math.max(0, roundTime((shootState.recordedSeconds || 0) - removedSeconds))
  const currentDisclosureSources = disclosureSourcesFor(shootState.editedTranscript, shootState.caption)
  const disclosureDetected = currentDisclosureSources.length > 0
  const canSubmit = shootState.recorded
    && scriptReady
    && shootState.selectedBeatIds.length >= minSelectedBeats
    && wordCount >= 8
    && disclosureDetected
    && shootState.editedTranscriptReviewed
  const showShootDevSkip = import.meta.env.DEV || showDevTools

  const setPreviewMode = (enabled: boolean) => {
    previewSkippingRef.current = enabled
    setPreviewSkipping(enabled)
  }

  useEffect(() => {
    if (videoRef.current && stream && !recordedUrl) {
      videoRef.current.srcObject = stream
    }
  }, [stream, recordedUrl])

  useEffect(() => {
    if (recordedUrl && playbackRef.current) {
      playbackRef.current.srcObject = null
      playbackRef.current.load()
    }
    if (recordedUrl && videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [recordedUrl])

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      shouldTranscribeRef.current = false
      try {
        transcriptionRef.current?.stop()
      } catch {
        // Speech recognition may already be stopped.
      }
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [stream])

  const enrichState = (next: ShootState): ShootState => {
    const normalizedCuts = normalizeCuts(next.editCuts, next.recordedSeconds)
    const normalizedSegments = normalizeTranscriptSegments(next.transcriptSegments, next.recordedSeconds)
    const nextRemovedSeconds = mergedCutSeconds(normalizedCuts)
    const rawTranscript = normalizedSegments.length > 0 ? transcriptText(normalizedSegments) : next.rawTranscript
    const autoEditedTranscript = editedTranscriptText(normalizedSegments, normalizedCuts, next.recordedSeconds, rawTranscript || next.editedTranscript)
    const editedTranscript = next.editedTranscriptManuallyEdited ? next.editedTranscript : autoEditedTranscript
    const disclosureSources = disclosureSourcesFor(editedTranscript, next.caption)
    return {
      ...next,
      editCuts: normalizedCuts,
      transcriptSegments: normalizedSegments,
      rawTranscript,
      editedTranscript,
      disclosureDetected: disclosureSources.length > 0,
      disclosureSources,
      finalEditedSeconds: Math.max(0, roundTime((next.recordedSeconds || 0) - nextRemovedSeconds)),
    }
  }

  const save = (next: ShootState) => {
    setFreeTextResponse(node.bindingKey, JSON.stringify(enrichState(next), null, 2))
  }

  const scriptSnapshot = (
    mode: ScriptMode = scriptMode,
    index: number = selectedSlateIndex,
    custom: SlateItem = customSlate
  ): SlateItem => {
    const source = mode === 'custom' ? custom : slateItems[index] || {}
    return scriptFields.reduce<SlateItem>((acc, field) => {
      acc[field.key] = source[field.key] || ''
      return acc
    }, {})
  }

  const selectSlate = (index: number) => {
    save({
      ...shootState,
      scriptMode: 'slate',
      selectedSlateIndex: index,
      selectedScript: scriptSnapshot('slate', index, customSlate),
    })
  }

  const selectCustomScript = () => {
    save({
      ...shootState,
      scriptMode: 'custom',
      selectedSlateIndex,
      selectedScript: scriptSnapshot('custom', selectedSlateIndex, customSlate),
    })
  }

  const updateCustomSlate = (field: string, value: string) => {
    const nextCustom = { ...customSlate, [field]: value }
    save({
      ...shootState,
      scriptMode: 'custom',
      customSlate: nextCustom,
      selectedScript: scriptSnapshot('custom', selectedSlateIndex, nextCustom),
    })
  }

  const requestCamera = async () => {
    setCameraError('')
    try {
      let nextStream: MediaStream
      try {
        nextStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: true,
        })
      } catch {
        nextStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false,
        })
      }
      setStream(nextStream)
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Camera permission was not granted.')
    }
  }

  const recordingElapsedSeconds = () => Math.max(0, (Date.now() - startedAtRef.current) / 1000)

  const addTranscriptSegment = (text: string) => {
    const cleanText = text.replace(/\s+/g, ' ').trim()
    if (!cleanText) return
    const end = clampTime(recordingElapsedSeconds(), maxSeconds)
    const estimatedDuration = Math.min(Math.max(cleanText.split(/\s+/).length * 0.42, 0.8), 8)
    const start = clampTime(Math.max(0, end - estimatedDuration), maxSeconds)
    const segment = {
      id: `transcript-${Date.now()}-${transcriptSegmentsRef.current.length + 1}`,
      start,
      end: Math.max(end, roundTime(start + 0.1)),
      text: cleanText,
    }
    transcriptSegmentsRef.current = [...transcriptSegmentsRef.current, segment]
    setLiveTranscript(transcriptText(transcriptSegmentsRef.current))
  }

  const startSpeechTranscription = () => {
    const speechWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor
      webkitSpeechRecognition?: SpeechRecognitionConstructor
    }
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    transcriptSegmentsRef.current = []
    shouldTranscribeRef.current = false
    pendingRecordingFinalizeRef.current = null
    setLiveTranscript('')
    if (!Recognition) {
      setTranscriptionStatus('Browser speech transcription is not available in this session.')
      return
    }

    const recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1
    recognition.onstart = () => setTranscriptionStatus('Listening for recorded transcript...')
    recognition.onresult = (event) => {
      let interimText = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const text = result?.[0]?.transcript || ''
        if (!text.trim()) continue
        if (result?.isFinal) {
          addTranscriptSegment(text)
        } else {
          interimText += ` ${text}`
        }
      }
      const baseText = transcriptText(transcriptSegmentsRef.current)
      setLiveTranscript(`${baseText}${interimText}`.trim())
    }
    recognition.onerror = (event) => {
      setTranscriptionStatus(event.error ? `Transcript capture issue: ${event.error}.` : 'Transcript capture issue.')
    }
    recognition.onend = () => {
      transcriptionRef.current = null
      if (shouldTranscribeRef.current && recorderRef.current?.state === 'recording') {
        window.setTimeout(startSpeechTranscription, 250)
        return
      }
      setTranscriptionStatus(transcriptSegmentsRef.current.length > 0
        ? 'Recorded transcript captured.'
        : 'No recorded speech transcript was captured.'
      )
      const pending = pendingRecordingFinalizeRef.current
      pendingRecordingFinalizeRef.current = null
      if (pending) pending()
    }

    transcriptionRef.current = recognition
    shouldTranscribeRef.current = true
    try {
      recognition.start()
    } catch {
      shouldTranscribeRef.current = false
      transcriptionRef.current = null
      setTranscriptionStatus('Could not start browser speech transcription.')
    }
  }

  const stopSpeechTranscriptionThen = (finalize: () => void) => {
    shouldTranscribeRef.current = false
    const recognition = transcriptionRef.current
    if (!recognition) {
      finalize()
      return
    }
    pendingRecordingFinalizeRef.current = finalize
    window.setTimeout(() => {
      const pending = pendingRecordingFinalizeRef.current
      if (!pending) return
      pendingRecordingFinalizeRef.current = null
      pending()
    }, 900)
    try {
      recognition.stop()
    } catch {
      const pending = pendingRecordingFinalizeRef.current
      pendingRecordingFinalizeRef.current = null
      if (pending) pending()
    }
  }

  const finishRecording = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    const recorder = recorderRef.current
    const stopRecorder = () => {
      if (!recorder || recorder.state !== 'recording') return
      const isMp4Recorder = recorder.mimeType.toLowerCase().includes('mp4')
      if (!isMp4Recorder) {
        try {
          recorder.requestData()
        } catch {
          // Some browsers only allow the final dataavailable event during stop.
        }
      }
      recorder.stop()
    }
    stopSpeechTranscriptionThen(stopRecorder)
  }

  const startRecording = () => {
    if (!stream || recording || !scriptReady) return
    if (typeof MediaRecorder === 'undefined') {
      setCameraError('This browser can show the camera, but it does not support in-browser recording.')
      return
    }
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl)
      if (recordedUrlRef.current === recordedUrl) recordedUrlRef.current = null
      recordedBlobRef.current = null
      setRecordedUrl(null)
    }
    setPlaybackError('')
    chunksRef.current = []
    const hasAudio = stream.getAudioTracks().length > 0
    const mimeType = recorderMimeType(hasAudio)
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recorderRef.current = recorder
    startedAtRef.current = Date.now()
    setElapsed(0)
    if (hasAudio) {
      startSpeechTranscription()
    } else {
      transcriptSegmentsRef.current = []
      setLiveTranscript('')
      setTranscriptionStatus('Microphone audio was not available, so the recorded transcript cannot be captured.')
    }
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => {
      const seconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000))
      if (chunksRef.current.length === 0) {
        setRecording(false)
        setPlaybackPlaying(false)
        setPlaybackError('The browser stopped recording before it produced video data. Please retake the shoot.')
        return
      }
      const fallbackChunk = chunksRef.current.find((chunk): chunk is Blob => chunk instanceof Blob && Boolean(chunk.type))
      const fallbackChunkType = fallbackChunk?.type
      const blobType = recorder.mimeType || fallbackChunkType || 'video/webm'
      const blob = new Blob(chunksRef.current, { type: blobType })
      if (recordedUrlRef.current) URL.revokeObjectURL(recordedUrlRef.current)
      const nextRecordedUrl = URL.createObjectURL(blob)
      recordedBlobRef.current = blob
      recordedUrlRef.current = nextRecordedUrl
      if (videoRef.current) videoRef.current.srcObject = null
      if (playbackRef.current) {
        playbackRef.current.pause()
        playbackRef.current.srcObject = null
        playbackRef.current.src = nextRecordedUrl
        playbackRef.current.load()
      }
      setRecordedUrl(nextRecordedUrl)
      setPlaybackError('')
      setRecording(false)
      setPlaybackPlaying(false)
      setPreviewMode(false)
      setPlayheadSeconds(0)
      setEditNotice('Recorded take is ready. Use Play raw take or scrub below to find cut points.')
      const transcriptSegments = normalizeTranscriptSegments(transcriptSegmentsRef.current, seconds)
      const rawTranscript = transcriptText(transcriptSegments)
      const editedTranscript = editedTranscriptText(transcriptSegments, [], seconds, rawTranscript)
      save({
        ...shootState,
        recorded: true,
        recordedSeconds: seconds,
        editCuts: [],
        rawTranscript,
        editedTranscript,
        transcriptSegments,
        editedTranscriptManuallyEdited: false,
        editedTranscriptReviewed: false,
        finalEditedSeconds: seconds,
        selectedScript: scriptSnapshot(),
        completedAt: new Date().toISOString(),
      })
    }
    const useTimedChunks = !(mimeType || recorder.mimeType).toLowerCase().includes('mp4')
    try {
      recorder.start(useTimedChunks ? 1000 : undefined)
    } catch {
      recorder.start()
    }
    setRecording(true)
    timerRef.current = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAtRef.current) / 1000)
      setElapsed(seconds)
      if (seconds >= maxSeconds) finishRecording()
    }, 500)
  }

  const toggleBeat = (beatId: string) => {
    const selected = shootState.selectedBeatIds.includes(beatId)
      ? shootState.selectedBeatIds.filter((id) => id !== beatId)
      : [...shootState.selectedBeatIds, beatId]
    save({ ...shootState, selectedBeatIds: selected, selectedScript: scriptSnapshot() })
  }

  const updateCaption = (caption: string) => {
    save({ ...shootState, caption, selectedScript: scriptSnapshot() })
  }

  const updateRecordingNotes = (recordingNotes: string) => {
    save({ ...shootState, recordingNotes, selectedScript: scriptSnapshot() })
  }

  const updateEditedTranscript = (editedTranscript: string) => {
    save({
      ...shootState,
      editedTranscript,
      editedTranscriptManuallyEdited: true,
      editedTranscriptReviewed: false,
      selectedScript: scriptSnapshot(),
    })
  }

  const resetEditedTranscriptToAuto = () => {
    const autoEditedTranscript = editedTranscriptText(shootState.transcriptSegments, editCuts, shootState.recordedSeconds, shootState.rawTranscript)
    save({
      ...shootState,
      editedTranscript: autoEditedTranscript,
      editedTranscriptManuallyEdited: false,
      editedTranscriptReviewed: false,
      selectedScript: scriptSnapshot(),
    })
    setEditingEditedTranscript(false)
  }

  const updateEditedTranscriptReviewed = (editedTranscriptReviewed: boolean) => {
    save({ ...shootState, editedTranscriptReviewed, selectedScript: scriptSnapshot() })
  }

  const updateCut = (cutId: string, patch: Partial<EditCut>) => {
    save({
      ...shootState,
      editCuts: editCuts.map((cut) => cut.id === cutId ? { ...cut, ...patch } : cut),
      editedTranscriptReviewed: false,
      selectedScript: scriptSnapshot(),
    })
  }

  const removeCut = (cutId: string) => {
    save({
      ...shootState,
      editCuts: editCuts.filter((cut) => cut.id !== cutId),
      editedTranscriptReviewed: false,
      selectedScript: scriptSnapshot(),
    })
    if (latestCutId === cutId) setLatestCutId('')
    setEditNotice('Cut removed.')
  }

  const currentPlaybackTime = () => {
    const video = playbackRef.current
    const maxRecordedSeconds = shootState.recordedSeconds || (video?.duration && Number.isFinite(video.duration) ? video.duration : maxSeconds)
    const current = video && Number.isFinite(video.currentTime) ? video.currentTime : playheadSeconds
    return clampTime(current, maxRecordedSeconds)
  }

  const addCutRange = (rawStart: number, rawEnd: number) => {
    const maxRecordedSeconds = shootState.recordedSeconds || maxSeconds
    if (!shootState.recorded || maxRecordedSeconds <= 0) return
    const start = clampTime(Math.min(rawStart, rawEnd), maxRecordedSeconds)
    const end = clampTime(Math.max(rawStart, rawEnd), maxRecordedSeconds)
    const safeStart = Math.min(start, Math.max(0, maxRecordedSeconds - 0.1))
    const safeEnd = Math.max(end, safeStart + 0.1)
    const id = `cut-${Date.now()}`
    save({
      ...shootState,
      editCuts: [
        ...editCuts,
        {
          id,
          start: roundTime(safeStart),
          end: clampTime(safeEnd, maxRecordedSeconds),
        },
      ],
      editedTranscriptReviewed: false,
      selectedScript: scriptSnapshot(),
    })
    setLatestCutId(id)
    setCutStartMark(null)
    setEditNotice(`Added cut ${formatPreciseTime(safeStart)}-${formatPreciseTime(clampTime(safeEnd, maxRecordedSeconds))}. Adjust it below if needed.`)
  }

  const seekPlayback = (seconds: number) => {
    const video = playbackRef.current
    if (!recordedUrl) {
      setEditNotice('The recorded video is not available in this browser session. Retake the shoot to edit playback.')
      return
    }
    const maxRecordedSeconds = shootState.recordedSeconds || maxSeconds
    const nextTime = clampTime(seconds, maxRecordedSeconds)
    setPreviewMode(false)
    setPlayheadSeconds(nextTime)
    if (video) video.currentTime = nextTime
  }

  const toggleRawPlayback = async () => {
    const video = playbackRef.current
    if (!recordedUrl) {
      setEditNotice('The recorded video is not available in this browser session. Retake the shoot to edit playback.')
      return
    }
    if (!video) {
      setEditNotice('Record a take first, then use the raw playback controls here to find cut points.')
      return
    }
    setPreviewMode(false)
    if (video.paused) {
      try {
        setPlaybackError('')
        await video.play()
        setPlaybackPlaying(true)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown playback error.'
        setPlaybackError(`The browser could not play this recording. Retake the shoot; the next recording will use a safer playback format. (${message})`)
        setEditNotice('Playback failed, so this take needs to be retaken before editing.')
      }
    } else {
      video.pause()
      setPlaybackPlaying(false)
    }
  }

  const nudgePlayback = (deltaSeconds: number) => {
    seekPlayback(currentPlaybackTime() + deltaSeconds)
  }

  const markCutStart = () => {
    if (!recordedUrl) {
      setEditNotice('The recorded video is not available in this browser session. Retake the shoot to edit playback.')
      return
    }
    const current = currentPlaybackTime()
    setCutStartMark(current)
    setEditNotice(cutStartMark === null
      ? `Cut start marked at ${formatPreciseTime(current)}. Move to the end of that section and mark cut end.`
      : `Pending cut start moved to ${formatPreciseTime(current)}. Mark cut end to save it.`
    )
  }

  const markCutEnd = () => {
    if (!recordedUrl) {
      setEditNotice('The recorded video is not available in this browser session. Retake the shoot to edit playback.')
      return
    }
    if (cutStartMark === null) {
      setEditNotice('Mark a cut start first.')
      return
    }
    const current = currentPlaybackTime()
    if (current <= cutStartMark) {
      setEditNotice(`Move the playhead after ${formatPreciseTime(cutStartMark)} before marking cut end.`)
      return
    }
    if (Math.abs(current - cutStartMark) < 0.2) {
      setEditNotice('Make the marked cut at least 0.2 seconds long.')
      return
    }
    addCutRange(cutStartMark, current)
  }

  const playEditedPreview = async () => {
    const video = playbackRef.current
    if (!recordedUrl) {
      setEditNotice('The recorded video is not available in this browser session. Retake the shoot to preview edits.')
      return
    }
    if (!video) return
    if (previewSkippingRef.current && !video.paused) {
      video.pause()
      setPreviewMode(false)
      setPlaybackPlaying(false)
      return
    }
    if (editCuts.length === 0) {
      setEditNotice('Add at least one cut before playing an edited preview.')
      return
    }
    setPreviewMode(true)
    const firstCut = editCuts.find((cut) => cut.start <= 0 && cut.end > 0)
    video.currentTime = firstCut ? firstCut.end : 0
    lastPlaybackTimeRef.current = video.currentTime
    try {
      setPlaybackError('')
      await video.play()
      setPlaybackPlaying(true)
    } catch (error) {
      setPreviewMode(false)
      const message = error instanceof Error ? error.message : 'Unknown playback error.'
      setPlaybackError(`The browser could not play this recording. Retake the shoot; the next recording will use a safer playback format. (${message})`)
    }
  }

  const handlePlaybackError = () => {
    const video = playbackRef.current
    const code = video?.error?.code
    const detail = code ? ` Media error code: ${code}.` : ''
    const type = recordedBlobRef.current?.type ? ` Format: ${recordedBlobRef.current.type}.` : ''
    setPlaybackPlaying(false)
    setPreviewMode(false)
    setPlaybackError(`The browser could not decode this recorded take.${detail}${type} Retake the shoot; the next recording will use a safer playback format.`)
  }

  const handlePlaybackTimeUpdate = () => {
    const video = playbackRef.current
    if (!video) return
    const current = video.currentTime
    const maxRecordedSeconds = shootState.recordedSeconds || video.duration || maxSeconds
    setPlayheadSeconds(clampTime(current, maxRecordedSeconds))
    if (!previewSkippingRef.current || editCuts.length === 0) {
      lastPlaybackTimeRef.current = current
      return
    }
    const previous = lastPlaybackTimeRef.current
    const cut = editCuts.find((segment) =>
      (current >= segment.start && current < segment.end) ||
      (previous < segment.start && current >= segment.start && current < segment.end + 0.4)
    )
    if (cut) {
      const nextTime = Math.min(cut.end, video.duration || cut.end)
      video.currentTime = nextTime
      setPlayheadSeconds(clampTime(nextTime, maxRecordedSeconds))
      lastPlaybackTimeRef.current = nextTime
      return
    }
    lastPlaybackTimeRef.current = current
  }

  const attachPlaybackVideo = useCallback((element: HTMLVideoElement | null) => {
    playbackRef.current = element
    if (!element || !recordedUrl) return
    element.srcObject = null
    if (element.src !== recordedUrl) {
      element.src = recordedUrl
      element.load()
    }
  }, [recordedUrl])

  const submit = () => {
    save({ ...shootState, selectedScript: scriptSnapshot(), completedAt: shootState.completedAt || new Date().toISOString() })
    goNext(node)
  }

  const skipShootForDev = () => {
    const fallbackSlate = {
      platform: 'TikTok 60-sec natural-light SPF tint wear test',
      hook: 'I wore this SPF tint for four hours so you can see whether it still looks like skin.',
      proof: 'Texture close-up, natural-light shade check, and the visible shift after four hours.',
      trust: 'Paid partnership; show what was gifted, what changed, and what still needs longer testing.',
    }
    const devScriptMode: ScriptMode = scriptReady ? scriptMode : 'custom'
    const devCustomSlate = scriptReady ? customSlate : fallbackSlate
    save({
      recorded: true,
      recordedSeconds: maxSeconds,
      selectedBeatIds: node.beats.slice(0, Math.max(minSelectedBeats, 1)).map((beat) => beat.id),
      caption: 'Paid partnership with GlowKind. Dev skip: disclose the sponsorship, show the product honestly, keep the wear-test caveat, and note what still needs longer testing.',
      scriptMode: devScriptMode,
      selectedSlateIndex,
      customSlate: devCustomSlate,
      selectedScript: scriptSnapshot(devScriptMode, selectedSlateIndex, devCustomSlate),
      editCuts: [
        { id: 'dev-cut-1', start: 12.4, end: 14.1 },
        { id: 'dev-cut-2', start: 63.8, end: 66.5 },
      ],
      recordingNotes: 'Remember to show natural light, texture, shade shift after four hours, and say this is not a full skincare review yet.',
      rawTranscript: 'Paid partnership with GlowKind. I am testing the SPF skin tint in natural light, showing the texture, and noting the shade shift I saw after four hours. I still need longer wear time before calling it a full skincare review.',
      editedTranscript: 'Paid partnership with GlowKind. I am testing the SPF skin tint in natural light, showing the texture, and noting the shade shift I saw after four hours. I still need longer wear time before calling it a full skincare review.',
      transcriptSegments: [
        { id: 'dev-transcript-1', start: 0.8, end: 8.5, text: 'Paid partnership with GlowKind. I am testing the SPF skin tint in natural light.' },
        { id: 'dev-transcript-2', start: 15.2, end: 24.4, text: 'I am showing the texture and the shade shift I saw after four hours.' },
        { id: 'dev-transcript-3', start: 72.1, end: 82.4, text: 'I still need longer wear time before calling it a full skincare review.' },
      ],
      editedTranscriptManuallyEdited: false,
      editedTranscriptReviewed: true,
      disclosureDetected: true,
      disclosureSources: ['editedTranscript', 'caption'],
      finalEditedSeconds: maxSeconds - 4.4,
      completedAt: new Date().toISOString(),
    })
    goNext(node)
  }

  const scriptValue = (field: string | undefined) => {
    if (!field) return ''
    return selectedSlate[field] || ''
  }

  return (
    <SceneWrapper illustration={node.illustration} showBack backLabel="Back">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.25, margin: 0 }}>{node.title}</h1>
          {node.content && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', lineHeight: 1.7, color: '#333' }}>
              {renderContentWithGlossary(interpolate(node.content, context))}
            </div>
          )}
        </div>

        <section style={{ border: '1px solid #000', boxShadow: '4px 4px 0 #000', background: '#F7F1E3', padding: '1rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Choose your shoot script
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#4C4332', lineHeight: 1.55, marginBottom: '0.75rem' }}>
            Pick one content-slate idea to keep visible while you film, or switch to a stronger idea that came up during setup.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '0.625rem', marginBottom: '0.875rem' }}>
            {slateItems.map((item, index) => {
              const selected = scriptMode === 'slate' && selectedSlateIndex === index
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectSlate(index)}
                  style={{
                    border: selected ? '2px solid #3A6B5E' : '1px solid #000',
                    boxShadow: selected ? 'none' : '3px 3px 0 #000',
                    background: selected ? '#DDE8D8' : '#FBF7EA',
                    color: '#1E1E1A',
                    padding: selected ? 'calc(0.75rem - 1px)' : '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    minHeight: '6.75rem',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.78rem' }}>Content item #{index + 1}</strong>
                  <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.74rem', lineHeight: 1.45, color: '#4C4332' }}>
                    {item.platform || 'Platform not filled'}
                  </span>
                  <span style={{ display: 'block', marginTop: '0.3rem', fontSize: '0.74rem', lineHeight: 1.45 }}>
                    {item.hook || 'No hook yet'}
                  </span>
                </button>
              )
            })}
            <button
              type="button"
              onClick={selectCustomScript}
              style={{
                border: scriptMode === 'custom' ? '2px solid #3A6B5E' : '1px dashed #000',
                boxShadow: scriptMode === 'custom' ? 'none' : '3px 3px 0 #000',
                background: scriptMode === 'custom' ? '#DDE8D8' : '#EFE8D2',
                color: '#1E1E1A',
                padding: scriptMode === 'custom' ? 'calc(0.75rem - 1px)' : '0.75rem',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'Inter, system-ui, sans-serif',
                minHeight: '6.75rem',
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.78rem' }}>New idea for this shoot</strong>
              <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.74rem', lineHeight: 1.45, color: '#4C4332' }}>
                Use this if the brief, metrics, or product setup gave you a better angle.
              </span>
            </button>
          </div>

          {scriptMode === 'custom' && (
            <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.875rem', marginBottom: '0.875rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: '0.75rem' }}>
              {scriptFields.map((field) => (
                <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 700, color: '#3A6B5E' }}>
                  {field.label}
                  {field.key === 'trust' ? (
                    <textarea
                      value={customSlate[field.key] || ''}
                      onChange={(event) => updateCustomSlate(field.key, event.currentTarget.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      style={{
                        border: '1px solid #000',
                        background: '#fff',
                        color: '#000',
                        padding: '0.55rem',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '0.8rem',
                        lineHeight: 1.45,
                        resize: 'vertical',
                      }}
                    />
                  ) : (
                    <input
                      value={customSlate[field.key] || ''}
                      onChange={(event) => updateCustomSlate(field.key, event.currentTarget.value)}
                      placeholder={field.placeholder}
                      style={{
                        border: '1px solid #000',
                        background: '#fff',
                        color: '#000',
                        padding: '0.55rem',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '0.8rem',
                      }}
                    />
                  )}
                </label>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '0.75rem' }}>
            {scriptFields.map((field) => (
              <div key={field.key} style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.65rem', minHeight: '4rem' }}>
                <strong style={{ display: 'block', fontSize: '0.7rem', color: '#3A6B5E', textTransform: 'uppercase' }}>{field.label}</strong>
                <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8rem', lineHeight: 1.45 }}>
                  {selectedSlate[field.key] || 'Choose or write a script idea before recording.'}
                </span>
              </div>
            ))}
          </div>
          {!scriptReady && (
            <div style={{ marginTop: '0.75rem', fontSize: '0.76rem', lineHeight: 1.45, color: '#8A4C3D' }}>
              Fill every new-idea field, or select one of your submitted content items, before recording.
            </div>
          )}
        </section>

        <section style={{ border: '1px solid #000', boxShadow: '4px 4px 0 #000', background: '#FBF7EA', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
              Transcript/Notes
            </div>
            <div style={{ marginTop: '0.3rem', fontSize: '0.8125rem', color: '#4C4332', lineHeight: 1.5 }}>
              Optional prep pad for smoother recording. Write a draft transcript, extra reminders beyond the slate, or leave it blank if the slate is enough.
            </div>
          </div>
          <textarea
            value={shootState.recordingNotes}
            onChange={(event) => updateRecordingNotes(event.currentTarget.value)}
            placeholder="Optional: draft lines, reminders to disclose the partnership, product details to mention, or notes you want visible while filming."
            rows={4}
            style={{
              border: '1px solid #000',
              background: '#fff',
              color: '#000',
              padding: '0.625rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.875rem',
              lineHeight: 1.5,
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '0.72rem', color: '#666' }}>
            Optional notes: {notesWordCount} words.
          </span>
        </section>

        <section style={{ width: 'calc(100% + 6rem)', marginLeft: '-3rem', marginRight: '-3rem', borderTop: '1px solid #000', borderBottom: '1px solid #000', background: '#1E1E1A' }}>
          <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {recordedUrl ? (
              <video
                key="recorded-playback"
                ref={attachPlaybackVideo}
                src={recordedUrl}
                controls
                playsInline
                preload="auto"
                onTimeUpdate={handlePlaybackTimeUpdate}
                onSeeked={() => {
                  const current = currentPlaybackTime()
                  setPlayheadSeconds(current)
                  lastPlaybackTimeRef.current = current
                }}
                onLoadedMetadata={() => {
                  setPlaybackError('')
                  setPlayheadSeconds(currentPlaybackTime())
                }}
                onLoadedData={() => setPlaybackError('')}
                onCanPlay={() => setPlaybackError('')}
                onError={handlePlaybackError}
                onStalled={() => setPlaybackError('Playback stalled while loading this take. Try pausing and playing again; if it keeps happening, retake the shoot.')}
                onPlay={() => {
                  setPlaybackError('')
                  setPlaybackPlaying(true)
                }}
                onPause={() => {
                  setPreviewMode(false)
                  setPlaybackPlaying(false)
                }}
                onEnded={() => {
                  setPreviewMode(false)
                  setPlaybackPlaying(false)
                }}
                style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
              />
            ) : stream && (recording || !shootState.recorded) ? (
              <video
                key="live-camera"
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
              />
            ) : shootState.recorded ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F2EBD9', textAlign: 'center', padding: '1rem', background: '#111' }}>
                Recorded {formatTime(shootState.recordedSeconds)}, but the playable video file is no longer in this browser session. Retake the shoot to edit playback.
              </div>
            ) : (
              <video
                key="live-camera-empty"
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }}
              />
            )}
            {!stream && !recordedUrl && !shootState.recorded && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F2EBD9', textAlign: 'center', padding: '1rem' }}>
                Enable your camera to film the sponsored reel.
              </div>
            )}
            {recording && activeBeat && (
              <div style={{ position: 'absolute', left: '1rem', right: '1rem', bottom: '1rem', background: 'rgba(247,241,227,0.94)', border: '1px solid #000', boxShadow: '4px 4px 0 rgba(0,0,0,0.7)', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.75rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
                  <span>{activeBeat.label}</span>
                  <span>{formatTime(Math.min(elapsed, maxSeconds))} / {formatTime(maxSeconds)}</span>
                </div>
                <div style={{ marginTop: '0.35rem', fontSize: '0.95rem', lineHeight: 1.45, color: '#1E1E1A' }}>
                  {activeBeat.prompt}
                </div>
                {scriptValue(activeBeat.sourceField) && (
                  <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', lineHeight: 1.45, color: '#4C4332' }}>
                    Slate cue: {scriptValue(activeBeat.sourceField)}
                  </div>
                )}
                {shootState.recordingNotes.trim() && (
                  <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', lineHeight: 1.45, color: '#4C4332', maxHeight: '4.2rem', overflow: 'hidden' }}>
                    Notes: {shootState.recordingNotes.trim()}
                  </div>
                )}
                {liveTranscript && (
                  <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', lineHeight: 1.45, color: '#4C4332', maxHeight: '3.5rem', overflow: 'hidden' }}>
                    Live transcript: {liveTranscript}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {cameraError && (
          <div style={{ border: '1px solid #B87D6B', background: '#F2EBD9', padding: '0.75rem', fontSize: '0.8125rem', color: '#1E1E1A' }}>
            Camera error: {cameraError}
          </div>
        )}

        {playbackError && (
          <div style={{ border: '1px solid #B87D6B', background: '#F2EBD9', padding: '0.75rem', fontSize: '0.8125rem', lineHeight: 1.5, color: '#1E1E1A' }}>
            Playback error: {playbackError}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {!stream && !recordedUrl && (
            <ActionButton text="Enable camera" onClick={requestCamera} fullWidth={false} />
          )}
          {stream && !recording && (
            <ActionButton
              text={shootState.recorded ? 'Retake 2-minute shoot' : 'Start 2-minute shoot'}
              onClick={startRecording}
              disabled={!scriptReady}
              variant={scriptReady ? 'primary' : 'secondary'}
              fullWidth={false}
            />
          )}
          {recording && (
            <ActionButton text="Stop recording" onClick={finishRecording} variant="danger" fullWidth={false} />
          )}
          {showShootDevSkip && (
            <ActionButton text="Skip shoot (dev)" onClick={skipShootForDev} variant="secondary" fullWidth={false} />
          )}
          <span style={{ fontSize: '0.75rem', color: '#555' }}>
            {scriptReady
              ? `Aim for about ${formatTime(maxSeconds)}. You can stop once every beat is covered.`
              : 'Choose or write a complete script reference before recording.'}
          </span>
        </div>

        <section style={{ border: '1px solid #000', boxShadow: '4px 4px 0 #000', background: '#FBF7EA', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
              Recorded Transcript
            </div>
            <div style={{ marginTop: '0.3rem', fontSize: '0.8125rem', color: '#4C4332', lineHeight: 1.5 }}>
              This is captured from the microphone during the recorded take, not from the optional notes box. After you finish editing, play the edited preview and check that Edited Transcript After Cuts matches what you actually edited. Do not skip this check: this transcript is part of the final deliverable used for grading.
            </div>
          </div>
          <div style={{ border: '1px solid #CDBF94', background: '#F7F1E3', padding: '0.65rem', fontSize: '0.78rem', lineHeight: 1.45, color: '#4C4332' }}>
            {recording ? transcriptionStatus : shootState.recorded ? transcriptionStatus : 'Record a take to capture the spoken transcript.'}
          </div>
          {recording && liveTranscript && (
            <div style={{ border: '1px solid #CDBF94', background: '#fff', padding: '0.65rem', fontSize: '0.8rem', lineHeight: 1.5, color: '#1E1E1A' }}>
              <strong style={{ display: 'block', fontSize: '0.68rem', color: '#3A6B5E', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Live Transcript</strong>
              {liveTranscript}
            </div>
          )}
          {shootState.recorded && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '0.75rem' }}>
              <div style={{ border: '1px solid #CDBF94', background: '#fff', padding: '0.65rem', minHeight: '6rem' }}>
                <strong style={{ display: 'block', fontSize: '0.68rem', color: '#3A6B5E', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Raw Recorded Transcript</strong>
                <span style={{ fontSize: '0.8rem', lineHeight: 1.5, color: '#1E1E1A' }}>
                  {shootState.rawTranscript || 'No spoken transcript captured for this take.'}
                </span>
              </div>
              <div style={{ border: '1px solid #CDBF94', background: '#fff', padding: '0.65rem', minHeight: '6rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <strong style={{ display: 'block', fontSize: '0.68rem', color: '#3A6B5E', textTransform: 'uppercase' }}>Edited Transcript After Cuts</strong>
                  <button
                    type="button"
                    onClick={() => setEditingEditedTranscript((editing) => !editing)}
                    style={{ border: '1px solid #000', background: '#F2EBD9', padding: '0.35rem 0.55rem', cursor: 'pointer', fontSize: '0.72rem' }}
                  >
                    {editingEditedTranscript ? 'Done editing' : 'Edit'}
                  </button>
                </div>
                {editingEditedTranscript ? (
                  <>
                    <textarea
                      value={shootState.editedTranscript}
                      onChange={(event) => updateEditedTranscript(event.currentTarget.value)}
                      rows={6}
                      placeholder="Correct the final edited transcript here if the automatic transcript does not match your edited preview."
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        border: '1px solid #000',
                        background: '#fff',
                        color: '#000',
                        padding: '0.55rem',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '0.8rem',
                        lineHeight: 1.5,
                        resize: 'vertical',
                      }}
                    />
                    <button
                      type="button"
                      onClick={resetEditedTranscriptToAuto}
                      style={{ marginTop: '0.5rem', border: '1px solid #000', background: '#fff', padding: '0.35rem 0.55rem', cursor: 'pointer', fontSize: '0.72rem' }}
                    >
                      Reset to auto transcript
                    </button>
                  </>
                ) : (
                  <span style={{ fontSize: '0.8rem', lineHeight: 1.5, color: '#1E1E1A' }}>
                    {shootState.editedTranscript || 'No edited transcript available yet.'}
                  </span>
                )}
                {shootState.editedTranscriptManuallyEdited && (
                  <div style={{ marginTop: '0.45rem', fontSize: '0.72rem', color: '#4C4332' }}>
                    Manually corrected transcript will be used for grading.
                  </div>
                )}
              </div>
            </div>
          )}
          {shootState.recorded && (
            <label style={{ display: 'flex', gap: '0.55rem', alignItems: 'flex-start', fontSize: '0.8125rem', lineHeight: 1.45 }}>
              <input
                type="checkbox"
                checked={shootState.editedTranscriptReviewed}
                onChange={(event) => updateEditedTranscriptReviewed(event.currentTarget.checked)}
                style={{ marginTop: '0.2rem' }}
              />
              <span>I played the edited preview and checked that Edited Transcript After Cuts matches the final edited video.</span>
            </label>
          )}
        </section>

        <section style={{ border: '1px solid #000', boxShadow: '4px 4px 0 #000', background: '#EFE8D2', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
              Edit timeline
            </div>
            <div style={{ marginTop: '0.3rem', fontSize: '0.8125rem', color: '#4C4332' }}>
              Cut the awkward middle moments from the take. Use the preview to skip silence, filler words, false starts, or rambles.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: '0.5rem' }}>
            {[
              ['Raw', shootState.recorded ? formatTime(shootState.recordedSeconds) : '--'],
              ['Playhead', shootState.recorded ? formatPreciseTime(playheadSeconds) : '--'],
              ['Removed', shootState.recorded ? formatPreciseTime(removedSeconds) : '--'],
              ['Final', shootState.recorded ? formatPreciseTime(finalEditedSeconds) : '--'],
              ['Cuts', editCuts.length.toString()],
            ].map(([label, value]) => (
              <div key={label} style={{ border: '1px solid #CDBF94', background: '#F7F1E3', padding: '0.65rem' }}>
                <strong style={{ display: 'block', fontSize: '0.68rem', color: '#3A6B5E', textTransform: 'uppercase' }}>{label}</strong>
                <span style={{ display: 'block', marginTop: '0.2rem', fontSize: '1rem', fontWeight: 800 }}>{value}</span>
              </div>
            ))}
          </div>

          {shootState.recorded ? (
            <>
              <div style={{ position: 'relative', height: '2.75rem', border: '1px solid #000', background: '#F7F1E3', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '0.5rem', transform: 'translateY(-50%)', background: '#DDE8D8' }} />
                {node.beats.map((beat, index) => {
                  const left = ((index * beatSeconds) / Math.max(1, shootState.recordedSeconds)) * 100
                  return (
                    <div key={beat.id} style={{ position: 'absolute', left: `${Math.min(left, 100)}%`, top: 0, bottom: 0, borderLeft: '1px solid rgba(0,0,0,0.35)' }} />
                  )
                })}
                {editCuts.map((cut) => {
                  const left = (cut.start / Math.max(1, shootState.recordedSeconds)) * 100
                  const width = ((cut.end - cut.start) / Math.max(1, shootState.recordedSeconds)) * 100
                  return (
                    <div
                      key={cut.id}
                      title={`${formatPreciseTime(cut.start)}-${formatPreciseTime(cut.end)}`}
                      style={{
                        position: 'absolute',
                        left: `${Math.min(left, 100)}%`,
                        width: `${Math.max(width, 0.5)}%`,
                        top: 0,
                        bottom: 0,
                        background: 'rgba(184,125,107,0.78)',
                        borderLeft: '1px solid #000',
                        borderRight: '1px solid #000',
                      }}
                    />
                  )
                })}
                {cutStartMark !== null && (
                  <div
                    title={`Cut start ${formatPreciseTime(cutStartMark)}`}
                    style={{
                      position: 'absolute',
                      left: `${Math.min((cutStartMark / Math.max(1, shootState.recordedSeconds)) * 100, 100)}%`,
                      top: 0,
                      bottom: 0,
                      borderLeft: '3px solid #3A6B5E',
                      zIndex: 3,
                    }}
                  />
                )}
                <div
                  title={`Playhead ${formatPreciseTime(playheadSeconds)}`}
                  style={{
                    position: 'absolute',
                    left: `${Math.min((playheadSeconds / Math.max(1, shootState.recordedSeconds)) * 100, 100)}%`,
                    top: 0,
                    bottom: 0,
                    borderLeft: '2px solid #000',
                    zIndex: 4,
                  }}
                />
              </div>

              <div style={{ border: '1px solid #CDBF94', background: '#FBF7EA', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ fontSize: '0.78rem', lineHeight: 1.45, color: '#4C4332' }}>
                  Play or scrub the raw take here. Mark cut start, then mark cut end to save that cut immediately. Repeat for every silence, filler word, false start, or ramble.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <ActionButton text={playbackPlaying ? 'Pause raw take' : 'Play raw take'} onClick={toggleRawPlayback} variant="secondary" fullWidth={false} />
                  <input
                    type="range"
                    min={0}
                    max={shootState.recordedSeconds}
                    step={0.1}
                    value={Math.min(playheadSeconds, shootState.recordedSeconds)}
                    onChange={(event) => seekPlayback(event.currentTarget.valueAsNumber)}
                    style={{ flex: '1 1 220px', minWidth: 0 }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E1E1A', minWidth: '4.5rem', textAlign: 'right' }}>
                    {formatPreciseTime(playheadSeconds)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    [-5, '-5s'],
                    [-1, '-1s'],
                    [1, '+1s'],
                    [5, '+5s'],
                  ].map(([delta, label]) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => nudgePlayback(Number(delta))}
                      style={{
                        border: '1px solid #000',
                        background: '#fff',
                        color: '#000',
                        padding: '0.4rem 0.6rem',
                        cursor: 'pointer',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: '0.76rem',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <ActionButton text="Mark cut start" onClick={markCutStart} variant="secondary" fullWidth={false} />
                  <ActionButton text="Mark cut end" onClick={markCutEnd} variant="secondary" fullWidth={false} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.74rem', color: '#555' }}>
                  <span>Current: {formatPreciseTime(playheadSeconds)}</span>
                  <span>Pending start: {cutStartMark === null ? '--' : formatPreciseTime(cutStartMark)}</span>
                  <span>Saved cuts: {editCuts.length}</span>
                </div>
                {editNotice && (
                  <div style={{ border: '1px solid #3A6B5E', background: '#DDE8D8', padding: '0.55rem', fontSize: '0.78rem', lineHeight: 1.45, color: '#1E1E1A' }}>
                    {editNotice}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <ActionButton text={previewSkipping ? 'Stop edited preview' : 'Play edited preview'} onClick={playEditedPreview} variant="secondary" fullWidth={false} disabled={editCuts.length === 0} />
                <span style={{ fontSize: '0.74rem', color: '#555' }}>
                  Edited preview skips saved cuts. Normal video controls stay raw for finding more cut points.
                </span>
              </div>

              {editCuts.length === 0 ? (
                <div style={{ border: '1px dashed #000', background: '#F7F1E3', padding: '0.75rem', fontSize: '0.8rem', color: '#4C4332' }}>
                  No middle cuts yet. Play or scrub the raw take here, mark a start, then mark an end to save the cut.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {editCuts.map((cut, index) => (
                    <div
                      key={cut.id}
                      style={{
                        border: cut.id === latestCutId ? '2px solid #B87D6B' : '1px solid #000',
                        background: '#F7F1E3',
                        padding: cut.id === latestCutId ? 'calc(0.75rem - 1px)' : '0.75rem',
                        display: 'grid',
                        gap: '0.65rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '0.78rem', color: '#1E1E1A' }}>
                          Cut {index + 1}: {formatPreciseTime(cut.start)}-{formatPreciseTime(cut.end)}
                        </strong>
                        <button
                          type="button"
                          onClick={() => removeCut(cut.id)}
                          style={{ border: '1px solid #000', background: '#fff', padding: '0.35rem 0.55rem', cursor: 'pointer', fontSize: '0.72rem' }}
                        >
                          Delete
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '0.65rem' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
                          Start
                          <input
                            type="range"
                            min={0}
                            max={shootState.recordedSeconds}
                            step={0.1}
                            value={cut.start}
                            onChange={(event) => {
                              const nextStart = Math.min(event.currentTarget.valueAsNumber, cut.end - 0.1)
                              updateCut(cut.id, { start: clampTime(nextStart, shootState.recordedSeconds) })
                            }}
                          />
                          <input
                            type="number"
                            min={0}
                            max={shootState.recordedSeconds}
                            step={0.1}
                            value={cut.start}
                            onChange={(event) => {
                              const nextStart = Math.min(event.currentTarget.valueAsNumber, cut.end - 0.1)
                              updateCut(cut.id, { start: clampTime(nextStart, shootState.recordedSeconds) })
                            }}
                            style={{ border: '1px solid #000', padding: '0.45rem', fontFamily: 'Inter, system-ui, sans-serif' }}
                          />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
                          End
                          <input
                            type="range"
                            min={0}
                            max={shootState.recordedSeconds}
                            step={0.1}
                            value={cut.end}
                            onChange={(event) => {
                              const nextEnd = Math.max(event.currentTarget.valueAsNumber, cut.start + 0.1)
                              updateCut(cut.id, { end: clampTime(nextEnd, shootState.recordedSeconds) })
                            }}
                          />
                          <input
                            type="number"
                            min={0}
                            max={shootState.recordedSeconds}
                            step={0.1}
                            value={cut.end}
                            onChange={(event) => {
                              const nextEnd = Math.max(event.currentTarget.valueAsNumber, cut.start + 0.1)
                              updateCut(cut.id, { end: clampTime(nextEnd, shootState.recordedSeconds) })
                            }}
                            style={{ border: '1px solid #000', padding: '0.45rem', fontFamily: 'Inter, system-ui, sans-serif' }}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div style={{ border: '1px dashed #000', background: '#F7F1E3', padding: '0.75rem', fontSize: '0.8rem', color: '#4C4332' }}>
              Record a take before making middle cuts.
            </div>
          )}

          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
              Edited Video Beats
            </div>
            <div style={{ marginTop: '0.3rem', fontSize: '0.8125rem', color: '#4C4332' }}>
              Choose the required parts that still remain in the final edit after your cuts. Choose at least {minSelectedBeats}.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '0.625rem' }}>
            {node.beats.map((beat, index) => {
              const selected = shootState.selectedBeatIds.includes(beat.id)
              return (
                <button
                  key={beat.id}
                  onClick={() => toggleBeat(beat.id)}
                  style={{
                    border: selected ? '2px solid #3A6B5E' : '1px solid #000',
                    boxShadow: selected ? 'none' : '3px 3px 0 #000',
                    background: selected ? '#DDE8D8' : '#F7F1E3',
                    color: '#1E1E1A',
                    padding: selected ? 'calc(0.75rem - 1px)' : '0.75rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'Inter, system-ui, sans-serif',
                  }}
                >
                  <strong style={{ display: 'block', fontSize: '0.78rem' }}>
                    {selected ? `${shootState.selectedBeatIds.indexOf(beat.id) + 1}. ` : ''}{beat.label}
                  </strong>
                  <span style={{ display: 'block', marginTop: '0.35rem', fontSize: '0.74rem', lineHeight: 1.45 }}>
                    {index * beatSeconds}s-{Math.min((index + 1) * beatSeconds, maxSeconds)}s · {beat.prompt}
                  </span>
                </button>
              )
            })}
          </div>
          <div style={{ border: `1px solid ${disclosureDetected ? '#3A6B5E' : '#B87D6B'}`, background: disclosureDetected ? '#DDE8D8' : '#F2EBD9', padding: '0.65rem', fontSize: '0.8rem', lineHeight: 1.45, color: '#1E1E1A' }}>
            {disclosureDetected
              ? `Disclosure detected in ${currentDisclosureSources.includes('editedTranscript') && currentDisclosureSources.includes('caption') ? 'the edited transcript and caption/export note' : currentDisclosureSources.includes('editedTranscript') ? 'the edited transcript' : 'the caption/export note'}.`
              : 'No paid-partnership disclosure detected yet. Mention it in your edited spoken transcript or in the caption/export note.'}
          </div>
        </section>

        <section style={{ border: '1px solid #000', background: '#F7F1E3', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#3A6B5E', textTransform: 'uppercase' }}>
              Caption/Export Note
            </div>
            <div style={{ marginTop: '0.3rem', fontSize: '0.8125rem', color: '#4C4332', lineHeight: 1.5 }}>
              {node.captionPrompt}
            </div>
          </div>
          <textarea
            value={shootState.caption}
            onChange={(event) => updateCaption(event.currentTarget.value)}
            placeholder="Paid partnership with GlowKind. I wore the SPF tint in natural light for four hours; here is what looked good, what shifted, and what I still need to test. Export notes: add full spoken subtitles, keep the shade-check label on screen, and avoid smoothing filters..."
            rows={4}
            style={{
              border: '1px solid #000',
              background: '#fff',
              color: '#000',
              padding: '0.625rem',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontSize: '0.875rem',
              lineHeight: 1.45,
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '0.72rem', color: '#666' }}>
            {shootState.recorded ? `Recorded ${formatTime(shootState.recordedSeconds)}. ` : 'Record a camera take first. '}
            {shootState.selectedBeatIds.length}/{minSelectedBeats} beats · {editCuts.length} cuts · {notesWordCount} optional notes words · {wordCount} caption words · disclosure {disclosureDetected ? 'detected' : 'missing'} · transcript {shootState.editedTranscriptReviewed ? 'checked' : 'needs check'}.
          </span>
          <ActionButton text="Submit edited reel plan" onClick={submit} disabled={!canSubmit} variant={canSubmit ? 'primary' : 'secondary'} />
          {showShootDevSkip && (
            <ActionButton text="Skip shoot (dev)" onClick={skipShootForDev} variant="secondary" fullWidth={false} />
          )}
        </section>
      </motion.div>
    </SceneWrapper>
  )
}
