import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGames, updateGames } from './game-store.mjs';
import { getOrders, updateOrders } from './order-store.mjs';

const orderStatuses = new Set(['demo-created', 'processing', 'completed', 'cancelled']);
const gameFields = new Set(['title', 'englishTitle', 'genre', 'tags', 'price', 'originalPrice', 'rating', 'badge', 'colors', 'description', 'appId', 'coverUrl', 'active']);
const uploadDir = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'data', 'uploads');

function jsonError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw jsonError('请求内容过大');
  }
  try {
    const value = JSON.parse(body || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid object');
    return value;
  } catch {
    throw jsonError('请求格式无效');
  }
}

async function uploadCover(request, response, sendJson) {
  if (request.method !== 'POST') return null;
  const mime = String(request.headers['content-type'] || '').toLowerCase();
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const extension = extensions[mime];
  if (!extension) throw jsonError('请选择 JPG、PNG、WebP 或 GIF 图片');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 8 * 1024 * 1024) throw jsonError('封面图片不能超过 8 MB');
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks);
  const valid = extension === 'jpg' ? data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data.at(-2) === 0xff && data.at(-1) === 0xd9
    : extension === 'png' ? data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : extension === 'gif' ? ['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString())
        : data.length > 12 && data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP';
  if (!valid) throw jsonError('图片内容与文件格式不匹配');
  const filename = `${randomUUID()}.${extension}`;
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), data, { flag: 'wx' });
  return sendJson(response, 201, { coverUrl: `/uploads/${filename}` });
}

function cleanText(value, label, maxLength, required = false) {
  if (typeof value !== 'string') throw jsonError(`${label}格式无效`);
  const text = value.trim();
  if ((required && !text) || text.length > maxLength) throw jsonError(`${label}必填且不能超过 ${maxLength} 个字符`);
  return text;
}

function validateUrl(value) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.length > 2048) throw jsonError('封面链接格式无效');
  if (/^\/uploads\/[\w-]+\.(?:jpg|png|webp|gif)$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol');
    return url.href;
  } catch {
    throw jsonError('封面链接仅支持 http 或 https 地址');
  }
}

function normalizeGameInput(input, current = null) {
  for (const key of Object.keys(input)) {
    if (!gameFields.has(key)) throw jsonError(`不支持修改字段：${key}`);
  }

  const value = { ...(current || {}), ...input };
  const title = cleanText(value.title, '游戏名称', 80, true);
  const englishTitle = cleanText(value.englishTitle, '英文名称', 100, true);
  const genre = cleanText(value.genre, '游戏分类', 50, true);
  const price = Number(value.price);
  const originalPrice = Number(value.originalPrice);
  const rating = Number(value.rating);
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) throw jsonError('售价需大于 0 且不超过 1,000,000');
  if (!Number.isFinite(originalPrice) || originalPrice < price || originalPrice > 1_000_000) throw jsonError('原价不能低于售价或超过 1,000,000');
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) throw jsonError('评分需在 0 到 5 之间');
  if (!Array.isArray(value.tags) || value.tags.length > 12 || value.tags.some((tag) => typeof tag !== 'string' || tag.trim().length > 40)) throw jsonError('游戏标签最多 12 个，每个不超过 40 个字符');
  if (!Array.isArray(value.colors) || value.colors.length !== 2 || value.colors.some((color) => typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) throw jsonError('展示颜色需填写两个十六进制颜色值');
  const badge = cleanText(value.badge ?? '', '推荐标记', 40);
  const description = cleanText(value.description ?? '', '游戏简介', 600);
  let appId;
  if (value.appId != null && value.appId !== '') {
    appId = Number(value.appId);
    if (!Number.isSafeInteger(appId) || appId < 1) throw jsonError('商店应用 ID 必须是正整数');
  }
  if (value.active != null && typeof value.active !== 'boolean') throw jsonError('商品状态无效');

  return {
    ...(current || {}),
    title,
    englishTitle,
    genre,
    tags: value.tags.map((tag) => tag.trim()).filter(Boolean),
    price,
    originalPrice,
    rating,
    badge,
    colors: [...value.colors],
    description,
    ...(appId == null ? { appId: undefined } : { appId }),
    coverUrl: validateUrl(value.coverUrl),
    active: value.active ?? current?.active ?? true,
  };
}

async function listGames(request, response, sendJson) {
  if (request.method !== 'GET') return null;
  return sendJson(response, 200, { games: await getGames() });
}

