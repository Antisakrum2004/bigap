'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardHeader } from '@/components/bigap-dashboard/dashboard-header';
import { TaskTable } from '@/components/bigap-dashboard/task-table';
import { TaskModal } from '@/components/bigap-dashboard/task-modal';
import { GanttChart } from '@/components/bigap-dashboard/gantt-chart';
import { UsersMap, StagesMap, StatusFilter } from '@/lib/types';
import { getStageInfo } from '@/lib/bitrix-config';
import { AlertCircle, LayoutList, BarChart3 } from 'lucide-react';
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

interface TasksApiResponse {
  tasks: FormattedTask[];
  total: number;
  cached: boolean;
  error?: string;
}

interface UsersApiResponse {
  users: Record<number, { name: string; lastName: string; avatar: string }>;
  cached: boolean;
  error?: string;
}

type ViewMode = 'table' | 'gantt';

export default function DashboardPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Fetch tasks
  const {
    data: tasksData,
    isLoading: tasksLoading,
    refetch: refetchTasks,
    dataUpdatedAt,
    error: tasksError,
  } = useQuery<TasksApiResponse>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    },
  });

  // Derive responsible IDs from tasks
  const tasks = tasksData?.tasks ?? [];
  const responsibleIds = useMemo(
    () => [...new Set(tasks.map((t) => t.responsibleId).filter(Boolean))],
    [tasks]
  );

  const { data: usersData } = useQuery<UsersApiResponse>({
    queryKey: ['users', responsibleIds],
    queryFn: async () => {
      if (responsibleIds.length === 0) return { users: {}, cached: false };
      const response = await fetch(`/api/users?ids=${responsibleIds.join(',')}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: responsibleIds.length > 0,
  });

  // Build stages map from STAGE_MAP config
  const stagesMap: StagesMap = useMemo(() => {
    const map: StagesMap = {};

    for (const task of tasks) {
      const taskGroupId = String(task.groupId);
      const stageInfo = getStageInfo(taskGroupId, task.stageId);
      if (task.stageId && !map[task.stageId]) {
        if (stageInfo) {
          map[task.stageId] = { title: stageInfo.title, color: '#' + stageInfo.color };
        } else {
          map[task.stageId] = { title: task.stageId, color: '#6b7280' };
        }
      }
      // Handle stageId=0 or empty
      if ((!task.stageId || task.stageId === '0' || task.stageId === '') && !map['0']) {
        map['0'] = { title: 'Новые', color: '#a8afb3' };
      }
    }

    return map;
  }, [tasks]);

  // Derive users map
  const usersMap: UsersMap = useMemo(() => {
    const map: UsersMap = {};
    const users = usersData?.users;
    if (users) {
      for (const [id, user] of Object.entries(users)) {
        map[parseInt(id)] = user;
      }
    }
    return map;
  }, [usersData]);

  // Find selected task
  const selectedTask = selectedTaskId
    ? tasks.find((t) => t.id === selectedTaskId) ?? null
    : null;

  const handleRefresh = useCallback(() => {
    refetchTasks();
  }, [refetchTasks]);

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader
        totalTasks={tasks.length}
        lastUpdated={lastUpdated}
        isLoading={tasksLoading}
        onRefresh={handleRefresh}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error state */}
        {tasksError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Ошибка загрузки задач</p>
              <p className="text-xs text-red-600 mt-0.5">
                {tasksError instanceof Error ? tasksError.message : 'Не удалось подключиться к Bitrix24'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="ml-auto text-xs text-red-700 hover:text-red-800 font-medium"
            >
              Повторить
            </button>
          </div>
        )}

        {/* Tasks warning (using cache) */}
        {tasksData?.error && !tasksError && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">{tasksData.error}</p>
          </div>
        )}

        {/* View mode toggle */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
              viewMode === 'table'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Таблица
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
              viewMode === 'gantt'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            )}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            Шкала
          </button>
        </div>

        {/* Task content */}
        {viewMode === 'table' ? (
          <TaskTable
            tasks={tasks}
            usersMap={usersMap}
            stagesMap={stagesMap}
            statusFilter={statusFilter}
            isLoading={tasksLoading}
            onTaskClick={(id) => setSelectedTaskId(id)}
            onFilterChange={setStatusFilter}
          />
        ) : (
          <GanttChart
            tasks={tasks}
            usersMap={usersMap}
            stagesMap={stagesMap}
            onTaskClick={(id) => setSelectedTaskId(id)}
          />
        )}
      </main>

      {/* Task detail modal */}
      <TaskModal
        task={selectedTask}
        usersMap={usersMap}
        stagesMap={stagesMap}
        open={!!selectedTaskId}
        onOpenChange={(open) => {
          if (!open) setSelectedTaskId(null);
        }}
      />
    </div>
  );
}
