import config from './scene-config.json'

export const sampleAnswers = (config.sample_answers || {}) as Record<string, unknown>
