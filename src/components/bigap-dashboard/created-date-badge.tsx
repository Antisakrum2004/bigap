'use client';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CreatedDateBadgeProps {
  createdDate: string;
  className?: string;
}

export function CreatedDateBadge({ createdDate, className }: CreatedDateBadgeProps) {
  if (!createdDate) {
    return (
      <span className={cn('text-sm text-gray-400', className)}>
        —
      </span>
    );
  }

  try {
    const date = new Date(createdDate);
    const formatted = format(date, 'd MMMM', { locale: ru });
    return (
      <span className={cn('text-sm text-gray-500', className)}>
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
