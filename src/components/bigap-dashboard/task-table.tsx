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
import { Inbox, ChevronDown, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
  chatId?: number;
}

interface TaskTableProps {
  tasks: FormattedTask[];
  usersMap: UsersMap;
  stagesMap: StagesMap;
  stageFilter: string;
  isLoading: boolean;
  onTaskClick: (taskId: string) => void;
  onFilterChange?: (filter: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  sortField?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (field: string) => void;
}

// Display name mapping for stages in filter
const STAGE_DISPLAY_NAMES: Record<string, string> = {
  'Новые': 'Новые',
  'Оценка': 'Оценка',
  'Работа': 'В работе',
  'Правки': 'Правки',
  'Тест': 'Тест',
  'Релиз': 'Релиз',
  'Готово': 'Готово',
  'Пауза': 'Пауза',
  'Оплата': 'Оплата',
};

// Sort order for stages in the filter dropdown
const STAGE_SORT: Record<string, number> = {
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

// Only show these stages in the filter (user requested)
const VISIBLE_STAGES = ['Новые', 'Работа', 'Готово', 'Пауза'];

type SortField = 'id' | 'title' | 'stage' | 'responsible' | 'deadline' | 'created' | 'duration';

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

function SortIcon({ field, currentField, currentDir }: { field: string; currentField: string; currentDir: 'asc' | 'desc' }) {
  if (field !== currentField) {
    return <ArrowUpDown className="h-3 w-3 text-gray-300" />;
  }
  return currentDir === 'asc'
    ? <ArrowUp className="h-3 w-3 text-teal-600" />
    : <ArrowDown className="h-3 w-3 text-teal-600" />;
}

export function TaskTable({
  tasks,
  usersMap,
  stagesMap,
  stageFilter,
  isLoading,
  onTaskClick,
  onFilterChange,
  searchQuery = '',
  onSearchChange,
  sortField = 'created',
  sortDir = 'desc',
  onSortChange,
}: TaskTableProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  // Build stage filter options — group by title to merge duplicates
  const stageOptions = useMemo(() => {
    // Group tasks by stage TITLE (not stageId) to merge duplicates like "Готово" (id 140 and 194)
    const titleGroups: Record<string, { count: number; sort: number }> = {};

    for (const task of tasks) {
      const sid = task.stageId || '0';
      const stageInfo = stagesMap[sid];
      const title = stageInfo?.title || (sid === '0' ? 'Новые' : sid);

      if (!titleGroups[title]) {
        titleGroups[title] = {
          count: 0,
          sort: STAGE_SORT[title] || 999,
        };
      }
      titleGroups[title].count++;
    }

    // Filter to only visible stages and sort
    const sorted = Object.entries(titleGroups)
      .filter(([title]) => VISIBLE_STAGES.includes(title))
      .sort((a, b) => a[1].sort - b[1].sort);

    return [
      { id: 'all', title: 'Все', count: tasks.length },
      ...sorted.map(([title, { count }]) => ({
        id: title, // Use title as ID for filtering
        title: STAGE_DISPLAY_NAMES[title] || title,
        count,
      })),
    ];
  }, [tasks, stagesMap]);

  // Helper: get stage title for a task
  const getTaskStageTitle = useMemo(() => {
    return (task: FormattedTask) => {
      const sid = task.stageId || '0';
      const stageInfo = stagesMap[sid];
      return stageInfo?.title || (sid === '0' ? 'Новые' : sid);
    };
  }, [stagesMap]);

  // Filter + search + sort tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Stage filter
    if (stageFilter !== 'all') {
      result = result.filter(task => getTaskStageTitle(task) === stageFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(task =>
        task.title.toLowerCase().includes(q) ||
        task.id.includes(q) ||
        `#${task.id}`.includes(q)
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const field = sortField as SortField;

      switch (field) {
        case 'id':
          return (parseInt(a.id) - parseInt(b.id)) * dir;
        case 'title':
          return a.title.localeCompare(b.title, 'ru') * dir;
        case 'stage': {
          const sa = STAGE_SORT[getTaskStageTitle(a)] || 999;
          const sb = STAGE_SORT[getTaskStageTitle(b)] || 999;
          return (sa - sb) * dir;
        }
        case 'responsible': {
          const ua = usersMap[a.responsibleId]?.name || '';
          const ub = usersMap[b.responsibleId]?.name || '';
          return ua.localeCompare(ub, 'ru') * dir;
        }
        case 'deadline': {
          if (a.deadline && b.deadline) {
            return (new Date(a.deadline).getTime() - new Date(b.deadline).getTime()) * dir;
          }
          if (a.deadline && !b.deadline) return -1 * dir;
          if (!a.deadline && b.deadline) return 1 * dir;
          return 0;
        }
        case 'created':
          return (new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()) * dir;
        case 'duration':
          return (a.durationFact - b.durationFact) * dir;
        default:
          return 0;
      }
    });

    return result;
  }, [tasks, stageFilter, searchQuery, sortField, sortDir, usersMap, getTaskStageTitle]);

  // Sortable column header helper
  const SortableHeader = ({ field, label, className }: { field: string; label: string; className?: string }) => (
    <TableHead className={cn('text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-teal-600 transition-colors', className)}>
      <button
        onClick={() => onSortChange?.(field)}
        className="flex items-center gap-1"
      >
        {label}
        <SortIcon field={field} currentField={sortField} currentDir={sortDir} />
      </button>
    </TableHead>
  );

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
      {/* Search + Filter bar */}
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Поиск по названию или ID..."
            className="w-full h-8 pl-8 pr-3 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:border-teal-300 focus:ring-1 focus:ring-teal-200 placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange?.('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {stageOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => onFilterChange?.(opt.id)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-full border transition-colors',
                stageFilter === opt.id
                  ? 'bg-teal-50 text-teal-700 border-teal-200 font-medium'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              )}
            >
              {opt.title}{' '}
              <span className={cn(
                'text-[10px]',
                stageFilter === opt.id ? 'text-teal-500' : 'text-gray-400'
              )}>
                {opt.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
              <SortableHeader field="id" label="ID" className="w-20" />
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-10" />
              <SortableHeader field="title" label="Задача" />
              <TableHead className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                {/* Stage filter dropdown in header */}
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
              <SortableHeader field="responsible" label="Исполнитель" className="w-32" />
              <SortableHeader field="deadline" label="Срок" className="w-28" />
              <SortableHeader field="created" label="Создана" className="w-28" />
              <SortableHeader field="duration" label="Время" className="w-20" />
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

      {/* Results count */}
      {(searchQuery || stageFilter !== 'all') && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          Найдено: {filteredTasks.length} из {tasks.length}
        </div>
      )}
    </>
  );
}
