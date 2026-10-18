/**
 * 内容回退数据。
 * 正常情况下页面会优先读取 data/*.json；当静态服务器未启动、fetch 失败或
 * 部署路径异常时，使用这里的同构数据保证站点仍可阅读。
 */
export const FALLBACK_SITE = {
  name: 'M1ghty_2wy',
  title: '转角的 M1ghty_2wy · 个人数字空间',
  tagline: '独立开发者 · Java 与 3D 创意编程玩家',
  bio: '白天与 JVM、分布式微服务和高并发斗智斗勇，深夜在转角的小房间里泡上一杯冰美式，用代码搭建属于自己的数字微缩世界。',
  motto: '代码会过期，但好奇心不会',
  location: '中国 · 远程工作',
  status: '正在把个人网站做成一座可探索的数字房间',
  focus: ['Java 21 / Spring Boot', 'Three.js / WebGL', '个人工具与自动化'],
  skills: [
    { name: 'Java / Spring Boot', level: '熟练', color: 'sky' },
    { name: 'Three.js / WebGL', level: '创作中', color: 'amber' },
    { name: 'React / TypeScript', level: '熟练', color: 'emerald' },
    { name: '架构设计 / 自动化', level: '长期实践', color: 'purple' }
  ],
  timeline: [
    { year: '现在', title: '构建个人数字空间', desc: '把作品、文章、工具和灵感收进一座可互动的 3D 代码屋。' },
    { year: '近期', title: '深入 Java 21 与 WebGL', desc: '在高并发服务和实时 3D 交互之间寻找更好的连接。' },
    { year: '长期', title: '持续开源与分享', desc: '把解决过的问题整理成可以复用的工具和内容。' }
  ],
  links: { github: '', email: '' }
};

export const FALLBACK_PROJECTS = [
  {
    id: 'p1',
    ver: 'v3.0.0 · LIVE',
    name: '转角的 M1ghty_2wy · 可探索 3D 庭院与工作室',
    desc: '基于 Three.js 的第三人称微缩世界：暖色庭院、可进入的工作室、统一物件交互、昼夜天气与程序化细节。',
    date: '2026-10'
  },
  {
    id: 'p2',
    ver: 'v1.8.2 · BACKEND',
    name: 'M1-Core 高并发微服务脚手架',
    desc: '基于 Java 21 虚拟线程与 Spring Cloud 打造的轻量级分布式核心底座，内置全链路追踪与自动化压测模块。',
    date: '2026-09'
  },
  {
    id: 'p3',
    ver: 'v1.4.0 · TOOLKIT',
    name: 'AutoBugShield 智能代码审查助手',
    desc: '自动识别潜在空指针、并发竞态与祖传坏味道代码，让每一次 git push 都稳如泰山。',
    date: '2026-08'
  }
];

export const FALLBACK_ARTICLES = [
  {
    id: 'a1',
    cat: '3D 前端与创意编程',
    title: '如何用 Three.js 打造一座有温度的「转角程序员代码屋」微缩世界',
    date: '2026-10-17',
    body: '静态的个人主页往往看一眼就会关掉，而一座可以走进去、切换雨夜、还能点击咖啡机和橘猫触发彩蛋的 3D 房间，却能让每位访客会心一笑。\n\n在这个项目里，我用参数化几何体与 Canvas 动态纹理搭建了庭院、工作台、咖啡角、书架与全息传送门。希望你在逛房间的时候也能找到属于程序员的快乐！'
  },
  {
    id: 'a2',
    cat: 'Java 与架构笔记',
    title: '从 JDK 8 到 JDK 21 虚拟线程：深夜重构祖传代码的踩坑实录',
    date: '2026-10-05',
    body: '每个 Java 程序员都面对过那句灵魂拷问：这段代码是谁写的？居然还能跑！本文总结了在高吞吐 I/O 场景下迁移至虚拟线程的核心注意事项，包括 synchronized 块导致的载体线程固定排查与连接池调优方案。'
  },
  {
    id: 'a3',
    cat: '极客日常随笔',
    title: '论冰美式浓度与代码 Bug 率之间的非线性关系',
    date: '2026-09-21',
    body: '经过长达三年的非正式抽样统计，当血液中的冰美式浓度低于 30% 时，写出死循环的概率提升 240%；而当右手边有一只橘猫趴在沙发上呼噜呼噜时，Debug 效率将获得神秘玄学加成。'
  }
];

