import http from 'node:http';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { getGames } from './server/game-store.mjs';
import { appendOrder } from './server/order-store.mjs';
import { handleAdminApi } from './server/admin-api.mjs';
import { handleReviewApi } from './server/review-api.mjs';
import { handlePointsApi } from './server/points-api.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const usersFile = path.join(root, 'data', 'users.json');
const sessionsFile = path.join(root, 'data', 'sessions.json');
const port = Number(process.env.PORT || 4174);
const host = process.env.HOST || '0.0.0.0';
const scrypt = promisify(scryptCallback);
const sessionCookie = 'playshelf_session';
const sessionLifetime = 7 * 24 * 60 * 60;
const loginFailures = new Map();

function sendJson(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(payload));
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function cookieValue(request, name) {
  const prefix = `${name}=`;
  const cookie = (request.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : '';
}

async function readRecords(file) {
  try {
    const records = JSON.parse(await readFile(file, 'utf8'));
    return Array.isArray(records) ? records : [];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeRecords(file, records) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
}

function publicUser(user) {
  return { id: user.id, name: user.name, username: user.username, email: user.email, createdAt: user.createdAt, role: user.role || 'customer' };
}

async function getAuthenticatedUser(request) {
  const token = cookieValue(request, sessionCookie);
  if (!token) return null;
  const tokenHash = digest(token);
  const [sessions, users] = await Promise.all([readRecords(sessionsFile), readRecords(usersFile)]);
  const session = sessions.find((item) => item.tokenHash === tokenHash && Date.parse(item.expiresAt) > Date.now());
  const user = session && users.find((item) => item.id === session.userId);
  return user ? publicUser(user) : null;
}

async function startSession(user, request, response) {
  const token = randomBytes(32).toString('base64url');
  const now = Date.now();
  const sessions = await readRecords(sessionsFile);
  sessions.push({ tokenHash: digest(token), userId: user.id, expiresAt: new Date(now + sessionLifetime * 1000).toISOString() });
  await writeRecords(sessionsFile, sessions.filter((item) => Date.parse(item.expiresAt) > now));
  const forwardedHttps = request.headers['x-forwarded-proto']?.split(',')[0]?.trim() === 'https';
  const secure = request.socket.encrypted || forwardedHttps ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionLifetime}${secure}`);
}

async function endSession(request, response) {
  const token = cookieValue(request, sessionCookie);
  if (token) {
    const tokenHash = digest(token);
    const sessions = await readRecords(sessionsFile);
    await writeRecords(sessionsFile, sessions.filter((item) => item.tokenHash !== tokenHash));
  }
  response.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  sendJson(response, 200, { ok: true });
}

async function register(request, response) {
  let input;
  try { input = await readBody(request); } catch (error) { return sendJson(response, 400, { error: error.message === 'Unexpected end of JSON input' ? '请求格式无效' : error.message }); }
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (name.length < 1 || name.length > 32) return sendJson(response, 400, { error: '昵称长度需为 1–32 个字符' });
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) return sendJson(response, 400, { error: '请填写有效的邮箱地址' });
  if (password.length < 8 || password.length > 128) return sendJson(response, 400, { error: '密码长度需为 8–128 个字符' });

  const users = await readRecords(usersFile);
  if (users.some((user) => user.email === email)) return sendJson(response, 409, { error: '这个邮箱已经注册，请直接登录' });
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = (await scrypt(password, passwordSalt, 64)).toString('hex');
  const user = { id: randomUUID(), name, email, passwordSalt, passwordHash, role: 'customer', createdAt: new Date().toISOString() };
  users.push(user);
  await writeRecords(usersFile, users);
  await startSession(user, request, response);
  sendJson(response, 201, { user: publicUser(user) });
}

async function login(request, response) {
  let input;
  try { input = await readBody(request); } catch (error) { return sendJson(response, 400, { error: error.message === 'Unexpected end of JSON input' ? '请求格式无效' : error.message }); }
  const identifier = String(input.email || input.identifier || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (!identifier || identifier.length > 254 || password.length < 1 || password.length > 128) return sendJson(response, 400, { error: '账号或密码不正确' });

  const attemptKey = `${request.socket.remoteAddress || 'unknown'}:${identifier}`;
  const attempt = loginFailures.get(attemptKey);
  if (attempt?.blockedUntil > Date.now()) return sendJson(response, 429, { error: '尝试次数过多，请一分钟后再试' });
  const users = await readRecords(usersFile);
  const user = users.find((item) => item.email?.toLowerCase() === identifier || (item.role === 'admin' && [item.username, item.name].some((value) => String(value || '').trim().toLowerCase() === identifier)));
  const salt = user?.passwordSalt || 'playshelf-invalid-account-salt';
  const expected = Buffer.from(user?.passwordHash || '00'.repeat(64), 'hex');
  const actual = await scrypt(password, salt, 64);
  const valid = timingSafeEqual(actual, expected) && Boolean(user);
  if (!valid) {
    const count = (attempt?.count || 0) + 1;
    loginFailures.set(attemptKey, { count, blockedUntil: count >= 8 ? Date.now() + 60_000 : 0 });
    return sendJson(response, 401, { error: '邮箱或密码不正确' });
  }

  loginFailures.delete(attemptKey);
  await startSession(user, request, response);
  sendJson(response, 200, { user: publicUser(user) });
}

async function readBody(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error('请求内容过大');
  }
  return JSON.parse(body || '{}');
}

async function createOrder(request, response) {
  let input;
  try { input = await readBody(request); } catch (error) { return sendJson(response, 400, { error: error.message === 'Unexpected end of JSON input' ? '请求格式无效' : error.message }); }
  const email = String(input.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return sendJson(response, 400, { error: '请填写有效的联系邮箱' });
  if (!Array.isArray(input.items) || input.items.length === 0) return sendJson(response, 400, { error: '购物袋中没有商品' });

  let currentGames;
  try { currentGames = await getGames({ includeInactive: false }); }
  catch { return sendJson(response, 500, { error: '商品目录暂时不可用，请稍后重试' }); }

  const lines = [];
  for (const item of input.items) {
    const game = currentGames.find((entry) => entry.id === item.id);
    const quantity = Number(item.quantity);
    if (!game || !Number.isInteger(quantity) || quantity < 1 || quantity > 9) return sendJson(response, 400, { error: '商品或数量无效，请刷新后重试' });
    const existing = lines.find((line) => line.id === game.id);
    if (existing) existing.quantity = Math.min(existing.quantity + quantity, 9);
    else lines.push({ id: game.id, title: game.title, quantity, unitPrice: game.price });
  }
  const total = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const user = await getAuthenticatedUser(request);
  const order = {
    orderId: `PS-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex').toUpperCase()}`,
    email,
    userId: user?.id || null,
    items: lines,
    total,
    status: 'demo-created',
    createdAt: new Date().toISOString(),
  };

  try {
    await appendOrder(order);
  } catch {
    return sendJson(response, 500, { error: '订单保存失败，请稍后再试' });
  }
  sendJson(response, 201, { orderId: order.orderId, total, status: order.status });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.json': 'application/json; charset=utf-8',
};

