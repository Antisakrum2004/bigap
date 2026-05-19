import { NextRequest, NextResponse } from 'next/server';
import { fetchUsers } from '@/lib/bitrix-api';

// In-memory cache for users
let cachedUsers: Record<number, { name: string; lastName: string; avatar: string }> | null = null;
let usersCacheTimestamp = 0;
const USERS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * GET /api/users?ids=1,2,3
 * Fetches user info from Bitrix24 by user IDs.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const idsParam = searchParams.get('ids');
  const refresh = searchParams.get('refresh') === 'true';

  if (!idsParam) {
    return NextResponse.json(
      { error: 'User IDs are required (comma-separated)' },
      { status: 400 }
    );
  }

  const userIds = idsParam.split(',').map(Number).filter(Boolean);

  if (userIds.length === 0) {
    return NextResponse.json({ users: {} });
  }

  // Check cache if not forcing refresh
  if (!refresh && cachedUsers && Date.now() - usersCacheTimestamp < USERS_CACHE_TTL) {
    // Return only requested users from cache
    const filteredUsers: Record<number, { name: string; lastName: string; avatar: string }> = {};
    for (const id of userIds) {
      if (cachedUsers[id]) {
        filteredUsers[id] = cachedUsers[id];
      }
    }
    return NextResponse.json({ users: filteredUsers, cached: true });
  }

  try {
    const users = await fetchUsers(userIds);

    // Update cache
    if (!cachedUsers) cachedUsers = {};
    Object.assign(cachedUsers, users);
    usersCacheTimestamp = Date.now();

    return NextResponse.json({ users, cached: false });
  } catch (error) {
    console.error('Failed to fetch users:', error);

    // Return cached data if available
    if (cachedUsers) {
      const filteredUsers: Record<number, { name: string; lastName: string; avatar: string }> = {};
      for (const id of userIds) {
        if (cachedUsers[id]) {
          filteredUsers[id] = cachedUsers[id];
        }
      }
      return NextResponse.json({
        users: filteredUsers,
        cached: true,
        error: 'Using cached data - API request failed',
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch users from Bitrix24', users: {} },
      { status: 500 }
    );
  }
}
