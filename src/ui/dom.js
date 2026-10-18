/**
 * 安全 DOM 工具。所有动态内容通过 textContent / setAttribute 写入，
 * 不使用 HTML 字符串拼接用户数据。
 */
export function h(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

export function clear(node) {
  if (node) node.replaceChildren();
  return node;
}

export function button(className, text, onClick, attrs = {}) {
  const node = h('button', className, text);
  node.type = 'button';
  if (onClick) node.addEventListener('click', onClick);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null) continue;
    if (key === 'dataset') {
      for (const [dataKey, dataValue] of Object.entries(value)) node.dataset[dataKey] = dataValue;
    } else if (key === 'ariaLabel') {
      node.setAttribute('aria-label', value);
    } else {
      node.setAttribute(key, value);
    }
  }
  return node;
}

export function link(className, text, href, options = {}) {
  const node = h('a', className, text);
  if (href) {
    node.href = href;
    node.target = '_blank';
    node.rel = 'noopener noreferrer';
  } else {
    node.setAttribute('aria-disabled', 'true');
  }
  if (options.title) node.title = options.title;
  return node;
}

export function badge(text, tone = '') {
  return h('span', `badge ${tone ? `badge-${tone}` : ''}`.trim(), text);
}

export function emptyState(text, className = 'empty-state') {
  return h('div', className, text);
}

export function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch (error) {
    return '';
  }
}

export function formatDate(value) {
  if (!value) return '';
  return String(value);
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function showInlineStatus(node, message, type = 'info') {
  if (!node) return;
  node.hidden = !message;
  node.textContent = message || '';
  node.dataset.tone = type;
}
