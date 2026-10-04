import { AlreadyCheckedInError, checkIn, getPointsStatus } from './points-store.mjs';

export async function handlePointsApi(request, response, url, { sendJson, getAuthenticatedUser }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) return sendJson(response, 401, { error: '请先登录后再查看科技点或签到' });
    const expectedUserId = request.headers['x-account-id'];
    const requiresAccountId = url.pathname === '/api/check-in' && request.method === 'POST';
    if ((requiresAccountId || expectedUserId !== undefined) && expectedUserId !== user.id) {
      return sendJson(response, 409, { error: '登录账号已变更，请重新载入账号', code: 'ACCOUNT_CHANGED' });
    }
    if (url.pathname === '/api/points' && request.method === 'GET') {
      return sendJson(response, 200, { points: await getPointsStatus(user.id) });
    }
    if (url.pathname === '/api/check-in' && request.method === 'POST') {
      return sendJson(response, 200, await checkIn(user.id));
    }
    return sendJson(response, 405, { error: '不支持此操作' });
  } catch (error) {
    if (error instanceof AlreadyCheckedInError) {
      return sendJson(response, 409, { error: error.message, points: error.points });
    }
    console.error('Points API error:', error.message);
    return sendJson(response, 500, { error: '科技点暂时不可用，请稍后重试' });
  }
}
