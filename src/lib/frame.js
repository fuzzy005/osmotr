export const CENTER = { x: 0.22, y: 0.24, w: 0.56, h: 0.46 }

let scratch

function scratchCanvas(width, height) {
  if (!scratch) scratch = document.createElement('canvas')
  if (scratch.width !== width || scratch.height !== height) {
    scratch.width = width
    scratch.height = height
  }
  return scratch
}

export function sampleRegion(video, box, size) {
  const canvas = scratchCanvas(size, size)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const vw = video.videoWidth
  const vh = video.videoHeight
  const sx = Math.max(0, box.x) * vw
  const sy = Math.max(0, box.y) * vh
  const sw = Math.max(2, Math.min(1 - box.x, box.w) * vw)
  const sh = Math.max(2, Math.min(1 - box.y, box.h) * vh)
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, size, size)
  return ctx.getImageData(0, 0, size, size).data
}

export function hashRegion(video, box) {
  if (!video?.videoWidth) return { hex: '', spread: 0 }
  const data = sampleRegion(video, box, 8)
  const gray = []
  for (let i = 0; i < data.length; i += 4) {
    gray.push(data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11)
  }
  let min = 255
  let max = 0
  let sum = 0
  for (const value of gray) {
    sum += value
    if (value < min) min = value
    if (value > max) max = value
  }
  const avg = sum / gray.length
  let bits = ''
  let hex = ''
  for (const value of gray) {
    bits += value >= avg ? '1' : '0'
    if (bits.length === 4) {
      hex += parseInt(bits, 2).toString(16)
      bits = ''
    }
  }
  return { hex, spread: max - min }
}

export function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return 64
  let count = 0
  for (let i = 0; i < a.length; i += 1) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16)
    if (Number.isNaN(x)) return 64
    count += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1)
  }
  return count
}

export function thumbRegion(video, box) {
  if (!video?.videoWidth) return ''
  const canvas = document.createElement('canvas')
  canvas.width = 160
  canvas.height = 120
  const ctx = canvas.getContext('2d')
  const vw = video.videoWidth
  const vh = video.videoHeight
  ctx.drawImage(
    video,
    box.x * vw,
    box.y * vh,
    Math.max(2, box.w * vw),
    Math.max(2, box.h * vh),
    0,
    0,
    160,
    120,
  )
  return canvas.toDataURL('image/jpeg', 0.62)
}

export function boxStyle(box, video) {
  if (!video?.videoWidth) return { display: 'none' }
  const ew = video.clientWidth
  const eh = video.clientHeight
  const scale = Math.max(ew / video.videoWidth, eh / video.videoHeight)
  const dw = video.videoWidth * scale
  const dh = video.videoHeight * scale
  const ox = (ew - dw) / 2
  const oy = (eh - dh) / 2
  return {
    left: `${ox + box.x * dw}px`,
    top: `${oy + box.y * dh}px`,
    width: `${box.w * dw}px`,
    height: `${box.h * dh}px`,
  }
}
