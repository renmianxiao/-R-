import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readArray, updateArray } from './json-file-store.mjs';
import { findActiveGame } from './game-store.mjs';

const reviewsFile = fileURLToPath(new URL('../data/reviews.json', import.meta.url));
const publicReview = (review) => ({ id: review.id, name: review.name, rating: review.rating, text: review.text, createdAt: review.createdAt, updatedAt: review.updatedAt });

export async function handleReviewApi(request, response, url, { sendJson, readBody, getAuthenticatedUser }) {
  try {
    let gameId;
    try { gameId = decodeURIComponent(url.pathname.split('/')[3]); } catch { return sendJson(response, 400, { error: '游戏地址无效' }); }
    if (!await findActiveGame(gameId)) return sendJson(response, 404, { error: '这款游戏不存在或已下架' });
    if (!['GET', 'POST'].includes(request.method)) return sendJson(response, 405, { error: '不支持此操作' });
    const user = await getAuthenticatedUser(request);
    if (request.method === 'POST') {
      if (!user) return sendJson(response, 401, { error: '请先登录后再发布评价' });
      let input;
      try { input = await readBody(request); } catch { return sendJson(response, 400, { error: '评价内容格式无效或过大' }); }
      if (!input || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) return sendJson(response, 400, { error: '请选择 1–5 星评分' });
      const text = typeof input.text === 'string' ? input.text.trim() : '';
      if (text.length < 10 || text.length > 1000) return sendJson(response, 400, { error: '评价需填写 10–1000 个字符' });
      let saved;
      await updateArray(reviewsFile, (reviews) => {
        const current = reviews.find((review) => review.gameId === gameId && review.userId === user.id);
        const now = new Date().toISOString();
        saved = { id: current?.id || randomUUID(), gameId, userId: user.id, name: user.name || '玩家', rating: input.rating, text, createdAt: current?.createdAt || now, updatedAt: now };
        if (current) reviews[reviews.indexOf(current)] = saved;
        else reviews.push(saved);
      });
      return sendJson(response, 200, { review: publicReview(saved) });
    }
    const reviews = (await readArray(reviewsFile)).filter((review) => review.gameId === gameId).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const total = reviews.length;
    const pages = Math.max(1, Math.ceil(total / 6));
    const page = Math.min(pages, Math.max(1, Number.parseInt(url.searchParams.get('page'), 10) || 1));
    const own = user && reviews.find((review) => review.userId === user.id);
    return sendJson(response, 200, { reviews: reviews.slice((page - 1) * 6, page * 6).map(publicReview), total, pages, page, average: total ? reviews.reduce((sum, review) => sum + review.rating, 0) / total : null, ownReview: own ? publicReview(own) : null });
  } catch (error) {
    console.error('Review API error:', error.message);
    return sendJson(response, 500, { error: '评价暂时不可用，请稍后重试' });
  }
}
