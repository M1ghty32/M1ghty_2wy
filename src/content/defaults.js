/**
 * 内容回退数据。
 * 正常情况下页面会优先读取 data/*.json；当静态服务器未启动、fetch 失败或
 * 部署路径异常时，使用这里的同构数据保证站点仍可阅读。
 */
export const FALLBACK_SITE = {
  name: 'M1ghty_2wy',
  title: 'M1ghty_2wy · 个人网站',
  tagline: 'Java 后端工程师 · 实时 3D 交互实践者',
  bio: '专注 Java 服务端开发：高并发、分布式系统与工程效率。工作之外持续实践 Three.js / WebGL 实时渲染，这个站点以可探索的 3D 空间组织项目、文章与工具，作为个人作品与方法论的长期记录。',
  motto: '把复杂系统做简单，把长期主义做具体。',
  location: '中国 · 远程协作',
  status: '持续更新：项目记录、架构笔记与工具沉淀',
  focus: ['Java 21 / Spring Boot', '高并发与分布式系统', 'Three.js / WebGL'],
  skills: [
    { name: 'Java / Spring Boot', level: '主力技术栈', color: 'sky' },
    { name: '分布式 / 高并发', level: '工程实践', color: 'emerald' },
    { name: 'Three.js / WebGL', level: '持续实践', color: 'amber' },
    { name: 'React / TypeScript', level: '熟练', color: 'purple' }
  ],
  timeline: [
    { year: '2026', title: '重构个人网站', desc: '以可探索的 3D 空间承载项目与方法论，替代传统列表式作品集。' },
    { year: '2025', title: '服务端架构与性能优化', desc: '围绕虚拟线程、异步 I/O 与可观测性做系统性实践。' },
    { year: '2024', title: '持续输出技术笔记', desc: '把项目中的取舍与复盘整理为可复用的文档与工具。' }
  ],
  links: { github: 'https://github.com/M1ghty32', email: '' }
};

export const FALLBACK_PROJECTS = [
  {
    id: 'p1',
    ver: 'v3.1.0 · LIVE',
    name: 'M1ghty_2wy · 可探索的 3D 个人网站',
    desc: '以 Three.js 构建的第三人称微缩空间：庭院、工作室与内容面板统一在同一套交互体系内，支持昼夜、天气与自适应画质。',
    date: '2026-10'
  },
  {
    id: 'p2',
    ver: 'v1.8.2 · BACKEND',
    name: 'M1-Core 高并发微服务底座',
    desc: '基于 Java 21 虚拟线程与 Spring Cloud 的服务端底座，包含配置中心、链路追踪、灰度发布与自动化压测。',
    date: '2026-09'
  },
  {
    id: 'p3',
    ver: 'v1.4.0 · TOOLKIT',
    name: 'CodeGuard 静态审查工具',
    desc: '面向 Java 工程的静态检查工具，覆盖空指针、并发竞态与常见坏味道，可接入 CI 作为合并前质量门禁。',
    date: '2026-08'
  }
];

export const FALLBACK_ARTICLES = [
  {
    id: 'a1',
    cat: '前端与图形',
    title: '用 Three.js 构建可探索的个人网站：场景组织与性能取舍',
    date: '2026-10-18',
    body: '把作品集做成可以走进去的 3D 空间，难点不在建模，而在场景组织、交互一致性与性能预算。\n\n本文记录了本站的几项关键取舍：为什么把静态景物批量合并为少量 draw call，为什么交互对象必须保持独立，以及如何通过自适应分辨率与材质复用，在移动端维持可交互的帧率。'
  },
  {
    id: 'a2',
    cat: 'Java 与架构',
    title: '从 JDK 8 到 JDK 21：虚拟线程迁移的关键约束',
    date: '2026-10-06',
    body: '虚拟线程改变的是阻塞式 I/O 的成本结构，而不是简单替换线程池。迁移过程中需要重点关注 synchronized 造成的载体线程固定、连接池容量与请求背压。\n\n本文整理了高吞吐 I/O 场景下的迁移清单，包括压测方法、可观测性指标与回滚预案。'
  },
  {
    id: 'a3',
    cat: '工程实践',
    title: '静态站点的工程化部署：GitHub Pages、自定义域名与缓存策略',
    date: '2026-09-22',
    body: '没有服务器同样可以做正式站点：GitHub Pages 提供静态托管，自定义域名与 HTTPS 证书可以自动签发，真正需要设计的是发布流程与缓存策略。\n\n本文记录了从仓库推送到 Pages 构建、再到 DNS 生效的完整链路，以及如何用相对路径与缓存头让内容更新及时生效。'
  }
];

export const FALLBACK_NOTES = [
  {
    id: 'note-1',
    title: '站点重构记录',
    body: '完成庭院地坪与门廊铺装的调整：草地改为程序化纹理，入口增加石板过渡。下一步是统一内容排版与文章阅读体验。',
    date: '2026-10-19',
    mood: 'PROGRESS'
  },
  {
    id: 'note-2',
    title: '内容结构整理',
    body: '项目、文章与工具三类内容已按统一字段整理，后续新增内容只需提交 JSON，无需改动页面代码。',
    date: '2026-10-12',
    mood: 'MAINTENANCE'
  }
];

export const FALLBACK_GUESTBOOK = [
  {
    id: 'guest-1',
    title: '访客反馈：空间导航',
    body: '从庭院走到工作室的路径很清晰，物件的交互提示也比较克制。建议在移动端保留更大的触控区域。',
    mood: 'FEEDBACK',
    author: '匿名访客',
    date: '2026-10-16'
  },
  {
    id: 'guest-2',
    title: '访客反馈：内容入口',
    body: '用传送门进入个人空间的设计比传统导航自然，文章和项目的入口也容易找到。',
    mood: 'VISITOR',
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
    title: '场景建模笔记',
    description: '记录房间比例、材质颜色和低多边形建模草稿。',
    tags: ['建模', '草稿']
  },
  {
    id: 'library-3',
    type: 'idea',
    title: '用 3D 空间组织个人作品',
    description: '让访客通过物件、声音和天气状态理解一个人的工作方式。',
    tags: ['产品', '创意']
  }
];