async function serveFrontend(request, response, pathname) {
  let requestedPath;
  try { requestedPath = decodeURIComponent(pathname); } catch { requestedPath = '/'; }
  const resolved = path.resolve(dist, `.${requestedPath}`);
  if (resolved !== dist && !resolved.startsWith(`${dist}${path.sep}`)) {
    response.writeHead(403); response.end('Forbidden'); return;
  }
  let target = resolved;
  try {
    const info = await stat(target);
    if (info.isDirectory()) target = path.join(target, 'index.html');
    await stat(target);
  } catch { target = path.join(dist, 'index.html'); }
  try {
    const content = await readFile(target);
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(target)] || 'application/octet-stream' });
    response.end(content);
  } catch {
    response.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('前端尚未构建，请先运行 npm run build。');
  }
}

async function serveUpload(response, pathname) {
  const filename = path.basename(pathname.slice('/uploads/'.length));
  if (!filename || filename !== pathname.slice('/uploads/'.length)) {
    response.writeHead(404); response.end(); return;
  }
  const target = path.join(root, 'data', 'uploads', filename);
  try {
    const content = await readFile(target);
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
    response.end(content);
  } catch {
    response.writeHead(404); response.end();
  }
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (url.pathname === '/api/points' || url.pathname === '/api/check-in') return handlePointsApi(request, response, url, { sendJson, getAuthenticatedUser });
  if (/^\/api\/games\/[^/]+\/reviews$/.test(url.pathname)) return handleReviewApi(request, response, url, { sendJson, readBody, getAuthenticatedUser });
  if (request.method === 'GET' && url.pathname.startsWith('/uploads/')) return serveUpload(response, url.pathname);
  if (url.pathname === '/api/admin' || url.pathname.startsWith('/api/admin/')) {
    const user = await getAuthenticatedUser(request);
    if (!user) return sendJson(response, 401, { error: '请先登录管理员账号' });
    if (user.role !== 'admin') return sendJson(response, 403, { error: '你没有后台管理权限' });
    return handleAdminApi(request, response, url, user, sendJson);
  }
  if (request.method === 'GET' && url.pathname === '/api/health') return sendJson(response, 200, { status: 'ok' });
  if (request.method === 'GET' && url.pathname === '/api/games') {
    try { return sendJson(response, 200, await getGames({ includeInactive: false })); }
    catch { return sendJson(response, 500, { error: '商品目录暂时不可用，请稍后重试' }); }
  }
  if (request.method === 'GET' && url.pathname === '/api/me') return sendJson(response, 200, { user: await getAuthenticatedUser(request) });
  if (request.method === 'POST' && url.pathname === '/api/register') return register(request, response);
  if (request.method === 'POST' && url.pathname === '/api/login') return login(request, response);
  if (request.method === 'POST' && url.pathname === '/api/logout') return endSession(request, response);
  if (request.method === 'POST' && url.pathname === '/api/orders') return createOrder(request, response);
  if (url.pathname.startsWith('/api/')) return sendJson(response, 404, { error: '接口不存在' });
  if (request.method !== 'GET' && request.method !== 'HEAD') { response.writeHead(405); response.end(); return; }
  return serveFrontend(request, response, url.pathname);
});

server.listen(port, host, () => {
  console.log(`PlayShelf API: http://127.0.0.1:${port}/api/health`);
});
