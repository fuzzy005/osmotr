import { useEffect, useState } from 'react'
import { KINDS } from '../lib/kinds.js'
import { CENTER, boxStyle, hashRegion, hamming, thumbRegion } from '../lib/frame.js'
import { loadDetector, readDetections } from '../lib/detector.js'
import { useCamera } from '../lib/useCamera.js'

function uid() {
  return Math.random().toString(36).slice(2, 8)
}

export default function Scan({ anchors, onChange, onBack, onDone }) {
  const { videoRef, ready, error, start } = useCamera(true)
  const [detector, setDetector] = useState(null)
  const [detectorStatus, setDetectorStatus] = useState('loading')
  const [detections, setDetections] = useState([])
  const [note, setNote] = useState('')

  useEffect(() => {
    let cancel = false
    loadDetector()
      .then((next) => {
        if (cancel) return
        setDetector(next)
        setDetectorStatus('ready')
      })
      .catch(() => {
        if (!cancel) setDetectorStatus('failed')
      })
    return () => {
      cancel = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !detector) return undefined
    let stop = false
    let timer
    const tick = () => {
      if (stop) return
      const video = videoRef.current
      if (video) {
        try {
          setDetections(readDetections(detector, video))
        } catch {
          setDetections([])
        }
      }
      timer = setTimeout(tick, 700)
    }
    timer = setTimeout(tick, 400)
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [ready, detector, videoRef])

  const hasFloor = anchors.some((anchor) => anchor.kind === 'floor')
  const readyRoom = hasFloor && anchors.length >= 4
  const suggestion = detections[0]

  function addAnchor(kind, box, coco = '') {
    const video = videoRef.current
    if (!video?.videoWidth) {
      setNote('Сначала включите камеру и дождитесь картинки.')
      return
    }
    const { hex, spread } = hashRegion(video, box)
    if (spread < 12) {
      setNote('Подойдите ближе: в рамке должна быть сама вещь, не голая стена.')
      return
    }
    const dup = anchors.find((anchor) => hamming(anchor.hash, hex) <= 8)
    if (dup) {
      setNote(`Это уже отмечено: ${dup.label}.`)
      return
    }
    const count = anchors.filter((anchor) => anchor.kind === kind.id).length
    const anchor = {
      id: uid(),
      kind: kind.id,
      label: count ? `${kind.label} ${count + 1}` : kind.label,
      coco,
      hash: hex,
      thumb: thumbRegion(video, box),
    }
    onChange([...anchors, anchor])
    setNote(`${anchor.label} запомнен.`)
  }

  function remove(id) {
    onChange(anchors.filter((anchor) => anchor.id !== id))
  }

  return (
    <div className="stage">
      <video ref={videoRef} playsInline muted autoPlay />
      <div className="reticle" style={ready ? boxStyle(CENTER, videoRef.current) : undefined} />
      {detections.map((det) => (
        <div key={`${det.coco}-${det.box.x.toFixed(2)}`} className="livebox" style={boxStyle(det.box, videoRef.current)}>
          {det.kind.label}
        </div>
      ))}
      <header className="scanbar">
        <button className="texty light" type="button" onClick={onBack}>
          Назад
        </button>
        <strong>Осмотр комнаты</strong>
      </header>
      <div className="dock">
        {!ready && (
          <button className="primary wide" type="button" onClick={start}>
            Открыть камеру
          </button>
        )}
        {error && <p className="warn">{error}</p>}
        {detectorStatus === 'failed' && (
          <p className="fine light">Автопоиск вещей недоступен. Отмечайте пол и предметы кнопками, рамка в центре кадра.</p>
        )}
        {note && <p className="note">{note}</p>}
        {suggestion && ready && (
          <button
            className="suggest"
            type="button"
            onClick={() => addAnchor(suggestion.kind, suggestion.box, suggestion.coco)}
          >
            Похоже на {suggestion.kind.label.toLowerCase()}. Запомнить
          </button>
        )}
        <div className="chips">
          {KINDS.map((kind) => {
            const count = anchors.filter((anchor) => anchor.kind === kind.id).length
            return (
              <button
                key={kind.id}
                type="button"
                className={kind.id === 'floor' && !hasFloor ? 'chip warn' : count ? 'chip on' : 'chip'}
                onClick={() => addAnchor(kind, CENTER, '')}
              >
                {kind.label}
                {count > 0 && <small>{count}</small>}
              </button>
            )
          })}
        </div>
        {anchors.length > 0 && (
          <div className="thumbs">
            {anchors.map((anchor) => (
              <figure key={anchor.id}>
                {anchor.thumb && <img src={anchor.thumb} alt={anchor.label} />}
                <figcaption>{anchor.label}</figcaption>
                <button type="button" onClick={() => remove(anchor.id)} aria-label={`Убрать ${anchor.label}`}>
                  ×
                </button>
              </figure>
            ))}
          </div>
        )}
        <button className="primary wide" type="button" disabled={!readyRoom} onClick={onDone}>
          {readyRoom ? 'Собрать дело' : hasFloor ? `Нужны ещё места: ${anchors.length} из 4.` : 'Сначала отметьте пол в рамке.'}
        </button>
      </div>
    </div>
  )
}
