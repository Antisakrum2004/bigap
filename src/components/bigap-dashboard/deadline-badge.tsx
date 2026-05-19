'use client';

import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInDays, isToday, isTomorrow, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DeadlineBadgeProps {
  deadline: string | null;
  className?: string;
}

export function DeadlineBadge({ deadline, className }: DeadlineBadgeProps) {
  if (!deadline) {
    return (
      <span className={cn('text-sm text-gray-400', className)}>
        —
      </span>
    );
  }

  const deadlineDate = new Date(deadline);
  const now = new Date();

  // Check relative dates
  if (isPast(deadlineDate) && !isToday(deadlineDate)) {
    const daysOverdue = Math.abs(differenceInDays(deadlineDate, now));
    return (
      <span className={cn('text-sm font-medium text-red-600', className)}>
        {daysOverdue === 0
          ? 'Вчера'
          : `${daysOverdue} дн. назад`}
      </span>
    );
  }

  if (isToday(deadlineDate)) {
    return (
      <span className={cn('text-sm font-medium text-amber-600', className)}>
        Сегодня
      </span>
    );
  }

  if (isTomorrow(deadlineDate)) {
    return (
      <span className={cn('text-sm font-medium text-orange-600', className)}>
        Завтра
      </span>
    );
  }

  // Future deadline
  const daysUntil = differenceInDays(deadlineDate, now);
  if (daysUntil <= 7) {
    return (
      <span className={cn('text-sm text-gray-600', className)}>
        Через {daysUntil} дн.
      </span>
    );
  }

  // Far future - show date
  const relativeStr = formatDistanceToNow(deadlineDate, { locale: ru, addSuffix: true });
  return (
    <span className={cn('text-sm text-gray-500', className)}>
      {relativeStr}
    </span>
  );
}
