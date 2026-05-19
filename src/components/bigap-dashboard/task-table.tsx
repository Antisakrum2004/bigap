'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskRow, TaskCard, shouldShowTask } from './task-row';
import { UsersMap, StagesMap, StatusFilter } from '@/lib/types';
import { Inbox } from 'lucide-react';

interface FormattedTask {
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
}

interface TaskTableProps {
  tasks: FormattedTask[];
  usersMap: UsersMap;
  stagesMap: StagesMap;
  statusFilter: StatusFilter;
  isLoading: boolean;
  onTaskClick: (taskId: string) => void;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-2.5 w-2.5 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <Inbox className="h-12 w-12 mb-3 text-gray-300" />
      <p className="text-sm">Нет задач для отображения</p>
    </div>
  );
}

export function TaskTable({
  tasks,
  usersMap,
  stagesMap,
  statusFilter,
  isLoading,
  onTaskClick,
}: TaskTableProps) {
  // Sort: newest deadlines first, tasks without deadline at the end
  const filteredTasks = tasks
    .filter((task) => shouldShowTask(statusFilter, task))
    .sort((a, b) => {
      if (a.deadline && b.deadline) {
        return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      return parseInt(b.id) - parseInt(a.id);
    });

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">ID</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-10" />
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Задача</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Стадия</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Исполнитель</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Срок</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Создана</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Комментарий</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                usersMap={usersMap}
                stagesMap={stagesMap}
                statusFilter={statusFilter}
                onClick={() => onTaskClick(task.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            usersMap={usersMap}
            stagesMap={stagesMap}
            onClick={() => onTaskClick(task.id)}
          />
        ))}
      </div>
    </>
  );
}
