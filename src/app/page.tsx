'use client';

import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardHeader } from '@/components/bigap-dashboard/dashboard-header';
import { TaskTable } from '@/components/bigap-dashboard/task-table';
import { TaskModal } from '@/components/bigap-dashboard/task-modal';
import { UsersMap, StagesMap } from '@/lib/types';
import { getStatusType } from '@/components/bigap-dashboard/status-dot';
import { getStageInfo } from '@/lib/bitrix-config';
import { AlertCircle } from 'lucide-react';

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

export default function DashboardPage() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

  // Compute task counts for filters
  const taskCounts = useMemo(() => {
    const counts = {
      all: 0,
      in_progress: 0,
      overdue: 0,
      review: 0,
      completed: 0,
    };

    for (const task of tasks) {
      counts.all++;
      const statusType = getStatusType(task.deadline, task.realStatus);
      if (task.realStatus === 3 && statusType !== 'overdue') counts.in_progress++;
      if (statusType === 'overdue') counts.overdue++;
      if (task.realStatus === 4) counts.review++;
      if (task.realStatus === 5) counts.completed++;
    }

    return counts;
  }, [tasks]);

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
        totalTasks={taskCounts.all}
        inProgressCount={taskCounts.in_progress}
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



        {/* Task table */}
        <TaskTable
          tasks={tasks}
          usersMap={usersMap}
          stagesMap={stagesMap}
          statusFilter="all"
          isLoading={tasksLoading}
          onTaskClick={(id) => setSelectedTaskId(id)}
        />
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
