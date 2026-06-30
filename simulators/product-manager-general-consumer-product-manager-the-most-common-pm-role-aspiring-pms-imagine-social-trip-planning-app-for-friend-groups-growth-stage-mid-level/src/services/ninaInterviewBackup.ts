export const typedBackupNotice = 'Nina is using a backup typed response right now, so you can keep practicing the interview.'

export function localNinaReply(question: string, turnNumber: number) {
  const normalized = question.toLowerCase()

  if (/saved|place|vote|choice|option/.test(normalized)) {
    return 'For the Montreal trip, we saved 18 places, but only 3 of 7 friends actually voted. It looked like everyone was participating, but I still did not know which choice the group wanted.'
  }
  if (/budget|date|money|cost|schedule/.test(normalized)) {
    return 'Budget felt awkward, and budget pressure made people quiet. I did not want to push friends in a way that made me sound bossy, so the trip slowed down.'
  }
  if (/finish|outside|text|group chat|what happened|ended/.test(normalized)) {
    return 'The final choices happened in group text. Roamly helped us collect ideas, but when it was time to decide, I needed a smaller next step than a whole itinerary.'
  }
  if (/help|need|improve|feature|nudge|reminder|decision/.test(normalized)) {
    return 'What I needed was help getting everyone to make one small decision, not a whole planning system. A reminder could help only if it felt low-pressure.'
  }

  const orderedReplies = [
    'The moment that stands out is after people had joined and saved ideas. The trip looked active, but no one knew the next decision we were supposed to make.',
    'I was trying to get friends to agree on something small enough to move the plan forward, like date comfort, budget comfort, or one first activity.',
    'For the Montreal trip, we saved 18 places, but only 3 of 7 friends actually voted. That made it hard to tell what the group really preferred.',
    'Budget felt awkward, and budget pressure made people quiet. I moved the conversation to group text because I needed a more natural way to ask.',
    'What I needed was help getting everyone to make one small decision, not a whole planning system. A full itinerary felt too final before the group agreed on basics.',
  ]

  return orderedReplies[Math.min(Math.max(turnNumber - 1, 0), orderedReplies.length - 1)]
}
