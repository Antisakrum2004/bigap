'use client';

import { useMemo } from 'react';
import { UsersMap, StagesMap } from '@/lib/types';
import { StageBadge } from './stage-badge';
import { DeadlineBadge } from './deadline-badge';
import { CommentSentIndicator } from './comment-cell';

interface GanttTask {
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

interface GanttChartProps {
  tasks: GanttTask[];
  usersMap: UsersMap;
  stagesMap: StagesMap;
  onTaskClick: (taskId: string) => void;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes === 0) return '—';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}м`;
  if (mins === 0) return `${hours}ч`;
  return `${hours}ч ${mins}м`;
}

const STAGE_COLORS: Record<string, string> = {
  'Новые': '#a8afb3',
  'Оценка': '#f5d220',
  'Работа': '#2fc6f6',
  'Правки': '#ff5752',
  'Тест': '#9b51e0',
  'Релиз': '#ffa900',
  'Готово': '#8ec82f',
  'Пауза': '#754c24',
  'Оплата': '#14b033',
};

export function GanttChart({ tasks, usersMap, stagesMap, onTaskClick }: GanttChartProps) {
  // Calculate the date range for the Gantt chart
  const { startDate, endDate, days, tasksInRange } = useMemo(() => {
    const now = new Date();
    // Range: 14 days before today to 30 days after
    const start = new Date(now);
    start.setDate(start.getDate() - 14);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() + 30);
    end.setHours(23, 59, 59, 999);

    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    // Filter tasks that have dates in range
    const filtered = tasks
      .filter(t => t.realStatus !== 5) // exclude completed
      .sort((a, b) => {
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return dateA - dateB;
      });

    return { startDate: start, endDate: end, days: totalDays, tasksInRange: filtered };
  }, [tasks]);

  // Get day columns
  const dayColumns = useMemo(() => {
    const cols: { date: Date; label: string; isWeekend: boolean; isToday: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isToday = d.getTime() === today.getTime();
      const label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      cols.push({ date: d, label, isWeekend, isToday });
    }
    return cols;
  }, [startDate, days]);

  // Get position of a task bar
  function getBarPosition(task: GanttTask) {
    const taskStart = new Date(task.createdDate);
    taskStart.setHours(0, 0, 0, 0);
    const taskEnd = task.deadline
      ? new Date(task.deadline)
      : new Date(); // if no deadline, use today

    const totalMs = endDate.getTime() - startDate.getTime();
    const startOffset = Math.max(0, (taskStart.getTime() - startDate.getTime()) / totalMs * 100);
    const endOffset = Math.min(100, (taskEnd.getTime() - startDate.getTime()) / totalMs * 100);
    const width = Math.max(2, endOffset - startOffset);

    return { left: `${startOffset}%`, width: `${width}%` };
  }

  const stage = (taskId: string) => stagesMap[taskId];
  const user = (responsibleId: number) => usersMap[responsibleId];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header with dates */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Date row */}
          <div className="flex border-b border-gray-200 bg-gray-50/80">
            {/* Task info column */}
            <div className="w-64 shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
              Задача
            </div>
            {/* Timeline column */}
            <div className="flex-1 flex">
              {dayColumns.map((d, i) => (
                <div
                  key={i}
                  className={`flex-1 min-w-[28px] text-center py-1.5 text-[9px] ${
                    d.isToday
                      ? 'bg-teal-50 text-teal-700 font-bold'
                      : d.isWeekend
                      ? 'bg-gray-100 text-gray-400'
                      : 'text-gray-400'
                  }`}
                >
                  {i % 3 === 0 ? d.label : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          {tasksInRange.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">
              Нет задач для отображения
            </div>
          ) : (
            tasksInRange.map((task) => {
              const stageInfo = stage(task.stageId);
              const userInfo = user(task.responsibleId);
              const assigneeName = userInfo?.name || `#${task.responsibleId}`;
              const barPos = getBarPosition(task);
              const stageColor = stageInfo
                ? STAGE_COLORS[stageInfo.title] || '#6b7280'
                : '#6b7280';

              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.realStatus !== 5;

              return (
                <div
                  key={task.id}
                  className="flex items-center border-b border-gray-100 hover:bg-gray-50/50 cursor-pointer transition-colors"
                  onClick={() => onTaskClick(task.id)}
                >
                  {/* Task info */}
                  <div className="w-64 shrink-0 px-3 py-2 border-r border-gray-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] text-gray-400 font-mono">#{task.id}</span>
                      <CommentSentIndicator taskId={task.id} />
                    </div>
                    <div className="text-xs font-medium text-gray-900 line-clamp-1 mb-1">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500">{assigneeName}</span>
                      {task.durationFact > 0 && (
                        <span className="text-[10px] text-gray-400">{formatDuration(task.durationFact)}</span>
                      )}
                    </div>
                  </div>

                  {/* Gantt bar area */}
                  <div className="flex-1 relative py-3 px-1">
                    {/* Today line */}
                    {(() => {
                      const todayOffset = ((new Date().getTime() - startDate.getTime()) / (endDate.getTime() - startDate.getTime())) * 100;
                      if (todayOffset >= 0 && todayOffset <= 100) {
                        return (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-teal-400 z-10"
                            style={{ left: `${todayOffset}%` }}
                          />
                        );
                      }
                      return null;
                    })()}

                    {/* Task bar */}
                    <div
                      className="absolute h-6 rounded-full flex items-center px-2 group"
                      style={{
                        left: barPos.left,
                        width: barPos.width,
                        backgroundColor: isOverdue ? '#fef2f2' : `${stageColor}20`,
                        border: `1px solid ${isOverdue ? '#fca5a5' : `${stageColor}60`}`,
                      }}
                    >
                      <div
                        className="h-2 w-2 rounded-full shrink-0 mr-1"
                        style={{ backgroundColor: isOverdue ? '#ef4444' : stageColor }}
                      />
                      <span className="text-[9px] text-gray-600 truncate hidden group-hover:block">
                        {task.title}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
