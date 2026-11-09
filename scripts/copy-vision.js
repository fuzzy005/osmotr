import { access, cp, mkdir } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wasmSrc = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')
const wasmDest = path.join(root, 'public', 'vision')
const modelDest = path.join(root, 'public', 'models', 'efficientdet_lite0.tflite')
const modelUrl =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite'

await mkdir(wasmDest, { recursive: true })
await cp(wasmSrc, wasmDest, { recursive: true })

try {
  await access(modelDest)
  console.log('vision wasm copied, model already in place')
} catch {
  await mkdir(path.dirname(modelDest), { recursive: true })
  const response = await fetch(modelUrl)
  if (!response.ok) throw new Error(`model ${response.status}`)
  await pipeline(Readable.fromWeb(response.body), createWriteStream(modelDest))
  console.log('vision wasm copied, model saved')
}
