import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from '../data/catalog.mjs';
import { readArray, updateArray, writeArrayAtomic } from './json-file-store.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const gamesFile = path.join(root, 'data', 'games.json');
let initialization;

async function ensureGamesFile() {
  try {
    await stat(gamesFile);
    return;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (!initialization) {
    const initialGames = catalog.map((game) => ({ ...game, active: true }));
    initialization = writeArrayAtomic(gamesFile, initialGames).finally(() => { initialization = null; });
  }
  await initialization;
}

export async function getGames({ includeInactive = true } = {}) {
  await ensureGamesFile();
  const games = await readArray(gamesFile);
  return includeInactive ? games : games.filter((game) => game.active !== false);
}

export async function saveGames(games) {
  await ensureGamesFile();
  await writeArrayAtomic(gamesFile, games);
}

export async function updateGames(updater) {
  await ensureGamesFile();
  return updateArray(gamesFile, updater);
}

export async function findActiveGame(id) {
  const games = await getGames({ includeInactive: false });
  return games.find((game) => game.id === id) || null;
}
