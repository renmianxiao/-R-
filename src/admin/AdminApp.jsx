import { useEffect, useState } from 'react';
import AdminShell from './AdminShell.jsx';
import OverviewPage from './pages/OverviewPage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import { adminRequest } from './admin-api.js';
import './admin.css';

const routeDetails = {
  overview: { title: '经营概览', description: '掌握商品与演示订单的当前状态。' },
  products: { title: '商品管理', description: '整理在售商品，更新目录信息。' },
  orders: { title: '订单管理', description: '查看演示订单并更新处理状态。' },
};
function AdminAccessPage({ mode, error, onLogin, busy }) {
  const isLogin = mode === 'login'; const isError = mode === 'error'; const isNotFound = mode === 'not-found';
  return <main className="admin-access"><div className="admin-access-card">
    <a className="admin-brand admin-access-brand" href="/" aria-label="返回集游商城"><span className="admin-brand-mark"><img src="/jiyou-logo.png" alt="" /></span><span><strong>集游</strong><small>PLAY SHELF</small></span></a>
    <div className="admin-access-icon"><span /><span /><span /></div><p className="admin-access-kicker">管理员入口</p>
    <h1>{isLogin ? '进入管理后台' : isError ? '无法加载管理后台' : isNotFound ? '没有找到页面' : '当前账号无法访问'}</h1>
    <p className="admin-access-copy">{isLogin ? '使用已获授权的集游账号登录。新注册账号需要先由本机管理员设置权限。' : isError ? '暂时无法读取登录状态，请检查服务后重试。' : isNotFound ? '这个后台地址不存在，可以返回管理概览继续操作。' : '此页面仅限管理员账号使用。请切换账号或返回商城。'}</p>
    {isLogin && <form className="admin-login-form" onSubmit={onLogin}><label>管理员账号<input name="email" type="text" autoComplete="username" required maxLength={254} placeholder="输入管理员账号或邮箱" /></label><label>密码<input name="password" type="password" autoComplete="current-password" required maxLength={128} placeholder="输入账号密码" /></label>{error && <p className="admin-form-error" role="alert">{error}</p>}<button className="admin-primary-button" type="submit" disabled={busy}>{busy ? '正在登录…' : '登录后台'}<span aria-hidden="true">↗</span></button></form>}
    {!isLogin && error && <p className="admin-form-error" role="alert">{error}</p>}<a className="admin-back-link" href="/">返回商城 <span aria-hidden="true">↗</span></a>
  </div><div className="admin-access-aside"><span>PLAY SHELF / CONTROL ROOM</span><p>把每一次上新<br />和订单处理，<em>安排妥当。</em></p><small>商品目录 · 演示订单</small></div></main>;
}
function AdminLoading() { return <main className="admin-loading" role="status"><span className="admin-loading-mark"><i /><i /><i /></span><p>正在确认管理员权限…</p></main>; }

export default function AdminApp() {
  const [access, setAccess] = useState('loading'); const [user, setUser] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/admin';
  const routes = { '/admin': 'overview', '/admin/products': 'products', '/admin/orders': 'orders' };
  const section = routes[pathname] || null;
  useEffect(() => { let active = true; adminRequest('/api/me').then(({ user: currentUser }) => { if (!active) return; setUser(currentUser); setAccess(!currentUser ? 'login' : currentUser.role === 'admin' ? 'admin' : 'forbidden'); }).catch((e) => { if (active) { setError(e.message); setAccess('error'); } }); return () => { active = false; }; }, []);
  async function login(event) { event.preventDefault(); if (busy) return; const form = new FormData(event.currentTarget); setBusy(true); setError(''); try { const result = await adminRequest('/api/login', { method: 'POST', body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) }); setUser(result.user); setAccess(result.user?.role === 'admin' ? 'admin' : 'forbidden'); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  async function logout() { try { await adminRequest('/api/logout', { method: 'POST' }); } catch {} finally { window.location.href = '/'; } }
  if (access === 'loading') return <AdminLoading />;
  if (access === 'login' || access === 'forbidden' || access === 'error') return <AdminAccessPage mode={access} error={error} onLogin={login} busy={busy} />;
  if (!section) return <AdminAccessPage mode="not-found" error="没有找到这个管理页面。" />;
  const Page = { overview: OverviewPage, products: ProductsPage, orders: OrdersPage }[section];
  return <AdminShell active={section} user={user} onLogout={logout}><div className="admin-page-heading"><div><p className="admin-page-context">管理工作台 <span>/</span> {routeDetails[section].title}</p><h1>{routeDetails[section].title}</h1><p className="admin-page-description">{routeDetails[section].description}</p></div><div className="admin-heading-date"><span>今天</span><strong>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</strong></div></div><Page /></AdminShell>;
}
