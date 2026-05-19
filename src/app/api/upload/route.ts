import { NextRequest, NextResponse } from 'next/server';
import { bitrixApi } from '@/lib/bitrix-api';

/**
 * POST /api/upload
 * Uploads a file to Bitrix24 Disk.
 * Returns the disk file ID for use in im.disk.file.commit.
 *
 * The file will be committed to the task chat by the comment API
 * using im.disk.file.commit — no need to attach via UF_TASK_WEBDAV_FILES.
 *
 * Body (FormData):
 *   - file: The file to upload
 *   - taskId: The task ID (for reference only)
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

    // Upload via base64 fileContent (recommended — single API call)
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
          console.log(`[upload] base64 upload success: diskObjectId=${diskId}`);
        }
      }
    } catch (e) {
      console.warn('[upload] base64 method failed:', (e as Error).message);
    }

    // Fallback: Two-step upload URL method
    if (!diskId) {
      let uploadUrl: string | null = null;
      let fieldName = 'file';

      try {
        const urlResult = await bitrixApi<{
          result?: Record<string, unknown>;
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
        console.warn('[upload] Get upload URL failed:', (e as Error).message);
      }

      if (!uploadUrl) {
        try {
          const getUrl = `https://1c-cms.bitrix24.ru/rest/116/48yuunr8ss2u18qm/disk.folder.uploadfile.json?id=${folderId}&data[NAME]=${encodeURIComponent(file.name)}`;
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
          console.warn('[upload] GET fallback for URL failed:', (e2 as Error).message);
        }
      }

      if (!uploadUrl) {
        return NextResponse.json(
          { error: 'Failed to get upload URL from Bitrix24' },
          { status: 500 }
        );
      }

      // Upload file to URL via FormData
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

      // Try raw binary POST as last resort
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
        console.log(`[upload] Upload URL method success: diskObjectId=${diskId}`);
      }
    }

    if (!diskId) {
      return NextResponse.json(
        { error: 'All upload methods failed - could not get disk file ID' },
        { status: 500 }
      );
    }

    // Note: We do NOT attach the file to the task via UF_TASK_WEBDAV_FILES anymore.
    // Instead, the comment API uses im.disk.file.commit to send the file inline in the chat.
    // This is the only method that makes images appear inline in the task chat.

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
