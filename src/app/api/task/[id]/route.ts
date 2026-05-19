import { NextRequest, NextResponse } from 'next/server';
import { fetchTaskById } from '@/lib/bitrix-api';

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
 * GET /api/task/[id]
 * Fetches a single task detail by ID from Bitrix24.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: 'Task ID is required' },
      { status: 400 }
    );
  }

  try {
    const rawTask = await fetchTaskById(id);

    if (!rawTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = rawTask as RawTask;

    // Normalize tags
    let normalizedTags: string[] = [];
    if (task.tags) {
      if (Array.isArray(task.tags)) {
        normalizedTags = task.tags.map(String);
      } else if (typeof task.tags === 'string') {
        normalizedTags = [task.tags];
      }
    }

    const formattedTask: FormattedTask = {
      id: String(task.id),
      title: task.title || '',
      status: task.status || task.realStatus || 1,
      realStatus: task.realStatus || task.status || 1,
      stageId: String(task.stageId || ''),
      groupId: task.groupId || 0,
      createdDate: task.createdDate || '',
      closedDate: task.closedDate || null,
      responsibleId: task.responsibleId || 0,
      deadline: task.deadline || null,
      description: task.description || '',
      priority: task.priority || 1,
      durationFact: task.durationFact || 0,
      tags: normalizedTags,
    };

    return NextResponse.json({ task: formattedTask });
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task from Bitrix24' },
      { status: 500 }
    );
  }
}
