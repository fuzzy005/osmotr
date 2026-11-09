import test from 'node:test'
import assert from 'node:assert/strict'
import { PREMISES } from './premises.js'
import { buildFallbackCase } from './fallbackCase.js'
import { assertPlayable, normalizeCase } from './caseShape.js'
import { hamming } from './frame.js'

const anchors = [
  { id: 'fl', kind: 'floor', label: 'Пол' },
  { id: 'tb', kind: 'table', label: 'Стол' },
  { id: 'sh', kind: 'shelf', label: 'Полка' },
  { id: 'dr', kind: 'door', label: 'Дверь' },
  { id: 'wd', kind: 'wardrobe', label: 'Шкаф' },
]

test('запасные дела играбельны', () => {
  for (const premise of PREMISES) {
    const caseFile = buildFallbackCase(premise, anchors)
    assert.deepEqual(assertPlayable(caseFile, anchors, premise), [], premise.id)
    const again = normalizeCase(caseFile, anchors, premise)
    assert.equal(again.title, caseFile.title)
  }
})

test('тело только в тихом вечере и только на полу', () => {
  for (const premise of PREMISES) {
    const bodies = buildFallbackCase(premise, anchors).clues.filter((clue) => clue.kind === 'body')
    if (premise.body) {
      assert.equal(bodies.length, 1)
      assert.equal(bodies[0].anchorId, 'fl')
    } else {
      assert.equal(bodies.length, 0)
    }
  }
})

test('нормализация переносит тело на пол', () => {
  const raw = buildFallbackCase(PREMISES[0], anchors)
  raw.clues.find((clue) => clue.kind === 'body').anchorId = 'tb'
  const cleaned = normalizeCase(raw, anchors, PREMISES[0])
  assert.equal(cleaned.clues.find((clue) => clue.kind === 'body').anchorId, 'fl')
})

test('пустое дело отклоняется', () => {
  assert.equal(normalizeCase({}, anchors, PREMISES[0]), null)
})

test('хэмминг считает различающиеся биты', () => {
  assert.equal(hamming('0', '0'), 0)
  assert.equal(hamming('0', '1'), 1)
  assert.equal(hamming('0', 'f'), 4)
  assert.equal(hamming('ab', 'c'), 64)
})
