import { useEffect, useRef, useState } from 'react'
import { requestCase } from './lib/api.js'
import { cameraClues, demoAnchors, emptySession, nextClue } from './lib/session.js'
import { clearSession, loadSession, saveSession } from './lib/store.js'
import Board from './screens/Board.jsx'
import Brief from './screens/Brief.jsx'
import Home from './screens/Home.jsx'
import Investigate from './screens/Investigate.jsx'
import Phone from './screens/Phone.jsx'
import Scan from './screens/Scan.jsx'
import Verdict from './screens/Verdict.jsx'

function hydrate(saved) {
  const next = { ...emptySession(), ...(saved || {}) }
  for (const key of ['anchors', 'found', 'revealed', 'hints']) {
    if (!Array.isArray(next[key])) next[key] = []
  }
  if (!next.calls || typeof next.calls !== 'object') next.calls = {}
  if (!next.caseFile && ['brief', 'play', 'accuse', 'end', 'writing'].includes(next.phase)) {
    next.phase = next.anchors?.length ? 'scan' : 'home'
  }
  return next
}

export default function App() {
  const [session, setSession] = useState(emptySession)
  const [loaded, setLoaded] = useState(false)
  const [hint, setHint] = useState(null)
  const run = useRef(0)

  useEffect(() => {
    loadSession()
      .then((saved) => setSession(hydrate(saved)))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveSession(session).catch(() => {})
  }, [session, loaded])

  function patch(partial) {
    setSession((prev) => ({ ...prev, ...partial }))
  }

  function reset() {
    run.current += 1
    setHint(null)
    setSession(emptySession())
    clearSession().catch(() => {})
  }

  function collect(id) {
    setSession((prev) => (prev.found.includes(id) ? prev : { ...prev, found: [...prev.found, id] }))
  }

  function freshPlay() {
    return {
      anchors: [],
      caseFile: null,
      source: '',
      found: [],
      revealed: [],
      hints: [],
      calls: {},
      verdict: null,
      prefill: '',
      tab: 'camera',
    }
  }

  function goScan() {
    if (session.caseFile && !window.confirm('Закрыть текущее дело и снять комнату заново?')) return
    setHint(null)
    patch({ phase: 'scan', demo: false, ...freshPlay() })
  }

  function goDemo() {
    if (session.caseFile && !window.confirm('Закрыть текущее дело и открыть пробу?')) return
    setHint(null)
    const anchors = demoAnchors()
    const token = run.current + 1
    run.current = token
    patch({ phase: 'writing', demo: true, ...freshPlay(), anchors })
    requestCase(session.premiseId, anchors, true).then((result) => {
      if (token !== run.current) return
      setSession((prev) => ({
        ...prev,
        phase: 'brief',
        demo: true,
        anchors,
        caseFile: result.caseFile,
        source: result.source,
      }))
    })
  }

  function finishScan() {
    const anchors = session.anchors
    const token = run.current + 1
    run.current = token
    patch({ phase: 'writing' })
    requestCase(session.premiseId, anchors, false).then((result) => {
      if (token !== run.current) return
      setSession((prev) => ({
        ...prev,
        phase: 'brief',
        anchors,
        caseFile: result.caseFile,
        source: result.source,
      }))
    })
  }

  function takeHint() {
    const clue = nextClue(session.caseFile, session.found)
    if (!clue) {
      setHint({ empty: true })
      return
    }
    const anchor = session.anchors.find((item) => item.id === clue.anchorId) || null
    setSession((prev) => {
      const revealed = prev.revealed.includes(clue.id) ? prev.revealed : [...prev.revealed, clue.id]
      const hints = prev.hints.some((item) => item.clueId === clue.id)
        ? prev.hints
        : [...prev.hints, { clueId: clue.id, text: clue.hint, anchorId: clue.anchorId || '' }]
      return { ...prev, revealed, hints }
    })
    setHint({ clue, anchor })
  }

  if (!loaded) {
    return (
      <main className="paper boot">
        <p className="eyebrow">Осмотр</p>
        <h1>Открываю дело</h1>
      </main>
    )
  }

  if (session.phase === 'home') {
    return (
      <Home
        session={session}
        onPremise={(premiseId) => patch({ premiseId })}
        onScan={goScan}
        onDemo={goDemo}
        onResume={() => patch({ phase: session.verdict ? 'end' : 'play' })}
        onReset={reset}
      />
    )
  }

  if (session.phase === 'scan') {
    return (
      <Scan
        anchors={session.anchors}
        onChange={(anchors) => patch({ anchors })}
        onBack={() => {
          if (!session.anchors.length || window.confirm('Стереть отмеченные места и вернуться?')) {
            patch({ phase: 'home', anchors: [] })
          }
        }}
        onDone={finishScan}
      />
    )
  }

  if (session.phase === 'writing') {
    return (
      <main className="paper">
        <p className="eyebrow">До начала игры</p>
        <h1>Собираю дело</h1>
        <p className="lead">
          Улики, люди и звонки раскладываются по вашей комнате один раз. Если сервер молчит, дело соберётся на устройстве.
        </p>
      </main>
    )
  }

  if (session.phase === 'brief') return <Brief session={session} onStart={() => patch({ phase: 'play' })} onReset={reset} />
  if (session.phase === 'accuse' || session.phase === 'end') {
    return (
      <Verdict
        session={session}
        onVerdict={(verdict) => patch({ verdict, phase: 'end' })}
        onReset={reset}
      />
    )
  }

  const visibleLeft = cameraClues(session.caseFile, session.found, session.revealed).filter(
    (clue) => !session.found.includes(clue.id),
  ).length

  return (
    <div className="play">
      <header className="playtop">
        <button className="texty light" type="button" onClick={() => patch({ phase: 'home' })}>
          К завязкам
        </button>
        <span>
          {session.found.length} из {session.caseFile.clues.length}
          {visibleLeft > 0 ? ` · в камере ${visibleLeft}` : ''}
        </span>
        <button className="hint" type="button" onClick={takeHint}>
          Подсказка
        </button>
      </header>
      {session.tab === 'board' && (
        <Board session={session} onCollect={collect} onAccuse={() => patch({ phase: 'accuse' })} />
      )}
      {session.tab === 'phone' && (
        <Phone
          session={session}
          onCalls={(calls) => patch({ calls })}
          onFind={collect}
          onPrefillUsed={() => patch({ prefill: '' })}
        />
      )}
      {session.tab === 'camera' && <Investigate session={session} onCollect={collect} />}
      <nav className="tabs">
        {[
          ['camera', 'Камера'],
          ['board', 'Доска'],
          ['phone', 'Телефон'],
        ].map(([id, label]) => (
          <button key={id} type="button" className={session.tab === id ? 'on' : ''} onClick={() => patch({ tab: id })}>
            {label}
          </button>
        ))}
      </nav>
      {hint && (
        <Hint
          hint={hint}
          session={session}
          onClose={() => setHint(null)}
          onCollect={(id) => {
            collect(id)
            setHint(null)
          }}
          onDial={(number) => {
            patch({ tab: 'phone', prefill: number })
            setHint(null)
          }}
        />
      )}
    </div>
  )
}

