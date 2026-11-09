const KINDS = new Set(['note', 'object', 'trace', 'body', 'call'])

function clip(value, max) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function four(value, used) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length >= 4) {
    const number = digits.slice(0, 4)
    if (!used.has(number)) return number
  }
  return ''
}

export function assertPlayable(caseFile, anchors, premise) {
  const problems = []
  const anchorIds = new Set((anchors || []).map((anchor) => anchor.id))
  const floor = (anchors || []).find((anchor) => anchor.kind === 'floor')
  if (!caseFile?.title) problems.push('title')
  if (!caseFile?.briefing || caseFile.briefing.length < 40) problems.push('briefing')
  if (!caseFile?.truth?.summary || caseFile.truth.summary.length < 40) problems.push('summary')
  const people = caseFile?.people || []
  if (people.length < 3) problems.push('people')
  const peopleIds = new Set(people.map((person) => person.id))
  if (!peopleIds.has(caseFile?.truth?.culpritId)) problems.push('culprit')
  const motives = caseFile?.motives || []
  if (motives.filter((motive) => motive.correct).length !== 1) problems.push('motive')
  if (motives.length < 2) problems.push('motives')
  const clues = caseFile?.clues || []
  const ids = new Set(clues.map((clue) => clue.id))
  if (ids.size !== clues.length) problems.push('clue-ids')
  const room = clues.filter((clue) => clue.kind !== 'call')
  if (room.length < 4) problems.push('room')
  for (const clue of room) {
    if (!anchorIds.has(clue.anchorId)) problems.push(`anchor:${clue.id}`)
    if (!clue.hint || !clue.body || !clue.title) problems.push(`text:${clue.id}`)
  }
  const bodies = clues.filter((clue) => clue.kind === 'body')
  if (premise?.body) {
    if (bodies.length !== 1) problems.push('body-count')
    else if (!floor || bodies[0].anchorId !== floor.id) problems.push('body-floor')
  } else if (bodies.length) problems.push('body-extra')
  const calls = caseFile?.calls || []
  if (!calls.length) problems.push('calls')
  const numbers = new Set()
  for (const call of calls) {
    if (!/^\d{4}$/.test(call.number || '')) problems.push('number')
    if (numbers.has(call.number)) problems.push('number-dup')
    numbers.add(call.number)
    const nodes = new Set((call.nodes || []).map((node) => node.id))
    if (!nodes.has('start')) problems.push('start')
    for (const node of call.nodes || []) {
      if (node.givesClueId && !clues.some((clue) => clue.id === node.givesClueId && clue.kind === 'call')) {
        problems.push('gives')
      }
      for (const choice of node.choices || []) {
        if (choice.goto !== 'stop' && !nodes.has(choice.goto)) problems.push('goto')
      }
    }
    if (call.unlockClueId && !ids.has(call.unlockClueId)) problems.push('unlock')
  }
  const callClues = clues.filter((clue) => clue.kind === 'call')
  if (!callClues.length) problems.push('call-clue')
  return problems
}

