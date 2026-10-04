import { useEffect, useMemo, useRef, useState } from 'react';
import { catalog } from '../data/catalog.mjs';
import GameDetails from './GameDetails.jsx';
import AccountMenu from './AccountMenu.jsx';
import UserCenter from './UserCenter.jsx';
import useBrowseHistory from './useBrowseHistory.js';
import useTechPoints from './useTechPoints.js';

const categories = ['全部游戏', '动作', '角色扮演', '冒险', '模拟经营', '休闲益智', '体育竞速', '动作冒险', '即时战略', '恐怖惊悚', '枪战射击', '模拟机整合', '策略战棋'];
const money = (value) => `¥${Number(value).toFixed(2)}`;

function Icon({ name, size = 20, fill = 'none' }) {
  const shared = { width: size, height: size, viewBox: '0 0 24 24', fill, stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    bag: <><path d="M5 8h14l1 12H4L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    heart: <path d="M20.8 8.8c0 5.1-8.8 10.1-8.8 10.1S3.2 13.9 3.2 8.8a4.5 4.5 0 0 1 8.8-1.4 4.5 4.5 0 0 1 8.8 1.4Z" />,
    arrow: <><path d="M4.5 12h14" /><path d="m13 5.5 6.5 6.5-6.5 6.5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    minus: <path d="M5 12h14" />,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
    dice: <><rect x="3" y="3" width="18" height="18" rx="4" /><circle cx="7.5" cy="7.5" r=".8" /><circle cx="16.5" cy="7.5" r=".8" /><circle cx="12" cy="12" r=".8" /><circle cx="7.5" cy="16.5" r=".8" /><circle cx="16.5" cy="16.5" r=".8" /></>,
    history: <><path d="M3 11a9 9 0 1 1 2.6 7.4M3 4v7h7" /><path d="M12 7v5l3 2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18m-12 5 2 2 4-4" /></>,
    spark: <><path d="m13 2-8 11h6l-1 9 9-13h-6l1-7Z" /></>,
    settings: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    logout: <><path d="M10 4H4v16h6M10 12h11m-4-4 4 4-4 4" /></>,
  };
  return <svg {...shared}>{paths[name]}</svg>;
}

