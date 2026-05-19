import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * GET /api/task/[id]/comments
 * Fetches comment history for a Bitrix24 task.
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
    const response = await bitrixApi<{
      result: unknown[];
    }>('task.commentitem.getlist', {
      TASKID: id,
      order: { POST_DATE: 'ASC' },
    });

    const rawComments = response.result;
    if (!Array.isArray(rawComments)) {
      return NextResponse.json({ comments: [] });
    }

    const comments = rawComments.map((c: unknown) => {
      const comment = c as Record<string, unknown>;
      return {
        id: String(comment.ID || ''),
        authorId: parseInt(String(comment.AUTHOR_ID || '0')),
        authorName: String(comment.AUTHOR_NAME || ''),
        authorAvatar: String(comment.AUTHOR_AVATAR || ''),
        text: String(comment.POST_MESSAGE || ''),
        date: String(comment.POST_DATE || ''),
        isDashboard: String(comment.POST_MESSAGE || '').includes('дашборда БИГАП') || String(comment.POST_MESSAGE || '').includes('дашборда БИГАП'),
      };
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments', comments: [] },
      { status: 500 }
    );
  }
}
