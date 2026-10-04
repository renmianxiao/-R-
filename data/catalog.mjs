import { odeGames } from './ode-games.mjs';
import { gameTags } from './game-tags.mjs';

const featuredCatalog = [
  {
    id: 'cyberpunk-2077', appId: 1091500, title: '赛博朋克 2077', englishTitle: 'Cyberpunk 2077',
    genre: '开放世界', tags: ['动作', '角色扮演'], price: 149, originalPrice: 298, rating: 4.8, badge: '本周热卖',
    colors: ['#f1853b', '#5e1f54'],
    description: '成为夜之城的传奇佣兵，在这座巨大的未来都市里，决定自己的故事。'
  },
  {
    id: 'baldurs-gate-3', appId: 1086940, title: '博德之门 3', englishTitle: "Baldur's Gate 3",
    genre: '角色扮演', tags: ['策略', '冒险'], price: 199, originalPrice: 298, rating: 4.9, badge: '编辑推荐',
    colors: ['#d5a758', '#4a2748'],
    description: '集结队伍，掷出命运骰子。你的选择将决定被遗忘国度的未来。'
  },
  {
    id: 'hades-2', appId: 1145350, title: '哈迪斯 II', englishTitle: 'Hades II',
    genre: '动作', tags: ['独立', 'Roguelike'], price: 88, originalPrice: 108, rating: 4.9, badge: '新品',
    colors: ['#d84b48', '#431b43'],
    description: '挥舞黑暗巫术，探索冥界深处。每一次挑战都让你离时间泰坦更近一步。'
  },
  {
    id: 'elden-ring', appId: 1245620, title: '艾尔登法环', englishTitle: 'ELDEN RING',
    genre: '动作', tags: ['开放世界', '角色扮演'], price: 198, originalPrice: 298, rating: 4.9, badge: '人气大作',
    colors: ['#bd9d54', '#314b42'],
    description: '穿越交界地，寻找艾尔登法环。未知的冒险与严峻挑战正等待褪色者。'
  },
  {
    id: 'hollow-knight', appId: 367520, title: '空洞骑士', englishTitle: 'Hollow Knight',
    genre: '冒险', tags: ['独立', '类银河战士恶魔城'], price: 36, originalPrice: 58, rating: 4.8, badge: '口碑佳作',
    colors: ['#6b9eb5', '#233542'],
    description: '深入被遗忘的虫之王国，在精美手绘的洞穴中揭开古老秘密。'
  },
  {
    id: 'stardew-valley', appId: 413150, title: '星露谷物语', englishTitle: 'Stardew Valley',
    genre: '模拟经营', tags: ['独立', '农场'], price: 48, originalPrice: 68, rating: 4.9, badge: '治愈时光',
    colors: ['#77b96f', '#355a43'],
    description: '接手爷爷留下的旧农场，种田、钓鱼、交朋友，过上自己的田园生活。'
  },
  {
    id: 'black-myth-wukong', appId: 2358720, title: '黑神话：悟空', englishTitle: 'Black Myth: Wukong',
    genre: '动作', tags: ['角色扮演', '神话'], price: 268, originalPrice: 298, rating: 4.7, badge: '国产佳作',
    colors: ['#c47d40', '#3e2723'],
    description: '踏上充满危险与奇遇的西游之路，揭开古老传说背后的真相。'
  },
  {
    id: 'it-takes-two', appId: 1426210, title: '双人成行', englishTitle: 'It Takes Two',
    genre: '冒险', tags: ['合作', '派对'], price: 58, originalPrice: 198, rating: 4.8, badge: '好友必玩',
    colors: ['#e8a2b2', '#4c3d71'],
    description: '一场只为两人设计的奇妙合作冒险。叫上搭档，一起重新发现彼此。'
  },
];

export const catalog = [...featuredCatalog, ...odeGames].map((game) => ({ ...game, tags: gameTags[game.id] || game.tags, badge: /ODE/i.test(game.badge || '') ? '' : game.badge }));
