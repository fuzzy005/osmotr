import { FilesetResolver, ObjectDetector } from '@mediapipe/tasks-vision'
import { kindFromCoco } from './kinds.js'

let pending
let frame

function frameCanvas(video) {
  const width = 640
  const height = Math.max(1, Math.round((video.videoHeight / video.videoWidth) * width))
  if (!frame) frame = document.createElement('canvas')
  if (frame.width !== width || frame.height !== height) {
    frame.width = width
    frame.height = height
  }
  const ctx = frame.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(video, 0, 0, width, height)
  return frame
}

export function loadDetector() {
  if (!pending) {
    const base = import.meta.env.BASE_URL
    pending = FilesetResolver.forVisionTasks(`${base}vision`).then((vision) =>
      ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `${base}models/efficientdet_lite0.tflite`,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        scoreThreshold: 0.45,
        maxResults: 5,
      }),
    )
  }
  return pending
}

export function readDetections(detector, video) {
  if (!detector || video.readyState < 2 || !video.videoWidth) return []
  const canvas = frameCanvas(video)
  const result = detector.detect(canvas)
  return (result.detections || [])
    .flatMap((det) => {
      const category = det.categories?.[0]
      const kind = category ? kindFromCoco(category.categoryName || '') : null
      const raw = det.boundingBox
      if (!kind || !raw) return []
      let x = raw.originX
      let y = raw.originY
      let w = raw.width
      let h = raw.height
      if (w > 2 || h > 2) {
        x /= canvas.width
        y /= canvas.height
        w /= canvas.width
        h /= canvas.height
      }
      if (w * h < 0.03 || (category.score || 0) < 0.45) return []
      return [{ kind, coco: kind.coco, score: category.score || 0, box: { x, y, w, h } }]
    })
    .sort((a, b) => b.score - a.score)
}
