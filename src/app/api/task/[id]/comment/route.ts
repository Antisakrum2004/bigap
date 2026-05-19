import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * POST /api/task/[id]/comment
 * Adds a comment to a Bitrix24 task from the Bigap dashboard.
 * Optionally includes uploaded disk file references inline in the comment.
 */
export async function POST(
  request: NextRequest,
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
    const body = await request.json();
    const { comment, fileIds } = body as {
      comment: string;
      responsibleId?: number;
      fileIds?: number[];
    };

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    // Build comment with marker
    let commentText = `[B]📌 Комментарий из дашборда БИГАП:[/B]\n${comment.trim()}`;

    // If there are uploaded file IDs, embed them inline in the comment
    // so they appear in the task chat, not just in the task attachments
    if (fileIds && fileIds.length > 0) {
      const fileTags = fileIds.map((fid: number) => `[DISK FILE ID=n${fid}]`).join('\n');
      commentText += `\n${fileTags}`;
    }

    // Add comment to the task
    await bitrixApi('task.commentitem.add', {
      TASKID: id,
      FIELDS: {
        POST_MESSAGE: commentText,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment to Bitrix24 task' },
      { status: 500 }
    );
  }
}
