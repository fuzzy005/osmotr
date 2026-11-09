import { useEffect, useState } from 'react'

function knownNumbers(caseFile, found) {
  const open = new Set()
  for (const call of caseFile.calls) {
    if (found.includes(call.unlockClueId)) open.add(call.number)
  }
  for (const clue of caseFile.clues) {
    if (found.includes(clue.id) && clue.unlocksNumber) open.add(clue.unlocksNumber)
  }
  return open
}

export default function Phone({ session, onCalls, onFind, onPrefillUsed }) {
  const [digits, setDigits] = useState(session.prefill || '')
  const [active, setActive] = useState(session.prefill || '')
  const [line, setLine] = useState('')
  const open = knownNumbers(session.caseFile, session.found)

  useEffect(() => {
    if (!session.prefill) return
    setDigits(session.prefill)
    setActive(session.prefill)
    onPrefillUsed()
  }, [session.prefill, onPrefillUsed])

  function push(digit) {
    setLine('')
    setDigits((prev) => (prev.length >= 4 ? prev : prev + digit))
  }

  function dial(number = digits) {
    if (number.length !== 4) {
      setLine('Номер из четырёх цифр.')
      return
    }
    const call = session.caseFile.calls.find((item) => item.number === number)
    if (!call) {
      setLine('Такого номера нет.')
      setActive('')
      return
    }
    if (!open.has(number)) {
      setLine('Этого номера ещё нет в деле.')
      setActive('')
      return
    }
    setActive(number)
    setLine('')
    if (!session.calls[number]) {
      const start = call.nodes.find((node) => node.id === 'start')
      onCalls({
        ...session.calls,
        [number]: { nodeId: 'start', log: [{ from: 'them', text: start.text }] },
      })
      if (start.givesClueId) onFind(start.givesClueId)
    }
  }

  const call = session.caseFile.calls.find((item) => item.number === active)
  const progress = session.calls[active]
  const node = call?.nodes.find((item) => item.id === progress?.nodeId)

  function choose(choice) {
    const log = [...progress.log, { from: 'me', text: choice.label }]
    if (choice.goto === 'stop') {
      onCalls({ ...session.calls, [active]: { nodeId: 'stop', log } })
      return
    }
    const next = call.nodes.find((item) => item.id === choice.goto)
    if (!next) return
    log.push({ from: 'them', text: next.text })
    onCalls({ ...session.calls, [active]: { nodeId: next.id, log } })
    if (next.givesClueId) onFind(next.givesClueId)
  }

  return (
    <main className="paper with-tabs">
      <p className="eyebrow">Телефон дела</p>
      <h1>{digits.padEnd(4, '·')}</h1>
      {line && <p className="warn">{line}</p>}
      <div className="pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'стереть', '0', 'вызов'].map((key) => (
          <button
            key={key}
            type="button"
            className={key === 'вызов' ? 'key call' : 'key'}
            onClick={() => {
              if (key === 'стереть') setDigits((prev) => prev.slice(0, -1))
              else if (key === 'вызов') dial()
              else push(key)
            }}
          >
            {key}
          </button>
        ))}
      </div>
      <h2>Уже известные</h2>
      <div className="stack">
        {[...open].map((number) => {
          const item = session.caseFile.calls.find((callItem) => callItem.number === number)
          const person = session.caseFile.people.find((one) => one.id === item?.personId)
          return (
            <button key={number} type="button" className="ghost wide" onClick={() => dial(number)}>
              {number} · {person?.name || 'абонент'}
            </button>
          )
        })}
        {open.size === 0 && <p className="fine">Номера появляются в записках.</p>}
      </div>
      {call && progress && (
        <section className="thread">
          <h2>{session.caseFile.people.find((person) => person.id === call.personId)?.name}</h2>
          {progress.log.map((entry, index) => (
            <p key={`${entry.from}-${index}`} className={entry.from === 'me' ? 'me' : 'them'}>
              {entry.text}
            </p>
          ))}
          {node && progress.nodeId !== 'stop' && (
            <div className="stack">
              {node.choices.map((choice) => (
                <button key={choice.label} type="button" className="primary" onClick={() => choose(choice)}>
                  {choice.label}
                </button>
              ))}
              {node.choices.length === 0 && (
                <button type="button" className="ghost" onClick={() => choose({ label: 'Положить трубку', goto: 'stop' })}>
                  Положить трубку
                </button>
              )}
            </div>
          )}
          {progress.nodeId === 'stop' && <p className="fine">Трубка положена. Разговор сохранён.</p>}
        </section>
      )}
    </main>
  )
}
