import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';
import { BITRIX_CONFIG } from '@/lib/bitrix-config';

/**
 * POST /api/upload
 * Uploads a file to Bitrix24 Disk (Бигап project storage) and returns the disk file ID.
 * Also attaches the file to the task if taskId is provided.
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
    // We upload to folder 140 which is the root folder of the Бигап disk storage
    const folderId = 140;

    console.log(`[upload] Uploading "${file.name}" to folder ${folderId} for task ${taskId}`);

    // Step 1: Get upload URL from Bitrix24
    let uploadUrl: string | null = null;
    let fieldName = 'file';

    // Try POST method first (recommended)
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
      console.warn('[upload] POST method failed:', (e as Error).message);
    }

    // Fallback: GET method
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
        console.warn('[upload] GET fallback failed:', (e2 as Error).message);
      }
    }

    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'Failed to get upload URL from Bitrix24' },
        { status: 500 }
      );
    }

    // Step 2: Upload the file to the URL
    // Method A: FormData (proven to work with Bitrix24)
    let diskId: number | null = null;

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

    // Method B: Raw binary POST
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

    if (!diskId) {
      return NextResponse.json(
        { error: 'All upload methods failed - could not get disk file ID' },
        { status: 500 }
      );
    }

    console.log(`[upload] Success! diskObjectId=${diskId}`);

    // Step 3: Attach file to task via UF_TASK_WEBDAV_FILES
    // This ensures the file appears in the task's file list and is accessible from the chat
    if (taskId) {
      try {
        await bitrixApi('tasks.task.update', {
          taskId: parseInt(taskId),
          fields: {
            UF_TASK_WEBDAV_FILES: [`n${diskId}`],
          },
        });
        console.log(`[upload] Attached file n${diskId} to task ${taskId}`);
      } catch (e) {
        console.warn(`[upload] Failed to attach file to task:`, (e as Error).message);
        // Non-fatal - the file is still uploaded, just not attached
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
