'use client';

import { cn } from '@/lib/utils';

interface StatusDotProps {
  deadline: string | null;
  realStatus: number;
  className?: string;
}

type StatusType = 'overdue' | 'today' | 'tomorrow' | 'in_progress' | 'new' | 'review' | 'completed';

function getStatusInfo(deadline: string | null, realStatus: number): { type: StatusType; color: string; label: string } {
  // If completed, show green
  if (realStatus === 5) {
    return { type: 'completed', color: 'bg-emerald-500', label: 'Завершено' };
  }

  // If review/supposedly completed
  if (realStatus === 4) {
    return { type: 'review', color: 'bg-blue-500', label: 'На проверке' };
  }

  // If no deadline
  if (!deadline) {
    if (realStatus === 1) {
      return { type: 'new', color: 'bg-gray-400', label: 'Новая' };
    }
    return { type: 'in_progress', color: 'bg-emerald-500', label: 'В работе' };
  }

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
  const diffDays = Math.floor((deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Overdue
  if (diffDays < 0) {
    return { type: 'overdue', color: 'bg-red-500', label: 'Просрочено' };
  }

  // Due today
  if (diffDays === 0) {
    return { type: 'today', color: 'bg-amber-500', label: 'Сегодня' };
  }

  // Due tomorrow
  if (diffDays === 1) {
    return { type: 'tomorrow', color: 'bg-orange-500', label: 'Завтра' };
  }

  // In progress, future deadline
  return { type: 'in_progress', color: 'bg-emerald-500', label: 'В работе' };
}

export function StatusDot({ deadline, realStatus, className }: StatusDotProps) {
  const { type, color, label } = getStatusInfo(deadline, realStatus);

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)} title={label}>
      <span
        className={cn(
          'inline-block h-2.5 w-2.5 rounded-full shrink-0',
          color,
          type === 'overdue' && 'animate-pulse',
        )}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function getStatusType(deadline: string | null, realStatus: number): StatusType {
  return getStatusInfo(deadline, realStatus).type;
}

export { getStatusInfo };
