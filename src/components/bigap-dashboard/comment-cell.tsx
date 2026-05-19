'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Check, Image as ImageIcon, X, Paperclip } from 'lucide-react';

interface CommentItem {
  id: string;
  authorId: number;
  authorName: string;
  authorAvatar: string;
  text: string;
  date: string;
  isDashboard: boolean;
}

interface CommentCellProps {
  taskId: string;
  responsibleId?: number;
  className?: string;
  expanded?: boolean;
  onCommentSent?: () => void;
}

function formatCommentDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (diffHours < 24) return `${diffHours} ч. назад`;
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

function formatCommentFullDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Сегодня, ${time}`;
    if (isYesterday) return `Вчера, ${time}`;
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) + `, ${time}`;
  } catch {
    return dateStr;
  }
}

function stripBbCode(text: string): string {
  return text
    // Remove old dashboard marker prefix (legacy comments)
    .replace(/^\s*📌\s*Комментарий из дашборда БИГАП:\s*\n?/gi, '')
    .replace(/^\s*Комментарий из дашборда БИГАП:\s*\n?/gi, '')
    // Remove attachment notes (legacy)
    .replace(/\n?📎\s*\d+\s*(вложение|вложения|вложений)/gi, '')
    .replace(/\n?📎\s*Вложение/gi, '')
    // Remove BBCode tags
    .replace(/\[B\](.*?)\[\/B\]/gi, '$1')
    .replace(/\[USER=\d+\](.*?)\[\/USER\]/gi, '@$1')
    .replace(/\[URL=?([^\]]*)\](.*?)\[\/URL\]/gi, '$2')
    .replace(/\[IMG\](.*?)\[\/IMG\]/gi, '📎 Изображение')
    .replace(/\[DISK FILE ID=[^\]]*\]/gi, '📎')
    .replace(/\[(\/?)(?:b|i|u|s|code|quote|list|[\*]|color[^\]]*|size[^\]]*|font[^\]]*|url[^\]]*|img|video|audio|user[^\]]*|br|disk file[^\]]*)\]/gi, '')
    // Convert Bitrix24 emoji shortcodes like :f09f938c: to actual emoji
    .replace(/:[a-f0-9]{6,12}:/gi, (match) => {
      try {
        const hex = match.slice(1, -1);
        const codePoint = parseInt(hex, 16);
        if (codePoint > 0 && codePoint < 0x10FFFF) {
          return String.fromCodePoint(codePoint);
        }
      } catch {}
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function CommentCell({ taskId, responsibleId, className, expanded = false, onCommentSent }: CommentCellProps) {
  const [comment, setComment] = useState('');
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fetchAbortRef = useRef<boolean>(false);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [comment, focused]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (fetchAbortRef.current) return;
    setLoadingComments(true);
    try {
      const response = await fetch(`/api/task/${taskId}/comments`);
      if (response.ok && !fetchAbortRef.current) {
        const data = await response.json();
        setComments(data.comments || []);
        setCommentsLoaded(true);
      }
    } catch {
      // silently fail
    } finally {
      if (!fetchAbortRef.current) {
        setLoadingComments(false);
      }
    }
  }, [taskId]);

  // When showing expanded mode, fetch comments
  useEffect(() => {
    if (expanded && !commentsLoaded) {
      fetchComments();
    }
    return () => {
      fetchAbortRef.current = true;
    };
  }, [expanded, commentsLoaded, fetchComments]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.filter(
      (f) => !selectedFiles.find((s) => s.name === f.name && s.size === f.size)
    );
    setSelectedFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((f) => {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setFilePreviews((prev) => [...prev, ev.target?.result as string || '']);
        };
        reader.readAsDataURL(f);
      }
    });

    if (!focused) setFocused(true);
  }, [selectedFiles, focused]);

  // Handle paste (images)
  useEffect(() => {
    if (!focused) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const ext = blob.type.split('/')[1] || 'png';
            const file = new File([blob], `clipboard-${Date.now()}.${ext}`, { type: blob.type });
            imageFiles.push(file);
          }
        }
      }
      if (imageFiles.length) {
        setSelectedFiles((prev) => [...prev, ...imageFiles]);
        imageFiles.forEach((f) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            setFilePreviews((prev) => [...prev, ev.target?.result as string || '']);
          };
          reader.readAsDataURL(f);
        });
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [focused]);

  // Remove a selected file
  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Upload files to Bitrix24 and return disk IDs
  const uploadFiles = useCallback(async (): Promise<number[]> => {
    if (selectedFiles.length === 0) return [];
    setUploadingFiles(true);
    const diskIds: number[] = [];

    for (const file of selectedFiles) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('taskId', taskId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: fd,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.diskId) {
            diskIds.push(data.diskId);
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          console.error('Upload failed:', errData.error || response.status);
        }
      } catch (err) {
        console.error('Failed to upload file:', file.name, err);
      }
    }

    setUploadingFiles(false);
    return diskIds;
  }, [selectedFiles, taskId]);

  const handleSend = useCallback(async () => {
    if ((!comment.trim() && selectedFiles.length === 0) || sending) return;

    setSending(true);

    // Optimistic update: immediately add the comment to local state
    const optimisticComment: CommentItem = {
      id: `temp-${Date.now()}`,
      authorId: 0,
      authorName: '',
      authorAvatar: '',
      text: comment.trim() || (selectedFiles.length > 0 ? '📎 Изображение' : ''),
      date: new Date().toISOString(),
      isDashboard: true,
    };

    if (expanded) {
      setComments(prev => [...prev, optimisticComment]);
    }

    try {
      // Upload files first if any
      const fileIds = await uploadFiles();
      const hasFiles = fileIds.length > 0;

      // Always send the actual comment text. If only files (no text), send a dot.
      const commentToSend = comment.trim() || (hasFiles ? '.' : '');

      const response = await fetch(`/api/task/${taskId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: commentToSend,
          responsibleId,
          fileIds: hasFiles ? fileIds : undefined,
        }),
      });

      if (response.ok) {
        setSent(true);
        setComment('');
        setSelectedFiles([]);
        setFilePreviews([]);
        try {
          localStorage.setItem(`bigap-comment-sent-${taskId}`, String(Date.now()));
        } catch {}
        if (!expanded) setFocused(false);
        // Refresh comments from server to replace optimistic comment with real data
        setCommentsLoaded(false);
        setTimeout(() => fetchComments(), 1000);
        onCommentSent?.();
        setTimeout(() => setSent(false), 60000);
      } else {
        // On failure, remove optimistic comment
        if (expanded) {
          setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
        }
      }
    } catch {
      // On failure, remove optimistic comment
      if (expanded) {
        setComments(prev => prev.filter(c => c.id !== optimisticComment.id));
      }
    } finally {
      setSending(false);
    }
  }, [comment, sending, taskId, responsibleId, uploadFiles, fetchComments, selectedFiles, expanded, onCommentSent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ═══════════════════════════════════════
  // EXPANDED MODE (inside modal)
  // ═══════════════════════════════════════
  if (expanded) {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Comment history */}
        {comments.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {comments.map((c) => (
              <div
                key={c.id}
                className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2"
              >
                <div className="text-[10px] text-gray-400 mb-1" title={formatCommentFullDate(c.date)}>
                  {formatCommentDate(c.date)}
                </div>
                <p className="text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                  {stripBbCode(c.text)}
                </p>
              </div>
            ))}
          </div>
        )}
        {loadingComments && comments.length === 0 && (
          <p className="text-xs text-gray-400">Загрузка комментариев...</p>
        )}
        {!loadingComments && commentsLoaded && comments.length === 0 && (
          <p className="text-xs text-gray-400">Пока нет комментариев</p>
        )}

        {/* File previews */}
        {selectedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((f, i) => (
              <div key={i} className="relative group">
                {f.type.startsWith('image/') && filePreviews[i] ? (
                  <img
                    src={filePreviews[i]}
                    alt={f.name}
                    className="h-12 w-12 object-cover rounded border border-gray-200"
                  />
                ) : (
                  <div className="h-12 w-12 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                  </div>
                )}
                <button
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="flex items-start gap-1.5">
          <textarea
            ref={textareaRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => { if (!comment.trim() && selectedFiles.length === 0) setFocused(false); }}
            onKeyDown={handleKeyDown}
            placeholder="Написать комментарий..."
            rows={1}
            autoFocus
            className="flex-1 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none resize-none focus:border-teal-300 focus:ring-1 focus:ring-teal-200 min-w-0"
            style={{ overflow: 'hidden' }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0 mt-0.5 flex items-center justify-center h-6 w-6 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            title="Прикрепить изображение"
            type="button"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
          {(comment.trim() || selectedFiles.length > 0) && (
            <button
              onClick={handleSend}
              disabled={sending || uploadingFiles}
              className={cn(
                'shrink-0 mt-0.5 flex items-center justify-center h-6 w-6 rounded-full transition-colors',
                sending || uploadingFiles
                  ? 'bg-gray-200 text-gray-400'
                  : 'bg-teal-500 text-white hover:bg-teal-600'
              )}
              title={uploadingFiles ? 'Загрузка файлов...' : 'Отправить'}
              type="button"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {uploadingFiles && (
          <p className="text-xs text-amber-600">Загрузка файлов...</p>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  // COMPACT MODE (inside table row)
  // ═══════════════════════════════════════

  // Check localStorage for sent indicator
  const getShowSent = () => {
    try {
      const ls = localStorage.getItem(`bigap-comment-sent-${taskId}`);
      if (ls && Date.now() - parseInt(ls) < 24 * 60 * 60 * 1000) {
        return true;
      }
    } catch {}
    return false;
  };

  if (!focused && !sent && !getShowSent()) {
    return (
      <div className={cn('flex items-center gap-1.5 min-h-[24px]', className)}>
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

  if ((sent || getShowSent()) && !focused) {
    return (
      <div className={cn('flex items-center gap-1.5 min-h-[24px]', className)}>
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

  // Focused — expanded with send button and file attach
  return (
    <div className={cn('space-y-1.5 min-h-[24px]', className)} onClick={(e) => e.stopPropagation()}>
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedFiles.map((f, i) => (
            <div key={i} className="relative group">
              {f.type.startsWith('image/') && filePreviews[i] ? (
                <img
                  src={filePreviews[i]}
                  alt={f.name}
                  className="h-8 w-8 object-cover rounded border border-gray-200"
                />
              ) : (
                <div className="h-8 w-8 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                  <Paperclip className="h-3 w-3 text-gray-400" />
                </div>
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-2 w-2" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-1.5">
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => { if (!comment.trim() && selectedFiles.length === 0) setFocused(false); }}
          onKeyDown={handleKeyDown}
          placeholder="Написать комментарий..."
          rows={1}
          autoFocus
          className="flex-1 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none resize-none focus:border-teal-300 focus:ring-1 focus:ring-teal-200 min-w-0"
          style={{ overflow: 'hidden' }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 mt-0.5 flex items-center justify-center h-6 w-6 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          title="Прикрепить изображение"
          type="button"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </button>
        {(comment.trim() || selectedFiles.length > 0) && (
          <button
            onClick={handleSend}
            disabled={sending || uploadingFiles}
            className={cn(
              'shrink-0 mt-0.5 flex items-center justify-center h-6 w-6 rounded-full transition-colors',
              sending || uploadingFiles
                ? 'bg-gray-200 text-gray-400'
                : 'bg-teal-500 text-white hover:bg-teal-600'
            )}
            title={uploadingFiles ? 'Загрузка файлов...' : 'Отправить'}
            type="button"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {uploadingFiles && (
        <p className="text-[10px] text-amber-600">Загрузка файлов...</p>
      )}
    </div>
  );
}

/**
 * Small indicator component for task rows showing if a comment was sent from dashboard.
 * Uses localStorage only (no API calls per row).
 */
export function CommentSentIndicator({ taskId }: { taskId: string }) {
  const [hasSent, setHasSent] = useState(false);

  useEffect(() => {
    try {
      const sent = localStorage.getItem(`bigap-comment-sent-${taskId}`);
      if (sent) {
        const timestamp = parseInt(sent);
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setHasSent(true);
        } else {
          localStorage.removeItem(`bigap-comment-sent-${taskId}`);
        }
      }
    } catch {}
  }, [taskId]);

  if (!hasSent) return null;

  return (
    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Комментарий отправлен с дашборда" />
  );
}
