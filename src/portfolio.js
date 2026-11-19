import { normalizeCollection, validateSite } from './content-store.js';
import { FALLBACK_ARTICLES, FALLBACK_PROJECTS, FALLBACK_SITE } from './content/defaults.js';
import { h } from './ui/dom.js';

const $ = (id) => document.getElementById(id);
const filters = $('article-filters');
const articleList = $('article-list');
const directory = $('project-directory');
const projectList = $('project-list');
const dialog = $('search-dialog');
const searchInput = $('search-input');
const searchResults = $('search-results');
const quickLinks = [
  { kind: '作品', title: '校园数字孪生', words: '地图 Godot 3D 校园', url: '#project-campus' },
  { kind: '体验', title: '进入 3D 庭院', words: 'Three.js 工作室 游戏', url: './world.html?skipintro=1' },
  { kind: '体验', title: '校园漫游', words: '校园游戏 步行 俯瞰', url: './city-twin/game/' },
  { kind: '入口', title: '效率工具箱', words: '工具 文本 编码 JSON', url: './world.html?skipintro=1#/space/toolbox' },
  { kind: '入口', title: '随记与留言板', words: '笔记 留言', url: './world.html?skipintro=1#/space/notes' },
  { kind: '入口', title: '素材库', words: '素材 书签 资源', url: './world.html?skipintro=1#/space/library' },
  { kind: '入口', title: '管理工作台', words: '后台 发布 站主 编辑 登录', url: './admin/' },
];
let articles = [];
let projects = [];
let activeCategory = '';
let searchReady = false;

function anchor(label, destination, className = 'text-link') {
  const link = h('a', className, label);
  link.href = destination;
  return link;
}

function date(value, className) {
  const formatted = h('time', className, value);
  if (/^\d{4}-\d{2}(?:-\d{2})?$/.test(value)) formatted.dateTime = value;
  return formatted;
}

async function readData(name, fallback) {
  try {
    const response = await fetch('./data/' + name + '.json', {
      cache: 'no-cache', signal: AbortSignal.timeout(6500)
    });
    if (!response.ok) throw new Error('request failed');
    return await response.json();
  } catch {
    return fallback;
  }
}

function renderProfile(site) {
  document.title = site.title;
  document.querySelectorAll('[data-profile-name]').forEach((element) => { element.textContent = site.name; });
  document.querySelector('[data-profile-tagline]').textContent = site.tagline;
  $('about-bio').textContent = site.bio;
  for (const field of ['motto', 'location', 'status']) {
    const element = $('about-' + field);
    element.textContent = site[field] || '';
    element.hidden = !site[field];
  }
  const focus = $('about-focus');
  focus.replaceChildren(...site.focus.map((topic) => h('li', '', topic)));
  focus.hidden = !site.focus.length;
  const links = $('profile-links');
  links.replaceChildren();
  if (site.links?.github) links.append(anchor('GitHub ↗', site.links.github));
  if (site.links?.email) links.append(anchor('联系我 ↗', 'mailto:' + site.links.email));
  $('about-skills').replaceChildren(...site.skills.map((skill) => {
    const item = h('li', '', skill.name);
    if (skill.level) item.title = skill.level;
    return item;
  }));
  $('about-timeline').replaceChildren(...site.timeline.map((step) => {
    const item = h('li');
    item.append(h('span', '', step.year), h('strong', '', step.title));
    if (step.desc) item.append(h('p', '', step.desc));
    return item;
  }));
}

function projectDestination(id) {
  if (document.getElementById('project-' + id)?.classList.contains('feature-card')) {
    return '#project-' + encodeURIComponent(id);
  }
  return '#catalog-' + encodeURIComponent(id);
}

function renderProjects() {
  projectList.replaceChildren(...projects.map((project) => {
    const item = h('article', 'directory-item');
    item.id = 'catalog-' + project.id;
    item.append(h('h3', '', project.name), date(project.date), h('p', '', project.desc));
    if (project.image) item.append(anchor('查看图片 ↗', project.image));
    if (project.download) {
      const link = anchor('下载 3MF ↓', project.download);
      link.download = '';
      item.append(link);
    }
    return item;
  }));
  if (!projects.length) projectList.append(h('p', 'section-message', '暂无公开项目。'));
}

