import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';
import { BITRIX_CONFIG } from '@/lib/bitrix-config';

/**
 * POST /api/upload
 * Uploads a file to Bitrix24 Disk and attaches it to the task.
 * Returns the disk file ID for use in comment attachments.
 *
 * IMPORTANT: Files must be attached to the task via UF_TASK_WEBDAV_FILES
 * BEFORE referencing them with [DISK FILE ID=nX] in comments.
 * tasks.task.files.attach does NOT work reliably — we use tasks.task.update.
 *
 * Body (FormData):
 *   - file: The file to upload
 *   - taskId: The task ID (required for attaching to task)
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const taskId = formData.get('taskId') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Бигап project group storage: ID=26, ROOT_OBJECT_ID=140
    const folderId = 140;

    console.log(`[upload] Uploading "${file.name}" (${file.size} bytes) to folder ${folderId} for task ${taskId}`);

    // Method 1: Upload via base64 fileContent (recommended by Bitrix24 docs - single API call)
    let diskId: number | null = null;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64Content = Buffer.from(arrayBuffer).toString('base64');

      const uploadResult = await bitrixApi<{
        result?: Record<string, unknown>;
      }>('disk.folder.uploadfile', {
        id: folderId,
        data: {
          NAME: file.name,
        },
        fileContent: [
          file.name,
          base64Content,
        ],
      });

      const result = uploadResult?.result as Record<string, unknown> | undefined;
      if (result) {
        diskId = parseInt(String(result.ID || result.id || '0')) || null;
        if (diskId) {
          console.log(`[upload] Method 1 (base64) success: diskObjectId=${diskId}`);
        }
      }
    } catch (e) {
      console.warn('[upload] Method 1 (base64) failed:', (e as Error).message);
    }

    // Method 2: Two-step upload URL method (fallback)
    if (!diskId) {
      let uploadUrl: string | null = null;
      let fieldName = 'file';

      // Step 2a: Get upload URL
      try {
        const urlResult = await bitrixApi<{
          result?: {
            uploadUrl?: string;
            field?: string;
            fieldId?: string;
          };
        }>('disk.folder.uploadfile', {
          id: folderId,
          data: { NAME: file.name },
        });

        const result = urlResult?.result as Record<string, unknown> | undefined;
        if (result?.uploadUrl) {
          uploadUrl = String(result.uploadUrl);
          if (result.field && typeof result.field === 'string') fieldName = result.field;
          if (result.fieldId && typeof result.fieldId === 'string') fieldName = result.fieldId;
        }
      } catch (e) {
        console.warn('[upload] Method 2: get upload URL failed:', (e as Error).message);
      }

      // Fallback: GET method for upload URL
      if (!uploadUrl) {
        try {
          const getUrl = `${BITRIX_CONFIG.webhookUrl}disk.folder.uploadfile.json?id=${folderId}&data[NAME]=${encodeURIComponent(file.name)}`;
          const urlResponse = await fetch(getUrl);
          if (urlResponse.ok) {
            const urlData = await urlResponse.json();
            if (!urlData.error && urlData.result?.uploadUrl) {
              uploadUrl = urlData.result.uploadUrl;
              if (urlData.result.field || urlData.result.fieldId) {
                fieldName = urlData.result.field || urlData.result.fieldId;
              }
            }
          }
        } catch (e2) {
          console.warn('[upload] Method 2: GET fallback for URL failed:', (e2 as Error).message);
        }
      }

      if (!uploadUrl) {
        return NextResponse.json(
          { error: 'Failed to get upload URL from Bitrix24' },
          { status: 500 }
        );
      }

      // Step 2b: Upload file to URL
      // Try FormData first
      try {
        const fd = new FormData();
        fd.append(fieldName, file, file.name);
        const responseA = await fetch(uploadUrl, {
          method: 'POST',
          body: fd,
        });

        if (responseA.ok) {
          const textA = await responseA.text();
          try {
            const dataA = JSON.parse(textA);
            if (!dataA.error && dataA.result) {
              diskId = parseInt(String(dataA.result.ID || dataA.result.id || '0')) || null;
            }
          } catch {
            console.warn('[upload] FormData method returned non-JSON');
          }
        }
      } catch (eA) {
        console.warn('[upload] FormData method failed:', (eA as Error).message);
      }

      // Try raw binary POST
      if (!diskId) {
        try {
          const buffer = Buffer.from(await file.arrayBuffer());
          const responseB = await fetch(uploadUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
            body: buffer,
          });

          if (responseB.ok) {
            const textB = await responseB.text();
            try {
              const dataB = JSON.parse(textB);
              if (!dataB.error && dataB.result) {
                diskId = parseInt(String(dataB.result.ID || dataB.result.id || '0')) || null;
              }
            } catch {
              console.warn('[upload] Raw binary method returned non-JSON');
            }
          }
        } catch (eB) {
          console.warn('[upload] Raw binary method failed:', (eB as Error).message);
        }
      }

      if (diskId) {
        console.log(`[upload] Method 2 (upload URL) success: diskObjectId=${diskId}`);
      }
    }

    if (!diskId) {
      return NextResponse.json(
        { error: 'All upload methods failed - could not get disk file ID' },
        { status: 500 }
      );
    }

    // Step 3: Attach file to task via tasks.task.update with UF_TASK_WEBDAV_FILES
    // This is the ONLY reliable method. tasks.task.files.attach often fails with "file not found".
    if (taskId) {
      try {
        // First, get existing files on the task to preserve them
        let existingFiles: string[] = [];
        try {
          const taskResult = await bitrixApi<{
            result: { tasks: Array<{ ufTaskWebdavFiles?: number[] }> };
          }>('tasks.task.list', {
            filter: { ID: taskId },
            select: ['ID', 'UF_TASK_WEBDAV_FILES'],
          });
          const task = taskResult?.result?.tasks?.[0];
          if (task?.ufTaskWebdavFiles && Array.isArray(task.ufTaskWebdavFiles)) {
            existingFiles = task.ufTaskWebdavFiles.map((id: number) => String(id));
          }
        } catch {
          // If we can't get existing files, we'll just add the new one
        }

        // Build the file list: existing files + new file
        const allFiles = [...existingFiles, `n${diskId}`];

        await bitrixApi('tasks.task.update', {
          taskId: parseInt(taskId),
          fields: {
            UF_TASK_WEBDAV_FILES: allFiles,
          },
        });
        console.log(`[upload] Attached file n${diskId} to task ${taskId} via UF_TASK_WEBDAV_FILES (total files: ${allFiles.length})`);
      } catch (e) {
        console.warn(`[upload] UF_TASK_WEBDAV_FILES failed:`, (e as Error).message);
        // Non-fatal - the file is still uploaded to disk
      }
    }

    return NextResponse.json({
      diskId,
      fileName: file.name,
      folderId,
    });
  } catch (error) {
    console.error('[upload] Error:', error);
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 }
    );
  }
}
