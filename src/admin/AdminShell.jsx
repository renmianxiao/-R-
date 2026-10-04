const navigation = [
  { id: 'overview', label: '经营概览', href: '/admin', icon: 'overview' },
  { id: 'products', label: '商品管理', href: '/admin/products', icon: 'products' },
  { id: 'orders', label: '订单管理', href: '/admin/orders', icon: 'orders' },
];

function AdminIcon({ name, size = 18 }) {
  const paths = {
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1" /><rect x="13.5" y="3.5" width="7" height="7" rx="1" /><rect x="3.5" y="13.5" width="7" height="7" rx="1" /><rect x="13.5" y="13.5" width="7" height="7" rx="1" /></>,
    products: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4.5 7.7 7.5 4.4 7.5-4.4M12 12.1V21" /></>,
    orders: <><path d="M6 3.5h12v17H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    shop: <><path d="M4 10h16l-1 10H5L4 10Z" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H4" /><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>,
    shield: <><path d="M12 3 19 6v5c0 4.8-2.8 8-7 10-4.2-2-7-5.2-7-10V6l7-3Z" /><path d="m9 12 2 2 4-4" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function AdminShell({ active, user, onLogout, children }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="/" aria-label="集游商城">
          <span className="admin-brand-mark"><img src="/jiyou-logo.png" alt="" /></span>
          <span><strong>集游</strong><small>PLAY SHELF</small></span>
        </a>
        <div className="admin-sidebar-label">工作台</div>
        <nav className="admin-nav" aria-label="后台导航">
          {navigation.map((item) => <a key={item.id} className={`admin-nav-link ${active === item.id ? 'is-active' : ''}`} href={item.href} aria-current={active === item.id ? 'page' : undefined}><AdminIcon name={item.icon} /><span>{item.label}</span>{active === item.id && <i className="admin-nav-indicator" />}</a>)}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-security-note"><AdminIcon name="shield" size={16} /><span>管理员专属空间</span><b>已保护</b></div>
          <a className="admin-nav-link admin-shop-link" href="/"><AdminIcon name="shop" /><span>返回商城</span><span className="admin-external-mark">↗</span></a>
          <div className="admin-profile"><span className="admin-avatar">{(user?.name || user?.email || '管').slice(0, 1).toUpperCase()}</span><span className="admin-profile-copy"><strong>{user?.name || '管理员'}</strong><small>{user?.email}</small></span><button className="admin-logout" type="button" onClick={onLogout} aria-label="退出登录" title="退出登录"><AdminIcon name="logout" size={17} /></button></div>
        </div>
      </aside>
      <div className="admin-main-column">
        <header className="admin-topbar"><div className="admin-topbar-location"><span className="admin-location-dot" /><span>集游商城</span><span className="admin-location-slash">/</span><strong>管理后台</strong></div><div className="admin-topbar-right"><span className="admin-live-indicator"><i />服务运行中</span><a href="/" className="admin-topbar-shop">查看商城 <span>↗</span></a></div></header>
        <main className="admin-main">{children}</main>
        <footer className="admin-footer"><span>集游 PlayShelf</span><span>本机演示后台 · 数据保存在项目本地</span></footer>
      </div>
    </div>
  );
}