function renderArticles() {
  for (const filter of filters.children) {
    filter.setAttribute('aria-pressed', String(filter.dataset.category === activeCategory));
  }
  const visible = articles.filter((article) => !activeCategory || article.cat === activeCategory);
  const rows = visible.map((article) => {
    const row = h('details', 'article-row');
    row.id = 'article-' + article.id;
    const summary = h('summary');
    const copy = h('span');
    copy.append(h('span', 'article-title', article.title), h('span', 'article-cat', article.cat));
    const plus = h('span', 'article-indicator', '+');
    plus.setAttribute('aria-hidden', 'true');
    summary.append(copy, date(article.date, 'article-date'), plus);
    const body = h('div', 'article-body');
    for (const block of article.body.split(/\n{2,}/)) body.append(h('p', '', block));
    body.append(anchor('文章链接 #', '#article-' + encodeURIComponent(article.id)));
    row.append(summary, body);
    return row;
  });
  articleList.replaceChildren(...rows);
  if (!rows.length) articleList.append(h('p', 'section-message', '暂无已发布的文章。'));
  articleList.setAttribute('aria-busy', 'false');
}

function configureFilters() {
  const categories = [...new Set(articles.map(({ cat }) => cat))];
  if (categories.length <= 1) return;
  for (const category of ['', ...categories]) {
    const button = h('button', 'filter', category || '全部');
    button.type = 'button';
    button.dataset.category = category;
    button.addEventListener('click', () => {
      activeCategory = category;
      renderArticles();
    });
    filters.append(button);
  }
  filters.hidden = false;
}

function revealHash() {
  let id;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  if (id === 'project-directory') directory.open = true;
  if (!/^(?:article|catalog|project)-/.test(id) && id !== 'project-directory') return;
  if (id.startsWith('article-') && activeCategory && !document.getElementById(id)) {
    if (articles.some((article) => 'article-' + article.id === id)) {
      activeCategory = '';
      renderArticles();
    }
  }
  const target = document.getElementById(id);
  if (!target) return;
  if (id.startsWith('article-')) target.open = true;
  if (id.startsWith('catalog-')) directory.open = true;
  target.scrollIntoView({ block: 'start' });
}

function renderSearch() {
  const words = searchInput.value.normalize('NFKC').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const entries = [...quickLinks,
    ...projects.map((project) => ({
      kind: '作品', title: project.name, words: [project.ver, project.desc].join(' '),
      url: projectDestination(project.id)
    })),
    ...articles.map((article) => ({
      kind: '文章', title: article.title, words: [article.cat, article.body].join(' '),
      url: '#article-' + encodeURIComponent(article.id)
    }))
  ];
  const matches = words.length ? entries.filter((entry) => {
    const searchable = [entry.title, entry.kind, entry.words].join(' ').normalize('NFKC').toLocaleLowerCase();
    return words.every((word) => searchable.includes(word));
  }) : quickLinks;
  $('search-status').textContent = searchReady || matches.length
    ? (words.length ? (matches.length ? '找到 ' + matches.length + ' 项' : '没有匹配的内容。') : '常用入口')
    : '正在加载项目和文章…';
  searchResults.replaceChildren(...matches.slice(0, 20).map((result) => {
    const item = h('li');
    const link = anchor('', result.url, '');
    link.append(h('small', '', result.kind), h('span', '', result.title));
    link.addEventListener('click', () => {
      dialog.close();
      if (result.url === location.hash) revealHash();
    });
    item.append(link);
    return item;
  }));
}

function openSearch() {
  if (dialog.open) return;
  searchInput.value = '';
  renderSearch();
  dialog.showModal();
  searchInput.focus();
}

$('open-search').hidden = false;
$('open-search').addEventListener('click', openSearch);
searchInput.addEventListener('input', renderSearch);
searchInput.addEventListener('keydown', (event) => {
  if (event.isComposing) return;
  const first = searchResults.querySelector('a');
  if (event.key === 'ArrowDown' && first) {
    event.preventDefault();
    first.focus();
  }
  if (event.key === 'Enter' && searchInput.value.trim()) first?.click();
});
document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    openSearch();
  }
});
window.addEventListener('hashchange', revealHash);
document.querySelector('a[href="#project-directory"]').addEventListener('click', () => { directory.open = true; });

Promise.all([
  readData('site', FALLBACK_SITE),
  readData('projects', FALLBACK_PROJECTS),
  readData('articles', FALLBACK_ARTICLES),
]).then(([site, projectData, articleData]) => {
  renderProfile(validateSite(site));
  projects = normalizeCollection('projects', Array.isArray(projectData) ? projectData : FALLBACK_PROJECTS).items;
  articles = normalizeCollection('articles', Array.isArray(articleData) ? articleData : FALLBACK_ARTICLES).items
    .sort((first, second) => second.date.localeCompare(first.date));
  renderProjects();
  configureFilters();
  renderArticles();
  revealHash();
  searchReady = true;
  if (dialog.open) renderSearch();
}).catch(() => {
  articleList.textContent = '文章暂时无法加载，请刷新后重试。';
  articleList.setAttribute('aria-busy', 'false');
  projectList.textContent = '项目目录暂时无法加载，请刷新后重试。';
});
