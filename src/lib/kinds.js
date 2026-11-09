export const KINDS = [
  { id: 'floor', label: 'Пол', manual: true },
  { id: 'door', label: 'Дверь', manual: true },
  { id: 'wardrobe', label: 'Шкаф', manual: true },
  { id: 'shelf', label: 'Полка', manual: true },
  { id: 'nightstand', label: 'Тумбочка', manual: true },
  { id: 'window', label: 'Окно', manual: true },
  { id: 'table', label: 'Стол', coco: 'dining table' },
  { id: 'chair', label: 'Стул', coco: 'chair' },
  { id: 'couch', label: 'Диван', coco: 'couch' },
  { id: 'bed', label: 'Кровать', coco: 'bed' },
  { id: 'tv', label: 'Телевизор', coco: 'tv' },
  { id: 'fridge', label: 'Холодильник', coco: 'refrigerator' },
  { id: 'sink', label: 'Раковина', coco: 'sink' },
  { id: 'oven', label: 'Плита', coco: 'oven' },
  { id: 'microwave', label: 'Микроволновка', coco: 'microwave' },
  { id: 'laptop', label: 'Ноутбук', coco: 'laptop' },
  { id: 'book', label: 'Книга', coco: 'book' },
  { id: 'clock', label: 'Часы', coco: 'clock' },
  { id: 'plant', label: 'Растение', coco: 'potted plant' },
  { id: 'bottle', label: 'Бутылка', coco: 'bottle' },
  { id: 'vase', label: 'Ваза', coco: 'vase' },
]

const byCoco = new Map(KINDS.filter((kind) => kind.coco).map((kind) => [kind.coco, kind]))

export function kindFromCoco(name) {
  return byCoco.get(name) || null
}

export function kindById(id) {
  return KINDS.find((kind) => kind.id === id) || null
}
