import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';
import { BITRIX_CONFIG } from '@/lib/bitrix-config';

// In-memory cache
let cachedTasks: unknown[] | null = null;
let cachedTotal = 0;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface RawTask {
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
  tags?: string[] | string;
  ufCrmTask?: unknown[];
  ufTaskWebdavFiles?: unknown[];
}

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

/**
 * GET /api/tasks?groupId=6&refresh=true
 * Fetches tasks from Bitrix24 for the specified project group.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const groupId = parseInt(searchParams.get('groupId') || String(BITRIX_CONFIG.projectId));
  const refresh = searchParams.get('refresh') === 'true';
  const statusFilter = searchParams.get('status') || 'active';

  // Check cache
  if (!refresh && cachedTasks && Date.now() - cacheTimestamp < CACHE_TTL) {
    return NextResponse.json({
      tasks: cachedTasks,
      total: cachedTotal,
      cached: true,
    });
  }

  try {
    // Build filter based on status
    const filter: Record<string, unknown> = {
      GROUP_ID: groupId,
    };

    if (statusFilter === 'active') {
      // Active tasks: not completed, not deferred, not declined
      filter['!REAL_STATUS'] = [5, 6, 7];
    } else if (statusFilter === 'completed') {
      filter['REAL_STATUS'] = [5];
    } else if (statusFilter === 'in_progress') {
      filter['REAL_STATUS'] = [3, 4];
    } else if (statusFilter === 'all') {
      // No status filter
    }

    // Fetch all tasks with pagination
    const allTasks: FormattedTask[] = [];
    let start = 0;
    let total = 0;
    const pageSize = 50;

    do {
      const response = await bitrixApi<{
        result: { tasks: RawTask[] };
        total: number;
        next?: number;
      }>('tasks.task.list', {
        filter,
        select: [
          'ID',
          'TITLE',
          'STATUS',
          'REAL_STATUS',
          'STAGE_ID',
          'GROUP_ID',
          'CREATED_DATE',
          'CLOSED_DATE',
          'RESPONSIBLE_ID',
          'DEADLINE',
          'DESCRIPTION',
          'PRIORITY',
          'DURATION_FACT',
          'TAGS',
        ],
        start,
        order: { DEADLINE: 'desc', ID: 'desc' },
      });

      const tasks = response.result?.tasks || [];
      
      for (const task of tasks) {
        // Normalize tags - could be string or array
        let normalizedTags: string[] = [];
        if (task.tags) {
          if (Array.isArray(task.tags)) {
            normalizedTags = task.tags.map(String);
          } else if (typeof task.tags === 'string') {
            normalizedTags = [task.tags];
          }
        }

        allTasks.push({
          id: String(task.id),
          title: task.title || '',
          status: task.status || task.realStatus || 1,
          realStatus: task.realStatus || task.status || 1,
          stageId: String(task.stageId || ''),
          groupId: task.groupId || groupId,
          createdDate: task.createdDate || '',
          closedDate: task.closedDate || null,
          responsibleId: task.responsibleId || 0,
          deadline: task.deadline || null,
          description: task.description || '',
          priority: task.priority || 1,
          durationFact: task.durationFact || 0,
          tags: normalizedTags,
        });
      }

      total = response.total || 0;
      start += pageSize;

      if (allTasks.length >= total || tasks.length < pageSize) {
        break;
      }
    } while (start < total && start < 500); // Safety limit

    // Update cache
    cachedTasks = allTasks;
    cachedTotal = total;
    cacheTimestamp = Date.now();

    return NextResponse.json({
      tasks: allTasks,
      total,
      cached: false,
    });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    
    // Return cached data if available, even if stale
    if (cachedTasks) {
      return NextResponse.json({
        tasks: cachedTasks,
        total: cachedTotal,
        cached: true,
        error: 'Using cached data - API request failed',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch tasks from Bitrix24', tasks: [], total: 0 },
      { status: 500 }
    );
  }
}
