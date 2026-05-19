import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * POST /api/task/[id]/comment
 * Adds a comment to a Bitrix24 task from the Bigap dashboard.
 * Sends ONLY the user's plain text — no prefixes, no markers, no attachment notes.
 * Files are attached via UF_FORUM_MESSAGE_DOC (separate from comment text).
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

    // Send ONLY the user's text — no prefix, no markers, no attachment notes
    const commentText = comment.trim();

    console.log(`[comment] Posting comment to task ${id}, text: "${commentText.substring(0, 50)}", fileIds:`, fileIds);

    // Step 1: Add comment via task.comment.add (newer API — comments appear in the new task chat)
    let commentId: number | null = null;

    try {
      const addResult = await bitrixApi<{ result: number }>('task.comment.add', {
        taskId: id,
        commentText: commentText,
      });
      commentId = addResult.result;
      console.log(`[comment] Posted via task.comment.add, commentId=${commentId}`);
    } catch (e) {
      console.warn('[comment] task.comment.add failed:', (e as Error).message);
    }

    // Fallback: try task.commentitem.add (older API)
    if (!commentId) {
      try {
        const commentFields: Record<string, unknown> = {
          POST_MESSAGE: commentText,
        };

        if (fileIds && fileIds.length > 0) {
          commentFields.UF_FORUM_MESSAGE_DOC = fileIds.map((fid: number) => `n${fid}`);
        }

        const addResult2 = await bitrixApi<{ result: number }>('task.commentitem.add', {
          TASKID: id,
          FIELDS: commentFields,
        });
        commentId = addResult2.result;
        console.log(`[comment] Posted via task.commentitem.add, commentId=${commentId}`);
      } catch (e2) {
        console.warn('[comment] task.commentitem.add also failed:', (e2 as Error).message);
      }
    }

    if (!commentId) {
      return NextResponse.json(
        { error: 'Failed to post comment' },
        { status: 500 }
      );
    }

    // Step 2: If we have files and used task.comment.add, add UF_FORUM_MESSAGE_DOC
    // via task.commentitem.update to link the files to the comment as attachments
    if (fileIds && fileIds.length > 0 && commentId) {
      try {
        await bitrixApi('task.commentitem.update', {
          TASKID: id,
          ITEMID: commentId,
          FIELDS: {
            UF_FORUM_MESSAGE_DOC: fileIds.map((fid: number) => `n${fid}`),
          },
        });
        console.log(`[comment] Added UF_FORUM_MESSAGE_DOC to comment ${commentId}`);
      } catch (e) {
        console.warn(`[comment] Failed to add UF_FORUM_MESSAGE_DOC:`, (e as Error).message);
      }
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
