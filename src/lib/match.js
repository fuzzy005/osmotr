import { CENTER, hashRegion, hamming } from './frame.js'

const ACQUIRE = 18
const MANUAL = 14

export function matchAnchors(video, anchors, detections, held) {
  const now = performance.now()
  for (const det of detections) {
    const { hex, spread } = hashRegion(video, det.box)
    if (spread < 12) continue
    let best = null
    let bestDist = ACQUIRE
    for (const anchor of anchors) {
      if (!anchor.coco || anchor.coco !== det.coco) continue
      const dist = hamming(anchor.hash, hex)
      if (dist < bestDist) {
        best = anchor
        bestDist = dist
      }
    }
    if (best) held.set(best.id, { box: det.box, until: now + 900 })
  }

  const center = hashRegion(video, CENTER)
  if (center.spread >= 12) {
    for (const anchor of anchors) {
      if (anchor.coco) continue
      if (hamming(anchor.hash, center.hex) <= MANUAL) {
        held.set(anchor.id, { box: { ...CENTER }, until: now + 900 })
      }
    }
  }

  const hits = []
  for (const [id, value] of held) {
    if (value.until < now) {
      held.delete(id)
      continue
    }
    const anchor = anchors.find((item) => item.id === id)
    if (anchor) hits.push({ anchor, box: value.box })
  }
  return hits
}
