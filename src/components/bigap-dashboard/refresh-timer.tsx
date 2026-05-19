'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BITRIX_CONFIG } from '@/lib/bitrix-config';

interface RefreshTimerProps {
  lastUpdated: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
  className?: string;
}

export function RefreshTimer({ lastUpdated, isLoading, onRefresh, className }: RefreshTimerProps) {
  const [tick, setTick] = useState(0);
  const refreshStartRef = useRef(Date.now());

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

  const refreshIntervalSec = BITRIX_CONFIG.refreshInterval / 1000;
  const elapsed = (Date.now() - refreshStartRef.current) / 1000;
  const remaining = Math.max(0, Math.floor(refreshIntervalSec - elapsed));

  // Auto-refresh when countdown reaches 0
  const hasTriggeredRef = useRef(false);
  if (remaining <= 0 && !hasTriggeredRef.current && !isLoading) {
    hasTriggeredRef.current = true;
    // Use setTimeout to avoid calling during render
    setTimeout(() => {
      onRefresh();
    }, 0);
  }
  if (remaining > 0) {
    hasTriggeredRef.current = false;
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  // Suppress the unused tick warning
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
    onRefresh();
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
      <Button
        variant="outline"
        size="sm"
        onClick={handleManualRefresh}
        disabled={isLoading}
        className="h-8 gap-1.5 text-xs"
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
        <span className="hidden sm:inline">Обновить</span>
      </Button>
    </div>
  );
}
