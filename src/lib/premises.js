export const PREMISES = [
  {
    id: 'quiet',
    title: 'Тихий вечер',
    text: 'В комнате кто-то умер. Тело накрыто, крови почти нет.',
    body: true,
  },
  {
    id: 'empty',
    title: 'Пустая комната',
    text: 'Человек пропал из этой комнаты. Тела нет, борьба была.',
    body: false,
  },
  {
    id: 'missing',
    title: 'Не вышла',
    text: 'Она должна была выйти отсюда утром. Пальто на месте, её нет.',
    body: false,
  },
  {
    id: 'theft',
    title: 'Чего не хватает',
    text: 'Из комнаты пропал конверт с деньгами. Дверь никто не ломал.',
    body: false,
  },
]

export function premiseById(id) {
  return PREMISES.find((premise) => premise.id === id) || PREMISES[0]
}