export function normalizeCase(raw, anchors, premise) {
  if (!raw || typeof raw !== 'object') return null
  const anchorIds = new Set(anchors.map((anchor) => anchor.id))
  const floor = anchors.find((anchor) => anchor.kind === 'floor')
  const people = (Array.isArray(raw.people) ? raw.people : []).slice(0, 4).map((person, index) => ({
    id: clip(person.id, 12) || `p${index + 1}`,
    name: clip(person.name, 48),
    role: clip(person.role, 48),
    blurb: clip(person.blurb, 180),
  })).filter((person) => person.name)
  if (people.length < 3) return null
  const peopleIds = new Set(people.map((person) => person.id))
  const culpritId = clip(raw.truth?.culpritId, 12)
  if (!peopleIds.has(culpritId)) return null

  let clues = (Array.isArray(raw.clues) ? raw.clues : [])
    .map((clue, index) => ({
      id: clip(clue.id, 12) || `c${index + 1}`,
      anchorId: clip(clue.anchorId, 16),
      order: Number(clue.order) || index + 1,
      kind: KINDS.has(clue.kind) ? clue.kind : '',
      title: clip(clue.title, 80),
      seen: clip(clue.seen, 32) || 'улика',
      body: clip(clue.body, 500),
      hint: clip(clue.hint, 220),
      after: clip(clue.after, 12),
      unlocksNumber: '',
    }))
    .filter((clue) => clue.kind && clue.title && clue.body && clue.hint)

  const seenIds = new Set()
  clues = clues.filter((clue) => {
    if (seenIds.has(clue.id)) return false
    seenIds.add(clue.id)
    return true
  })

  if (premise.body) {
    if (!floor) return null
    const bodies = clues.filter((clue) => clue.kind === 'body')
    if (!bodies.length) return null
    bodies.slice(1).forEach((clue) => {
      clue.kind = 'trace'
    })
    bodies[0].anchorId = floor.id
    bodies[0].seen = bodies[0].seen || 'простыня'
  } else {
    clues = clues.filter((clue) => clue.kind !== 'body')
  }

  clues = clues.filter((clue) => clue.kind === 'call' || anchorIds.has(clue.anchorId))
  const clueIds = new Set(clues.map((clue) => clue.id))
  for (const clue of clues) {
    if (clue.after && !clueIds.has(clue.after)) clue.after = ''
    if (clue.after === clue.id) clue.after = ''
  }
  clues.sort((a, b) => a.order - b.order)
  clues = clues.map((clue, index) => ({ ...clue, order: index + 1 }))

  const usedNumbers = new Set()
  let calls = (Array.isArray(raw.calls) ? raw.calls : []).slice(0, 3).map((call) => {
    const number = four(call.number, usedNumbers)
    if (number) usedNumbers.add(number)
    const nodes = (Array.isArray(call.nodes) ? call.nodes : []).slice(0, 8).map((node, index) => ({
      id: clip(node.id, 16) || (index === 0 ? 'start' : `n${index}`),
      text: clip(node.text, 400),
      givesClueId: clueIds.has(node.givesClueId) ? clip(node.givesClueId, 12) : '',
      choices: (Array.isArray(node.choices) ? node.choices : []).slice(0, 3).map((choice) => ({
        label: clip(choice.label, 80),
        goto: clip(choice.goto, 16) || 'stop',
      })).filter((choice) => choice.label),
    })).filter((node) => node.text)
    if (nodes.length && nodes[0].id !== 'start' && !nodes.some((node) => node.id === 'start')) {
      nodes[0].id = 'start'
    }
    const nodeIds = new Set(nodes.map((node) => node.id))
    for (const node of nodes) {
      if (node.givesClueId && clues.find((clue) => clue.id === node.givesClueId)?.kind !== 'call') {
        node.givesClueId = ''
      }
      node.choices = node.choices.filter((choice) => choice.goto === 'stop' || nodeIds.has(choice.goto))
    }
    return {
      number,
      personId: peopleIds.has(call.personId) ? call.personId : people[0].id,
      unlockClueId: clueIds.has(call.unlockClueId) ? clip(call.unlockClueId, 12) : '',
      nodes,
    }
  })
  calls = calls.filter((call) => call.number && call.nodes.some((node) => node.id === 'start'))

  const roomNotes = clues.filter((clue) => clue.kind !== 'call')
  calls.forEach((call, index) => {
    if (!call.unlockClueId && roomNotes[index]) call.unlockClueId = roomNotes[index].id
    const holder = clues.find((clue) => clue.id === call.unlockClueId)
    if (holder && !holder.unlocksNumber) holder.unlocksNumber = call.number
  })

  let motives = (Array.isArray(raw.motives) ? raw.motives : []).slice(0, 4).map((motive, index) => ({
    id: clip(motive.id, 16) || `m${index + 1}`,
    text: clip(motive.text, 180),
    correct: Boolean(motive.correct),
  })).filter((motive) => motive.text)
  const truthMotive = clip(raw.truth?.motive, 180)
  if (!motives.some((motive) => motive.correct) && truthMotive) {
    motives.unshift({ id: 'true', text: truthMotive, correct: true })
  }
  let marked = false
  motives = motives.map((motive) => {
    if (!motive.correct || marked) return { ...motive, correct: false }
    marked = true
    return motive
  })

  const caseFile = {
    title: clip(raw.title, 64),
    logline: clip(raw.logline, 160),
    briefing: clip(raw.briefing, 700),
    truth: {
      culpritId,
      motive: truthMotive,
      summary: clip(raw.truth?.summary, 700),
    },
    people,
    motives,
    clues,
    calls,
  }
  if (assertPlayable(caseFile, anchors, premise).length) return null
  return caseFile
}
