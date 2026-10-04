import { useCallback, useEffect, useRef, useState } from 'react';

function readStatus(value, userId) {
  if (!value || value.userId !== userId || !Number.isSafeInteger(value.balance) || value.balance < 0
    || typeof value.checkedInToday !== 'boolean'
    || (value.todayReward !== null && (!Number.isInteger(value.todayReward) || value.todayReward < 0 || (value.todayReward > 50 && value.todayReward !== 100)))
    || (value.checkedInToday ? value.todayReward === null : value.todayReward !== null)
    || !/^\d{4}-\d{2}-\d{2}$/.test(value.day || '')
    || !Number.isFinite(Date.parse(value.serverNow)) || !Number.isFinite(Date.parse(value.nextResetAt))) {
    throw new Error('科技点数据格式异常，请重新载入。');
  }
  return value;
}

export default function useTechPoints({ user, onReward, onUnauthorized }) {
  const userId = user?.id || null;
  const activeUser = useRef(userId);
  activeUser.current = userId;
  const callbacks = useRef({ onReward, onUnauthorized });
  callbacks.current = { onReward, onUnauthorized };
  const scope = useRef(null);
  const [state, setState] = useState({ userId: null, status: null, loading: false, busy: false, error: '' });

  const isCurrent = (context) => context.alive && scope.current === context && activeUser.current === context.userId;
  const acceptStatus = (context, status, requestStartedAt) => {
    context.status = status;
    context.receivedAt = performance.now();
    // Conservatively include request transit time so a delayed response cannot postpone midnight.
    context.untilReset = Date.parse(status.nextResetAt) - Date.parse(status.serverNow) - (context.receivedAt - requestStartedAt);
  };

  const refresh = useCallback(async () => {
    const context = scope.current;
    if (!context || !isCurrent(context) || context.userId !== userId || context.postBusy) return;
    context.readController?.abort();
    const controller = new AbortController();
    context.readController = controller;
    const version = ++context.readVersion;
    const requestStartedAt = performance.now();
    setState((current) => ({ ...current, userId, loading: true, error: '' }));
    try {
      const response = await fetch('/api/points', { signal: controller.signal, cache: 'no-store', headers: { 'X-Account-Id': userId } });
      const result = await response.json();
      if (!isCurrent(context) || version !== context.readVersion) return;
      if (!response.ok) {
        if (response.status === 401 || result.code === 'ACCOUNT_CHANGED') {
          context.status = null;
          setState((current) => ({ ...current, status: null }));
          callbacks.current.onUnauthorized?.();
        }
        throw new Error(result.error || '无法载入科技点，请重试。');
      }
      if (result.points?.userId !== userId) {
        context.status = null;
        setState((current) => ({ ...current, status: null }));
        callbacks.current.onUnauthorized?.();
        throw new Error('登录账号已变更，请重新载入账号。');
      }
      const status = readStatus(result.points, userId);
      acceptStatus(context, status, requestStartedAt);
      setState({ userId, status, loading: false, busy: false, error: '' });
    } catch (error) {
      if (error.name === 'AbortError' || !isCurrent(context) || version !== context.readVersion) return;
      setState((current) => ({ ...current, loading: false, error: error.message || '无法连接签到服务，请稍后重试。' }));
    }
  }, [userId]);

  useEffect(() => {
    const context = { userId, alive: true, status: null, postBusy: false, readVersion: 0, readController: null };
    scope.current = context;
    setState({ userId, status: null, loading: Boolean(userId), busy: false, error: '' });
    if (userId) refresh();
    return () => {
      context.alive = false;
      context.readController?.abort();
    };
  }, [userId, refresh]);

  const checkIn = useCallback(async () => {
    const context = scope.current;
    if (!context || !isCurrent(context) || context.userId !== userId || context.postBusy || !context.status || context.status.checkedInToday) return;
    context.postBusy = true;
    context.readController?.abort();
    ++context.readVersion;
    const requestStartedAt = performance.now();
    setState((current) => ({ ...current, loading: false, busy: true, error: '' }));
    try {
      const response = await fetch('/api/check-in', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Account-Id': userId }, body: '{}' });
      const result = await response.json();
      if (!isCurrent(context)) return;
      if (response.status === 401 || result.code === 'ACCOUNT_CHANGED' || ((response.ok || response.status === 409) && result.points?.userId !== userId)) {
        context.status = null;
        setState((current) => ({ ...current, status: null }));
        callbacks.current.onUnauthorized?.();
        throw new Error(result.error || '登录账号已变更，请重新载入账号。');
      }
      if (response.ok || response.status === 409) {
        const status = readStatus(result.points, userId);
        if (response.ok && (!Number.isInteger(result.reward) || result.reward < 0 || (result.reward > 50 && result.reward !== 100))) throw new Error('签到结果异常，请重新载入科技点。');
        acceptStatus(context, status, requestStartedAt);
        setState({ userId, status, loading: false, busy: false, error: response.ok ? '' : (result.error || '今天已经签到，明天再来吧。') });
        if (response.ok) {
          // This key only asks other tabs to reload. The server owns the balance.
          try { localStorage.setItem(`playshelf-points-updated:${userId}`, `${Date.now()}:${Math.random()}`); } catch { /* Storage is optional. */ }
          callbacks.current.onReward?.(result.reward);
        }
      } else {
        throw new Error(result.error || '签到失败，请重试。');
      }
    } catch (error) {
      if (!isCurrent(context)) return;
      setState((current) => ({ ...current, busy: false, error: error.message || '无法连接签到服务，请稍后重试。' }));
    } finally {
      context.postBusy = false;
      if (isCurrent(context) && context.status && document.visibilityState === 'visible' && context.untilReset <= performance.now() - context.receivedAt) refresh();
    }
  }, [userId, refresh]);

  const current = state.userId === userId ? state : { status: null, loading: Boolean(userId), busy: false, error: '' };
  useEffect(() => {
    if (!userId) return;
    const resume = () => { if (document.visibilityState === 'visible') refresh(); };
    const sync = (event) => { if (event.key === `playshelf-points-updated:${userId}`) refresh(); };
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    window.addEventListener('storage', sync);
    document.addEventListener('visibilitychange', resume);
    return () => {
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      window.removeEventListener('storage', sync);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [userId, refresh]);

  useEffect(() => {
    const context = scope.current;
    if (!userId || !current.status || !context || !isCurrent(context)) return;
    // A monotonic timer preserves the server's midnight boundary if the device clock changes.
    const remaining = context.untilReset - (performance.now() - context.receivedAt);
    const timer = window.setTimeout(refresh, Math.max(0, remaining) + 200);
    return () => window.clearTimeout(timer);
  }, [userId, current.status, refresh]);

  return { status: current.status, loading: current.loading, busy: current.busy, error: current.error, refresh, checkIn };
}
