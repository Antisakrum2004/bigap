'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RefreshTimerProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
  className?: string;
}

export function RefreshTimer({ lastUpdated, isLoading, onRefresh, className }: RefreshTimerProps) {
  const [tick, setTick] = useState(0);
  const [justClicked, setJustClicked] = useState(false);
  const refreshStartRef = useRef(Date.now());
  const AUTO_REFRESH_SEC = 30 * 60; // 30 minutes

  // Reset the refresh start time when lastUpdated changes
  const prevLastUpdatedRef = useRef(lastUpdated);
  if (lastUpdated !== prevLastUpdatedRef.current) {
    prevLastUpdatedRef.current = lastUpdated;
    refreshStartRef.current = Date.now();
  }

  // Tick every second to update the countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = (Date.now() - refreshStartRef.current) / 1000;
  const remaining = Math.max(0, Math.floor(AUTO_REFRESH_SEC - elapsed));

  // Auto-refresh when countdown reaches 0
  const hasTriggeredRef = useRef(false);
  if (remaining <= 0 && !hasTriggeredRef.current && !isLoading) {
    hasTriggeredRef.current = true;
    setTimeout(() => {
      onRefresh();
    }, 0);
  }
  if (remaining > 0) {
    hasTriggeredRef.current = false;
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  void tick;

  const formatLastUpdated = () => {
    if (!lastUpdated) return '—';
    return lastUpdated.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleManualRefresh = useCallback(() => {
    refreshStartRef.current = Date.now();
    setJustClicked(true);
    onRefresh();
    // Reset click animation after 1s
    setTimeout(() => setJustClicked(false), 1000);
  }, [onRefresh]);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="text-xs text-gray-500 hidden sm:block">
        <span className="text-gray-400">Обновлено:</span>{' '}
        <span className="font-medium text-gray-600">{formatLastUpdated()}</span>
      </div>
      <div className="text-xs text-gray-400 hidden md:flex items-center gap-1">
        <RefreshCw className="h-3 w-3" />
        <span>через {minutes}:{seconds.toString().padStart(2, '0')}</span>
      </div>
      <button
        onClick={handleManualRefresh}
        disabled={isLoading}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-medium transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-1',
          justClicked
            ? 'bg-teal-100 text-teal-700 border-teal-300 scale-95'
            : isLoading
            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-wait'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 active:scale-95 cursor-pointer'
        )}
      >
        <RefreshCw className={cn(
          'h-3.5 w-3.5 transition-transform',
          isLoading && 'animate-spin'
        )} />
        <span className="hidden sm:inline">
          {isLoading ? 'Обновляю...' : 'Обновить'}
        </span>
      </button>
    </div>
  );
}