export const FALLBACK_NOTES = [
  {
    id: 'note-1',
    title: '房间里的第一条随记',
    body: '今天把个人网站改成了一座可以走进去的数字房间。下一步是让每件家具都能打开一段真实内容。',
    date: '2026-10-17',
    mood: 'BUILD MODE'
  },
  {
    id: 'note-2',
    title: '程序员彩蛋备忘',
    body: '如果服务器亮起绿色全息投影，说明今晚的部署没有回滚；如果橘猫坐上键盘，就先保存再排查。',
    date: '2026-10-12',
    mood: 'NIGHT SHIFT'
  }
];

export const FALLBACK_GUESTBOOK = [
  {
    id: 'guest-1',
    title: '来自深夜路过的访客',
    body: '在三联屏前绕了一圈，橘猫和咖啡机都很可爱。这个房间让我想起自己刚学写代码的那个夏天。',
    mood: 'VISITOR',
    author: '匿名访客',
    date: '2026-10-16'
  },
  {
    id: 'guest-2',
    title: '关于传送门的一条留言',
    body: '从庭院走到工作台，再点开传送门进入个人空间，路线比直接甩一个作品集链接有意思多了。',
    mood: 'EXPLORE',
    author: 'L.',
    date: '2026-10-15'
  }
];

export const FALLBACK_TOOLS = [
  {
    id: 'tool-json',
    name: 'JSON Crack / Formatter',
    category: '开发效率',
    description: '快速格式化、压缩和检查 JSON。',
    url: 'https://jsoncrack.com/',
    tags: ['JSON', '调试', 'API'],
    favorite: true
  },
  {
    id: 'tool-mdn',
    name: 'MDN Web Docs',
    category: '文档参考',
    description: '前端 API、Web 标准和浏览器能力的可靠参考。',
    url: 'https://developer.mozilla.org/',
    tags: ['Web', '文档', '标准'],
    favorite: true
  },
  {
    id: 'tool-github',
    name: 'GitHub',
    category: '协作发布',
    description: '代码托管、项目协作与个人开源档案。',
    url: 'https://github.com/',
    tags: ['Git', '开源', '协作'],
    favorite: true
  },
  {
    id: 'tool-regex',
    name: 'Regex101',
    category: '调试分析',
    description: '在线编写、解释和测试正则表达式。',
    url: 'https://regex101.com/',
    tags: ['Regex', '测试', '文本']
  },
  {
    id: 'tool-three',
    name: 'Three.js Journey',
    category: '创意编程',
    description: '系统学习 WebGL、着色器和 Three.js 场景制作。',
    url: 'https://threejs.org/',
    tags: ['3D', 'WebGL', 'Shader']
  }
];

export const FALLBACK_LIBRARY = [
  {
    id: 'library-1',
    type: 'bookmark',
    title: 'Three.js 示例库',
    description: '收集可复用的材质、相机和交互灵感。',
    url: 'https://threejs.org/examples/',
    tags: ['3D', '灵感']
  },
  {
    id: 'library-2',
    type: 'model',
    title: '代码屋建模笔记',
    description: '记录房间比例、材质颜色和低多边形建模草稿。',
    tags: ['建模', '草稿']
  },
  {
    id: 'library-3',
    type: 'idea',
    title: '把个人网站做成可探索的数字房间',
    description: '让访客通过物件、声音和天气状态理解一个人的工作方式。',
    tags: ['产品', '创意']
  }
];
