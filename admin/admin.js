import { h, button, showInlineStatus } from '../src/ui/dom.js';

const $ = (id) => document.getElementById(id);
const loginForm = $('login-form');
const profileForm = $('profile-form');
const postForm = $('post-form');
const status = (message, tone) => showInlineStatus($('workspace-status'), message, tone);
const loginStatus = (message, tone) => showInlineStatus($('login-status'), message, tone);
const apiRoot = new URL('../api/admin/', window.location.href);
let data = null;
let dirty = false;
let busy = false;
let githubConfigured = false;
let view = 'profile';
let selectedId = '';

async function api(route, method = 'GET', body) {
  const response = await fetch(new URL(route, apiRoot), {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? { Accept: 'application/json' }
      : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(method === 'POST' && route === 'publish' ? 60000 : 12000)
  });
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const result = isJson ? await response.json() : null;
  if (!response.ok || !result) {
    const error = new Error(result?.error || (
      !isJson && route === 'session'
        ? '当前地址只提供网站页面。请运行 npm start，再打开 http://127.0.0.1:4173/admin/。'
        : '请求未完成，请检查管理服务是否正常运行。'
    ));
    error.status = response.status;
    throw error;
  }
  return result;
}

function actions() {
  $('save').disabled = !dirty || busy;
  $('publish').hidden = !githubConfigured;
  $('publish').disabled = dirty || busy;
  $('logout').disabled = busy;
  $('new-post').disabled = busy || (data?.articles.length ?? 0) >= 500;
  $('workspace').setAttribute('aria-busy', String(busy));
  for (const form of [profileForm, postForm]) form.inert = busy;
}

function changed() {
  dirty = true;
  status('有修改待保存。', 'warning');
  actions();
}

function showLogin(message, { configured = true, tone = 'info', focus = false } = {}) {
  $('login-view').hidden = false;
  $('workspace').hidden = true;
  $('logout').hidden = true;
  loginForm.hidden = !configured;
  loginForm.elements.password.value = '';
  loginStatus(message, tone);
  if (focus && configured) loginForm.elements.username.focus();
}

function switchView(next) {
  view = next;
  $('profile-view').hidden = view !== 'profile';
  $('posts-view').hidden = view !== 'posts';
  $('workspace-title').textContent = view === 'profile' ? '个人简历' : '帖子';
  $('workspace-summary').textContent = view === 'profile'
    ? '编辑个人空间展示的简介、技能与经历。'
    : '撰写和编辑公开文章。';
  for (const btn of document.querySelectorAll('[data-view]')) {
    if (btn.dataset.view === next) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  }
}

async function openWorkspace(session) {
  githubConfigured = Boolean(session.githubConfigured);
  const current = await api('content');
  if (!dirty || !data) data = current;
  $('login-view').hidden = true;
  $('workspace').hidden = false;
  $('logout').hidden = false;
  $('publish-mode').textContent = githubConfigured
    ? '已配置 GitHub Pages 发布。'
    : '修改保存到当前服务。GitHub Pages 发布尚未配置。';
  renderProfile();
  renderPosts();
  switchView(view);
  status(dirty ? '已登录，未保存的修改仍在此页面。' : '所有修改已保存。', dirty ? 'warning' : 'info');
  actions();
}

function rowInput(text, value, onEdit, options = {}) {
  const label = h('label', options.wide ? 'field wide' : 'field', text);
  const input = h(options.options ? 'select' : options.multiline ? 'textarea' : 'input');
  if (options.options) {
    for (const [key, title] of options.options) {
      const option = h('option', '', title);
      option.value = key;
      input.append(option);
    }
  } else if (options.type) input.type = options.type;
  if (options.max) input.maxLength = options.max;
  if (options.rows) input.rows = options.rows;
  if (options.required) input.required = true;
  if (options.placeholder) input.placeholder = options.placeholder;
  input.value = value ?? '';
  input.addEventListener('input', () => {
    onEdit(input.value);
    changed();
  });
  label.append(input);
  return label;
}

function panel(title, className = '') {
  const card = h('section', 'panel ' + className);
  const top = h('div', 'panel-heading');
  top.append(h('h2', '', title));
  card.append(top);
  return { card, top };
}

const personalFields = [
  ['name', '显示名称', { required: true, max: 80 }],
  ['title', '网页标题', { required: true, max: 160 }],
  ['tagline', '个人定位', { required: true, max: 200, wide: true }],
  ['location', '所在地', { max: 100 }],
  ['status', '近况', { max: 200 }],
  ['motto', '座右铭', { max: 200, wide: true }],
  ['bio', '个人简介', { required: true, max: 1200, multiline: true, rows: 4, wide: true }]
];
const skillColors = [['sky', '浅蓝'], ['emerald', '青绿'], ['amber', '琥珀'], ['purple', '紫色']];

