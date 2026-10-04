# 游集后台管理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有游戏商城中交付可登录、受服务端权限保护并能持久管理商品与演示订单的后台。

**Architecture:** 延续 React + 原生 Node HTTP API。商品与订单数据由独立 JSON 存储模块维护，管理 API 对每个操作进行服务端授权和校验；React 在 `/admin` 渲染独立的后台壳层、概览、商品和订单页面。

**Tech Stack:** React 19、原生 Node.js HTTP、JSON 文件、CSS；不新增运行时依赖。

**Spec:** `docs/superpowers/specs/2026-10-01-game-shelf-admin-design.md`

## Global Constraints

- “复用现有技术栈和登录会话，不引入数据库或额外运行时依赖。”
- “此阶段使用项目现有 Node 服务和 JSON 文件存储，适用于本地作品集演示和低并发使用。”
- “所有页面文案明确这只是演示订单，不存在真实付款或履约。”
- “所有新注册账号服务端默认角色为 `customer`，注册请求忽略或拒绝用户自行提交的管理员角色。”
- 商品首次初始化来自现有 `data/catalog.mjs`；之后由 `data/games.json` 作为唯一可变目录，并加入 `.gitignore`。
- 下单使用服务端当前在售商品和价格生成快照，不信任客户端价格。
- 项目目录当前无 Git 仓库，因此本计划不含 Git 提交步骤。
- 不新增自动化测试文件；按各任务的手动验收项走查，最终运行 `npm run build`。

## Review Focus

- 未登录、会话过期、普通用户访问后台：任务 1、3 检查角色固定为 customer，管理 API 分别返回 401/403。
- 越界商品字段、客户端篡改商品 ID、未知订单状态：任务 3 检查服务端拒绝非法输入。
- 下架商品被直接加入订单：任务 2、3 检查仅在售商品可下单。
- 商品改价后历史订单内容变化：任务 2、3 检查订单快照不变。
- JSON 首次初始化、写入失败或并发覆盖：任务 2 检查有效初始化、原子写入和串行更新。

---

## 文件结构

- `server/json-file-store.mjs`：JSON 数组读取、同目录原子替换和单进程按文件串行写入。
- `server/game-store.mjs`、`server/order-store.mjs`：商品/订单领域存储接口。
- `server/admin-api.mjs`：管理 API、字段验证、权限后业务处理。
- `scripts/promote-admin.mjs`：本机管理员提权命令。
- `src/admin/admin-api.js`：同源 Fetch 和错误解析。
- `src/admin/AdminApp.jsx`、`src/admin/AdminShell.jsx`：会话门、路由分发、导航和后台布局。
- `src/admin/pages/OverviewPage.jsx`、`ProductsPage.jsx`、`OrdersPage.jsx`：三个后台页面。
- `src/admin/admin.css`：后台表格、表单、状态和响应式样式。

## Task 1: 管理员角色与本机提权

**Files:**
- Modify: `server.mjs`, `package.json`, `README.md`
- Create: `scripts/promote-admin.mjs`

**Interfaces:** `publicUser()` 返回 `role: 'customer' | 'admin'`，旧记录缺少角色时默认 `customer`；注册明确写入 `customer`。`npm run admin:promote -- <email>` 规范化邮箱并将已有账号提升为 admin。

- [ ] **Step 1: 将角色写入用户记录和公开用户**
  更新 `publicUser` 及注册对象；只返回非敏感用户字段，兼容旧账号。
- [ ] **Step 2: 增加本机提权脚本与说明**
  脚本读取 `data/users.json` 并只修改匹配用户角色。缺少参数、找不到用户或 JSON 读取失败时输出中文错误并非零退出。加入 npm script 和 README 的注册后提权步骤，不设置默认密码。
- [ ] **Step 3: 手动检查角色数据**
  确认新注册为 customer、命令后目标账号为 admin、未知邮箱无法提权；`/api/me` 不返回盐值或口令哈希。

