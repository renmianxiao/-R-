import { useEffect, useMemo, useState } from 'react';
import { adminRequest } from '../admin-api.js';

const blank = { title: '', englishTitle: '', genre: '', tags: '', price: '', originalPrice: '', rating: '4.5', badge: '', colors: '#647b61, #202922', description: '', coverUrl: '', appId: '' };
const money = (value) => new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 }).format(Number(value) || 0);

function ProductForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(initial ? { ...initial, tags: (initial.tags || []).join(', '), colors: (initial.colors || ['#647b61', '#202922']).join(', '), appId: initial.appId || '' } : blank);
  const [coverFile, setCoverFile] = useState(null); const [coverPreview, setCoverPreview] = useState(initial?.coverUrl || '');
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  function chooseCover(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setError('请选择 JPG、PNG、WebP 或 GIF 图片。'); event.target.value = ''; return; }
    if (file.size > 8 * 1024 * 1024) { setError('封面图片不能超过 8 MB。'); event.target.value = ''; return; }
    setError(''); setCoverFile(file); setCoverPreview(URL.createObjectURL(file));
  }
  async function submit(event) {
    event.preventDefault(); if (saving) return;
    const colors = form.colors.split(',').map((s) => s.trim());
    const payload = { ...form, tags: form.tags.split(',').map((s) => s.trim()).filter(Boolean), colors, price: Number(form.price), originalPrice: Number(form.originalPrice), rating: Number(form.rating), appId: form.appId ? Number(form.appId) : undefined };
    delete payload.id;
    if (![payload.title, payload.englishTitle, payload.genre].every((value) => typeof value === 'string' && value.trim())) return setError('请填写中英文名称和游戏分类。');
    if (!(payload.price > 0) || payload.originalPrice < payload.price || payload.rating < 0 || payload.rating > 5) return setError('请检查售价、原价和 0–5 分的评分。');
    if (colors.length !== 2 || colors.some((color) => !/^#[\da-f]{6}$/i.test(color))) return setError('请使用两个 #RRGGBB 颜色值，并用逗号分隔。');
    setSaving(true); setError('');
    try {
      if (coverFile) {
        const upload = await fetch('/api/admin/uploads/covers', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': coverFile.type }, body: coverFile });
        const result = await upload.json().catch(() => ({}));
        if (!upload.ok) throw new Error(result.error || '封面上传失败，请重试。');
        payload.coverUrl = result.coverUrl;
      }
      await onSave(payload); onClose();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }
  const fields = [['title', '游戏名称', true], ['englishTitle', '英文名称', true], ['genre', '分类', true], ['tags', '标签（逗号分隔）'], ['price', '售价（元）', true], ['originalPrice', '原价（元）', true], ['rating', '评分（0–5）', true], ['badge', '推荐标记'], ['appId', '商店应用 ID'], ['colors', '展示颜色（两个 #RRGGBB）'], ['description', '游戏简介']];
  return <div className="admin-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><section className="admin-product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-form-title"><header><div><p className="admin-section-eyebrow">CATALOG / EDITOR</p><h2 id="product-form-title">{initial ? '编辑商品' : '添加游戏'}</h2></div><button className="admin-icon-button" type="button" onClick={onClose} aria-label="关闭">×</button></header>
    <form onSubmit={submit}><div className="admin-form-grid">{fields.map(([name, label, required]) => <label key={name}>{label}{name === 'description' ? <textarea name={name} value={form[name] ?? ''} onChange={change} rows="3" maxLength={600} /> : <input name={name} value={form[name] ?? ''} onChange={change} required={Boolean(required)} maxLength={2048} type={['price', 'originalPrice', 'rating', 'appId'].includes(name) ? 'number' : 'text'} step={['price', 'originalPrice', 'rating'].includes(name) ? '0.01' : undefined} min={['price', 'originalPrice'].includes(name) ? '0.01' : name === 'rating' ? '0' : undefined} max={name === 'rating' ? '5' : undefined} />}</label>)}
      <label className="admin-cover-field">封面图片（JPG、PNG、WebP、GIF，最大 8 MB）<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={chooseCover} />{coverPreview && <img className="admin-cover-preview" src={coverPreview} alt="封面预览" />}</label>
    </div>
      {error && <p className="admin-form-error" role="alert">{error}</p>}<footer><button type="button" className="admin-secondary-button" onClick={onClose}>取消</button><button className="admin-primary-button" disabled={saving}>{saving ? '正在保存…' : initial ? '保存修改' : '创建商品'}<span>↗</span></button></footer></form></section></div>;
}

export default function ProductsPage() {
  const [games, setGames] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [query, setQuery] = useState(''); const [genre, setGenre] = useState('全部分类'); const [page, setPage] = useState(1); const [editing, setEditing] = useState(null); const [formOpen, setFormOpen] = useState(false);
  async function load() { setLoading(true); setError(''); try { const { games: rows } = await adminRequest('/api/admin/games'); setGames(rows); } catch (e) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  const genres = useMemo(() => ['全部分类', ...new Set(games.map((g) => g.genre).filter(Boolean))], [games]);
  const filtered = useMemo(() => games.filter((g) => (genre === '全部分类' || g.genre === genre) && `${g.title} ${g.englishTitle}`.toLowerCase().includes(query.trim().toLowerCase())), [games, genre, query]);
  const pages = Math.max(1, Math.ceil(filtered.length / 12)); const currentPage = Math.min(page, pages); const shown = filtered.slice((currentPage - 1) * 12, currentPage * 12);
  async function save(payload) {
    const result = editing
      ? await adminRequest(`/api/admin/games/${encodeURIComponent(editing.id)}`, { method: 'PATCH', body: JSON.stringify(payload) })
      : await adminRequest('/api/admin/games', { method: 'POST', body: JSON.stringify(payload) });
    setGames((current) => editing
      ? current.map((game) => game.id === result.game.id ? result.game : game)
      : [...current, result.game]);
    if (!editing) { setQuery(''); setGenre('全部分类'); setPage(1); }
    try { const { games: rows } = await adminRequest('/api/admin/games'); setGames(rows); }
    catch (e) { setError(`商品已保存，但列表暂时无法刷新：${e.message}`); }
  }
  async function toggle(game) { const next = game.active === false; if (!next && !window.confirm(`确认下架「${game.title}」？下架后商城将不再展示，但商品记录会保留。`)) return; try { await adminRequest(`/api/admin/games/${encodeURIComponent(game.id)}`, { method: 'PATCH', body: JSON.stringify({ active: next }) }); await load(); } catch (e) { setError(e.message); } }
  return <section className="admin-products">
    <div className="admin-list-toolbar"><div><span className="admin-count-pill">{games.filter((g) => g.active !== false).length} 在售</span><span className="admin-muted-inline">共 {games.length} 款商品</span></div><button className="admin-primary-button admin-add-button" onClick={() => { setEditing(null); setFormOpen(true); }}>＋ 添加游戏</button></div>
    <div className="admin-filter-row"><label className="admin-search-field"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="搜索中英文名称" aria-label="搜索中英文名称" /></label><label className="admin-select-field"><span>分类</span><select value={genre} onChange={(e) => { setGenre(e.target.value); setPage(1); }}>{genres.map((item) => <option key={item}>{item}</option>)}</select></label><button className="admin-refresh-button" onClick={load} disabled={loading}>↻ 刷新</button></div>
    {error && <div className="admin-inline-error" role="alert">{error}<button onClick={load}>重试</button></div>}
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>游戏</th><th>分类</th><th>售价 / 原价</th><th>评分</th><th>状态</th><th>操作</th></tr></thead><tbody>
      {loading ? <tr><td colSpan="6" className="admin-table-message">正在载入商品目录…</td></tr> : shown.map((game) => <tr key={game.id}><td><div className="admin-game-cell"><span className="admin-game-cover" style={{ background: `linear-gradient(145deg, ${game.colors?.[0] || '#647b61'}, ${game.colors?.[1] || '#202922'})` }}>{game.coverUrl ? <img src={game.coverUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <b>{game.title?.slice(0, 1)}</b>}</span><span><strong>{game.title}</strong><small>{game.englishTitle}</small></span></div></td><td><span className="admin-genre-chip">{game.genre}</span></td><td><strong className="admin-price">{money(game.price)}</strong><small className="admin-old-price">{money(game.originalPrice)}</small></td><td>★ {Number(game.rating).toFixed(1)}</td><td><span className={`admin-status-pill ${game.active === false ? 'is-inactive' : 'is-active'}`}><i />{game.active === false ? '已下架' : '在售'}</span></td><td><div className="admin-row-actions"><button onClick={() => { setEditing(game); setFormOpen(true); }}>编辑</button><button className={game.active === false ? 'is-relist' : 'is-delist'} onClick={() => toggle(game)}>{game.active === false ? '重新上架' : '下架'}</button></div></td></tr>)}
      {!loading && shown.length === 0 && <tr><td colSpan="6" className="admin-table-message">{games.length ? '没有匹配的商品，试试调整搜索条件。' : '还没有商品，点击“添加游戏”创建第一款。'}</td></tr>}
    </tbody></table></div>
    <div className="admin-pagination"><span>显示 {filtered.length ? (currentPage - 1) * 12 + 1 : 0}–{Math.min(currentPage * 12, filtered.length)} 项，共 {filtered.length} 项</span><div><button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>← 上一页</button><b>{currentPage} / {pages}</b><button disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>下一页 →</button></div></div>
    {formOpen && <ProductForm initial={editing} onClose={() => setFormOpen(false)} onSave={save} />}
  </section>;
}
