import './game-details.css';
import GameReviews from './GameReviews.jsx';

export default function GameDetails({ game, games, loading, failed, wishlist, onWishlist, onAdd, onOpen, Cover, Icon, money, user, onLogin }) {
  if (!game) return <section className="detail-empty container"><p className="section-kicker">PLAY SHELF</p><h1>{loading ? '正在载入游戏…' : failed ? '暂时无法读取游戏信息' : '没有找到这款游戏'}</h1><p>{loading ? '请稍候。' : failed ? '请检查网站服务后刷新重试。' : '游戏可能已下架，可以返回商城发现其他游戏。'}</p><a className="button button-lime" href="/#catalog">返回商城</a></section>;
  const related = games.filter((item) => item.id !== game.id && item.active !== false && (item.genre === game.genre || item.tags?.some((tag) => game.tags?.includes(tag)))).slice(0, 4);
  const discount = Math.round((1 - game.price / game.originalPrice) * 100);
  return <div className="game-detail container">
    <nav className="detail-breadcrumb" aria-label="面包屑"><a href="/#catalog">商城</a><span>/</span><span>{game.title}</span></nav>
    <section className="detail-hero" aria-labelledby="game-title" style={{ '--detail-color': game.colors?.[0] || '#d7f36a' }}>
      <div className="detail-art"><Cover game={game} className="detail-cover" showDiscount={false} /><span className="detail-art-caption">PLAY SHELF / {game.englishTitle}</span></div>
      <div className="detail-main"><div className="section-kicker">{game.badge || '探索好游戏'} <span>✳</span></div><h1 id="game-title">{game.title}</h1><p className="detail-english">{game.englishTitle}</p>
        <div className="detail-chips"><span>{game.genre}</span><span className="detail-rating">★ {Number(game.rating).toFixed(1)} 玩家评分</span>{(game.tags || []).map((tag) => <span key={tag}>{tag}</span>)}</div>
        <p className="detail-summary">{game.description || '这款游戏暂未添加简介。'}</p>
        <div className="detail-buy"><span className="detail-edition">数字版游戏</span><div className="detail-price"><strong>{money(game.price)}</strong>{game.originalPrice > game.price && <><del>{money(game.originalPrice)}</del><span>优惠 {discount}%</span></>}</div><div className="detail-buttons"><button className="button button-lime" onClick={() => onAdd(game)}>加入购物袋 <Icon name="plus" size={18} /></button><button className="button button-outline" aria-pressed={wishlist.includes(game.id)} onClick={() => onWishlist(game)}><Icon name="heart" size={18} fill={wishlist.includes(game.id) ? 'currentColor' : 'none'} />{wishlist.includes(game.id) ? '已加入心愿单' : '加入心愿单'}</button></div><p className="detail-demo-note">作品集演示商城 · 下单生成模拟订单</p></div>
      </div>
    </section>
    <section className="detail-about"><div><p className="section-kicker">ABOUT THE GAME</p><h2>关于这款游戏</h2><p className="detail-description">{game.description || '这款游戏暂未添加详细介绍。'}</p></div><dl><div><dt>游戏类型</dt><dd>{game.genre}</dd></div><div><dt>玩家评分</dt><dd>★ {Number(game.rating).toFixed(1)} / 5</dd></div><div><dt>游戏标签</dt><dd>{game.tags?.join(' · ') || '暂无标签'}</dd></div></dl></section>
    <GameReviews gameId={game.id} user={user} onLogin={onLogin} />
    {related.length > 0 && <section className="detail-related"><div className="detail-related-heading"><div><p className="section-kicker">KEEP EXPLORING</p><h2>你可能也会喜欢</h2></div><a href="/#catalog" className="text-link">浏览全部 <Icon name="arrow" size={16} /></a></div><div className="detail-related-grid">{related.map((item) => <button key={item.id} className="detail-related-card" onClick={() => onOpen(item)}><Cover game={item} showDiscount={false} /><span><strong>{item.title}</strong><small>{item.genre}</small><b>{money(item.price)}</b></span></button>)}</div></section>}
  </div>;
}
