import { useState } from 'react'

export default function Verdict({ session, onVerdict, onReset }) {
  const file = session.caseFile
  const [personId, setPersonId] = useState(session.verdict?.personId || '')
  const [motiveId, setMotiveId] = useState(session.verdict?.motiveId || '')
  const verdict = session.verdict

  function submit() {
    if (!personId || !motiveId) return
    const personOk = personId === file.truth.culpritId
    const motiveOk = Boolean(file.motives.find((motive) => motive.id === motiveId && motive.correct))
    onVerdict({ personId, motiveId, personOk, motiveOk })
  }

  const culprit = file.people.find((person) => person.id === file.truth.culpritId)

  return (
    <main className="paper">
      <p className="eyebrow">{verdict ? 'Дело закрыто' : 'Версия'}</p>
      <h1>{file.title}</h1>
      {!verdict && (
        <>
          <h2>Кто</h2>
          <div className="premises">
            {file.people.map((person) => (
              <button
                key={person.id}
                type="button"
                className={personId === person.id ? 'file on' : 'file'}
                onClick={() => setPersonId(person.id)}
              >
                <strong>{person.name}</strong>
                <span>{person.role}. {person.blurb}</span>
              </button>
            ))}
          </div>
          <h2>Почему</h2>
          <div className="premises">
            {file.motives.map((motive) => (
              <button
                key={motive.id}
                type="button"
                className={motiveId === motive.id ? 'file on' : 'file'}
                onClick={() => setMotiveId(motive.id)}
              >
                <span>{motive.text}</span>
              </button>
            ))}
          </div>
          <button className="primary wide" type="button" disabled={!personId || !motiveId} onClick={submit}>
            Закрыть дело
          </button>
        </>
      )}
      {verdict && (
        <>
          <p className="lead">
            {verdict.personOk && verdict.motiveOk && 'Дело сходится.'}
            {verdict.personOk && !verdict.motiveOk && 'Человека вы назвали верно. Мотив другой.'}
            {!verdict.personOk && 'Версия не сходится.'}
          </p>
          <p>{file.truth.summary}</p>
          <p>
            Виновен {culprit?.name}. {file.truth.motive}
          </p>
          <p className="fine">Подсказок: {session.hints.length}. Зацепок на доске: {session.found.length} из {file.clues.length}.</p>
          <button className="primary" type="button" onClick={onReset}>
            Новое дело
          </button>
        </>
      )}
    </main>
  )
}
