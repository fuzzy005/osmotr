export function emptySession() {
  return {
    phase: 'home',
    premiseId: 'quiet',
    demo: false,
    anchors: [],
    caseFile: null,
    source: '',
    found: [],
    revealed: [],
    hints: [],
    calls: {},
    tab: 'camera',
    prefill: '',
    verdict: null,
  }
}

export function cameraClues(caseFile, found, revealed) {
  if (!caseFile) return []
  return caseFile.clues.filter((clue) => {
    if (clue.kind === 'call') return false
    if (revealed.includes(clue.id) || found.includes(clue.id)) return true
    if (!clue.after) return true
    return found.includes(clue.after)
  })
}

export function nextClue(caseFile, found) {
  if (!caseFile) return null
  return (
    [...caseFile.clues].sort((a, b) => a.order - b.order).find((clue) => !found.includes(clue.id)) ||
    null
  )
}

export function demoAnchors() {
  return [
    ['floor', 'Пол'],
    ['table', 'Стол'],
    ['shelf', 'Полка'],
    ['door', 'Дверь'],
    ['wardrobe', 'Шкаф'],
  ].map(([kind, label], index) => ({
    id: `demo${index}`,
    kind,
    label,
    coco: '',
    hash: '0000000000000000',
    thumb: '',
  }))
}
