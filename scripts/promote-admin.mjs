import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const usersFile = path.join(root, 'data', 'users.json');
const requestedEmail = String(process.argv[2] || '').trim().toLowerCase();

if (!requestedEmail) {
  console.error('请先提供已注册账号的邮箱，例如：npm run admin:promote -- you@example.com');
  process.exitCode = 1;
} else {
  try {
    const users = JSON.parse(await readFile(usersFile, 'utf8'));
    if (!Array.isArray(users)) throw new Error('账号数据格式无效');
    const user = users.find((record) => String(record.email || '').trim().toLowerCase() === requestedEmail);
    if (!user) throw new Error('未找到此账号，请先在商城注册后再试');
    if (user.role === 'admin') {
      console.log(`账号 ${requestedEmail} 已是管理员`);
    } else {
      user.role = 'admin';
      const temporaryFile = `${usersFile}.${process.pid}.${randomUUID()}.tmp`;
      try {
        await mkdir(path.dirname(usersFile), { recursive: true });
        await writeFile(temporaryFile, `${JSON.stringify(users, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
        await rename(temporaryFile, usersFile);
      } catch (error) {
        await rm(temporaryFile, { force: true }).catch(() => {});
        throw error;
      }
      console.log(`已将 ${requestedEmail} 设置为管理员`);
    }
  } catch (error) {
    const message = error.code === 'ENOENT'
      ? '还没有账号数据，请先在商城注册账号'
      : error instanceof SyntaxError
        ? '账号数据格式无效，请检查 data/users.json'
        : error.message === '账号数据格式无效' || error.message === '未找到此账号，请先在商城注册后再试'
          ? error.message
          : '无法更新账号数据，请检查文件权限';
    console.error(`管理员设置失败：${message}`);
    process.exitCode = 1;
  }
}
