import { readFileSync } from 'node:fs'

const config = JSON.parse(
  readFileSync(new URL('../src/data/scene-config.json', import.meta.url), 'utf8')
)

function interpolate(text, values) {
  if (!text) return ''
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const normalized = key.trim()
    return Object.prototype.hasOwnProperty.call(values, normalized) ? values[normalized] : match
  })
}

export function buildMayaPromptBundle({ playerName = 'Student' } = {}) {
  const node = config.storyline.nodes.scene_03_checkin
  const npc = config.npcs.maya
  if (!node) throw new Error('Missing scene_03_checkin in scene-config.json')
  if (!npc) throw new Error('Missing maya NPC in scene-config.json')

  const context = { playerName }
  const goalPrompt = interpolate(node.goalPrompt, context)
  const meetingContext = interpolate(node.meetingContext || node.content || '', context)
  const isInPerson = (node.meetingMode || node.presentation) === 'in_person'
  const meetingPhrase = isInPerson ? 'in an in-person workplace conversation' : 'in a live voice meeting'
  const speechStyle = isInPerson
    ? 'Speak naturally, like a real colleague or manager sitting with the student in the same workplace.'
    : 'Speak naturally, like a real colleague or client on a call.'
  const initial = (node.initialMessages || [])
    .map((m) => `${m.role === 'user' ? playerName || 'Student' : npc.name}: ${interpolate(m.content, context)}`)
    .join('\n')

  const systemPrompt = `You are ${npc.name}, ${npc.role}, ${meetingPhrase} with ${playerName || 'the student'}.

PERSONA:
${npc.persona}
${npc.voice ? `\nVOICE: ${npc.voice}` : ''}

MEETING GOAL:
${goalPrompt}

MEETING CONTEXT:
${meetingContext || 'Use the scene context and your persona to make this feel like a realistic workplace conversation.'}

${initial ? `INITIAL CONTEXT MESSAGES:\n${initial}\n` : ''}RULES:
- ${speechStyle}
- Keep each turn under 90 words unless the student asks for detail.
- Ask follow-up questions, push back, clarify ambiguity, and react to the student's actual words.
- Do not mention being an AI, a model, or a simulator.
- Do not grade the student during the meeting.
- Stay focused on the meeting goal and the workplace stakes.`

  return {
    sceneId: node.id,
    npcId: node.npcId,
    npcName: npc.name,
    npcRole: npc.role,
    voiceName: node.voiceName,
    maxTurns: node.maxTurns,
    goalPrompt,
    meetingContext,
    systemPrompt,
  }
}
