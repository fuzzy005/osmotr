import { useEffect, useRef, useState } from 'react'
import { boxStyle } from '../lib/frame.js'
import { loadDetector, readDetections } from '../lib/detector.js'
import { matchAnchors } from '../lib/match.js'
import { cameraClues } from '../lib/session.js'
import { useCamera } from '../lib/useCamera.js'

export default function Investigate({ session, onCollect }) {
  const { videoRef, ready, error, start } = useCamera(!session.demo)
  const [detector, setDetector] = useState(null)
  const [hits, setHits] = useState([])
  const held = useRef(new Map())

  useEffect(() => {
    if (session.demo) return undefined
    let cancel = false
    loadDetector()
      .then((next) => {
        if (!cancel) setDetector(next)
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [session.demo])

  useEffect(() => {
    if (!ready) return undefined
    let stop = false
    let timer
    const tick = () => {
      if (stop) return
      const video = videoRef.current
      if (video) {
        let detections = []
        if (detector) {
          try {
            detections = readDetections(detector, video)
          } catch {
            detections = []
          }
        }
        try {
          setHits(matchAnchors(video, session.anchors, detections, held.current))
        } catch {
          setHits([])
        }
      }
      timer = setTimeout(tick, 700)
    }
    timer = setTimeout(tick, 300)
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [ready, detector, session.anchors, videoRef])

  const visible = cameraClues(session.caseFile, session.found, session.revealed)
  const pins = []
  for (const hit of hits) {
    const clues = visible.filter((clue) => clue.anchorId === hit.anchor.id)
    clues.forEach((clue, index) => pins.push({ clue, hit, index }))
  }

  return (
    <div className="stage">
      {!session.demo && <video ref={videoRef} playsInline muted autoPlay />}
      {session.demo && <div className="demo-stage">Проба без камеры. Улики открываются с доски и из подсказки.</div>}
      {pins.map(({ clue, hit, index }) => {
        const found = session.found.includes(clue.id)
        const full = clue.kind === 'body' || clue.kind === 'trace'
        const style = boxStyle(hit.box, videoRef.current)
        if (!full) {
          style.transform = `translate(${index * 28}px, 0)`
        }
        return (
          <button
            key={clue.id}
            type="button"
            className={`pin pin-${clue.kind} ${found ? 'is-done' : ''}`}
            style={style}
            onClick={() => onCollect(clue.id)}
          >
            {(clue.kind === 'body' || clue.kind === 'trace') && <i />}
            <span>{found ? 'в деле' : clue.seen}</span>
          </button>
        )
      })}
      <header className="scanbar">
        <strong>{session.caseFile.title}</strong>
      </header>
      <div className="dock slim">
        {!session.demo && !ready && (
          <button className="primary wide" type="button" onClick={start}>
            Открыть камеру
          </button>
        )}
        {error && <p className="warn">{error}</p>}
        <p className="fine light">Улика появляется, когда кадр снова похож на отмеченную вещь. Если не ловится — подсказка сверху.</p>
      </div>
    </div>
  )
}