## Task 2: JSON 存储与商城商品/订单数据流

**Files:**
- Create: `server/json-file-store.mjs`, `server/game-store.mjs`, `server/order-store.mjs`
- Modify: `server.mjs`, `.gitignore`

**Interfaces:** `readArray(file) -> Promise<Array>`；`writeArrayAtomic(file, records) -> Promise<void>`；`getGames({ includeInactive = true } = {}) -> Promise<Game[]>`；`saveGames(games)`；`findActiveGame(id) -> Promise<Game | null>`；`getOrders()`；`saveOrders(orders)`。

- [ ] **Step 1: 实现 JSON 文件读写原语**
  仅对 `ENOENT` 返回空数组；损坏 JSON、非数组和其他读错误必须抛出。写入确保父目录存在、先写同目录临时文件再 rename，并对同一文件串行化更新；失败时清理临时文件。
- [ ] **Step 2: 实现商品初始化和商品/订单存储**
  `data/games.json` 缺失时从现有 108 款 `catalog` 复制并附加 `active: true`，存在时不覆盖。订单保留当前 `data/orders.json` 字段和商品快照结构。
- [ ] **Step 3: 让商店和下单共用可变商品目录**
  `GET /api/games` 仅返回 active 商品；`POST /api/orders` 只接受仍在售的 ID，并从服务端读取当前价格、生成下单快照后经 `saveOrders` 保存。`.gitignore` 增加 `data/games.json`。
- [ ] **Step 4: 手动检查数据边界**
  首次读取初始化 108 款且刷新不重复；下架游戏不显示且不能直接下单；创建订单保存有效 JSON；并发写入不互相覆盖；写入失败会返回错误且不会留下半写文件；后续改价不改变旧订单行。

## Task 3: 管理 API、授权与服务端校验

**Files:**
- Create: `server/admin-api.mjs`
- Modify: `server.mjs`
- Consume: `server/game-store.mjs`, `server/order-store.mjs`

**Interfaces:** 主服务只将管理员身份传给 `handleAdminApi(request, response, url, adminUser, sendJson)`。API 提供：`GET /api/admin/overview`、`GET/POST /api/admin/games`、`PATCH /api/admin/games/:id`、`GET /api/admin/orders`、`PATCH /api/admin/orders/:orderId`。

- [ ] **Step 1: 在主服务给所有 `/api/admin/*` 加会话门禁**
  未登录返回 401，非 admin 返回 403，只有通过校验的请求进入管理处理器；UI 路由本身不作为安全措施。
- [ ] **Step 2: 实现概览和商品管理处理器**
  概览返回 `{ productCount, orderCount, pendingOrderCount, demoOrderAmount }`，金额排除 cancelled。商品列表包含上下架商品；创建 ID 使用 `game-${randomUUID()}`；更新只允许白名单字段，下架用 `active: false`，不物理删除。验证必填名称/分类、文本长度、`price > 0`、`originalPrice >= price`、`rating` 为 0–5、图片 URL 为 http/https、tags/颜色格式有效。
- [ ] **Step 3: 实现订单查看和状态更新**
  只允许 `demo-created | processing | completed | cancelled`；成功时写 `statusUpdatedAt` 和 `statusUpdatedBy`，不得改商品快照；非法状态返回 400，不存在订单返回 404。
- [ ] **Step 4: 手动检查 API 权限与验证**
  使用无 Cookie、customer 和 admin 会话调用相同管理 API，确认 401/403/成功；无效或过期会话返回 401；尝试非法商品字段、客户端自定义商品 ID、未知状态和已下架商品下单，确认服务端拒绝或忽略；刷新后数据仍保存。

## Task 4: `/admin` 入口、登录门与布局

**Files:**
- Modify: `src/main.jsx`
- Create: `src/admin/admin-api.js`, `src/admin/AdminApp.jsx`, `src/admin/AdminShell.jsx`, `src/admin/admin.css`

