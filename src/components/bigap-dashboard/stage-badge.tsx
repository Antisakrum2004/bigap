'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StageBadgeProps {
  stageId: string;
  stageTitle?: string;
  stageColor?: string;
  className?: string;
}

// Map of stage titles to Tailwind classes for known stages
const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Новые': { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  'Оценка': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300' },
  'Работа': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-300' },
  'Правки': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300' },
  'Тест': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
  'Релиз': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
  'Готово': { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-300' },
  'Пауза': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  'Счет': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300' },
  'Оплата': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-300' },
  'Выполняются': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
  'Сделаны': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
};

const DEFAULT_STAGE_COLOR = { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };

export function StageBadge({ stageId, stageTitle, stageColor, className }: StageBadgeProps) {
  const displayTitle = stageTitle || stageId || '—';
  const colors = STAGE_COLORS[displayTitle] || DEFAULT_STAGE_COLOR;

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium px-2 py-0.5 border',
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {displayTitle}
    </Badge>
  );
}
