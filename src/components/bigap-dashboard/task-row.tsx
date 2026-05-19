'use client';

import { TableCell, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatusDot, getStatusType } from './status-dot';
import { StageBadge } from './stage-badge';
import { DeadlineBadge } from './deadline-badge';
import { TypeBadge } from './type-badge';
import { UsersMap, StagesMap, StatusFilter } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TaskRowProps {
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
  };
  usersMap: UsersMap;
  stagesMap: StagesMap;
  statusFilter: StatusFilter;
  onClick: () => void;
}

export function shouldShowTask(statusFilter: StatusFilter, task: TaskRowProps['task']): boolean {
  const statusType = getStatusType(task.deadline, task.realStatus);

  switch (statusFilter) {
    case 'all':
      return true;
    case 'in_progress':
      return task.realStatus === 3 && statusType !== 'overdue';
    case 'overdue':
      return statusType === 'overdue';
    case 'review':
      return task.realStatus === 4;
    case 'completed':
      return task.realStatus === 5;
    default:
      return true;
  }
}

export function TaskRow({ task, usersMap, stagesMap, statusFilter: _statusFilter, onClick }: TaskRowProps) {
  const user = usersMap[task.responsibleId];
  const stage = stagesMap[task.stageId];

  const assigneeName = user
    ? `${user.name} ${user.lastName}`.trim() || `#${task.responsibleId}`
    : `#${task.responsibleId}`;

  const assigneeInitials = user
    ? `${(user.name || '')[0] || ''}${(user.lastName || '')[0] || ''}`
    : '?';

  return (
    <TableRow
      className={cn(
        'cursor-pointer transition-colors hover:bg-gray-50',
        task.realStatus === 5 && 'opacity-60',
      )}
      onClick={onClick}
    >
      {/* ID */}
      <TableCell className="text-gray-400 text-sm font-mono w-20">
        #{task.id}
      </TableCell>

      {/* Status dot */}
      <TableCell className="w-10">
        <StatusDot deadline={task.deadline} realStatus={task.realStatus} />
      </TableCell>

      {/* Title */}
      <TableCell className="max-w-xs lg:max-w-md">
        <span className={cn(
          'text-sm font-medium text-gray-900 line-clamp-1',
          task.realStatus === 5 && 'line-through text-gray-500',
        )}>
          {task.title}
        </span>
      </TableCell>

      {/* Stage */}
      <TableCell className="w-32">
        <StageBadge
          stageId={task.stageId}
          stageTitle={stage?.title}
          stageColor={stage?.color}
        />
      </TableCell>

      {/* Assignee */}
      <TableCell className="w-40">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            {user?.avatar && <AvatarImage src={user.avatar} alt={assigneeName} />}
            <AvatarFallback className="text-[10px] bg-gray-100 text-gray-600">
              {assigneeInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-700 truncate">{assigneeName}</span>
        </div>
      </TableCell>

      {/* Deadline */}
      <TableCell className="w-28">
        <DeadlineBadge deadline={task.deadline} />
      </TableCell>

      {/* Type */}
      <TableCell className="w-24">
        <TypeBadge tags={task.tags} />
      </TableCell>
    </TableRow>
  );
}

/* Mobile card version */
export function TaskCard({ task, usersMap, stagesMap, onClick }: Omit<TaskRowProps, 'statusFilter'>) {
  const user = usersMap[task.responsibleId];
  const stage = stagesMap[task.stageId];

  const assigneeName = user
    ? `${user.name} ${user.lastName}`.trim() || `#${task.responsibleId}`
    : `#${task.responsibleId}`;

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50',
        task.realStatus === 5 && 'opacity-60',
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <StatusDot deadline={task.deadline} realStatus={task.realStatus} />
          <span className="text-xs text-gray-400 font-mono">#{task.id}</span>
        </div>
        <StageBadge stageId={task.stageId} stageTitle={stage?.title} stageColor={stage?.color} />
      </div>

      <h3 className={cn(
        'text-sm font-medium text-gray-900 mb-3',
        task.realStatus === 5 && 'line-through text-gray-500',
      )}>
        {task.title}
      </h3>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5">
            {user?.avatar && <AvatarImage src={user.avatar} alt={assigneeName} />}
            <AvatarFallback className="text-[8px] bg-gray-100 text-gray-600">
              {user?.name?.[0] || '?'}{user?.lastName?.[0] || ''}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-gray-500">{assigneeName}</span>
        </div>
        <div className="flex items-center gap-2">
          <DeadlineBadge deadline={task.deadline} />
          <TypeBadge tags={task.tags} />
        </div>
      </div>
    </div>
  );
}
