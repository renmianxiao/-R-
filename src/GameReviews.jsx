import { useEffect, useState } from 'react';
import './game-reviews.css';

export default function GameReviews({ gameId, user, onLogin }) {
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [hydratedFor, setHydratedFor] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`/api/games/${encodeURIComponent(gameId)}/reviews?page=${page}`, { signal: controller.signal })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error || '评价加载失败'); return result; })
      .then((result) => {
        setData(result);
        const identity = `${gameId}:${user?.id || 'guest'}`;
        if (hydratedFor !== identity) { setRating(result.ownReview?.rating || 0); setText(result.ownReview?.text || ''); setHydratedFor(identity); }
      })
      .catch((failure) => { if (failure.name !== 'AbortError') setError(failure.message || '无法连接评价服务，请重试'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [gameId, user?.id, page, refresh]);

  async function submit(event) {
    event.preventDefault();
    if (saving || loading) return;
    if (!rating) { setError('请先选择星级评分。'); return; }
    if (text.trim().length < 10) { setError('请填写至少 10 个字符的评价。'); return; }
    setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch(`/api/games/${encodeURIComponent(gameId)}/reviews`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, text }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '评价保存失败');
      setMessage('评价已保存。'); setPage(1); setRefresh((value) => value + 1);
    } catch (failure) { setError(failure.message || '无法连接评价服务，请重试'); }
    finally { setSaving(false); }
  }
  return <section className="game-reviews" aria-labelledby="reviews-title">
    <div className="reviews-heading"><div><p className="section-kicker">PLAYER REVIEWS</p><h2 id="reviews-title">玩家评价</h2></div><div className="reviews-summary"><strong>{data?.total ? data.average.toFixed(1) : '—'}</strong><span> / 5<br />{data?.total || 0} 条真实用户评价</span></div></div>
    <div className="reviews-layout"><div className="reviews-list" aria-busy={loading}>
      {loading ? <p className="reviews-empty" role="status">正在载入评价…</p> : data?.total ? data.reviews.map((review) => <article className="review-card" key={review.id}><header><span className="review-avatar">{review.name.slice(0, 1)}</span><div><strong>{review.name}</strong><time dateTime={review.updatedAt}>{new Date(review.updatedAt).toLocaleDateString('zh-CN')}{review.updatedAt !== review.createdAt ? ' · 已编辑' : ''}</time></div><span className="review-stars" aria-label={`${review.rating} 星`}>{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></span></header><p>{review.text}</p></article>) : !error && <div className="reviews-empty"><strong>还没有玩家评价</strong><p>玩过这款游戏？分享你的体验，帮助其他玩家做选择。</p></div>}
      {!loading && data?.pages > 1 && <div className="reviews-pagination"><button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button><span>{data.page} / {data.pages}</span><button disabled={page >= data.pages} onClick={() => setPage(page + 1)}>下一页</button></div>}
    </div><aside className="review-compose"><h3>{data?.ownReview ? '修改你的评价' : '说说你的游戏体验'}</h3><p>每人每款游戏可发布一条评价，之后可以修改。</p>{user ? <form onSubmit={submit}><fieldset disabled={loading || saving}><legend>你的评分</legend><div className="review-rating-input" role="radiogroup" aria-label="星级评分">{[1, 2, 3, 4, 5].map((value) => <label key={value}><input type="radio" name="review-rating" value={value} checked={rating === value} onChange={() => { setRating(value); setMessage(''); }} /><span className={value <= rating ? 'is-rated' : ''}>★</span><span className="review-sr-only">{value} 星</span></label>)}</div><label className="review-text-label">评价内容<textarea required minLength={10} maxLength={1000} value={text} onChange={(event) => { setText(event.target.value); setMessage(''); }} placeholder="有哪些让你喜欢或不喜欢的地方？" rows={5} /></label><small>{text.length} / 1000</small><button className="button button-lime" disabled={!rating || text.trim().length < 10}>{saving ? '正在保存…' : data?.ownReview ? '保存修改' : '发布评价'}</button></fieldset></form> : <button className="button button-lime" onClick={onLogin}>登录后评价</button>}</aside></div>
    {error && <div className="review-error" role="alert">{error} <button onClick={() => setRefresh((value) => value + 1)}>重新加载</button></div>}{message && <p className="review-success" role="status">{message}</p>}
  </section>;
}
