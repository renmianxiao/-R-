import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const queues = new Map();

function enqueue(filePath, operation) {
  const previous = queues.get(filePath) || Promise.resolve();
  const current = previous.catch(() => {}).then(operation);
  queues.set(filePath, current);
  return current.finally(() => {
    if (queues.get(filePath) === current) queues.delete(filePath);
  });
}

export async function readArray(filePath) {
  try {
    const records = JSON.parse(await readFile(filePath, 'utf8'));
    if (!Array.isArray(records)) throw new Error('数据文件格式无效');
    return records;
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeUnlocked(filePath, records) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryFile = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryFile, `${JSON.stringify(records, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryFile, filePath);
  } catch (error) {
    await rm(temporaryFile, { force: true }).catch(() => {});
    throw error;
  }
}

export function writeArrayAtomic(filePath, records) {
  if (!Array.isArray(records)) return Promise.reject(new TypeError('数据必须是数组'));
  return enqueue(filePath, () => writeUnlocked(filePath, records));
}

export function updateArray(filePath, updater) {
  return enqueue(filePath, async () => {
    const records = await readArray(filePath);
    const next = await updater(records);
    const updatedRecords = next === undefined ? records : next;
    if (!Array.isArray(updatedRecords)) throw new TypeError('更新结果必须是数组');
    await writeUnlocked(filePath, updatedRecords);
    return updatedRecords;
  });
}
