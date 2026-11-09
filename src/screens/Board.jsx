import { cameraClues } from '../lib/session.js'

export default function Board({ session, onCollect, onAccuse }) {
  const found = session.caseFile.clues.filter((clue) => session.found.includes(clue.id))
  const left = session.caseFile.clues.length - found.length
  const open = cameraClues(session.caseFile, session.found, session.revealed).filter(
    (clue) => !session.found.includes(clue.id),
  )

  return (
    <main className="paper with-tabs">
      <p className="eyebrow">Доска</p>
      <h1>Что уже есть</h1>
      <p className="lead">
        {left ? `Ещё не найдено: ${left}. Повторно обходить комнату ради текста не нужно.` : 'Все зацепки на доске.'}
      </p>
      {session.demo && open.length > 0 && (
        <section className="demo-open">
          <h2>В пробе, без камеры</h2>
          {open.map((clue) => {
            const anchor = session.anchors.find((item) => item.id === clue.anchorId)
            return (
              <button key={clue.id} type="button" className="ghost wide" onClick={() => onCollect(clue.id)}>
                Осмотреть: {anchor?.label || clue.title}
              </button>
            )
          })}
        </section>
      )}
      {found.length === 0 && <p>Доска пустая. Первые следы видны в камере сразу.</p>}
      <div className="cards">
        {found.map((clue) => {
          const anchor = session.anchors.find((item) => item.id === clue.anchorId)
          return (
            <article key={clue.id} className="card">
              {anchor?.thumb && <img src={anchor.thumb} alt={anchor.label} />}
              <div>
                <p className="eyebrow">{clue.kind === 'call' ? 'Звонок' : anchor?.label || 'Комната'}</p>
                <h2>{clue.title}</h2>
                <p>{clue.body}</p>
              </div>
            </article>
          )
        })}
      </div>
      <button className="primary wide" type="button" onClick={onAccuse}>
        Назвать виновного
      </button>
    </main>
  )
}
