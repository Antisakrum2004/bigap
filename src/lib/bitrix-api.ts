import { BITRIX_CONFIG } from './bitrix-config';

interface BitrixApiParams {
  [key: string]: unknown;
}

/**
 * Server-side helper for making requests to the Bitrix24 REST API.
 * ALL requests MUST be POST with JSON body - GET returns stale data!
 */
export async function bitrixApi<T = unknown>(
  method: string,
  params: BitrixApiParams = {}
): Promise<T> {
  const url = `${BITRIX_CONFIG.webhookUrl}${method}.json`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Bitrix24 API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Bitrix24 API error: ${data.error} - ${data.error_description || ''}`);
  }

  return data as T;
}

/**
 * Fetch all tasks with pagination support
 */
export async function fetchAllTasks(
  groupId?: number,
  filters: BitrixApiParams = {}
): Promise<{ tasks: unknown[]; total: number }> {
  const allTasks: unknown[] = [];
  let start = 0;
  let total = 0;
  const pageSize = 50;

  const groupFilter = groupId || BITRIX_CONFIG.projectId;

  do {
    const response = await bitrixApi<{
      result: { tasks: unknown[] };
      total: number;
      next?: number;
    }>('tasks.task.list', {
      filter: {
        GROUP_ID: groupFilter,
        ...filters,
      },
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
      order: { DEADLINE: 'asc', ID: 'desc' },
    });

    const tasks = response.result?.tasks || [];
    allTasks.push(...tasks);
    total = response.total || 0;
    start += pageSize;

    // If we've fetched all tasks, break
    if (allTasks.length >= total || tasks.length < pageSize) {
      break;
    }
  } while (start < total);

  return { tasks: allTasks, total };
}

/**
 * Fetch a single task by ID
 */
export async function fetchTaskById(
  taskId: string
): Promise<unknown | null> {
  const response = await bitrixApi<{
    result: { tasks: unknown[] };
  }>('tasks.task.list', {
    filter: { ID: taskId },
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
  });

  const tasks = response.result?.tasks || [];
  return tasks.length > 0 ? tasks[0] : null;
}

/**
 * Fetch users by IDs
 */
export async function fetchUsers(userIds: number[]): Promise<Record<number, {
  name: string;
  lastName: string;
  avatar: string;
}>> {
  const usersMap: Record<number, { name: string; lastName: string; avatar: string }> = {};

  // Process in batches of 50 (Bitrix24 batch limit)
  for (let i = 0; i < userIds.length; i += 50) {
    const batch = userIds.slice(i, i + 50);

    try {
      const response = await bitrixApi<{
        result: Record<string, unknown>;
      }>('user.get', {
        ID: batch,
      });

      const users = response.result as unknown;
      if (Array.isArray(users)) {
        for (const user of users) {
          const u = user as Record<string, unknown>;
          const id = parseInt(String(u.ID));
          usersMap[id] = {
            name: String(u.NAME || ''),
            lastName: String(u.LAST_NAME || ''),
            avatar: String(u.PERSONAL_PHOTO || u.AVATAR || ''),
          };
        }
      }
    } catch {
      // Silently fail for user fetching - we'll show IDs instead
      console.error('Failed to fetch users batch');
    }
  }

  return usersMap;
}

/**
 * Fetch stages for a workgroup
 */
export async function fetchStages(
  groupId?: number
): Promise<Record<string, { title: string; color: string }>> {
  const stagesMap: Record<string, { title: string; color: string }> = {};

  try {
    const response = await bitrixApi<{
      result: unknown[];
    }>('task.stages.get', {
      groupId: groupId || BITRIX_CONFIG.projectId,
    });

    const stages = response.result;
    if (Array.isArray(stages)) {
      for (const stage of stages) {
        const s = stage as Record<string, unknown>;
        const id = String(s.ID || s.id || '');
        stagesMap[id] = {
          title: String(s.TITLE || s.title || id),
          color: String(s.COLOR || s.color || '#6b7280'),
        };
      }
    }
  } catch {
    // Stages API might not be available - return empty map
    console.error('Failed to fetch stages, will use stageId as-is');
  }

  return stagesMap;
}
