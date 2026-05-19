'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { StatusDot } from './status-dot';
import { StageBadge } from './stage-badge';
import { DeadlineBadge } from './deadline-badge';
import { CommentCell } from './comment-cell';
import { UsersMap, StagesMap } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Calendar, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';

interface TaskModalProps {
  task: {
    id: string;
    title: string;
    status: number;
    realStatus: number;
    stageId: string;
    groupId: number;
    createdDate: string;
    closedDate: string | null;
    responsibleId: number;
    deadline: string | null;
    description: string;
    priority: number;
    durationFact: number;
    tags: string[];
  } | null;
  usersMap: UsersMap;
  stagesMap: StagesMap;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function sanitizeDescriptionHtml(html: string): string {
  if (!html) return '';
  // Allow safe tags including img, but strip dangerous ones
  return html
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, '')
    // Remove style tags to prevent CSS attacks
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function TaskModal({ task, usersMap, stagesMap, open, onOpenChange }: TaskModalProps) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  if (!task) return null;

  const user = usersMap[task.responsibleId];
  const stage = stagesMap[task.stageId];
  // First name only
  const assigneeName = user
    ? user.name || `#${task.responsibleId}`
    : `#${task.responsibleId}`;

  const hasDescription = task.description && task.description.trim().length > 0;
  const hasImages = task.description && /<img\b/i.test(task.description);
  const plainTextLen = task.description ? task.description.replace(/<[^>]*>/g, '').length : 0;
  const isLongDescription = plainTextLen > 300;

  // For tasks without images, show plain text; for tasks with images, show HTML
  const shouldRenderHtml = hasImages;

  const priorityLabel = task.priority === 2 ? 'Высокий' : task.priority === 0 ? 'Низкий' : 'Средний';
  const priorityColor = task.priority === 2 ? 'text-red-600' : task.priority === 0 ? 'text-gray-400' : 'text-gray-600';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 font-mono">#{task.id}</span>
            <StatusDot deadline={task.deadline} realStatus={task.realStatus} />
          </div>
          <DialogTitle className="text-lg font-semibold text-gray-900 pr-8">
            {task.title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Задача #{task.id}: {task.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Stage & Priority */}
          <div className="flex flex-wrap items-center gap-3">
            {stage && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">Стадия:</span>
                <StageBadge stageId={task.stageId} stageTitle={stage.title} />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Приоритет:</span>
              <span className={cn('text-xs font-medium', priorityColor)}>{priorityLabel}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Статус:</span>
              <span className="text-xs font-medium text-gray-700">
                {{ 1: 'Новая', 2: 'Ожидает', 3: 'В работе', 4: 'На проверке', 5: 'Завершена', 6: 'Отложена', 7: 'Отклонена' }[task.realStatus as 1|2|3|4|5|6|7]
                  ?? `Статус ${task.realStatus}`}
              </span>
            </div>
          </div>

          {/* Assignee — first name only */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="h-4 w-4 text-gray-400 shrink-0" />
            <Avatar className="h-8 w-8">
              {user?.avatar && <AvatarImage src={user.avatar} alt={assigneeName} />}
              <AvatarFallback className="text-xs bg-gray-200 text-gray-600">
                {(user?.name || '?')[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-900">{assigneeName}</span>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-gray-500">Дедлайн:</span>
              <DeadlineBadge deadline={task.deadline} />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-400 shrink-0" />
              <span className="text-gray-500">Создана:</span>
              <span className="text-gray-700">{formatDate(task.createdDate)}</span>
            </div>
          </div>

          {task.closedDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-green-400 shrink-0" />
              <span className="text-gray-500">Закрыта:</span>
              <span className="text-green-600">{formatDate(task.closedDate)}</span>
            </div>
          )}

          {/* Description — render HTML with images */}
          {hasDescription && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Описание</h4>
              <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 overflow-hidden">
                {shouldRenderHtml ? (
                  <>
                    <div
                      className={cn(
                        'prose prose-sm max-w-none break-words overflow-hidden',
                        !descriptionExpanded && isLongDescription && 'max-h-40'
                      )}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeDescriptionHtml(
                          descriptionExpanded
                            ? task.description
                            : task.description.slice(0, 1500)
                        ),
                      }}
                    />
                    {!descriptionExpanded && isLongDescription && (
                      <div className="h-8 bg-gradient-to-t from-gray-50 to-transparent -mt-8 relative" />
                    )}
                  </>
                ) : (
                  <p className="whitespace-pre-wrap break-words">
                    {task.description
                      .replace(/<br\s*\/?>/gi, '\n')
                      .replace(/<\/p>/gi, '\n\n')
                      .replace(/<\/div>/gi, '\n')
                      .replace(/<\/li>/gi, '\n')
                      .replace(/<li>/gi, '• ')
                      .replace(/<[^>]*>/g, '')
                      .replace(/&nbsp;/g, ' ')
                      .replace(/&amp;/g, '&')
                      .replace(/&lt;/g, '<')
                      .replace(/&gt;/g, '>')
                      .replace(/\n{3,}/g, '\n\n')
                      .trim()
                      .slice(0, descriptionExpanded ? undefined : 300)}
                    {!descriptionExpanded && plainTextLen > 300 && '...'}
                  </p>
                )}
                {(isLongDescription || (shouldRenderHtml && task.description.length > 1500)) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    className="mt-2 h-7 text-xs text-teal-600 hover:text-teal-700 p-0"
                  >
                    {descriptionExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3 mr-1" />
                        Свернуть
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3 mr-1" />
                        Развернуть
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Comments — history + input */}
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium text-gray-700">Комментарии</h4>
            <CommentCell taskId={task.id} responsibleId={task.responsibleId} expanded />
          </div>

          {/* Bitrix link */}
          <div className="pt-3 border-t">
            <a
              href={`https://1c-cms.bitrix24.ru/company/personal/user/${task.responsibleId}/tasks/task/view/${task.id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-teal-600 transition-colors"
            >
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Открыть в Bitrix24
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
