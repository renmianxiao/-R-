import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteOptions = ['--host', '127.0.0.1', '--configLoader', 'native'];
if (process.argv.includes('--open')) viteOptions.push('--open');
const api = spawn(process.execPath, [path.join(root, 'server.mjs')], { cwd: root, stdio: 'inherit' });
const vite = spawn(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'), ...viteOptions], { cwd: root, stdio: 'inherit' });
let stopping = false;

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill();
  vite.kill();
  process.exitCode = code;
}

for (const child of [api, vite]) child.on('exit', (code) => {
  if (!stopping && code !== null && code !== 0) stop(code);
});
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