function readStorage(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function GameCover({ game, className = '', showDiscount = true }) {
  const discount = Math.round((1 - game.price / game.originalPrice) * 100);
  const steamCoverUrl = game.appId ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900_2x.jpg` : '';
  const coverUrl = steamCoverUrl || game.coverUrl;
  return (
    <div className={`game-cover ${className}`} style={{ '--cover-a': game.colors?.[0], '--cover-b': game.colors?.[1] }}>
      {coverUrl && <img src={coverUrl} alt={`${game.title} 游戏封面`} loading="lazy" onError={(event) => { const image = event.currentTarget; if (game.coverUrl && coverUrl !== game.coverUrl && !image.dataset.fallback) { image.dataset.fallback = 'true'; image.src = game.coverUrl; } else { image.style.display = 'none'; } }} />}
      <div className="cover-fallback"><span>{game.englishTitle}</span></div>
      <div className="cover-shade" />
      {showDiscount && <span className="cover-discount">-{discount}%</span>}
    </div>
  );
}

function App() {
  const [games, setGames] = useState(catalog);
  const [cart, setCart] = useState(() => readStorage('playshelf-cart', []));
  const [wishlist, setWishlist] = useState(() => readStorage('playshelf-wishlist', []));
  const [category, setCategory] = useState('全部游戏');
  const [wishlistOnly, setWishlistOnly] = useState(() => new URLSearchParams(window.location.search).get('wishlist') === '1');
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') || '');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchInput = useRef(null);
  const [sort, setSort] = useState('featured');
  const [catalogPage, setCatalogPage] = useState(1);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const detailPath = window.location.pathname.startsWith('/games/');
  const accountPath = ['/account', '/account/', '/account/history', '/account/history/'].includes(window.location.pathname);
  const accountSection = window.location.pathname.includes('/account/history') ? 'history' : 'overview';
  let detailId = '';
  try { detailId = decodeURIComponent(window.location.pathname.slice('/games/'.length)); } catch { /* Invalid URLs show the missing game state. */ }
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogFailed, setCatalogFailed] = useState(false);
  const detailGame = detailPath ? games.find((game) => game.id === detailId && game.active !== false) : null;
  function openGame(game) { window.location.assign(`/games/${encodeURIComponent(game.id)}`); }
  useEffect(() => {
    document.title = accountPath ? `${accountSection === 'history' ? '浏览历史' : '个人中心'} — 集游 PlayShelf` : detailGame ? `${detailGame.title} — 集游 PlayShelf` : '集游 PlayShelf — 好游戏，值得收藏';
  }, [detailGame, accountPath, accountSection]);
  const [email, setEmail] = useState('player@example.com');
  const [notice, setNotice] = useState('');
  const [order, setOrder] = useState(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const { history, clearHistory, storageError } = useBrowseHistory({ user, game: detailGame, ready: !catalogLoading && !catalogFailed });
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const points = useTechPoints({ user, onUnauthorized: loadSession, onReward: (reward) => showNotice(reward === 100 ? '幸运彩蛋！获得 100 科技点 ✦' : reward === 0 ? '遇到 0 点彩蛋，今日已签到，明天再试试手气。' : `签到成功，获得 ${reward} 科技点`) });
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [randomOpen, setRandomOpen] = useState(false);
  const [randomGenre, setRandomGenre] = useState('');
  const [randomGame, setRandomGame] = useState(null);
  const randomGenres = [...new Set(games.filter((game) => game.active !== false).map((game) => game.genre).filter(Boolean))];
  const randomPool = games.filter((game) => game.active !== false && (!randomGenre || game.genre === randomGenre));
  const randomSelect = useRef(null);
  useEffect(() => {
    if (!randomOpen) return;
    const previousFocus = document.activeElement;
    randomSelect.current?.focus();
    const closeOnEscape = (event) => { if (event.key === 'Escape') setRandomOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { window.removeEventListener('keydown', closeOnEscape); previousFocus?.focus(); };
  }, [randomOpen]);
  function drawRandomGame() {
    if (randomPool.length) setRandomGame(randomPool[Math.floor(Math.random() * randomPool.length)]);
  }

  async function loadSession() {
    setAuthLoading(true); setSessionError('');
    try {
      const response = await fetch('/api/me');
      if (!response.ok) throw new Error('无法读取登录状态，请重试。');
      const data = await response.json();
      setUser(data.user || null);
      if (data.user?.email) setEmail(data.user.email);
    } catch { setSessionError('无法读取登录状态，请确认网站服务已启动后重试。'); }
    finally { setAuthLoading(false); }
  }

  useEffect(() => {
    fetch('/api/games').then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { if (!Array.isArray(data)) throw new Error('invalid catalog'); setGames(data); })
      .catch(() => setCatalogFailed(true))
      .finally(() => setCatalogLoading(false));
    loadSession();
  }, []);

  useEffect(() => { localStorage.setItem('playshelf-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('playshelf-wishlist', JSON.stringify(wishlist)); }, [wishlist]);

  const filteredGames = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const matches = games.filter((game) => {
      const matchCategory = category === '全部游戏' || game.genre === category || game.tags?.includes(category);
      const matchSearch = !normalized || `${game.title} ${game.englishTitle} ${game.genre} ${(game.tags || []).join(' ')}`.toLowerCase().includes(normalized);
      const matchWishlist = !wishlistOnly || wishlist.includes(game.id);
      return matchCategory && matchSearch && matchWishlist;
    });
    if (sort === 'price-low') return [...matches].sort((a, b) => a.price - b.price);
    if (sort === 'rating') return [...matches].sort((a, b) => b.rating - a.rating);
    return matches;
  }, [games, category, search, sort, wishlist, wishlistOnly]);

  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filteredGames.length / pageSize));
  const currentPage = Math.min(catalogPage, pageCount);
  const visiblePages = useMemo(() => {
    if (pageCount <= 5) return Array.from({ length: pageCount }, (_, index) => index + 1);
    const nearbyPages = currentPage <= 2
      ? [1, 2, 3]
      : currentPage >= pageCount - 1
        ? [pageCount - 2, pageCount - 1, pageCount]
        : [currentPage - 1, currentPage, currentPage + 1];
    const pages = [...new Set([1, ...nearbyPages, pageCount])]
      .filter((page) => page >= 1 && page <= pageCount)
      .sort((a, b) => a - b);
    return pages.flatMap((page, index) => index > 0 && page - pages[index - 1] > 1 ? ['…', page] : [page]);
  }, [currentPage, pageCount]);
  const shownGames = useMemo(() => filteredGames.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filteredGames, currentPage]);

  useEffect(() => { setCatalogPage(1); }, [category, search, sort, wishlistOnly]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartLines = cart.map((item) => ({ ...item, game: games.find((game) => game.id === item.id) })).filter((item) => item.game);
  const cartTotal = cartLines.reduce((sum, item) => sum + item.game.price * item.quantity, 0);

  function showNotice(message) {
    setNotice(message);
    window.clearTimeout(showNotice.timeout);
    showNotice.timeout = window.setTimeout(() => setNotice(''), 2400);
  }

  function goToCatalogPage(page) {
    setCatalogPage(page);
  }

  function addToCart(game) {
    setCart((current) => {
      const found = current.find((item) => item.id === game.id);
      return found ? current.map((item) => item.id === game.id ? { ...item, quantity: Math.min(item.quantity + 1, 9) } : item) : [...current, { id: game.id, quantity: 1 }];
    });
    showNotice(`${game.title} 已加入购物车`);
  }

  function toggleWishlist(game) {
    const exists = wishlist.includes(game.id);
    setWishlist((current) => exists ? current.filter((id) => id !== game.id) : [...current, game.id]);
    showNotice(exists ? '已从愿望单移除' : '已加入愿望单');
  }

  function changeQuantity(id, amount) {
    setCart((current) => current.map((item) => item.id === id ? { ...item, quantity: item.quantity + amount } : item).filter((item) => item.quantity > 0));
  }

  async function checkout(event) {
    event.preventDefault();
    if (!cart.length || checkoutBusy) return;
    setCheckoutBusy(true);
    try {
      const response = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, items: cart.map(({ id, quantity }) => ({ id, quantity })) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '订单提交失败');
      setOrder(result);
      setCart([]);
      setCartOpen(false);
    } catch (error) {
      showNotice(error.message || '无法连接订单服务，请确认 API 已启动');
    } finally {
      setCheckoutBusy(false);
    }
  }

  function openAccount() {
    setAuthMode('login');
    setAuthName(user?.name || '');
    setAuthEmail(user?.email || '');
    setAuthPassword('');
    setAuthError('');
    setAuthOpen(true);
  }

  async function submitAuth(event) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch(`/api/${authMode === 'register' ? 'register' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '登录暂时失败，请稍后重试');
      setUser(result.user);
      setSessionError('');
      if (result.user.email) setEmail(result.user.email);
      setAuthPassword('');
      setAuthOpen(false);
      showNotice(authMode === 'register' ? '账号创建成功，欢迎来到集游' : '登录成功，欢迎回来');
    } catch (error) {
      setAuthError(error.message || '无法连接账号服务，请确认 API 已启动');
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    setAuthBusy(true);
    setAuthError('');
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) throw new Error('退出登录失败，请重试');
      setUser(null);
      setAuthOpen(false);
      showNotice('已安全退出登录');
    } catch (error) {
      setAuthError(error.message || '退出登录失败，请重试');
      showNotice(error.message || '退出登录失败，请重试');
    } finally {
      setAuthBusy(false);
    }
  }

  function chooseCategory(value) {
    setCategory(value);
    setWishlistOnly(false);
    setMobileMenuOpen(false);
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const heroGame = games[0] || catalog[0];
  const bestSellers = [...games].filter((game) => game.active !== false).sort((a, b) => b.rating - a.rating).slice(0, 30);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/#top" aria-label="集游首页"><span className="brand-mark"><img src="/jiyou-logo.png" alt="" /></span><span className="brand-word">集游<span>PLAY SHELF</span></span></a>
        <nav className={`main-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="主导航">
          <a className="nav-active" href="/#catalog" onClick={() => { setCategory('全部游戏'); setWishlistOnly(false); }}>商店</a>
          <a href="/#popular">人气精选</a>
          <a href="/#about">关于集游</a>
        </nav>
        <div className="header-actions">
          <div className={`search-box ${mobileSearchOpen ? 'is-open' : ''}`}><span className="search-icon"><Icon name="search" size={18} /></span><button className="search-toggle" type="button" aria-label="展开搜索" onClick={() => { const open = !mobileSearchOpen; setMobileSearchOpen(open); if (open) window.setTimeout(() => searchInput.current?.focus(), 20); }}><Icon name="search" size={18} /></button><input ref={searchInput} onKeyDown={(event) => { if ((detailPath || accountPath) && event.key === 'Enter') window.location.assign(`/?q=${encodeURIComponent(search)}#catalog`); }} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索游戏" aria-label="搜索游戏" /><kbd>⌘ K</kbd></div>
          <button className="icon-button random-head" type="button" aria-label="随机游戏" title="随机游戏" onClick={() => { setRandomGame(null); setRandomGenre(''); setRandomOpen(true); }}><Icon name="dice" /></button>
          <button className={`icon-button wishlist-head ${wishlistOnly ? 'is-active' : ''}`} aria-label={`愿望单 ${wishlist.length} 款`} onClick={() => { if (detailPath || accountPath) { window.location.assign('/?wishlist=1#catalog'); return; } const next = !wishlistOnly; setWishlistOnly(next); setCategory('全部游戏'); setSearch(''); document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); showNotice(next ? `正在显示愿望单 · ${wishlist.length} 款` : '正在显示全部游戏'); }}><Icon name="heart" /><span>{wishlist.length}</span></button>
          <AccountMenu user={user} loading={authLoading} busy={authBusy} error={authError || sessionError} onLogin={openAccount} onLogout={logout} points={points} Icon={Icon} />
          <button className="cart-button" onClick={() => setCartOpen(true)}><Icon name="bag" size={18} /><span>购物袋</span><b>{cartCount}</b></button>
          <button className="icon-button mobile-menu-button" aria-label="打开菜单" onClick={() => setMobileMenuOpen((open) => !open)}><Icon name={mobileMenuOpen ? 'close' : 'menu'} /></button>
        </div>
      </header>
      {announcementVisible && !detailPath && !accountPath && <div className="announcement"><span className="announcement-dot" /> 本周精选：独立佳作与人气大作持续上新 <a href="/#catalog">去逛逛 <Icon name="arrow" size={13} /></a><button className="announcement-close" type="button" aria-label="关闭顶部提示" onClick={() => setAnnouncementVisible(false)}><Icon name="close" size={14} /></button></div>}

      <main id="top">
        {storageError && user && (accountPath || detailPath) && <p className="history-storage-notice container" role="status">{storageError}</p>}
        {randomOpen && <div className="overlay modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setRandomOpen(false); }}>
          <section className="random-modal" role="dialog" aria-modal="true" aria-labelledby="random-title">
            <button className="modal-close icon-button" aria-label="关闭随机游戏" onClick={() => setRandomOpen(false)}><Icon name="close" /></button>
            <div className="random-symbol"><Icon name="dice" size={28} /></div>
            <div className="section-kicker">LUCKY PICK <span>✳</span></div>
            <h2 id="random-title">下一款，交给运气。</h2>
            <p className="random-intro">选一个类型，发现一款值得一玩的游戏。</p>
            <label className="random-filter">游戏类型<select ref={randomSelect} value={randomGenre} onChange={(event) => { setRandomGenre(event.target.value); setRandomGame(null); }}><option value="">全部类型</option>{randomGenres.map((genre) => <option value={genre} key={genre}>{genre}</option>)}</select></label>
            <p className="random-count">{randomPool.length ? `共有 ${randomPool.length} 款游戏等待抽取` : '这个类型暂无在售游戏，请选择其他类型。'}</p>
            {randomGame && <div className="random-result" aria-live="polite"><GameCover game={randomGame} className="random-cover" showDiscount={false} /><div><small>{randomGame.genre} · ★ {Number(randomGame.rating).toFixed(1)}</small><h3>{randomGame.title}</h3><p>{randomGame.englishTitle}</p><strong>{money(randomGame.price)}</strong></div></div>}
            <div className="random-actions"><button className="button button-lime" disabled={!randomPool.length} onClick={drawRandomGame}><Icon name="dice" size={18} />{randomGame ? '再抽一次' : '随机抽取'}</button>{randomGame && <button className="button button-outline" onClick={() => { setRandomOpen(false); openGame(randomGame); }}>查看详情 <Icon name="arrow" size={16} /></button>}</div>
          </section>
        </div>}
        {accountPath ? <UserCenter section={accountSection} user={user} authLoading={authLoading} authError={sessionError} onLogin={openAccount} onRetryAuth={loadSession} onLogout={logout} busy={authBusy} points={points} games={games} gamesLoading={catalogLoading} wishlistCount={wishlist.length} history={history} onClearHistory={clearHistory} onOpen={openGame} Cover={GameCover} Icon={Icon} money={money} /> : detailPath ? <GameDetails user={user} onLogin={openAccount} game={detailGame} games={games} loading={catalogLoading} failed={catalogFailed} wishlist={wishlist} onWishlist={toggleWishlist} onAdd={addToCart} onOpen={openGame} Cover={GameCover} Icon={Icon} money={money} /> : <>
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> 本周焦点 <span className="eyebrow-divider">/</span> 玩家之选</div>
            <h1>好游戏，<br /><em>值得</em>收藏。</h1>
            <p>从独立佳作到年度大作，发现下一段<br className="desktop-break" /> 让你舍不得暂停的冒险。</p>
            <div className="hero-actions"><button className="button button-lime" onClick={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })}>探索游戏 <Icon name="arrow" size={17} /></button><span className="hero-note">精选数字游戏 · 演示商城</span></div>
            <div className="hero-players"><div className="avatar-stack"><span>小</span><span>游</span><span>猫</span><span>＋</span></div><div><strong>{String(games.length).padStart(2, '0')} 款精选</strong><small>独立佳作与热门大作持续上新</small></div></div>
          </div>
          <button className="hero-art" style={{ '--cover-a': heroGame.colors?.[0], '--cover-b': heroGame.colors?.[1] }} onClick={() => openGame(heroGame)} aria-label={`查看${heroGame.title}`}>
            <img src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${heroGame.appId}/library_hero.jpg`} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
            <div className="hero-art-wash" /><span className="hero-index">FEATURED / 01</span><span className="hero-sticker">本周<br />推荐</span>
            <span className="hero-art-caption"><small>编辑精选 · {heroGame.genre}</small><strong>{heroGame.englishTitle}</strong></span>
            <span className="hero-art-price"><small>限时优惠</small><strong>{money(heroGame.price)}</strong></span>
            <span className="hero-art-arrow"><Icon name="arrow" size={20} /></span>
          </button>
          <div className="hero-side-label">PLAY MORE · PLAY WELL</div>
        </section>

        <section className="promise-bar container" aria-label="服务特点">
          <div><span className="promise-icon">✳</span><span><strong>下单有记录</strong><small>提交后生成演示订单</small></span></div>
          <div><span className="promise-icon">↗</span><span><strong>认真挑选</strong><small>每一款都值得体验</small></span></div>
          <div><span className="promise-icon">♡</span><span><strong>收藏心动</strong><small>加入愿望单慢慢挑</small></span></div>
          <div className="promise-note">GOOD GAMES, GOOD DAYS <span>✳</span></div>
        </section>

        <section className="catalog-section container" id="catalog">
          <div className="section-heading">
            <div><div className="section-kicker">{wishlistOnly ? 'YOUR WISHLIST' : 'THE COLLECTION'} <span>✳</span></div><h2>{wishlistOnly ? '我的愿望单' : '逛逛游戏'}<span className="heading-period">.</span></h2><p>{wishlistOnly ? '把心动的游戏留在这里。' : '今天想玩点什么？'}</p></div>
            <a className="text-link" href="/#popular">看看人气榜 <Icon name="arrow" size={16} /></a>
          </div>
          <div className="catalog-controls">
            <div className="category-tabs" role="tablist" aria-label="游戏分类">{categories.map((item) => <button key={item} className={category === item && !wishlistOnly ? 'active' : ''} onClick={() => { setCategory(item); setWishlistOnly(false); }}>{item}{item === '全部游戏' && <span>{games.length}</span>}</button>)}</div>
            <label className="sort-control"><span>排序</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">精选推荐</option><option value="rating">玩家评分</option><option value="price-low">价格从低到高</option></select></label>
          </div>
          <div className="catalog-results">{shownGames.length ? <div className="game-grid">{shownGames.map((game, index) => <article className="game-card" key={game.id} style={{ '--card-index': index }}>
            <button className="cover-button" onClick={() => openGame(game)} aria-label={`查看${game.title}详情`}><GameCover game={game} /><span className="cover-view">查看详情 <Icon name="arrow" size={14} /></span></button>
            <button className={`favorite-button ${wishlist.includes(game.id) ? 'is-favorite' : ''}`} aria-label={wishlist.includes(game.id) ? '移出愿望单' : '加入愿望单'} onClick={() => toggleWishlist(game)}><Icon name="heart" size={17} fill={wishlist.includes(game.id) ? 'currentColor' : 'none'} /></button>
            <div className="game-meta"><div className="game-tags"><span>{game.genre}</span><span className="rating">★ {game.rating.toFixed(1)}</span></div><button className="game-title" onClick={() => openGame(game)}>{game.title}</button><div className="game-bottom"><div><strong>{money(game.price)}</strong><del>{money(game.originalPrice)}</del></div><button className="add-button" onClick={() => addToCart(game)} aria-label={`将${game.title}加入购物车`}><Icon name="plus" size={18} /></button></div></div>
          </article>)}</div> : <div className="empty-state"><span>⌕</span><h3>暂时没有找到这款游戏</h3><p>试试其他关键词或分类吧。</p><button onClick={() => { setSearch(''); setCategory('全部游戏'); }}>查看全部游戏</button></div>}
          <div className="catalog-pagination" aria-label="游戏目录分页">
            <span className="catalog-page-summary">正在展示 <strong>{filteredGames.length ? (currentPage - 1) * pageSize + 1 : 0}–{Math.min(currentPage * pageSize, filteredGames.length)}</strong> / {filteredGames.length} 款精选游戏</span>
            {pageCount > 1 && <nav className="catalog-page-controls" aria-label="选择游戏目录页码">
              <button type="button" className="catalog-page-step" disabled={currentPage === 1} onClick={() => goToCatalogPage(currentPage - 1)} aria-label="上一页">←<span>上一页</span></button>
              {visiblePages.map((page, index) => typeof page === 'number' ? <button type="button" key={page} className={`catalog-page-number ${currentPage === page ? 'is-current' : ''}`} aria-label={`第 ${page} 页`} aria-current={currentPage === page ? 'page' : undefined} onClick={() => goToCatalogPage(page)}>{page}</button> : <span className="catalog-page-ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>)}
              <button type="button" className="catalog-page-step" disabled={currentPage === pageCount} onClick={() => goToCatalogPage(currentPage + 1)} aria-label="下一页"><span>下一页</span>→</button>
            </nav>}
            <span className="catalog-footer-mark">慢慢挑，总有一款对胃口 <span>↗</span></span>
          </div>
          </div>
        </section>

        <section className="popular-section" id="popular"><div className="container popular-inner"><div className="popular-copy"><div className="section-kicker">PLAYER FAVORITES <span>✳</span></div><h2>玩家都在玩<span className="heading-period">.</span></h2><p>好评如潮的游戏，值得加入你的收藏。</p><a className="button button-outline" href="/#catalog" onClick={() => setCategory('全部游戏')}>浏览全部 <Icon name="arrow" size={16} /></a></div><div className="popular-list">{bestSellers.map((game, index) => <button className="popular-row" key={game.id} onClick={() => openGame(game)}><span className="popular-number">{String(index + 1).padStart(2, '0')}</span><GameCover game={game} className="popular-thumb" showDiscount={false} /><span className="popular-info"><strong>{game.title}</strong><small>{game.genre} · 玩家评分 {game.rating.toFixed(1)}</small></span><span className="popular-detail"><span className="popular-description">{game.description || `${game.title}，探索属于你的下一段游戏冒险。`}</span><span className="popular-tags">{(game.tags || []).slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</span></span><span className="popular-price"><strong>{money(game.price)}</strong><del>{money(game.originalPrice)}</del></span><Icon name="arrow" size={17} /></button>)}</div></div></section>

        <section className="newsletter container" id="about"><div className="newsletter-mark">集<br />游<span>✳</span></div><div><div className="section-kicker">A LITTLE NOTE FROM US</div><h2>好游戏，不该被错过。</h2><p>集游认真挑选每一款游戏，把下一段冒险送到你面前。</p></div><a href="/#top" className="newsletter-link">回到顶部 <span>↑</span></a><div className="newsletter-orbit orbit-one" /><div className="newsletter-orbit orbit-two" /></section>
        </>}
      </main>

      <footer className="site-footer container"><a className="brand footer-brand" href="/#top"><span className="brand-mark"><img src="/jiyou-logo.png" alt="" /></span><span className="brand-word">集游<span>PLAY SHELF</span></span></a><span>© 2026 集游 PlayShelf · 为好游戏留个位置</span><span className="footer-demo">DEMO STORE · 模拟订单演示</span></footer>

      {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><aside className="cart-drawer" aria-label="购物袋"><div className="drawer-head"><div><span className="section-kicker">YOUR BAG</span><h2>购物袋 <span>({cartCount})</span></h2></div><button className="icon-button" aria-label="关闭购物袋" onClick={() => setCartOpen(false)}><Icon name="close" /></button></div>{cartLines.length ? <><div className="cart-items">{cartLines.map(({ game, quantity }) => <div className="cart-line" key={game.id}><GameCover game={game} className="cart-thumb" /><div className="cart-line-info"><strong>{game.title}</strong><small>{game.genre} · 数字版</small><b>{money(game.price)}</b><div className="quantity-control"><button aria-label="减少数量" onClick={() => changeQuantity(game.id, -1)}><Icon name="minus" size={13} /></button><span>{quantity}</span><button aria-label="增加数量" onClick={() => changeQuantity(game.id, 1)}><Icon name="plus" size={13} /></button><button className="remove-item" onClick={() => setCart((current) => current.filter((item) => item.id !== game.id))}>移除</button></div></div></div>)}</div><form className="checkout-form" onSubmit={checkout}><label>订单联系邮箱<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><div className="cart-total"><span>合计</span><strong>{money(cartTotal)}</strong></div><button className="button button-lime checkout-button" disabled={checkoutBusy}>{checkoutBusy ? '正在提交…' : '提交演示订单'} <Icon name="arrow" size={17} /></button><p>这是作品集演示站，不会产生真实支付。</p></form></> : <div className="cart-empty"><div className="empty-bag"><Icon name="bag" size={28} /></div><h3>购物袋还是空的</h3><p>去挑一款喜欢的游戏吧。</p><button className="button button-lime" onClick={() => { setCartOpen(false); if (detailPath || accountPath) { window.location.assign('/#catalog'); return; } document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }); }}>去逛逛 <Icon name="arrow" size={16} /></button></div>}</aside></div>}


      {order && <div className="overlay modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setOrder(null); }}><section className="success-modal" role="dialog" aria-modal="true"><button className="modal-close icon-button" aria-label="关闭" onClick={() => setOrder(null)}><Icon name="close" /></button><div className="success-icon"><Icon name="check" size={28} /></div><div className="section-kicker">ORDER RECEIVED <span>✳</span></div><h2>订单已创建</h2><p>演示订单已保存。下次我们可以继续接入真实的支付和游戏发放流程。</p><div className="order-reference"><span>订单编号</span><strong>{order.orderId}</strong><span>订单金额</span><strong>{money(order.total)}</strong></div><button className="button button-lime" onClick={() => setOrder(null)}>继续逛逛 <Icon name="arrow" size={16} /></button></section></div>}

      {authOpen && <div className="overlay modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setAuthOpen(false); }}><section className={`auth-modal ${user ? 'account-modal' : ''}`} role="dialog" aria-modal="true" aria-label={user ? '账户信息' : authMode === 'login' ? '登录集游' : '注册集游'}><button className="modal-close icon-button" aria-label="关闭" onClick={() => setAuthOpen(false)}><Icon name="close" /></button>{user ? <><div className="account-avatar"><Icon name="user" size={25} /></div><div className="section-kicker">PLAYER ACCOUNT <span>✳</span></div><h2>你好，{user.name}</h2><p>你已登录集游账号。</p><div className="account-email"><span>{user.role === 'admin' && !user.email ? '管理员账号' : '登录邮箱'}</span><strong>{user.email || user.username || user.name}</strong></div>{authError && <div className="auth-error" role="alert">{authError}</div>}<button className="button button-outline account-logout" disabled={authBusy} onClick={logout}>{authBusy ? '正在退出…' : '退出登录'}</button><small className="auth-note">购物袋与愿望单暂存在此浏览器。</small></> : <><div className="auth-symbol"><Icon name="user" size={20} /></div><div className="section-kicker">PLAYER ACCOUNT <span>✳</span></div><h2>{authMode === 'login' ? '欢迎回来。' : '创建你的账号。'}</h2><p className="auth-intro">{authMode === 'login' ? '登录集游，继续发现下一段冒险。' : '注册一个账号，开启你的集游之旅。'}</p><form className="auth-form" onSubmit={submitAuth}>{authMode === 'register' && <label>昵称<input required autoComplete="nickname" maxLength={32} value={authName} onChange={(event) => setAuthName(event.target.value)} placeholder="怎么称呼你？" /></label>}<label>{authMode === 'login' ? '邮箱或管理员账号' : '邮箱'}<input required autoComplete={authMode === 'login' ? 'username' : 'email'} type={authMode === 'login' ? 'text' : 'email'} maxLength={254} value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder={authMode === 'login' ? '邮箱或管理员账号' : 'you@example.com'} /></label><label>密码<input required autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} type="password" minLength={authMode === 'register' ? 8 : 1} maxLength={128} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder={authMode === 'register' ? '至少 8 个字符' : '输入你的密码'} /></label>{authError && <div className="auth-error" role="alert">{authError}</div>}<button className="button button-lime auth-submit" disabled={authBusy}>{authBusy ? '请稍候…' : authMode === 'login' ? '登录' : '创建账号'} <Icon name="arrow" size={16} /></button></form><div className="auth-switch">{authMode === 'login' ? '还没有账号？' : '已经注册过了？'}<button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError(''); setAuthPassword(''); }}>{authMode === 'login' ? '立即注册' : '去登录'}</button></div><small className="auth-note">密码经过 scrypt 哈希后保存 · 作品集演示账号</small></>}</section></div>}

      {notice && <div className="toast"><span>✳</span>{notice}</div>}
    </div>
  );
}

export default App;