async function createGame(request, response, sendJson) {
  if (request.method !== 'POST') return null;
  const input = await readBody(request);
  const game = normalizeGameInput(input);
  game.id = `game-${randomUUID()}`;
  let created;
  await updateGames((games) => {
    while (games.some((item) => item.id === game.id)) game.id = `game-${randomUUID()}`;
    games.push(game);
    created = game;
  });
  return sendJson(response, 201, { game: created });
}

async function patchGame(request, response, url, sendJson) {
  if (request.method !== 'PATCH') return null;
  const match = url.pathname.match(/^\/api\/admin\/games\/([^/]+)$/);
  if (!match) return null;
  let id;
  try { id = decodeURIComponent(match[1]); } catch { throw jsonError('商品 ID 格式无效'); }
  const input = await readBody(request);
  let updated = null;
  await updateGames((games) => {
    const index = games.findIndex((game) => game.id === id);
    if (index < 0) return;
    updated = normalizeGameInput(input, games[index]);
    games[index] = updated;
  });
  if (!updated) return sendJson(response, 404, { error: '找不到这款游戏' });
  return sendJson(response, 200, { game: updated });
}

async function listOrders(request, response, sendJson) {
  if (request.method !== 'GET') return null;
  return sendJson(response, 200, { orders: await getOrders() });
}

async function patchOrder(request, response, url, adminUser, sendJson) {
  if (request.method !== 'PATCH') return null;
  const match = url.pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if (!match) return null;
  let orderId;
  try { orderId = decodeURIComponent(match[1]); } catch { throw jsonError('订单号格式无效'); }
  const input = await readBody(request);
  if (!orderStatuses.has(input.status)) throw jsonError('订单状态无效');
  if (input.expectedStatus != null && !orderStatuses.has(input.expectedStatus)) throw jsonError('原订单状态无效');
  let updated = null;
  await updateOrders((orders) => {
    const index = orders.findIndex((order) => order.orderId === orderId);
    if (index < 0) return;
    if (input.expectedStatus != null && orders[index].status !== input.expectedStatus) throw jsonError('订单已被更新，请刷新后重试', 409);
    updated = { ...orders[index], status: input.status, statusUpdatedAt: new Date().toISOString(), statusUpdatedBy: adminUser.email };
    orders[index] = updated;
  });
  if (!updated) return sendJson(response, 404, { error: '找不到这笔订单' });
  return sendJson(response, 200, { order: updated });
}

export async function handleAdminApi(request, response, url, adminUser, sendJson) {
  try {
    if (url.pathname === '/api/admin/uploads/covers') {
      const result = await uploadCover(request, response, sendJson);
      if (result !== null) return result;
    }
    if (request.method === 'GET' && url.pathname === '/api/admin/overview') {
      const [games, orders] = await Promise.all([getGames(), getOrders()]);
      const demoOrderAmount = orders.reduce((total, order) => {
        if (order.status === 'cancelled') return total;
        const amount = Number(order.total);
        return total + (Number.isFinite(amount) ? amount : 0);
      }, 0);
      return sendJson(response, 200, {
        productCount: games.filter((game) => game.active !== false).length,
        orderCount: orders.length,
        pendingOrderCount: orders.filter((order) => order.status === 'demo-created').length,
        demoOrderAmount,
      });
    }

    if (url.pathname === '/api/admin/games') {
      const result = request.method === 'GET'
        ? await listGames(request, response, sendJson)
        : await createGame(request, response, sendJson);
      if (result !== null) return result;
    }
    if (/^\/api\/admin\/games\/[^/]+$/.test(url.pathname)) {
      const result = await patchGame(request, response, url, sendJson);
      if (result !== null) return result;
    }
    if (url.pathname === '/api/admin/orders') {
      const result = await listOrders(request, response, sendJson);
      if (result !== null) return result;
    }
    if (/^\/api\/admin\/orders\/[^/]+$/.test(url.pathname)) {
      const result = await patchOrder(request, response, url, adminUser, sendJson);
      if (result !== null) return result;
    }
    if (!['GET', 'POST', 'PATCH'].includes(request.method)) {
      response.setHeader('Allow', 'GET, POST, PATCH');
      response.writeHead(405);
      response.end();
      return;
    }
    return sendJson(response, 404, { error: '后台接口不存在' });
  } catch (error) {
    if (error.status) return sendJson(response, error.status, { error: error.message });
    console.error('PlayShelf admin API error:', error.message);
    return sendJson(response, 500, { error: '后台数据暂时不可用，请稍后重试' });
  }
}
