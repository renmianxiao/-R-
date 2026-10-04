import { useEffect, useState } from 'react';
import { adminRequest } from '../admin-api.js';

const money = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 });

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    adminRequest('/api/admin/overview').then((result) => { if (active) setData(result); }).catch((e) => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <section className="admin-overview" aria-label="经营概览数据">
    <div className="admin-overview-hero">
      <div><p className="admin-section-eyebrow">本机演示数据 / LIVE SNAPSHOT</p><h2>待处理订单</h2><p>需要进一步查看的演示订单</p></div>
      <div className="admin-overview-primary"><strong>{loading ? '—' : data?.pendingOrderCount ?? 0}</strong><span>笔</span><i aria-hidden="true">↗</i></div>
      <span className="admin-overview-index">01 <i /> 04</span>
    </div>
    <div className="admin-metric-grid">
      <article className="admin-metric-card"><span className="admin-metric-number">02</span><span className="admin-metric-label">在售商品</span><strong>{loading ? '—' : data?.productCount ?? 0}</strong><small>当前可在商城浏览</small></article>
      <article className="admin-metric-card"><span className="admin-metric-number">03</span><span className="admin-metric-label">订单总数</span><strong>{loading ? '—' : data?.orderCount ?? 0}</strong><small>包含所有演示订单状态</small></article>
      <article className="admin-metric-card admin-metric-amount"><span className="admin-metric-number">04</span><span className="admin-metric-label">演示订单金额</span><strong>{loading ? '—' : money.format(data?.demoOrderAmount || 0)}</strong><small>已排除已取消订单 · 非实际收入</small></article>
    </div>
    {error && <div className="admin-inline-error" role="alert">{error}<button type="button" onClick={() => window.location.reload()}>重试</button></div>}
    {!loading && !error && data?.orderCount === 0 && <div className="admin-empty-note"><span>还没有演示订单</span><p>商城顾客完成演示下单后，订单会出现在这里。</p></div>}
    <div className="admin-demo-notice"><span aria-hidden="true">✳</span><p><strong>演示环境</strong> 这里统计的是本机演示订单数据，不代表真实付款、收入或履约。</p></div>
  </section>;
}
