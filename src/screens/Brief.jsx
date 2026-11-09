export default function Brief({ session, onStart, onReset }) {
  const file = session.caseFile
  return (
    <main className="paper">
      <p className="eyebrow">{session.source === 'gemini' ? 'Написано перед игрой' : 'Собрано на устройстве'}</p>
      <h1>{file.title}</h1>
      <p className="lead">{file.logline}</p>
      <p>{file.briefing}</p>
      <h2>Кто был рядом</h2>
      <ul className="people">
        {file.people.map((person) => (
          <li key={person.id}>
            <strong>{person.name}</strong>
            <span>{person.role}</span>
            <p>{person.blurb}</p>
          </li>
        ))}
      </ul>
      <p className="fine">Дело разложено по {session.anchors.length} местам. Новые улики по ходу не появятся.</p>
      <div className="stack">
        <button className="primary" type="button" onClick={onStart}>
          Начать осмотр
        </button>
        <button className="texty" type="button" onClick={onReset}>
          Закрыть дело
        </button>
      </div>
    </main>
  )
}
