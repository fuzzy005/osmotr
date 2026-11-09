import { PREMISES } from '../lib/premises.js'

export default function Home({ session, onPremise, onScan, onDemo, onResume, onReset }) {
  const premise = PREMISES.find((item) => item.id === session.premiseId) || PREMISES[0]
  const canResume = Boolean(session.caseFile)

  return (
    <main className="paper">
      <p className="eyebrow">Одна комната · одно дело</p>
      <h1>Осмотр</h1>
      <p className="lead">
        Комната, в которой вы стоите, становится местом дела. Сначала отмечаете пол и вещи.
        Потом дело пишется целиком. Улика остаётся на той вещи, которую камера узнает снова.
      </p>

      {canResume && (
        <div className="resume">
          <div>
            <strong>{session.caseFile.title}</strong>
            <p>Дело уже разложено по этой комнате.</p>
          </div>
          <button className="primary" type="button" onClick={onResume}>
            Продолжить
          </button>
          <button className="texty" type="button" onClick={onReset}>
            Закрыть и начать другое
          </button>
        </div>
      )}

      <h2>Выберите завязку</h2>
      <div className="premises">
        {PREMISES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === premise.id ? 'file on' : 'file'}
            onClick={() => onPremise(item.id)}
          >
            <strong>{item.title}</strong>
            <span>{item.text}</span>
          </button>
        ))}
      </div>

      <div className="stack">
        <button className="primary" type="button" onClick={onScan}>
          Снять комнату
        </button>
        <button className="ghost" type="button" onClick={onDemo}>
          Проба без камеры
        </button>
      </div>
      <p className="fine">
        Подсказка есть всегда. Если камера не узнает вещь, улику можно забрать прямо из подсказки.
        Телефон в деле — набор из четырёх цифр, разговор идёт текстом.
      </p>
    </main>
  )
}
