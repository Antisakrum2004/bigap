import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * GET /api/task/[id]/comments?chatId=7662
 * Fetches comment history for a Bitrix24 task.
 * Combines data from BOTH:
 *   1. task.commentitem.getlist (old forum comments — text only)
 *   2. im.dialog.messages.get (new IM chat — includes inline images)
 *
 * The chatId parameter is required for IM messages.
 */
export async function GET(
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

  const chatId = request.nextUrl.searchParams.get('chatId');

  try {
    // Fetch from old API (forum comments)
    const forumComments = await fetchForumComments(id);

    // Fetch from IM chat if chatId provided
    let imMessages: CommentItem[] = [];
    if (chatId) {
      imMessages = await fetchImMessages(parseInt(chatId));
    }

    // Merge and deduplicate by date+text proximity
    // IM messages take priority (they have file info)
    const merged = mergeComments(forumComments, imMessages);

    return NextResponse.json({ comments: merged });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments', comments: [] },
      { status: 500 }
    );
  }
}

interface CommentItem {
  id: string;
  authorId: number;
  authorName: string;
  authorAvatar: string;
  text: string;
  date: string;
  isDashboard: boolean;
  hasFiles?: boolean;
  source?: 'forum' | 'im';
}

async function fetchForumComments(taskId: string): Promise<CommentItem[]> {
  try {
    const response = await bitrixApi<{
      result: unknown[];
    }>('task.commentitem.getlist', {
      TASKID: taskId,
      ORDER: { ID: 'ASC' },
    });

    const rawComments = response.result;
    if (!Array.isArray(rawComments)) return [];

    return rawComments.map((c: unknown) => {
      const comment = c as Record<string, unknown>;
      const messageText = String(comment.POST_MESSAGE || '');
      return {
        id: `forum-${comment.ID || ''}`,
        authorId: parseInt(String(comment.AUTHOR_ID || '0')),
        authorName: String(comment.AUTHOR_NAME || ''),
        authorAvatar: String(comment.AUTHOR_AVATAR || ''),
        text: messageText,
        date: String(comment.POST_DATE || ''),
        isDashboard: false,
        source: 'forum' as const,
      };
    });
  } catch {
    return [];
  }
}

async function fetchImMessages(chatId: number): Promise<CommentItem[]> {
  try {
    const response = await bitrixApi<{
      result: {
        messages: Array<Record<string, unknown>>;
      };
    }>('im.dialog.messages.get', {
      DIALOG_ID: `chat${chatId}`,
      LIMIT: 50,
    });

    const messages = response?.result?.messages;
    if (!Array.isArray(messages)) return [];

    return messages
      .filter((m: Record<string, unknown>) => {
        // Filter out system messages (author_id=0 means system)
        const authorId = parseInt(String(m.author_id || m.authorId || '0'));
        return authorId > 0;
      })
      .map((m: Record<string, unknown>) => {
        const text = String(m.text || '');
        const params = m.params as Record<string, unknown> | undefined;
        const hasFiles = !!(params?.FILE_ID);

        return {
          id: `im-${m.id || ''}`,
          authorId: parseInt(String(m.author_id || m.authorId || '0')),
          authorName: '',  // IM API doesn't return name in messages
          authorAvatar: '',
          text,
          date: String(m.date || ''),
          isDashboard: false,
          hasFiles,
          source: 'im' as const,
        };
      });
  } catch {
    return [];
  }
}

function mergeComments(forum: CommentItem[], im: CommentItem[]): CommentItem[] {
  // Use a Map to deduplicate by text+date proximity
  const merged = new Map<string, CommentItem>();

  // Add forum comments first
  for (const c of forum) {
    merged.set(c.id, c);
  }

  // Add IM comments (they have file info that forum comments don't)
  for (const c of im) {
    // Check if there's already a forum comment with similar text at similar time
    const isDuplicate = forum.some(fc => {
      if (fc.text === c.text) return true;
      // Check if one text contains the other (im messages may include [DISK FILE ID] that forum strips)
      const fcClean = fc.text.replace(/\[DISK FILE ID=[^\]]*\]/gi, '').trim();
      const cClean = c.text.replace(/\[DISK FILE ID=[^\]]*\]/gi, '').trim();
      if (fcClean && cClean && (fcClean.includes(cClean) || cClean.includes(fcClean))) return true;
      return false;
    });

    if (!isDuplicate) {
      merged.set(c.id, c);
    }
  }

  // Sort by date
  const result = Array.from(merged.values());
  result.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateA - dateB;
  });

  return result;
}
