'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TypeBadgeProps {
  tags: string[];
  className?: string;
}

const TYPE_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  'Работа': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  'Ревью': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'Баг': { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
  'Новое': { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
};

const DEFAULT_TYPE = { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };

function detectTaskType(tags: string[]): string | null {
  if (!tags || tags.length === 0) return null;

  for (const tag of tags) {
    const lower = tag.toLowerCase().trim();
    if (lower.includes('баг') || lower.includes('bug')) return 'Баг';
    if (lower.includes('ревью') || lower.includes('review')) return 'Ревью';
    if (lower.includes('работ') || lower.includes('work') || lower.includes('dev') || lower.includes('разраб')) return 'Работа';
    if (lower.includes('нов') || lower.includes('new')) return 'Новое';
  }

  return tags[0] || null;
}

export function TypeBadge({ tags, className }: TypeBadgeProps) {
  const taskType = detectTaskType(tags);

  if (!taskType) {
    return (
      <span className={cn('text-sm text-gray-400', className)}>
        —
      </span>
    );
  }

  const config = TYPE_CONFIG[taskType] || DEFAULT_TYPE;

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium px-2 py-0.5 border',
        config.bg,
        config.text,
        config.border,
        className
      )}
    >
      {taskType}
    </Badge>
  );
}
