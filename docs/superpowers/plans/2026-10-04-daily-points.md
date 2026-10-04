# 科技点与每日签到实施计划

> **For agentic workers:** Use the approved design below. Tasks use checkbox syntax for tracking.

**Goal:** 让登录用户每天领取一次随机科技点，菜单和个人中心同步显示余额。

**Architecture:** 后端按北京时间计算日期，使用加密随机数抽奖，通过现有原子 JSON 文件存储保存余额与签到记录。React 使用一个按账号隔离的状态 hook，两个入口共用状态，并在午夜、重新聚焦页面时刷新。

**Tech Stack:** React 19、Node.js、现有 JSON 文件队列；不增加依赖。

**Spec:** 用户已确认的本次签到规则。

## Global Constraints

- 每个账号北京时间每天一次；00:00 重置资格，余额累计保留。
- 20–40 点 80%；1–19 点 8%；41–50 点 10.9%；100 点 1%；0 点 0.1%；区间内等概率。
- 0 点仍算成功签到。前端提交的数据不能指定奖励、日期或账号。
- 按上层开发指令，本次不添加或运行测试；进行静态检查及构建，并明确验证范围。
- 原地更新桌面项目，无 Git 仓库，不创建工作树或提交。

## Review Focus

- 多个请求同时到达时只发放一次。
- 午夜切换、页面休眠后恢复时应更新签到资格。
- 退出或切换账号时不显示上个账号余额。
- 网络失败和持久化失败时不能误报已领取。
- 0 点与 100 点正确保存、显示；刷新后状态保留。

## Task 1: 后端签到事务（并行）

**Files:** server/points-store.mjs、server/points-api.mjs、server.mjs。

**Interfaces:** GET /api/points 返回 {points}；POST /api/check-in 返回 {points,reward}，重复返回 409 {error,points}。points 含 balance、checkedInToday、todayReward、day、serverNow、nextResetAt、timeZone。

- [x] 加密抽奖、北京时间日期和原子存储，保留签到记录。
- [x] 鉴权接口与路由接入；存储失败返回错误。
- [x] 语法检查与静态审查。

## Task 2: 菜单及个人中心（并行）

**Files:** src/AccountMenu.jsx、src/account-menu.css、src/UserCenter.jsx、src/user-center.css。

**Interfaces:** points 属性为 {status,loading,busy,error,refresh,checkIn}。

- [x] 替换占位余额及签到按钮。
- [x] 展示奖励、彩蛋、概率、失败重试及今日已签到状态。
- [x] 保留现有账户、历史和响应式布局。

## Task 3: 共享状态与集成

**Files:** src/useTechPoints.js、src/App.jsx。

- [x] 按 user.id 读取服务端余额，隔离过期请求。
- [x] 两个入口共用签到状态；阻止重复提交，处理 409 同步。
- [x] 根据服务端时差安排午夜刷新，恢复前台刷新，并通知同浏览器其他标签页更新。
- [x] 构建、独立静态审查并更新运行说明。


## 完成记录

- 独立静态审查指出并已修正跨标签页身份变化与延迟响应造成的午夜刷新滞后。
- points 状态包含 userId；前端发送 X-Account-Id，后端在发放前拒绝账号不匹配并由前端重新载入会话。
- 午夜计时使用单调时钟，并保守扣除请求耗时；POST 彩蛋通知读取实际 reward，处理写入跨午夜的情况。
- npm.cmd run build 成功：49 个模块；server.mjs、points-store.mjs、points-api.mjs、useTechPoints.js 语法检查均退出 0。
- 未添加或运行测试，未改动已有账号或签到数据，未重启用户正在运行的服务。后端需要重新启动才能载入新接口。
