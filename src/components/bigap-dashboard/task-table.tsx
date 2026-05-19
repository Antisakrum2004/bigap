'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskRow, TaskCard } from './task-row';
import { UsersMap, StagesMap } from '@/lib/types';
import { Inbox, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  stageFilter: string;
  isLoading: boolean;
  onTaskClick: (taskId: string) => void;
  onFilterChange?: (filter: string) => void;
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
  stageFilter,
  isLoading,
  onTaskClick,
  onFilterChange,
}: TaskTableProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  // Build stage filter options dynamically from actual tasks
  const stageOptions = useMemo(() => {
    // Group tasks by stageId → count + title
    const stageGroups: Record<string, { title: string; count: number; sort: number }> = {};

    for (const task of tasks) {
      const sid = task.stageId || '0';
      if (!stageGroups[sid]) {
        const stageInfo = stagesMap[sid];
        const title = stageInfo?.title || (sid === '0' ? 'Новые' : sid);
        // Sort order based on stage title
        const sortMap: Record<string, number> = {
          'Новые': 100,
          'Оценка': 200,
          'Работа': 300,
          'Правки': 400,
          'Тест': 500,
          'Релиз': 600,
          'Готово': 700,
          'Пауза': 800,
          'Оплата': 900,
        };
        stageGroups[sid] = {
          title,
          count: 0,
          sort: sortMap[title] || 999,
        };
      }
      stageGroups[sid].count++;
    }

    // Sort by sort order
    const sorted = Object.entries(stageGroups).sort((a, b) => a[1].sort - b[1].sort);

    return [
      { id: 'all', title: 'Все', count: tasks.length },
      ...sorted.map(([id, { title, count }]) => ({ id, title, count })),
    ];
  }, [tasks, stagesMap]);

  // Filter tasks by selected stage
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (stageFilter === 'all') return true;
        const sid = task.stageId || '0';
        return sid === stageFilter;
      })
      .sort((a, b) => {
        if (a.deadline && b.deadline) {
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        }
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;
        return parseInt(b.id) - parseInt(a.id);
      });
  }, [tasks, stageFilter]);

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
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <LoadingSkeleton />
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
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                {/* Stage filter dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setFilterOpen(!filterOpen)}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-teal-600 transition-colors"
                  >
                    Стадия
                    <ChevronDown className={cn('h-3 w-3 transition-transform', filterOpen && 'rotate-180')} />
                  </button>
                  {filterOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                      <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
                        {stageOptions.map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => {
                              onFilterChange?.(opt.id);
                              setFilterOpen(false);
                            }}
                            className={cn(
                              'w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors flex items-center justify-between',
                              stageFilter === opt.id && 'text-teal-600 font-medium bg-teal-50/50'
                            )}
                          >
                            <span>{opt.title}</span>
                            <span className={cn(
                              'text-[10px] ml-2',
                              stageFilter === opt.id ? 'text-teal-500' : 'text-gray-400'
                            )}>
                              {opt.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Исполнитель</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Срок</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Создана</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Время</TableHead>
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
                onClick={() => onTaskClick(task.id)}
              />
            ))}
          </TableBody>
        </Table>
        {filteredTasks.length === 0 && <EmptyState />}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {/* Mobile filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {stageOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => onFilterChange?.(opt.id)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                stageFilter === opt.id
                  ? 'bg-teal-50 text-teal-700 border-teal-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              )}
            >
              {opt.title} ({opt.count})
            </button>
          ))}
        </div>

        {filteredTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            usersMap={usersMap}
            stagesMap={stagesMap}
            onClick={() => onTaskClick(task.id)}
          />
        ))}
        {filteredTasks.length === 0 && <EmptyState />}
      </div>
    </>
  );
}
