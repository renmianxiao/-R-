import { useCallback, useEffect, useRef, useState } from 'react';

const emptyHistory = [];

function validId(value) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .filter((entry) => entry && validId(entry.gameId)
      && typeof entry.visitedAt === 'number' && Number.isFinite(entry.visitedAt)
      && entry.visitedAt > 0 && entry.visitedAt <= 8640000000000000)
    .map(({ gameId, visitedAt }) => ({ gameId, visitedAt }))
    .sort((a, b) => b.visitedAt - a.visitedAt)
    .filter(({ gameId }) => {
      if (seen.has(gameId)) return false;
      seen.add(gameId);
      return true;
    })
    .slice(0, 30);
}

export default function useBrowseHistory({ user, game, ready }) {
  const key = validId(user?.id) ? `playshelf-history:${user.id}` : null;
  const gameId = validId(game?.id) && game.active !== false ? game.id : null;
  const canRecord = Boolean(ready && gameId);
  const [state, setState] = useState({ key: null, history: emptyHistory, error: '', writable: true });
  const current = useRef(state);
  const recordedVisits = useRef(new Set());

  useEffect(() => {
    const needsLoad = current.current.key !== key;
    let next = needsLoad
      ? { key, history: emptyHistory, error: '', writable: true }
      : current.current;
    let storage;
    if (key) {
      let raw;
      try {
        storage = window.localStorage;
        if (needsLoad) raw = storage.getItem(key);
      } catch {
        next = { ...next, error: '无法读取浏览记录，浏览器可能禁用了本地存储。', writable: false };
      }
      if (needsLoad && next.writable && raw !== null) {
        try {
          next.history = normalizeHistory(JSON.parse(raw));
        } catch {
          next.error = '浏览记录数据已损坏，已暂时隐藏。';
        }
      }
    }
    current.current = next;
    setState(next);

    if (!key || typeof window === 'undefined') return undefined;
    const syncHistory = (event) => {
      if ((event.key !== key && event.key !== null) || current.current.key !== key
        || (event.storageArea && event.storageArea !== storage)) return;
      let history = emptyHistory;
      let error = '';
      try {
        history = event.newValue === null ? emptyHistory : normalizeHistory(JSON.parse(event.newValue));
      } catch {
        error = '浏览记录数据已损坏，已暂时隐藏。';
      }
      const synced = { key, history, error, writable: true };
      current.current = synced;
      setState(synced);
    };
    window.addEventListener('storage', syncHistory);
    return () => window.removeEventListener('storage', syncHistory);
  }, [key]);

  useEffect(() => {
    if (!key || !canRecord) return;
    const visit = JSON.stringify([key, gameId]);
    if (recordedVisits.current.has(visit)) return;
    recordedVisits.current.add(visit);
    const previous = current.current;
    const history = normalizeHistory([
      { gameId, visitedAt: Date.now() },
      ...(previous.key === key ? previous.history.filter((entry) => entry.gameId !== gameId) : emptyHistory),
    ]);
    let error = previous.key === key ? previous.error : '';
    if (previous.key === key && previous.writable) {
      try {
        window.localStorage.setItem(key, JSON.stringify(history));
        error = '';
      } catch {
        error = '无法保存浏览记录，浏览器存储可能已满或被禁用。';
      }
    }
    const next = { key, history, error, writable: previous.key === key && previous.writable };
    current.current = next;
    setState(next);
  }, [key, gameId, canRecord]);

  const clearHistory = useCallback(() => {
    if (!key) return;
    let error = '';
    let writable = true;
    try {
      window.localStorage.removeItem(key);
    } catch {
      error = '无法清除已保存的浏览记录，请检查浏览器的存储设置。';
      writable = false;
    }
    const next = { key, history: writable ? emptyHistory : current.current.key === key ? current.current.history : emptyHistory, error, writable };
    current.current = next;
    setState(next);
  }, [key]);

  return {
    // Mask the old account before the loading effect runs for a new account.
    history: state.key === key ? state.history : emptyHistory,
    clearHistory,
    storageError: state.key === key ? state.error : '',
  };
}
