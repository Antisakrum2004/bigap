'use client';

import { cn } from '@/lib/utils';

interface StageBadgeProps {
  stageId: string;
  stageTitle?: string;
  stageColor?: string;
  className?: string;
}

// Map of stage titles to text color classes
const STAGE_TEXT_COLORS: Record<string, string> = {
  'Новые': 'text-gray-500',
  'Оценка': 'text-yellow-600',
  'Работа': 'text-cyan-600',
  'Правки': 'text-red-500',
  'Тест': 'text-purple-600',
  'Релиз': 'text-orange-600',
  'Готово': 'text-lime-600',
  'Пауза': 'text-amber-700',
  'Счет': 'text-blue-600',
  'Оплата': 'text-green-600',
  'Выполняются': 'text-teal-600',
  'Сделаны': 'text-emerald-600',
};

const DEFAULT_TEXT_COLOR = 'text-slate-600';

export function StageBadge({ stageId, stageTitle, stageColor, className }: StageBadgeProps) {
  const displayTitle = stageTitle || stageId || '—';
  const textColor = STAGE_TEXT_COLORS[displayTitle] || DEFAULT_TEXT_COLOR;

  return (
    <span className={cn('text-xs font-semibold', textColor, className)}>
      {displayTitle}
    </span>
  );
}
