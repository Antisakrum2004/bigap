'use client';

import { Button } from '@/components/ui/button';
import { RefreshTimer } from './refresh-timer';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import Image from 'next/image';

interface DashboardHeaderProps {
  totalTasks: number;
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({
  totalTasks,
  lastUpdated,
  isLoading,
  onRefresh,
}: DashboardHeaderProps) {
  const today = format(new Date(), 'd MMMM yyyy', { locale: ru });

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <Image
              src="/logo.png"
              alt="БИГАП"
              width={112}
              height={54}
              className="h-9 w-auto object-contain"
              priority
            />
          </div>

          {/* Center: Stats summary */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Всего в работе:</span>
              <span className="inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full text-xs font-bold bg-teal-100 text-teal-700">
                {totalTasks}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-400">
              <span className="text-gray-300">|</span>
              <span>{today}</span>
            </div>
          </div>

          {/* Right: Refresh controls */}
          <RefreshTimer
            lastUpdated={lastUpdated}
            isLoading={isLoading}
            onRefresh={onRefresh}
            className="shrink-0"
          />
        </div>
      </div>
    </header>
  );
}
