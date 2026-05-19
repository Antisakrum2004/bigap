import { NextRequest, NextResponse } from 'next/server';
import { BITRIX_CONFIG } from '@/lib/bitrix-config';

/**
 * POST /api/upload
 * Uploads a file to Bitrix24 Disk and returns the disk file ID.
 * Uses the same 3-method fallback strategy as bitrix-form.
 *
 * Body (FormData):
 *   - file: The file to upload
 *   - folderId: (optional) Bitrix24 disk folder ID, defaults to 3
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderId = formData.get('folderId') as string || '3';

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    const webhookUrl = BITRIX_CONFIG.webhookUrl;

    // Step 1: Get upload URL from Bitrix24
    const getUrl = `${webhookUrl}disk.folder.uploadfile?id=${folderId}&uploadFile=${encodeURIComponent(file.name)}`;
    const urlResponse = await fetch(getUrl);

    if (!urlResponse.ok) {
      return NextResponse.json(
        { error: `Failed to get upload URL: HTTP ${urlResponse.status}` },
        { status: 500 }
      );
    }

    const urlData = await urlResponse.json();

    if (urlData.error) {
      return NextResponse.json(
        { error: `Bitrix API error: ${urlData.error_description || urlData.error}` },
        { status: 500 }
      );
    }

    if (!urlData.result) {
      return NextResponse.json(
        { error: 'Empty result from disk.folder.uploadfile' },
        { status: 500 }
      );
    }

    const uploadUrl = urlData.result.uploadUrl || urlData.result.UPLOAD_URL;
    const fieldName = urlData.result.field || urlData.result.fieldId || 'file';

    if (!uploadUrl) {
      return NextResponse.json(
        { error: 'No uploadUrl in response' },
        { status: 500 }
      );
    }

    let diskId: number | null = null;

    // Method A: Raw binary POST
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const responseA = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: buffer,
      });

      if (responseA.ok) {
        const textA = await responseA.text();
        try {
          const dataA = JSON.parse(textA);
          if (!dataA.error && dataA.result) {
            diskId = dataA.result.ID || dataA.result.id || null;
          }
        } catch {
          // Non-JSON response, try next method
        }
      }
    } catch (eA) {
      console.warn('Upload Method A failed:', (eA as Error).message);
    }

    // Method B: FormData via fetch
    if (!diskId) {
      try {
        const fd = new FormData();
        fd.append(fieldName, file, file.name);
        const responseB = await fetch(uploadUrl, {
          method: 'POST',
          body: fd,
        });

        if (responseB.ok) {
          const textB = await responseB.text();
          try {
            const dataB = JSON.parse(textB);
            if (!dataB.error && dataB.result) {
              diskId = dataB.result.ID || dataB.result.id || null;
            }
          } catch {
            // Non-JSON response
          }
        }
      } catch (eB) {
        console.warn('Upload Method B failed:', (eB as Error).message);
      }
    }

    if (!diskId) {
      return NextResponse.json(
        { error: 'All upload methods failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ diskId, fileName: file.name });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'File upload failed' },
      { status: 500 }
    );
  }
}
