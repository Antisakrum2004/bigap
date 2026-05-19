'use client';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
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

  try {
    const deadlineDate = new Date(deadline);
    const formatted = format(deadlineDate, 'd MMMM', { locale: ru });
    return (
      <span className={cn('text-sm text-gray-700', className)}>
        {formatted}
      </span>
    );
  } catch {
    return (
      <span className={cn('text-sm text-gray-400', className)}>
        —
      </span>
    );
  }
}
