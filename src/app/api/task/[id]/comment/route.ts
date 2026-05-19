import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * POST /api/task/[id]/comment
 * Adds a comment to a Bitrix24 task from the Bigap dashboard.
 * Optionally includes uploaded disk file references inline in the comment.
 * Files are already attached to the task via UF_TASK_WEBDAV_FILES during upload.
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
      diskObjectIds?: number[];
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
    // The files are already attached to the task via UF_TASK_WEBDAV_FILES
    // so [DISK FILE ID=nXXX] should render properly
    if (fileIds && fileIds.length > 0) {
      const fileTags = fileIds.map((fid: number) => `[DISK FILE ID=n${fid}]`).join('\n');
      commentText += `\n${fileTags}`;
    }

    console.log(`[comment] Posting comment to task ${id}, fileIds:`, fileIds);

    // Add comment to the task using the older API
    // Also pass UF_FORUM_MESSAGE_DOC for file attachments
    const commentFields: Record<string, unknown> = {
      POST_MESSAGE: commentText,
    };

    // If we have file IDs, also pass them as UF_FORUM_MESSAGE_DOC
    if (fileIds && fileIds.length > 0) {
      commentFields.UF_FORUM_MESSAGE_DOC = fileIds.map((fid: number) => `n${fid}`);
    }

    await bitrixApi('task.commentitem.add', {
      TASKID: id,
      FIELDS: commentFields,
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
