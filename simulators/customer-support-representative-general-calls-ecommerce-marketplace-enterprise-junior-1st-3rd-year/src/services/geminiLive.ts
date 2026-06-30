const MODEL = 'models/gemini-3.1-flash-live-preview'
const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent'

const INPUT_SAMPLE_RATE = 16000
const OUTPUT_SAMPLE_RATE = 24000

export type LiveStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error'

export interface LiveSessionHandlers {
  onStatus?: (status: LiveStatus, detail?: string) => void
  onUserTranscript?: (text: string) => void
  onNpcTranscript?: (text: string) => void
  onNpcSpeakingChange?: (speaking: boolean) => void
}

function base64Encode(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function floatToPCM16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

function pcm16ToFloat(input: Int16Array): Float32Array<ArrayBuffer> {
  const out = new Float32Array(input.length)
  for (let i = 0; i < input.length; i++) out[i] = input[i] / 0x8000
  return out
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null
  private micCtx: AudioContext | null = null
  private playCtx: AudioContext | null = null
  private micStream: MediaStream | null = null
  private micSource: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private playheadTime = 0
  private setupDone = false
  private muted = false
  private closed = false
  private systemPrompt = ''
  private apiKey = ''
  private voiceName = 'Charon'
  private resumptionHandle: string | null = null
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private micRequested = true
  private setupWaiters: Array<{ resolve: () => void; reject: (error: Error) => void }> = []

  constructor(private handlers: LiveSessionHandlers) {}

  async start(args: { apiKey: string; systemPrompt: string; voiceName?: string; micEnabled?: boolean }) {
    this.apiKey = args.apiKey
    this.systemPrompt = args.systemPrompt
    this.voiceName = args.voiceName || 'Charon'
    this.micRequested = args.micEnabled ?? true
    this.closed = false
    this.connect(false)
  }

  primeAudioOutput() {
    this.ensurePlayContext()
    void this.playCtx?.resume?.()
  }

  async enableMic() {
    this.micRequested = true
    if (!this.setupDone) return
    await this.startMic()
    this.handlers.onStatus?.('connected')
  }

  async sendText(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    this.primeAudioOutput()
    await this.waitForSetup()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Meeting connection is not open.')
    }
    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text: trimmed }],
        }],
        turnComplete: true,
      },
    }))
  }

  private connect(isReconnect: boolean) {
    if (!isReconnect) this.handlers.onStatus?.('connecting')
    this.setupDone = false

    this.ws = new WebSocket(`${WS_URL}?key=${this.apiKey}`)
    this.ws.binaryType = 'arraybuffer'

    this.ws.onopen = () => {
      const setup: any = {
        setup: {
          model: MODEL,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: this.voiceName },
              },
            },
            temperature: 0.7,
          },
          systemInstruction: { parts: [{ text: this.systemPrompt }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          sessionResumption: this.resumptionHandle ? { handle: this.resumptionHandle } : {},
        },
      }
      this.ws?.send(JSON.stringify(setup))
    }

    this.ws.onmessage = async (evt) => {
      let text: string
      if (evt.data instanceof ArrayBuffer) {
        text = new TextDecoder().decode(evt.data)
      } else if (evt.data instanceof Blob) {
        text = await evt.data.text()
      } else {
        text = evt.data as string
      }

      try {
        this.handleServerMessage(JSON.parse(text))
      } catch (e) {
        console.warn('Failed to parse live meeting message', e, text)
      }
    }

    this.ws.onerror = () => {
      // onclose usually carries the actionable detail and reconnect behavior.
    }

    this.ws.onclose = (ev) => {
      if (this.closed) return
      this.scheduleReconnect(ev.code, ev.reason)
    }
  }

  private scheduleReconnect(code: number, reason: string) {
    const maxAttempts = 6
    if (this.reconnectAttempts >= maxAttempts) {
      const detail = reason ? `closed (${code}): ${reason}` : `closed (${code})`
      this.handlers.onStatus?.('error', detail)
      return
    }
    this.reconnectAttempts += 1
    const delay = Math.min(500 * 2 ** (this.reconnectAttempts - 1), 4000)
    this.handlers.onStatus?.('connecting', 'reconnecting')
    this.reconnectTimer = setTimeout(() => {
      if (!this.closed) this.connect(true)
    }, delay)
  }

  private async handleServerMessage(msg: any) {
    if (msg.setupComplete) {
      this.setupDone = true
      this.reconnectAttempts = 0
      try {
        if (this.micRequested && !this.micStream) await this.startMic()
        this.handlers.onStatus?.('connected')
        this.resolveSetupWaiters()
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Microphone failed')
        this.handlers.onStatus?.('error', error.message)
        this.rejectSetupWaiters(error)
      }
      return
    }

    if (msg.sessionResumptionUpdate) {
      const update = msg.sessionResumptionUpdate
      if (update.resumable && update.newHandle) this.resumptionHandle = update.newHandle
      return
    }

    if (msg.goAway) {
      try { this.ws?.close() } catch { /* noop */ }
      return
    }

    const sc = msg.serverContent
    if (!sc) return

    if (sc.inputTranscription?.text) this.handlers.onUserTranscript?.(sc.inputTranscription.text)
    if (sc.outputTranscription?.text) this.handlers.onNpcTranscript?.(sc.outputTranscription.text)

    const parts = sc.modelTurn?.parts as any[] | undefined
    if (parts) {
      for (const p of parts) {
        const inline = p.inlineData
        if (inline?.data && typeof inline.mimeType === 'string' && inline.mimeType.startsWith('audio/')) {
          this.enqueueAudio(inline.data)
        }
      }
    }

    if (sc.turnComplete) this.handlers.onNpcSpeakingChange?.(false)
  }

  private async startMic() {
    if (this.micStream) return
    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    })

    this.micCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: INPUT_SAMPLE_RATE,
    })
    const sourceSampleRate = this.micCtx.sampleRate
    this.micSource = this.micCtx.createMediaStreamSource(this.micStream)
    this.processor = this.micCtx.createScriptProcessor(4096, 1, 1)
    const needsResample = sourceSampleRate !== INPUT_SAMPLE_RATE

    this.processor.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
      const input = e.inputBuffer.getChannelData(0)
      const resampled = needsResample ? this.resample(input, sourceSampleRate, INPUT_SAMPLE_RATE) : input
      if (this.muted) resampled.fill(0)
      const pcm = floatToPCM16(resampled)
      const b64 = base64Encode(new Uint8Array(pcm.buffer))
      this.ws.send(JSON.stringify({
        realtimeInput: {
          mediaChunks: [{ mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`, data: b64 }],
        },
      }))
    }

    this.micSource.connect(this.processor)
    this.processor.connect(this.micCtx.destination)
  }

  private waitForSetup() {
    if (this.setupDone && this.ws?.readyState === WebSocket.OPEN) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.setupWaiters.findIndex((waiter) => waiter.resolve === wrappedResolve)
        if (idx >= 0) this.setupWaiters.splice(idx, 1)
        reject(new Error('Meeting connection timed out.'))
      }, 10000)
      const wrappedResolve = () => {
        clearTimeout(timer)
        resolve()
      }
      const wrappedReject = (error: Error) => {
        clearTimeout(timer)
        reject(error)
      }
      this.setupWaiters.push({ resolve: wrappedResolve, reject: wrappedReject })
    })
  }

  private resolveSetupWaiters() {
    const waiters = this.setupWaiters.splice(0)
    waiters.forEach((waiter) => waiter.resolve())
  }

  private rejectSetupWaiters(error: Error) {
    const waiters = this.setupWaiters.splice(0)
    waiters.forEach((waiter) => waiter.reject(error))
  }

  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    const ratio = fromRate / toRate
    const outLen = Math.floor(input.length / ratio)
    const out = new Float32Array(outLen)
    for (let i = 0; i < outLen; i++) {
      const srcIdx = i * ratio
      const i0 = Math.floor(srcIdx)
      const i1 = Math.min(i0 + 1, input.length - 1)
      const frac = srcIdx - i0
      out[i] = input[i0] * (1 - frac) + input[i1] * frac
    }
    return out
  }

  private enqueueAudio(b64: string) {
    this.ensurePlayContext()
    if (!this.playCtx) return
    void this.playCtx.resume?.()
    const bytes = base64Decode(b64)
    const pcm = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2)
    const floats = pcm16ToFloat(pcm)
    const buffer = this.playCtx.createBuffer(1, floats.length, OUTPUT_SAMPLE_RATE)
    buffer.copyToChannel(floats, 0)
    const source = this.playCtx.createBufferSource()
    source.buffer = buffer
    source.connect(this.playCtx.destination)
    const now = this.playCtx.currentTime
    const startAt = Math.max(this.playheadTime, now)
    source.start(startAt)
    this.playheadTime = startAt + buffer.duration
    this.handlers.onNpcSpeakingChange?.(true)
  }

  private ensurePlayContext() {
    if (this.playCtx) return
    this.playCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: OUTPUT_SAMPLE_RATE,
    })
    this.playheadTime = this.playCtx.currentTime
  }

  setMuted(muted: boolean) {
    this.muted = muted
  }

  isSetupDone() {
    return this.setupDone
  }

  stop() {
    this.closed = true
    this.rejectSetupWaiters(new Error('Meeting connection closed.'))
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    try { this.processor?.disconnect() } catch { /* noop */ }
    try { this.micSource?.disconnect() } catch { /* noop */ }
    try { this.micStream?.getTracks().forEach((t) => t.stop()) } catch { /* noop */ }
    try { this.micCtx?.close() } catch { /* noop */ }
    try { this.playCtx?.close() } catch { /* noop */ }
    try { this.ws?.close() } catch { /* noop */ }
    this.processor = null
    this.micSource = null
    this.micStream = null
    this.micCtx = null
    this.playCtx = null
    this.ws = null
    this.handlers.onStatus?.('closed')
  }
}
