import { NextRequest, NextResponse } from 'next/server';
import { BITRIX_CONFIG } from '@/lib/bitrix-config';

/**
 * Bitrix24 API Proxy Route
 * Proxies POST requests to the Bitrix24 REST API to avoid CORS issues.
 * ALL Bitrix24 API calls must use POST with JSON body.
 * 
 * Usage: POST /api/bitrix/tasks.task.list
 * Body: { ...params to forward to Bitrix24 }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ method: string[] }> }
) {
  const { method } = await params;
  const methodPath = method.join('/');
  const url = `${BITRIX_CONFIG.webhookUrl}${methodPath}.json`;

  try {
    const body = await request.json().catch(() => ({}));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Bitrix24 API error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error, error_description: data.error_description },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Bitrix24 proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy request to Bitrix24' },
      { status: 500 }
    );
  }
}
