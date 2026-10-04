import { useEffect, useRef, useState } from 'react';
import './account-menu.css';

const emptyPoints = { status: null, loading: false, busy: false, error: '', refresh: async () => {}, checkIn: async () => {} };
const pointsFormatter = new Intl.NumberFormat('zh-CN');
const resetFormatter = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export default function AccountMenu({ user, loading, busy, error, onLogin, onLogout, Icon, points = emptyPoints }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const { status = null, loading: pointsLoading = false, busy: pointsBusy = false, error: pointsError = '', refresh = emptyPoints.refresh, checkIn = emptyPoints.checkIn } = points || emptyPoints;
  const checkedIn = status?.checkedInToday === true;
  const reward = checkedIn ? status.todayReward : null;
  const nextReset = status?.nextResetAt ? new Date(status.nextResetAt) : null;
  const validReset = nextReset && !Number.isNaN(nextReset.getTime());
  const checkInLabel = pointsBusy ? '正在签到…' : checkedIn ? '今日已签到' : '今日签到';
  useEffect(() => { setOpen(false); }, [user?.id]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event) => { if (!root.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', dismiss); document.removeEventListener('keydown', escape); };
  }, [open]);
  return <div className="account-menu-root" ref={root} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button className="account-button" type="button" ref={trigger} disabled={loading || (!user && busy)} aria-label={user ? `账户：${user.name}` : '登录或注册'} aria-expanded={user ? open : undefined} aria-controls={user ? 'account-dropdown' : undefined} onClick={() => user ? setOpen((value) => !value) : onLogin()}><Icon name="user" size={17} /><span>{loading ? '正在载入…' : user ? user.name : busy ? '请稍候…' : '登录 / 注册'}</span></button>
    {user && open && <div className="account-dropdown" id="account-dropdown">
      <div className="account-menu-identity"><span className="account-menu-avatar">{Array.from(user.name || '游')[0]}</span><div><strong>{user.name}</strong><small>{user.email || user.username || '集游玩家'}</small></div></div>
      <div className="account-menu-points" aria-busy={pointsLoading}><span><Icon name="spark" size={16} />科技点</span><strong aria-label={status ? `${status.balance} 科技点` : '科技点余额尚未载入'}>{status ? pointsFormatter.format(status.balance) : '—'}</strong></div>
      <nav aria-label="个人账户"><a href="/account"><Icon name="user" size={17} /><span>个人中心</span><Icon name="arrow" size={14} /></a><a href="/account/history"><Icon name="history" size={17} /><span>历史记录</span><Icon name="arrow" size={14} /></a><button className={`account-menu-checkin ${checkedIn ? 'is-checked' : ''}`} type="button" disabled={!status || pointsLoading || pointsBusy || checkedIn || busy} onClick={checkIn}><Icon name={checkedIn ? 'check' : 'calendar'} size={17} /><span>{checkInLabel}</span>{checkedIn && typeof reward === 'number' && <small>{reward === 0 ? '0 点' : `+${reward} 点`}</small>}</button>{user.role === 'admin' && <a href="/admin"><Icon name="settings" size={17} /><span>管理后台</span><Icon name="arrow" size={14} /></a>}</nav>
      <div className="account-menu-daily">
        <p className={reward === 100 ? 'is-lucky' : reward === 0 ? 'is-zero' : ''} role="status">{pointsBusy ? '签到中，请稍候…' : !status ? pointsError ? '科技点信息暂时无法载入' : '正在载入科技点…' : checkedIn ? reward === 100 ? '幸运签！今日获得 100 科技点。' : reward === 0 ? '今日抽中 0 科技点，明天再试一次。' : typeof reward === 'number' ? `今日获得 ${reward} 科技点。` : '今日签到已完成。' : '签到领取今日随机科技点。'}</p>
        <small>每天北京时间 00:00 重置{validReset && <><br />下次重置：<time dateTime={nextReset.toISOString()}>{resetFormatter.format(nextReset)}</time></>}</small>
      </div>
      {pointsError && <div className="account-menu-points-error"><p role="alert">{pointsError}</p><button type="button" disabled={pointsLoading || pointsBusy || busy} onClick={refresh}>{pointsLoading ? '正在载入…' : '重新载入'}</button></div>}
      <button className="account-menu-logout" type="button" disabled={busy} onClick={onLogout}><Icon name="logout" size={16} />{busy ? '正在退出…' : '退出登录'}</button>
      {error && <p className="account-menu-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
