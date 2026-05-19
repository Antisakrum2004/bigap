import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * POST /api/task/[id]/comment
 * Adds a comment to a Bitrix24 task from the Bigap dashboard.
 * Uses task.comment.add (new API — comments appear in the new task chat).
 *
 * IMPORTANT:
 * - The parameter for comment text is POST_MESSAGE (not commentText).
 * - Files are embedded via [DISK FILE ID=nX] BBCode tags inside POST_MESSAGE.
 *   This is the ONLY method that makes images appear inline in the chat.
 *   UF_FORUM_MESSAGE_DOC does NOT render images inline.
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
    const hasFiles = fileIds && fileIds.length > 0;

    console.log(`[comment] Posting comment to task ${id}, text: "${commentText.substring(0, 50)}", fileIds:`, fileIds);

    // Attach files to the task first (required for [DISK FILE ID] to work)
    if (hasFiles) {
      for (const fid of fileIds!) {
        try {
          await bitrixApi('tasks.task.files.attach', {
            taskId: parseInt(id),
            fileId: fid,
          });
          console.log(`[comment] Attached file ${fid} to task ${id}`);
        } catch (e) {
          console.warn(`[comment] tasks.task.files.attach failed for file ${fid}:`, (e as Error).message);
          // Non-fatal — the file is still on disk, just not formally attached
        }
      }
    }

    // Build the POST_MESSAGE with [DISK FILE ID=nX] tags for inline images
    let postMessage = commentText;
    if (hasFiles) {
      const diskTags = fileIds!.map((fid: number) => `[DISK FILE ID=n${fid}]`).join('\n');
      postMessage = `${commentText}\n${diskTags}`;
    }

    // Post comment via task.comment.add (new API — comments appear in the new task chat)
    let commentId: number | null = null;

    try {
      const addResult = await bitrixApi<{ result: number }>('task.comment.add', {
        taskId: id,
        POST_MESSAGE: postMessage,
      });
      commentId = addResult.result;
      console.log(`[comment] Posted via task.comment.add, commentId=${commentId}`);
    } catch (e) {
      console.error('[comment] task.comment.add failed:', (e as Error).message);
    }

    // Fallback: try task.commentitem.add (older API)
    if (!commentId) {
      try {
        const addResult2 = await bitrixApi<{ result: number }>('task.commentitem.add', {
          TASKID: id,
          FIELDS: {
            POST_MESSAGE: postMessage,
          },
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
