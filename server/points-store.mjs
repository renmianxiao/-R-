import { randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { readArray, updateArray } from './json-file-store.mjs';

const pointsFile = fileURLToPath(new URL('../data/points.json', import.meta.url));
const beijingOffset = 8 * 60 * 60 * 1000;
const dayLength = 24 * 60 * 60 * 1000;

function beijingDay(timestamp) {
  return new Date(timestamp + beijingOffset).toISOString().slice(0, 10);
}

function validateAccounts(accounts) {
  const userIds = new Set();
  for (const account of accounts) {
    if (!account || typeof account.userId !== 'string' || !account.userId.trim()
      || userIds.has(account.userId) || !Number.isSafeInteger(account.balance)
      || account.balance < 0 || !Array.isArray(account.checkIns)) {
      throw new Error('科技点账户数据格式无效');
    }
    userIds.add(account.userId);
    const days = new Set();
    let earned = 0;
    for (const entry of account.checkIns) {
      const timestamp = typeof entry?.createdAt === 'string' ? Date.parse(entry.createdAt) : NaN;
      if (!entry || typeof entry.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(entry.day)
        || days.has(entry.day) || !Number.isSafeInteger(entry.reward)
        || !(entry.reward >= 0 && entry.reward <= 50 || entry.reward === 100)
        || !Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== entry.createdAt
        || beijingDay(timestamp) !== entry.day) {
        throw new Error('科技点签到记录格式无效');
      }
      days.add(entry.day);
      earned += entry.reward;
      if (!Number.isSafeInteger(earned)) throw new Error('科技点余额超出可保存范围');
    }
    if (earned !== account.balance) throw new Error('科技点余额与签到记录不一致');
  }
}

function validateUserId(userId) {
  if (typeof userId !== 'string' || !userId.trim()) throw new Error('科技点账户身份无效');
}

function accountStatus(account, userId, timestamp = Date.now()) {
  const day = beijingDay(timestamp);
  const today = account?.checkIns.find((entry) => entry.day === day);
  const nextReset = (Math.floor((timestamp + beijingOffset) / dayLength) + 1) * dayLength - beijingOffset;
  return {
    userId,
    balance: account?.balance ?? 0,
    checkedInToday: Boolean(today),
    todayReward: today?.reward ?? null,
    day,
    serverNow: new Date(timestamp).toISOString(),
    nextResetAt: new Date(nextReset).toISOString(),
    timeZone: 'Asia/Shanghai',
  };
}

function drawReward() {
  // 1,000 equally likely slots: 80%, 1%, 0.1%, 8%, and 10.9%.
  const slot = randomInt(1000);
  if (slot < 800) return randomInt(20, 41);
  if (slot < 810) return 100;
  if (slot < 811) return 0;
  if (slot < 891) return randomInt(1, 20);
  return randomInt(41, 51);
}

export class AlreadyCheckedInError extends Error {
  constructor(points) {
    super('今天已经签到，明天再来吧');
    this.name = 'AlreadyCheckedInError';
    this.points = points;
  }
}

export async function getPointsStatus(userId) {
  validateUserId(userId);
  const accounts = await readArray(pointsFile);
  validateAccounts(accounts);
  return accountStatus(accounts.find((account) => account.userId === userId), userId);
}

export async function checkIn(userId) {
  validateUserId(userId);
  let saved;
  let reward;
  await updateArray(pointsFile, (accounts) => {
    validateAccounts(accounts);
    // Read the server clock after entering the queue, including across midnight.
    const now = Date.now();
    const day = beijingDay(now);
    saved = accounts.find((account) => account.userId === userId);
    if (saved?.checkIns.some((entry) => entry.day === day)) {
      throw new AlreadyCheckedInError(accountStatus(saved, userId, now));
    }
    if (!saved) {
      saved = { userId, balance: 0, checkIns: [] };
      accounts.push(saved);
    }
    reward = drawReward();
    const balance = saved.balance + reward;
    if (!Number.isSafeInteger(balance)) throw new Error('科技点余额超出可保存范围');
    saved.balance = balance;
    saved.checkIns.push({ day, reward, createdAt: new Date(now).toISOString() });
  });
  return { points: accountStatus(saved, userId), reward };
}
