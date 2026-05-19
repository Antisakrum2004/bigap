import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * POST /api/task/[id]/comment
 * Adds a comment to a Bitrix24 task from the Bigap dashboard.
 *
 * Strategy:
 * - WITHOUT files: use task.comment.add (creates comment visible in both old + new chat)
 * - WITH files: use im.disk.file.commit (sends file+text to the IM chat with inline image)
 *   Then ALSO use task.comment.add for text-only comment (so it appears in old comment list too)
 *
 * IMPORTANT:
 * - task.comment.add requires BOTH commentText AND POST_MESSAGE parameters.
 *   Only commentText is stored/displayed; POST_MESSAGE is required but ignored.
 * - im.disk.file.commit sends files inline in the IM chat with message text.
 *   This is the ONLY method that makes images appear inline in the task chat.
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
    const { comment, fileIds, chatId } = body as {
      comment: string;
      responsibleId?: number;
      fileIds?: number[];
      chatId?: number;
    };

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return NextResponse.json(
        { error: 'Comment text is required' },
        { status: 400 }
      );
    }

    const commentText = comment.trim();
    const hasFiles = fileIds && fileIds.length > 0;

    console.log(`[comment] Posting comment to task ${id}, text: "${commentText.substring(0, 50)}", fileIds:`, fileIds, `chatId: ${chatId}`);

    let commentId: number | null = null;
    let imMessageId: number | null = null;

    // =============================================
    // PATH A: Comment WITH files → use IM API
    // =============================================
    if (hasFiles && chatId) {
      // Send each file via im.disk.file.commit (with message text for the first file only)
      let firstFile = true;
      for (const fid of fileIds!) {
        try {
          const messageText = firstFile ? commentText : '';
          firstFile = false;

          const commitResult = await bitrixApi<{
            result: { MESSAGE_ID?: number };
          }>('im.disk.file.commit', {
            chat_id: chatId,
            disk_id: fid,
            message: messageText,
          });

          const msgId = commitResult?.result?.MESSAGE_ID;
          if (msgId) {
            imMessageId = msgId;
            console.log(`[comment] File ${fid} committed to chat ${chatId}, MESSAGE_ID=${msgId}`);
          }
        } catch (e) {
          console.warn(`[comment] im.disk.file.commit failed for file ${fid}:`, (e as Error).message);
        }
      }

      if (imMessageId) {
        // Also post a plain text comment via task.comment.add so it appears in old comment list
        try {
          const addResult = await bitrixApi<{ result: number }>('task.comment.add', {
            taskId: id,
            commentText: commentText,
            POST_MESSAGE: commentText,
          });
          commentId = addResult.result;
          console.log(`[comment] Text comment also posted via task.comment.add, commentId=${commentId}`);
        } catch (e) {
          console.warn('[comment] task.comment.add (companion text) failed:', (e as Error).message);
        }

        return NextResponse.json({
          success: true,
          commentId,
          imMessageId,
          method: 'im.disk.file.commit',
        });
      }
    }

    // =============================================
    // PATH B: Text-only comment OR fallback → task.comment.add
    // =============================================
    try {
      const addResult = await bitrixApi<{ result: number }>('task.comment.add', {
        taskId: id,
        commentText: commentText,
        POST_MESSAGE: commentText,
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
            POST_MESSAGE: commentText,
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
