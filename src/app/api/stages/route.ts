import { NextRequest, NextResponse } from 'next/server';
import { fetchStages } from '@/lib/bitrix-api';
import { BITRIX_CONFIG } from '@/lib/bitrix-config';

// In-memory cache for stages
let cachedStages: Record<string, { title: string; color: string }> | null = null;
let stagesCacheTimestamp = 0;
const STAGES_CACHE_TTL = 60 * 60 * 1000; // 1 hour (stages change rarely)

/**
 * GET /api/stages?groupId=6
 * Fetches task stages for the specified project group from Bitrix24.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const groupId = parseInt(searchParams.get('groupId') || String(BITRIX_CONFIG.projectId));
  const refresh = searchParams.get('refresh') === 'true';

  // Check cache
  if (!refresh && cachedStages && Date.now() - stagesCacheTimestamp < STAGES_CACHE_TTL) {
    return NextResponse.json({ stages: cachedStages, cached: true });
  }

  try {
    const stages = await fetchStages(groupId);

    // Update cache
    cachedStages = stages;
    stagesCacheTimestamp = Date.now();

    return NextResponse.json({ stages, cached: false });
  } catch (error) {
    console.error('Failed to fetch stages:', error);

    // Return cached data if available
    if (cachedStages) {
      return NextResponse.json({
        stages: cachedStages,
        cached: true,
        error: 'Using cached data - API request failed',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch stages from Bitrix24', stages: {} },
      { status: 500 }
    );
  }
}
