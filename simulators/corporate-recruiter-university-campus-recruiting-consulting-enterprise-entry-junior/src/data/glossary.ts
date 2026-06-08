import config from './scene-config.json'

export const glossary: Record<string, string> = (config.glossary || {}) as Record<string, string>
