import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * POST /api/task/[id]/comment
 * Adds a comment to a Bitrix24 task from the Bigap dashboard.
 * Uses task.comment.add (new API — comments appear in the new task chat).
 *
 * IMPORTANT: The parameter name for the comment text is POST_MESSAGE,
 * NOT commentText. Using commentText causes ERROR_CORE #256.
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

    const commentText = comment.trim();

    console.log(`[comment] Posting comment to task ${id}, text: "${commentText.substring(0, 50)}", fileIds:`, fileIds);

    // Build the request body for task.comment.add
    const addParams: Record<string, unknown> = {
      taskId: id,
      POST_MESSAGE: commentText,
    };

    // Attach files directly in the comment using UF_FORUM_MESSAGE_DOC
    if (fileIds && fileIds.length > 0) {
      addParams.UF_FORUM_MESSAGE_DOC = fileIds.map((fid: number) => `n${fid}`);
    }

    // Use task.comment.add (new API — comments appear in the new task chat)
    let commentId: number | null = null;

    try {
      const addResult = await bitrixApi<{ result: number }>('task.comment.add', addParams);
      commentId = addResult.result;
      console.log(`[comment] Posted via task.comment.add, commentId=${commentId}`);
    } catch (e) {
      console.error('[comment] task.comment.add failed:', (e as Error).message);
    }

    // Fallback: try task.commentitem.add (older API — comments may not appear in new chat)
    if (!commentId) {
      try {
        const fallbackFields: Record<string, unknown> = {
          POST_MESSAGE: commentText,
        };

        if (fileIds && fileIds.length > 0) {
          fallbackFields.UF_FORUM_MESSAGE_DOC = fileIds.map((fid: number) => `n${fid}`);
        }

        const addResult2 = await bitrixApi<{ result: number }>('task.commentitem.add', {
          TASKID: id,
          FIELDS: fallbackFields,
        });
        commentId = addResult2.result;
        console.log(`[comment] Posted via task.commentitem.add fallback, commentId=${commentId}`);
      } catch (e2) {
        console.error('[comment] task.commentitem.add also failed:', (e2 as Error).message);
      }
    }

    if (!commentId) {
      return NextResponse.json(
        { error: 'Failed to post comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, commentId });
  } catch (error) {
    console.error('Failed to add comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment to Bitrix24 task' },
      { status: 500 }
    );
  }
}
