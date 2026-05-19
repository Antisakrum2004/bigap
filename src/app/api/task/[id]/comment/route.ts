import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * POST /api/task/[id]/comment
 * Adds a comment to a Bitrix24 task from the Bigap dashboard.
 * Includes @mentions of the responsible person and user 116.
 * Optionally attaches uploaded file IDs.
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
    const { comment, responsibleId, fileIds } = body as {
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

    // Build mentions: @mention responsible + user 116
    const mentions: string[] = [];

    // Mention the responsible person
    if (responsibleId && responsibleId > 0) {
      mentions.push(`[USER=${responsibleId}]Исполнитель[/USER]`);
    }

    // Always mention user 116 (the dashboard owner)
    mentions.push(`[USER=116]Постановщик[/USER]`);

    const mentionStr = mentions.join(' ');

    // Build comment with marker + mentions
    let commentText = `[B]📌 Комментарий из дашборда БИГАП:[/B] ${mentionStr}\n${comment.trim()}`;

    // If there are uploaded file IDs, attach them to the task first
    if (fileIds && fileIds.length > 0) {
      try {
        const nIds = fileIds.map((fid: number) => `n${fid}`);
        await bitrixApi('tasks.task.update', {
          taskId: id,
          fields: {
            UF_TASK_WEBDAV_FILES: nIds,
          },
        });
      } catch (attachErr) {
        console.error('Failed to attach files to task, trying one by one:', attachErr);
        // Fallback: attach one by one
        if (fileIds && fileIds.length > 0) {
          for (const fid of fileIds) {
            try {
              await bitrixApi('tasks.task.update', {
                taskId: id,
                fields: {
                  UF_TASK_WEBDAV_FILES: [`n${fid}`],
                },
              });
            } catch (e2) {
              console.error(`Failed to attach file n${fid}:`, e2);
            }
          }
        }
      }
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