function Hint({ hint, session, onClose, onCollect, onDial }) {
  if (hint.empty) {
    return (
      <div className="modal">
        <section>
          <h2>Подсказка</h2>
          <p>Все зацепки уже на доске.</p>
          <button className="primary" type="button" onClick={onClose}>
            Понятно
          </button>
        </section>
      </div>
    )
  }
  const { clue, anchor } = hint
  const call = session.caseFile.calls.find((item) => item.nodes.some((node) => node.givesClueId === clue.id))
  return (
    <div className="modal">
      <section>
        <p className="eyebrow">Подсказка</p>
        <h2>{clue.title}</h2>
        <p>{clue.hint}</p>
        {anchor?.thumb && <img src={anchor.thumb} alt={anchor.label} />}
        {anchor && <p className="fine">Место, которое вы отметили: {anchor.label}.</p>}
        <div className="stack">
          {call && (
            <button className="primary" type="button" onClick={() => onDial(call.number)}>
              Набрать {call.number}
            </button>
          )}
          <button className="ghost" type="button" onClick={() => onCollect(clue.id)}>
            {clue.kind === 'call' ? 'Забрать запись на доску' : 'Камера не ловит — забрать на доску'}
          </button>
          <button className="texty" type="button" onClick={onClose}>
            Искать дальше
          </button>
        </div>
      </section>
    </div>
  )
}
