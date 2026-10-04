import './user-center.css';

const dateFormatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
const visitFormatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const pointsFormatter = new Intl.NumberFormat('zh-CN');
const resetFormatter = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const emptyPoints = { status: null, loading: false, busy: false, error: '', refresh: async () => {}, checkIn: async () => {} };

function parseDate(value) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function VisitTime({ value }) {
  const date = parseDate(value);
  return date ? <time dateTime={date.toISOString()}>{visitFormatter.format(date)}</time> : <span>浏览时间未知</span>;
}

function EmptyHistory({ Icon }) {
  return <div className="uc-empty">
    <span className="uc-empty-icon"><Icon name="history" size={28} /></span>
    <h3>还没有浏览记录</h3>
    <p>打开感兴趣的游戏，之后就能在这里找到它。</p>
    <a className="button button-lime" href="/#catalog">去探索游戏 <Icon name="arrow" size={16} /></a>
  </div>;
}

function UnavailableCover({ className, Icon }) {
  return <div className={`uc-unavailable-cover ${className}`} aria-hidden="true"><Icon name="bag" size={26} /><span>暂无封面</span></div>;
}

function RecentGame({ record, game, Cover, Icon, money, onOpen }) {
  return <article className={`uc-recent-game ${game ? '' : 'is-unavailable'}`}>
    {game ? <button className="uc-cover-link" type="button" onClick={() => onOpen(game)} aria-label={`查看${game.title}详情`}>
      <Cover game={game} className="uc-recent-cover" showDiscount={false} />
      <span className="uc-cover-action">查看详情 <Icon name="arrow" size={15} /></span>
    </button> : <UnavailableCover className="uc-recent-cover" Icon={Icon} />}
    {game ? <button className="uc-game-title" type="button" onClick={() => onOpen(game)}>{game.title}</button> : <h3 className="uc-game-title">游戏暂不可用</h3>}
    <div className="uc-recent-meta"><span>{game ? game.genre || '数字游戏' : '已下架或已移除'}</span>{game && <strong>{money(game.price)}</strong>}</div>
    <div className="uc-visit"><VisitTime value={record.visitedAt} /></div>
  </article>;
}

function HistoryRow({ record, game, Cover, Icon, money, onOpen }) {
  return <li className={`uc-history-row ${game ? '' : 'is-unavailable'}`}>
    {game ? <button className="uc-cover-link" type="button" onClick={() => onOpen(game)} aria-label={`查看${game.title}详情`}><Cover game={game} className="uc-history-cover" showDiscount={false} /></button> : <UnavailableCover className="uc-history-cover" Icon={Icon} />}
    <div className="uc-history-info">
      {game ? <button className="uc-game-title" type="button" onClick={() => onOpen(game)}>{game.title}</button> : <h3 className="uc-game-title">游戏暂不可用</h3>}
      <p>{game ? game.englishTitle || game.genre || '数字游戏' : '这款游戏已下架或已移除，暂时无法查看详情。'}</p>
      <span className="uc-visit"><Icon name="history" size={13} /><VisitTime value={record.visitedAt} /></span>
    </div>
    {game ? <div className="uc-history-action"><strong>{money(game.price)}</strong><button className="button button-outline" type="button" onClick={() => onOpen(game)}>查看详情 <Icon name="arrow" size={15} /></button></div> : <span className="uc-unavailable-tag">暂不可用</span>}
  </li>;
}