function listPanel(key, title, limit, createItem, fillRow) {
  const { card, top } = panel(title);
  const list = h('div', 'repeat-list');
  const items = data.site[key];
  const add = button('control subtle compact', '＋ 添加', () => {
    items.push(createItem());
    changed();
    render();
    list.lastElementChild?.querySelector('input')?.focus();
  });
  top.append(add);
  card.append(list);
  function render() {
    add.disabled = items.length >= limit;
    list.replaceChildren();
    if (!items.length) list.append(h('p', 'empty', '暂无条目。'));
    items.forEach((item, index) => {
      const row = h('div', 'repeat-row ' + (
        key === 'focus' ? 'focus-row' : key === 'timeline' ? 'timeline-row' : 'skill-row'
      ));
      const remove = button('control remove compact', '移除', () => {
        items.splice(index, 1);
        changed();
        render();
        (list.children[index] || list.lastElementChild)?.querySelector('input')?.focus();
        if (!items.length) add.focus();
      }, { ariaLabel: '移除第 ' + (index + 1) + ' 项' });
      fillRow(row, item, index, remove);
      list.append(row);
    });
  }
  render();
  return card;
}

function renderProfile() {
  const site = data.site;
  const basic = panel('基本资料').card;
  const inputs = h('div', 'form-grid');
  for (const [key, label, opts] of personalFields) {
    inputs.append(rowInput(label, site[key], (text) => { site[key] = text; }, opts));
  }
  basic.append(inputs);

  const links = panel('对外链接').card;
  const linkFields = h('div', 'form-grid');
  site.links ||= {};
  linkFields.append(
    rowInput('GitHub 主页', site.links.github, (text) => { site.links.github = text; }, { max: 2000, type: 'url' }),
    rowInput('公开邮箱', site.links.email, (text) => { site.links.email = text; }, { max: 160, type: 'email' })
  );
  links.append(linkFields);

  for (const key of ['focus', 'skills', 'timeline']) site[key] ||= [];
  const focus = listPanel('focus', '关注方向', 8, () => '', (row, item, index, remove) => {
    row.append(rowInput('方向', item, (text) => { site.focus[index] = text; }, { required: true, max: 80 }), remove);
  });
  const skills = listPanel('skills', '技能', 16, () => ({ name: '', level: '', color: 'sky' }), (row, item, _, remove) => {
    row.append(
      rowInput('技能名称', item.name, (text) => { item.name = text; }, { required: true, max: 80 }),
      rowInput('水平或说明', item.level, (text) => { item.level = text; }, { max: 40 }),
      rowInput('标签颜色', item.color || 'sky', (text) => { item.color = text; }, { options: skillColors }),
      remove
    );
  });
  const timeline = listPanel('timeline', '经历时间线', 16, () => ({ year: '', title: '', desc: '' }), (row, item, _, remove) => {
    row.append(
      rowInput('时间', item.year, (text) => { item.year = text; }, { max: 30, placeholder: '例如 2026' }),
      rowInput('经历标题', item.title, (text) => { item.title = text; }, { required: true, max: 100 }),
      remove,
      rowInput('经历说明', item.desc, (text) => { item.desc = text; }, { max: 300, multiline: true, wide: true })
    );
  });
  profileForm.replaceChildren(basic, focus, skills, timeline, links);
}

function postLabel(post) {
  return post.title.trim() || '未命名帖子';
}

function postMeta(post) {
  return [post.date, post.cat.trim()].filter(Boolean).join(' · ');
}

function renderPostList() {
  $('post-count').textContent = String(data.articles.length);
  const list = $('post-list');
  list.replaceChildren();
  if (!data.articles.length) list.append(h('p', 'empty', '当前没有帖子。'));
  for (const post of data.articles) {
    const choose = button('post-select', '', () => {
      selectedId = post.id;
      renderPosts();
      postForm.querySelector('input')?.focus();
    });
    if (post.id === selectedId) choose.setAttribute('aria-current', 'true');
    choose.append(h('strong', '', postLabel(post)), h('small', '', postMeta(post)));
    list.append(choose);
  }
}

function renderPosts() {
  if (!data.articles.some(({ id }) => id === selectedId)) selectedId = data.articles[0]?.id || '';
  renderPostList();
  const post = data.articles.find(({ id }) => id === selectedId);
  $('post-empty').hidden = Boolean(post);
  postForm.hidden = !post;
  postForm.replaceChildren();
  if (!post) return;
  const top = h('div', 'panel-heading');
  top.append(h('h2', '', '编辑帖子'), button('control remove compact', '移除帖子', () => {
    if (!window.confirm('移除「' + postLabel(post) + '」？保存修改后，当前站点将停止展示这篇帖子。')) return;
    data.articles = data.articles.filter(({ id }) => id !== selectedId);
    selectedId = '';
    changed();
    renderPosts();
  }));
  const fields = h('div', 'form-grid');
  function edit(key) {
    return (value) => {
      post[key] = value;
      if (key !== 'body') renderPostList();
    };
  }
  fields.append(
    rowInput('标题', post.title, edit('title'), { required: true, max: 180, wide: true }),
    rowInput('分类', post.cat, edit('cat'), { max: 80, placeholder: '极客随笔' }),
    rowInput('发布日期', post.date, edit('date'), { type: 'date', required: true }),
    rowInput('正文', post.body, edit('body'), { required: true, max: 6000, multiline: true, rows: 12, wide: true })
  );
  postForm.append(top, fields);
}

