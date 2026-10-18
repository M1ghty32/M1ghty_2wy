/**
 * 素材库：书签、模型笔记、灵感。
 */
import { h, clear, emptyState, link, safeExternalUrl } from '../dom.js';

const TYPE_LABELS = { bookmark: '书签', model: '模型笔记', idea: '灵感' };
const TYPE_ICONS = { bookmark: '🔖', model: '📐', idea: '💡' };

export function createLibraryRenderer({ store }) {
  const container = document.getElementById('library-container');
  const filter = document.getElementById('library-filter');

  filter?.addEventListener('change', render);

  function render() {
    if (!container) return;
    clear(container);
    const active = filter?.value || 'all';
    const items = store.get('library').filter((item) => active === 'all' || item.type === active);
    if (!items.length) {
      container.appendChild(emptyState('这一类素材还是空的。可以在控制台新增书签、模型笔记或灵感。'));
      return;
    }
    for (const item of items) {
      const card = h('article', `library-card library-${item.type}`);
      const top = h('div', 'library-top');
      top.append(h('span', 'library-type', `${TYPE_ICONS[item.type] || '✦'} ${TYPE_LABELS[item.type] || item.type}`));
      if (store.isLocal('library', item.id)) {
        top.appendChild(h('span', 'local-tag', store.isPublicItem('library', item.id) ? '本机修改' : '本机新增'));
      }
      const title = h('h4', 'library-title', item.title);
      const desc = h('p', 'library-desc', item.description || '还没有描述。');
      const tags = h('div', 'tag-row');
      (item.tags || []).forEach((tag) => tags.appendChild(h('span', 'tag', `#${tag}`)));
      card.append(top, title, desc, tags);
      const url = safeExternalUrl(item.url);
      if (url) {
        const actions = h('div', 'library-actions');
        actions.appendChild(link('text-link', '打开资源 ↗', url));
        card.appendChild(actions);
      }
      container.appendChild(card);
    }
  }

  return { render };
}
