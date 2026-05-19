export const BITRIX_CONFIG = {
  webhookUrl:
    process.env.BITRIX_WEBHOOK_URL ||
    'https://1c-cms.bitrix24.ru/rest/116/48yuunr8ss2u18qm/',
  projectId: parseInt(process.env.BITRIX_PROJECT_ID || '6'),
  refreshInterval: 30 * 60 * 1000, // 30 minutes
};

export const TASK_STATUS = {
  NEW: 1,
  PENDING: 2,
  IN_PROGRESS: 3,
  SUPPOSEDLY_COMPLETED: 4,
  COMPLETED: 5,
  DEFERRED: 6,
  DECLINED: 7,
} as const;

export const STATUS_LABELS: Record<number, string> = {
  [TASK_STATUS.NEW]: 'Новая',
  [TASK_STATUS.PENDING]: 'Ожидает',
  [TASK_STATUS.IN_PROGRESS]: 'В работе',
  [TASK_STATUS.SUPPOSEDLY_COMPLETED]: 'На проверке',
  [TASK_STATUS.COMPLETED]: 'Завершена',
  [TASK_STATUS.DEFERRED]: 'Отложена',
  [TASK_STATUS.DECLINED]: 'Отклонена',
};

// Complete STAGE_MAP from bitrix-dashboard documentation
// Key = groupId (project ID), value = project info with stages
export const STAGE_MAP: Record<string, {
  name: string;
  stages: { id: number; sort: number; title: string; color: string }[];
}> = {
  '4': {
    name: 'Живое пиво',
    stages: [
      { id: 80, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 756, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 82, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 402, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 406, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 758, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 84, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 404, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 408, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 410, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '6': {
    name: 'Бигап',
    stages: [
      { id: 136, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 534, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 138, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 188, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 190, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 258, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 140, sort: 700, title: 'Готово', color: '8ec82f' },
      { id: 192, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 194, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 196, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '20': {
    name: 'ВДЛ',
    stages: [
      { id: 150, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 722, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 152, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 514, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 154, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 748, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 724, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 726, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 728, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 730, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '32': {
    name: 'Дакар',
    stages: [
      { id: 86, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 736, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 528, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 204, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 198, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 746, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 90, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 508, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 200, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 202, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '36': {
    name: 'Медицина КЗ',
    stages: [
      { id: 292, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 362, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 294, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 298, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 300, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 750, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 296, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 308, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 302, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 306, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '50': {
    name: 'ИП Белолапотко',
    stages: [
      { id: 414, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 428, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 532, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 416, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 530, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 420, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 418, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 538, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 422, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 424, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '52': {
    name: 'ООО ОПТИМАПЛАСТ',
    stages: [
      { id: 430, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 442, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 622, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 432, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 436, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 786, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 434, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 440, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 438, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 444, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '62': {
    name: 'Нейс-Юг',
    stages: [
      { id: 564, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 588, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 566, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 590, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 720, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 568, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 592, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 594, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 752, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 754, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '66': {
    name: 'ИП Иванов',
    stages: [
      { id: 602, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 604, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 740, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 632, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 630, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 744, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 606, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 742, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 634, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 636, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '70': {
    name: 'МАРКДЖЕТ',
    stages: [
      { id: 614, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 620, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 616, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 618, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 760, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 762, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 764, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 766, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 768, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 770, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '72': {
    name: 'Керамика Фабрика',
    stages: [
      { id: 624, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 772, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 626, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 628, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 774, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 776, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 778, sort: 700, title: 'Готово', color: '7bd500' },
      { id: 780, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 782, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 784, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '82': {
    name: 'ЮРИСТЫ БИГАП',
    stages: [
      { id: 832, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 834, sort: 200, title: 'Оценка', color: 'f5d220' },
      { id: 836, sort: 300, title: 'Работа', color: '2fc6f6' },
      { id: 838, sort: 400, title: 'Правки', color: 'ff5752' },
      { id: 840, sort: 500, title: 'Тест', color: '9b51e0' },
      { id: 842, sort: 600, title: 'Релиз', color: 'ffa900' },
      { id: 844, sort: 700, title: 'Готово', color: '8ec82f' },
      { id: 846, sort: 800, title: 'Пауза', color: '754c24' },
      { id: 848, sort: 900, title: 'Счет', color: '1db7f1' },
      { id: 850, sort: 1000, title: 'Оплата', color: '14b033' },
    ],
  },
  '78': {
    name: 'Backlog',
    stages: [
      { id: 702, sort: 100, title: 'Новые', color: 'a8afb3' },
      { id: 704, sort: 200, title: 'Работа', color: '2fc6f6' },
      { id: 788, sort: 300, title: 'Пауза', color: 'a46200' },
      { id: 706, sort: 400, title: 'Готово', color: '7bd500' },
    ],
  },
};

// Helper to look up stage info by groupId and stageId
export function getStageInfo(
  groupId: number | string,
  stageId: string | number
): { title: string; color: string } | null {
  const group = STAGE_MAP[String(groupId)];
  if (!group) return null;

  const numericStageId = parseInt(String(stageId));
  if (isNaN(numericStageId) || numericStageId === 0) {
    // stageId=0 or empty means "Новые"
    return { title: 'Новые', color: 'a8afb3' };
  }

  const stage = group.stages.find((s) => s.id === numericStageId);
  if (!stage) return null;

  return { title: stage.title, color: stage.color };
}

// Task type colors
export const TASK_TYPE_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  'Работа': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Работа' },
  'Ревью': { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Ревью' },
  'Баг': { bg: 'bg-red-100', text: 'text-red-700', label: 'Баг' },
  'Новое': { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Новое' },
};