function dateToday() {
  const date = new Date();
  const part = (value) => String(value).padStart(2, '0');
  return [date.getFullYear(), part(date.getMonth() + 1), part(date.getDate())].join('-');
}

$('new-post').addEventListener('click', () => {
  const post = { id: 'a-' + crypto.randomUUID(), title: '', cat: '', date: dateToday(), body: '' };
  data.articles.unshift(post);
  selectedId = post.id;
  changed();
  renderPosts();
  postForm.querySelector('input')?.focus();
});

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

function displayError(error) {
  if (error.status === 401) {
    showLogin('登录已过期，请重新登录。', { tone: 'warning', focus: true });
  } else {
    const message = error.name === 'TimeoutError'
      ? '请求超时。请检查服务状态，再确认改动是否保存或发布。'
      : error.message;
    status(message, 'error');
  }
}

async function save() {
  if (!dirty || busy) return;
  if (!profileForm.checkValidity()) {
    switchView('profile');
    profileForm.reportValidity();
    return;
  }
  const invalid = data.articles.find((post) => !post.title.trim() || !post.body.trim() || !post.date);
  if (invalid) {
    selectedId = invalid.id;
    switchView('posts');
    renderPosts();
    postForm.reportValidity();
    status('请填写帖子的标题、日期和正文，或移除这篇未完成的帖子。', 'warning');
    return;
  }
  busy = true;
  actions();
  try {
    const saved = await api('content', 'PUT', data);
    data = { ...data, ...saved };
    dirty = false;
    status(githubConfigured ? '已保存到当前站点。可点击「发布到 GitHub Pages」同步。' : '已保存，当前站点刷新后即可看到修改。', 'success');
    renderProfile();
    renderPosts();
  } catch (error) {
    displayError(error);
  } finally {
    busy = false;
    actions();
  }
}

$('save').addEventListener('click', save);
for (const form of [profileForm, postForm]) {
  form.addEventListener('submit', (event) => { event.preventDefault(); save(); });
}

$('publish').addEventListener('click', async () => {
  if (dirty || busy) return;
  if (!window.confirm('发布当前保存的简历和帖子到 GitHub Pages？')) return;
  busy = true;
  actions();
  status('正在提交到 GitHub…');
  try {
    const result = await api('publish', 'POST', { revision: data.revision });
    status(result.unchanged === true
      ? '线上内容已是最新。'
      : '已提交到 GitHub。GitHub Pages 部署完成后生效。', 'success');
  } catch (error) {
    displayError(error);
  } finally {
    busy = false;
    actions();
  }
});

$('logout').addEventListener('click', async () => {
  if (dirty && !window.confirm('退出时放弃未保存的修改？')) return;
  busy = true;
  actions();
  try {
    await api('logout', 'POST', {});
    data = null;
    dirty = false;
    selectedId = '';
    profileForm.replaceChildren();
    postForm.replaceChildren();
    $('post-list').replaceChildren();
    showLogin('已退出登录。', { focus: true });
  } catch (error) {
    displayError(error);
  } finally {
    busy = false;
    actions();
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = loginForm.querySelector('button');
  submit.disabled = true;
  loginStatus('正在登录…');
  try {
    const payload = Object.fromEntries(new FormData(loginForm));
    await api('login', 'POST', payload);
    loginForm.reset();
    await openWorkspace(await api('session'));
    $('workspace-title').setAttribute('tabindex', '-1');
    $('workspace-title').focus();
  } catch (error) {
    loginForm.elements.password.value = '';
    loginStatus(error.message, 'error');
    loginForm.elements.password.focus();
  } finally {
    submit.disabled = false;
  }
});

window.addEventListener('beforeunload', (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

async function initialize() {
  try {
    const session = await api('session');
    if (session.authenticated) {
      await openWorkspace(session);
    } else if (session.configured === false) {
      showLogin('请先在网站目录运行 npm run setup，设置工作台账号和密码。', { configured: false });
    } else {
      showLogin('');
    }
  } catch (error) {
    showLogin(error.message || '管理服务暂时不可用。', { configured: false, tone: 'error' });
  }
}

initialize();