**Interfaces:** `main.jsx` 根据 pathname 将 `/admin*` 渲染为 `AdminApp`，其余路径继续渲染商城 `App`。`adminRequest(path, options)` 使用同源 fetch 并将 JSON/HTTP/网络错误转为可显示的中文 Error。`AdminApp` 读取 `/api/me`；未登录时调用现有 `/api/login`，普通用户展示拒绝页，管理员进入后台。

- [ ] **Step 1: 接入路径分流和 API 客户端**
  不新增路由依赖；错误保留服务端提示并处理非 JSON 响应。
- [ ] **Step 2: 实现后台登录门和角色状态**
  覆盖加载、未登录、登录失败、普通用户无权限、管理员和 `/api/me` 网络失败状态。
- [ ] **Step 3: 实现管理壳层与基础样式**
  导航使用 `/admin`、`/admin/products`、`/admin/orders` 原生链接；显示当前账号、返回商城和退出登录。沿用深色与黄绿强调，表格保持可读并在小屏横向滚动。
- [ ] **Step 4: 手动检查入口**
  以未登录、普通用户、管理员分别打开 `/admin`；确认门禁符合角色，商城 `/` 仍正常渲染。

## Task 5: 概览与商品管理页面

**Files:**
- Create: `src/admin/pages/OverviewPage.jsx`, `src/admin/pages/ProductsPage.jsx`
- Modify: `src/admin/AdminApp.jsx`, `src/admin/admin.css`

**Interfaces:** 概览使用 `GET /api/admin/overview`。商品页使用 `GET /api/admin/games`，默认每页 12 项，搜索中英文名、按动态 genre 筛选；新建用 POST，编辑/上下架用 PATCH。

- [ ] **Step 1: 实现经营概览卡片**
  展示在售商品、订单总数、待处理订单和排除取消订单后的演示金额；提供加载、空和错误反馈，不称作实际收入。
- [ ] **Step 2: 实现商品表格与筛选分页**
  展示封面、名称、分类、现价、原价、评分、状态和操作；分类由数据去重生成，空结果有提示，小屏可横向滚动。
- [ ] **Step 3: 实现新增/编辑表单和上/下架**
  tags 用逗号输入转换数组；颜色输入两个 hex 值；appId 可空。前端提供即时校验，服务端仍为最终校验。下架操作需确认且保留记录。
- [ ] **Step 4: 手动检查商品闭环**
  新建、编辑价格/分类、下架、重新上架；确认商店目录、后台列表、搜索筛选分页同步，旧订单快照不变。

## Task 6: 订单管理、集成验收和构建

**Files:**
- Create: `src/admin/pages/OrdersPage.jsx`
- Modify: `src/admin/AdminApp.jsx`, `src/admin/admin.css`, `README.md`（如命令说明尚缺）

**Interfaces:** 订单页调用 `GET /api/admin/orders`，支持订单号/邮箱搜索、状态筛选、详情；以 `PATCH /api/admin/orders/:orderId` 更新状态。映射：`demo-created`→待处理、`processing`→处理中、`completed`→已完成、`cancelled`→已取消。

- [ ] **Step 1: 实现订单表格与空/错误态**
  展示订单号、时间、邮箱、商品摘要、金额与状态；分别说明无订单和搜索无结果。
- [ ] **Step 2: 实现详情和状态更新**
  详情保留订单行名称、数量、下单单价和订单总额；取消前确认，提交中防重复；成功后显示更新时间，失败保留原状态并显示原因。
- [ ] **Step 3: 手动走查已确认的端到端范围**
  检查角色提权与拒绝、商品管理与商店同步、服务端定价、订单状态审计/持久化、空态和失败提示，以及原有登录、购物袋、演示下单流程。
- [ ] **Step 4: 运行生产构建**
  Run: `npm run build`
  Expected: 退出码为 0，Vite 成功生成 `dist/`，没有编译错误。
