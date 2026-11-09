import { buildFallbackCase } from './fallbackCase.js'
import { premiseById } from './premises.js'

const flights = new Map()

async function run(premise, anchors) {
  const payload = {
    premiseId: premise.id,
    anchors: anchors.map(({ id, kind, label }) => ({ id, kind, label })),
  }
  try {
    const response = await fetch('/api/case', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(75000),
    })
    if (!response.ok) throw new Error(String(response.status))
    const data = await response.json()
    if (!data.case) throw new Error('empty')
    return { source: data.source || 'gemini', caseFile: data.case }
  } catch {
    return { source: 'device', caseFile: buildFallbackCase(premise, anchors) }
  }
}

export function requestCase(premiseId, anchors, demo) {
  const premise = premiseById(premiseId)
  if (demo) return Promise.resolve({ source: 'device', caseFile: buildFallbackCase(premise, anchors) })
  const key = `${premise.id}:${anchors.map((anchor) => anchor.id).join('.')}`
  if (!flights.has(key)) flights.set(key, run(premise, anchors))
  return flights.get(key)
}