export default function UserCenter({
  section = 'overview', user, authLoading = false, authError, busy = false,
  onLogin, onRetryAuth, onLogout, games = [], gamesLoading = false, wishlistCount = 0, history = [],
  onClearHistory, onOpen, Cover, Icon, money, points = emptyPoints,
}) {
  const isHistory = section === 'history';
  const title = isHistory ? '浏览历史' : '个人中心';
  const records = [...history].sort((a, b) => (parseDate(b.visitedAt)?.getTime() || 0) - (parseDate(a.visitedAt)?.getTime() || 0));
  const gameById = new Map(games.map((game) => [String(game.id), game]));
  const nickname = user?.nickname || user?.name || user?.username || '集游玩家';
  const contact = user?.email || user?.username || '集游账号';
  const createdAt = parseDate(user?.createdAt || user?.created_at);
  const sessionError = typeof authError === 'string' ? authError : authError?.message;
  const { status: pointsStatus = null, loading: pointsLoading = false, busy: pointsBusy = false, error: pointsError = '', refresh = emptyPoints.refresh, checkIn = emptyPoints.checkIn } = points || emptyPoints;
  const checkedIn = pointsStatus?.checkedInToday === true;
  const reward = checkedIn ? pointsStatus.todayReward : null;
  const nextReset = parseDate(pointsStatus?.nextResetAt);
  const checkInLabel = pointsBusy ? '正在签到…' : checkedIn ? '今日已签到' : '今日签到';
  const clearHistory = () => {
    if (window.confirm('清空当前账号在此浏览器中的全部浏览记录？此操作无法撤销。')) onClearHistory();
  };

  return <section className="user-center container" aria-label={title}>
    <nav className="uc-breadcrumb" aria-label="当前位置"><a href="/">首页</a><span aria-hidden="true">/</span>{isHistory && <><a href="/account">个人中心</a><span aria-hidden="true">/</span></>}<span aria-current="page">{title}</span></nav>
    <header className="uc-page-heading"><div><h1>{title}</h1><p>{isHistory ? '找回刚刚让你心动的游戏。' : '你的收藏与足迹，都在这里。'}</p></div><a className="uc-text-link" href="/#catalog">继续逛逛 <Icon name="arrow" size={16} /></a></header>

    {authLoading ? <section className="uc-session-state" aria-busy="true" role="status"><span className="uc-state-symbol"><Icon name="user" size={29} /></span><h2>正在载入账号…</h2><p>稍候片刻，即可查看你的个人中心。</p></section> : authError ? <section className="uc-session-state" role="alert"><span className="uc-state-symbol"><Icon name="user" size={29} /></span><h2>暂时无法载入账号</h2><p>{sessionError || '账号信息获取失败，请重试。'}</p><button className="button button-lime" type="button" disabled={busy} onClick={onRetryAuth}>重新载入 <Icon name="arrow" size={16} /></button></section> : !user ? <section className="uc-session-state"><span className="uc-state-symbol"><Icon name="user" size={29} /></span><h2>登录，开启你的集游空间。</h2><p>查看个人资料，整理愿望单，找回浏览过的游戏。</p><button className="button button-lime" type="button" disabled={busy} onClick={onLogin}>{busy ? '请稍候…' : '登录 / 注册'} <Icon name="arrow" size={16} /></button><small>浏览记录仅保存在当前浏览器。</small></section> : <div className="uc-layout">
      <aside className="uc-sidebar" aria-label="个人账户">
        <div className="uc-sidebar-profile"><span className="uc-avatar" aria-hidden="true">{Array.from(nickname)[0]}</span><strong>{nickname}</strong><span>{user.role === 'admin' ? '管理员' : '集游玩家'}</span></div>
        <nav className="uc-nav" aria-label="个人中心导航">
          <a className={!isHistory ? 'is-current' : ''} href="/account" aria-current={!isHistory ? 'page' : undefined}><Icon name="user" size={18} /><span>个人中心</span></a>
          <a className={isHistory ? 'is-current' : ''} href="/account/history" aria-current={isHistory ? 'page' : undefined}><Icon name="history" size={18} /><span>浏览历史</span><small>{records.length}</small></a>
          <a href="/?wishlist=1#catalog"><Icon name="heart" size={18} /><span>我的愿望单</span><small>{wishlistCount}</small></a>
        </nav>
        <button className="uc-logout" type="button" disabled={busy} onClick={onLogout}><Icon name="logout" size={16} />{busy ? '正在退出…' : '退出登录'}</button>
      </aside>

      <div className="uc-content">
        {isHistory ? <section className="uc-history-panel" aria-labelledby="uc-history-title">
          <div className="uc-panel-heading"><div><h2 id="uc-history-title">最近浏览 <span>{records.length} 款</span></h2><p>浏览记录仅保存在当前浏览器。</p></div>{records.length > 0 && <button className="uc-clear" type="button" onClick={clearHistory}>清空记录</button>}</div>
          {gamesLoading && records.length ? <p className="uc-history-loading" role="status">正在载入游戏信息…</p> : records.length ? <ul className="uc-history-list">{records.map((record, index) => <HistoryRow key={`${record.gameId}:${record.visitedAt}:${index}`} record={record} game={gameById.get(String(record.gameId))} Cover={Cover} Icon={Icon} money={money} onOpen={onOpen} />)}</ul> : <EmptyHistory Icon={Icon} />}
        </section> : <>
          <section className="uc-profile-panel" aria-labelledby="uc-profile-title"><div><span className="uc-profile-caption">账号信息</span><h2 id="uc-profile-title">你好，{nickname}</h2><p className="uc-contact">{contact}</p><p className="uc-joined"><Icon name="calendar" size={14} />{createdAt ? <><time dateTime={createdAt.toISOString()}>{dateFormatter.format(createdAt)}</time> 加入集游</> : '加入日期暂未提供'}</p></div><span className="uc-profile-mark" aria-hidden="true"><Icon name="user" size={46} /></span></section>

          <div className="uc-stats">
            <a className="uc-stat" href="/?wishlist=1#catalog"><span className="uc-stat-label"><Icon name="heart" size={18} />愿望单<Icon name="arrow" size={15} /></span><strong>{wishlistCount}<small> 款游戏</small></strong><p>此浏览器中收藏的游戏</p></a>
            <a className="uc-stat" href="/account/history"><span className="uc-stat-label"><Icon name="history" size={18} />浏览历史<Icon name="arrow" size={15} /></span><strong>{records.length}<small> 款游戏</small></strong><p>随时回来，继续探索</p></a>
            <div className={`uc-stat uc-stat-points ${pointsStatus ? '' : 'is-loading'}`} aria-busy={pointsLoading}><span className="uc-stat-label"><Icon name="spark" size={18} />科技点</span><strong aria-label={pointsStatus ? `${pointsStatus.balance} 科技点` : '科技点余额尚未载入'}>{pointsStatus ? pointsFormatter.format(pointsStatus.balance) : '—'}</strong><p>{pointsStatus ? '每日签到，积累科技点' : pointsError ? '暂时无法载入' : '正在载入…'}</p></div>
          </div>

          <section className={`uc-checkin ${checkedIn ? 'is-checked' : ''} ${reward === 100 ? 'is-lucky' : reward === 0 ? 'is-zero' : ''}`} aria-labelledby="uc-checkin-title" aria-busy={pointsBusy}>
            <span className="uc-checkin-icon" aria-hidden="true"><Icon name={checkedIn ? 'check' : 'calendar'} size={24} /></span>
            <div className="uc-checkin-main"><h2 id="uc-checkin-title">今日签到{checkedIn && <span>已完成</span>}</h2><p>每天签一次，领取随机科技点。</p><p className="uc-checkin-reset">北京时间 00:00 重置{nextReset && <> · 下次重置 <time dateTime={nextReset.toISOString()}>{resetFormatter.format(nextReset)}</time></>}</p></div>
            <button className={`button ${checkedIn ? 'button-outline' : 'button-lime'} uc-checkin-button`} type="button" disabled={!pointsStatus || pointsLoading || pointsBusy || checkedIn || busy} onClick={checkIn}>{checkedIn && !pointsBusy && <Icon name="check" size={15} />}{checkInLabel}</button>
            <p className="uc-checkin-result" role="status">{pointsBusy ? '正在领取今日奖励…' : !pointsStatus ? pointsError ? '科技点信息暂时无法载入，请重新载入。' : '正在载入签到状态…' : checkedIn ? reward === 100 ? <><strong>幸运签！+100 科技点</strong><span>今日的幸运奖励已到账。</span></> : reward === 0 ? <><strong>今日抽中 0 科技点</strong><span>这次是罕见的空签，明天再试一次。</span></> : typeof reward === 'number' ? <>今日获得 <strong>+{reward} 科技点</strong>，已计入余额。</> : '今日签到已完成，明天再来。' : '大多数签到可获得 20–40 科技点，也有机会抽中 100。'}</p>
            {pointsError && <div className="uc-points-error"><p role="alert">{pointsError}</p><button type="button" disabled={pointsLoading || pointsBusy || busy} onClick={refresh}>{pointsLoading ? '正在载入…' : '重新载入'}</button></div>}
            <details className="uc-checkin-rules"><summary>查看奖励概率</summary><dl><div><dt>20–40 科技点</dt><dd>80%</dd></div><div><dt>1–19 科技点</dt><dd>8%</dd></div><div><dt>41–50 科技点</dt><dd>10.9%</dd></div><div><dt>100 科技点</dt><dd>1%</dd></div><div><dt>0 科技点</dt><dd>0.1%</dd></div></dl></details>
          </section>

          <section className="uc-recent" aria-labelledby="uc-recent-title"><div className="uc-panel-heading"><div><h2 id="uc-recent-title">最近浏览</h2><p>浏览记录仅保存在当前浏览器。</p></div><a className="uc-text-link" href="/account/history">查看全部 <Icon name="arrow" size={15} /></a></div>{gamesLoading && records.length ? <p className="uc-history-loading" role="status">正在载入游戏信息…</p> : records.length ? <div className="uc-recent-grid">{records.slice(0, 4).map((record, index) => <RecentGame key={`${record.gameId}:${record.visitedAt}:${index}`} record={record} game={gameById.get(String(record.gameId))} Cover={Cover} Icon={Icon} money={money} onOpen={onOpen} />)}</div> : <EmptyHistory Icon={Icon} />}</section>
        </>}
      </div>
    </div>}
  </section>;
}
