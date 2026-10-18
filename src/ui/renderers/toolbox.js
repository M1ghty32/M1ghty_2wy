/**
 * 工具箱：工具收藏 / 搜索 / 分类 / 本机处理器。
 */
import { h, clear, emptyState, link, safeExternalUrl } from '../dom.js';

function encodeBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function decodeBase64(text) {
  const binary = atob(text.replace(/\s+/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function rgbToHsl(r, g, b) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  let hue = 0;
  let sat = 0;
  const light = (max + min) / 2;
  if (max !== min) {
    const delta = max - min;
    sat = light > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === rr) hue = (gg - bb) / delta + (gg < bb ? 6 : 0);
    else if (max === gg) hue = (bb - rr) / delta + 2;
    else hue = (rr - gg) / delta + 4;
    hue /= 6;
  }
  return `${Math.round(hue * 360)}°, ${Math.round(sat * 100)}%, ${Math.round(light * 100)}%`;
}

export function createToolboxRenderer({ store, feedback }) {
  const container = document.getElementById('tools-container');
  const categoryBar = document.getElementById('tool-category-bar');
  const search = document.getElementById('tool-search');
  const utilityInput = document.getElementById('utility-input');
  const utilityOutput = document.getElementById('utility-output');
  const utilityStatus = document.getElementById('utility-status');
  const utilityOptions = document.getElementById('utility-options');
  const utilButtons = document.querySelectorAll('.utility-btn');

  let activeCategory = '全部';
  let utilityMode = 'json';

  function setUtilityStatus(message, isError = false) {
    if (!utilityStatus) return;
    utilityStatus.textContent = message;
    utilityStatus.dataset.tone = isError ? 'error' : 'muted';
  }

  function copyButton() {
    const button = h('button', 'utility-copy', '复制结果');
    button.type = 'button';
    button.addEventListener('click', async () => {
      if (!utilityOutput?.value) return;
      try {
        await navigator.clipboard.writeText(utilityOutput.value);
        setUtilityStatus('结果已复制到剪贴板。');
      } catch (error) {
        utilityOutput.select();
        setUtilityStatus('无法访问剪贴板，已选中结果，请按 Ctrl/Cmd+C。', true);
      }
    });
    return button;
  }

  function renderUtilityOptions() {
    if (!utilityOptions) return;
    clear(utilityOptions);
    if (utilityMode === 'json') {
      const select = h('select', 'mini-select');
      select.id = 'utility-json-mode';
      select.append(new Option('格式化', 'pretty'), new Option('压缩', 'minify'));
      select.addEventListener('change', runUtility);
      utilityOptions.append(select);
    } else if (utilityMode === 'base64') {
      const select = h('select', 'mini-select');
      select.id = 'utility-base64-mode';
      select.append(new Option('编码', 'encode'), new Option('解码', 'decode'));
      select.addEventListener('change', runUtility);
      utilityOptions.append(select);
    } else if (utilityMode === 'timestamp') {
      utilityOptions.append(h('span', 'utility-tip', '留空 = 当前时间；支持秒/毫秒时间戳或日期字符串'));
    } else if (utilityMode === 'color') {
      utilityOptions.append(h('span', 'utility-tip', '输入 HEX，如 #38bdf8 或 f59e0b'));
    } else if (utilityMode === 'regex') {
      const pattern = h('input', 'mini-input');
      pattern.id = 'utility-regex-pattern';
      pattern.placeholder = '正则表达式，如 \\bfoo\\b';
      pattern.spellcheck = false;
      const flags = h('input', 'mini-input mini-flags');
      flags.id = 'utility-regex-flags';
      flags.value = 'gi';
      flags.placeholder = 'flags';
      [pattern, flags].forEach((input) => input.addEventListener('input', runUtility));
      utilityOptions.append(pattern, flags);
    }
    utilityOptions.append(copyButton());
  }

  function setUtilityMode(mode) {
    utilityMode = mode;
    utilButtons.forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-util') === mode);
    });
    renderUtilityOptions();
    runUtility();
  }

  function runUtility() {
    if (!utilityInput || !utilityOutput) return;
    const input = utilityInput.value;
    try {
      let result = '';
      if (utilityMode === 'json') {
        const parsed = JSON.parse(input || '{}');
        const compact = document.getElementById('utility-json-mode')?.value === 'minify';
        result = compact ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
      } else if (utilityMode === 'base64') {
        const mode = document.getElementById('utility-base64-mode')?.value || 'encode';
        result = mode === 'decode' ? decodeBase64(input) : encodeBase64(input);
      } else if (utilityMode === 'timestamp') {
        const text = input.trim();
        let date;
        if (!text) date = new Date();
        else if (/^\d+$/.test(text)) {
          const number = Number(text);
          date = new Date(number < 10000000000 ? number * 1000 : number);
        } else {
          date = new Date(text);
        }
        if (Number.isNaN(date.getTime())) throw new Error('无法识别的日期或时间戳');
        result = [
          `本地时间: ${date.toLocaleString('zh-CN')}`,
          `ISO 8601: ${date.toISOString()}`,
          `Unix 秒: ${Math.floor(date.getTime() / 1000)}`,
          `Unix 毫秒: ${date.getTime()}`
        ].join('\n');
      } else if (utilityMode === 'color') {
        let hex = input.trim().replace('#', '');
        if (!/^[0-9a-fA-F]{3,6}$/.test(hex)) throw new Error('请输入 3 位或 6 位 HEX 颜色');
        if (hex.length === 3) hex = hex.split('').map((char) => char + char).join('');
        const rgb = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
        result = `HEX: #${hex.toUpperCase()}\nRGB: rgb(${rgb.join(', ')})\nHSL: hsl(${rgbToHsl(...rgb)})`;
      } else if (utilityMode === 'regex') {
        const expression = document.getElementById('utility-regex-pattern')?.value || '';
        const flags = (document.getElementById('utility-regex-flags')?.value || 'gi').replace(/[^dgimsuvy]/g, '');
        if (!expression) throw new Error('请输入正则表达式');
        const regex = new RegExp(expression, flags);
        const lines = input.split('\n').slice(0, 500);
        result = lines.map((line, index) => `${String(index + 1).padStart(3, '0')}: ${regex.test(line) ? 'MATCH ' : 'MISS  '} ${line}`).join('\n');
        if (input.split('\n').length > 500) result += '\n… 仅处理前 500 行';
      }
      utilityOutput.value = result;
      setUtilityStatus('处理完成。');
    } catch (error) {
      utilityOutput.value = '';
      setUtilityStatus(error.message || '输入格式无法处理。', true);
    }
  }

  utilButtons.forEach((button) => {
    button.addEventListener('click', () => setUtilityMode(button.getAttribute('data-util')));
  });
  utilityInput?.addEventListener('input', runUtility);
  search?.addEventListener('input', renderTools);

  categoryBar?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tool-category]');
    if (!button) return;
    activeCategory = button.getAttribute('data-tool-category');
    renderTools();
  });

  container?.addEventListener('click', (event) => {
    const favoriteButton = event.target.closest('[data-favorite-tool]');
    if (!favoriteButton) return;
    const id = favoriteButton.getAttribute('data-favorite-tool');
    const tool = store.getItem('tools', id);
    if (!tool) return;
    try {
      store.update('tools', id, { favorite: !tool.favorite });
      feedback(tool.favorite ? '已取消置顶。' : '已置顶这个工具（本机草稿）。', 'success');
    } catch (error) {
      feedback(error.message || '置顶失败。', 'error');
    }
  });

  function renderCategories(tools) {
    if (!categoryBar) return;
    clear(categoryBar);
    const categories = ['全部', ...new Set(tools.map((tool) => tool.category).filter(Boolean))];
    if (!categories.includes(activeCategory)) activeCategory = '全部';
    categories.forEach((category) => {
      const button = h('button', `filter-chip ${activeCategory === category ? 'is-active' : ''}`, category);
      button.type = 'button';
      button.dataset.toolCategory = category;
      categoryBar.appendChild(button);
    });
  }

  function renderTools() {
    if (!container) return;
    const tools = store.get('tools');
    renderCategories(tools);
    const query = (search?.value || '').trim().toLowerCase();
    const visible = tools.filter((tool) => {
      const matchesCategory = activeCategory === '全部' || tool.category === activeCategory;
      const haystack = [tool.name, tool.category, tool.description, ...(tool.tags || [])].join(' ').toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    }).sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)));
    clear(container);
    if (!visible.length) {
      container.appendChild(emptyState('没有匹配的工具。可以从控制台新增，或清空搜索词。'));
      return;
    }
    for (const tool of visible) {
      const card = h('article', 'tool-card');
      const top = h('div', 'tool-top');
      const titleWrap = h('div', '');
      titleWrap.append(h('h4', 'tool-name', tool.name), h('span', 'tool-category', tool.category));
      top.append(titleWrap, h('span', 'tool-fav-mark', tool.favorite ? '★' : '☆'));
      const desc = h('p', 'tool-desc', tool.description || '还没有描述。');
      const tags = h('div', 'tag-row');
      (tool.tags || []).forEach((tag) => tags.appendChild(h('span', 'tag', `#${tag}`)));
      const actions = h('div', 'tool-actions');
      const url = safeExternalUrl(tool.url);
      if (url) {
        actions.appendChild(link('btn btn-ghost btn-xs', '打开工具 ↗', url));
      } else {
        actions.appendChild(h('span', 'muted-label', '暂无链接'));
      }
      const favorite = h('button', 'btn btn-ghost btn-xs', tool.favorite ? '★ 已置顶' : '☆ 置顶');
      favorite.type = 'button';
      favorite.dataset.favoriteTool = tool.id;
      actions.appendChild(favorite);
      if (store.isLocal('tools', tool.id)) {
        actions.appendChild(h('span', 'local-tag', store.isPublicItem('tools', tool.id) ? '本机修改' : '本机新增'));
      }
      card.append(top, desc, tags, actions);
      container.appendChild(card);
    }
  }

  function render() {
    renderTools();
    // 打开面板时初始化一次处理器，保留当前模式与输入。
    if (!utilityOptions?.childElementCount) {
      renderUtilityOptions();
      runUtility();
    }
  }

  // 初始化模式，即使面板尚未打开也保持可用。
  setUtilityMode('json');

  return { render, setUtilityMode };
}
