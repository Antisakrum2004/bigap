'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CommentCellProps {
  taskId: string;
  className?: string;
}

export function CommentCell({ taskId, className }: CommentCellProps) {
  const [comment, setComment] = useState('');
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [comment, focused]);

  const handleSend = useCallback(async () => {
    if (!comment.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/task/${taskId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: comment.trim() }),
      });

      if (response.ok) {
        setSent(true);
        setComment('');
        setFocused(false);
        // Reset sent indicator after 30 seconds
        setTimeout(() => setSent(false), 30000);
      }
    } catch {
      // Silently fail
    } finally {
      setSending(false);
    }
  }, [comment, sending, taskId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Not focused, not sent — show subtle placeholder
  if (!focused && !sent) {
    return (
      <div className={cn('flex items-center gap-2 min-h-[24px]', className)}>
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Коммент."
          rows={1}
          className="w-full text-sm text-gray-700 bg-transparent border-0 outline-none resize-none placeholder:text-gray-300 cursor-pointer"
          style={{ height: '24px', overflow: 'hidden' }}
        />
      </div>
    );
  }

  // Sent — show green dot
  if (sent && !focused) {
    return (
      <div className={cn('flex items-center gap-2 min-h-[24px]', className)}>
        <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" title="Комментарий отправлен" />
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => { setComment(e.target.value); setSent(false); }}
          onFocus={() => setFocused(true)}
          placeholder="Коммент."
          rows={1}
          className="w-full text-sm text-gray-700 bg-transparent border-0 outline-none resize-none placeholder:text-gray-300 cursor-pointer"
          style={{ height: '24px', overflow: 'hidden' }}
        />
      </div>
    );
  }

  // Focused — expanded with send button
  return (
    <div className={cn('flex items-start gap-1.5 min-h-[24px]', className)}>
      <textarea
        ref={textareaRef}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onBlur={() => { if (!comment.trim()) setFocused(false); }}
        onKeyDown={handleKeyDown}
        placeholder="Написать комментарий..."
        rows={1}
        autoFocus
        className="flex-1 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none resize-none focus:border-teal-300 focus:ring-1 focus:ring-teal-200 min-w-0"
        style={{ overflow: 'hidden' }}
      />
      {comment.trim() && (
        <button
          onClick={handleSend}
          disabled={sending}
          className={cn(
            'shrink-0 mt-0.5 flex items-center justify-center h-6 w-6 rounded-full transition-colors',
            sending
              ? 'bg-gray-200 text-gray-400'
              : 'bg-teal-500 text-white hover:bg-teal-600'
          )}
          title="Отправить"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
