/**
 * 文章面板与阅读抽屉。
 */
import { h, clear, emptyState } from '../dom.js';

export function createArticlesRenderer({ store, feedback }) {
  const container = document.getElementById('articles-container');
  const form = document.getElementById('form-new-article');
  const toggle = document.getElementById('btn-toggle-new-article');
  const cancel = document.getElementById('btn-cancel-article');
  const reader = document.getElementById('article-reader-box');
  const readerCat = document.getElementById('reader-cat');
  const readerTitle = document.getElementById('reader-title');
  const readerBody = document.getElementById('reader-body');
  const closeReader = document.getElementById('btn-close-reader');

  function closeForm() {
    if (form) form.hidden = true;
    form?.reset();
  }

  function hideReader() {
    if (reader) reader.hidden = true;
  }

  function openReader(id) {
    const article = store.getItem('articles', id);
    if (!article || !reader) return;
    if (readerCat) readerCat.textContent = `${article.cat} // ${article.date}`;
    if (readerTitle) readerTitle.textContent = article.title;
    if (readerBody) readerBody.textContent = article.body;
    reader.hidden = false;
    reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toggle?.addEventListener('click', () => {
    if (!form) return;
    const willShow = form.hidden;
    form.hidden = !willShow;
    if (willShow) document.getElementById('inp-art-title')?.focus();
  });
  cancel?.addEventListener('click', closeForm);
  closeReader?.addEventListener('click', hideReader);

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const cat = document.getElementById('inp-art-cat')?.value.trim();
    const title = document.getElementById('inp-art-title')?.value.trim();
    const body = document.getElementById('inp-art-body')?.value.trim();
    if (!title || !body) {
      feedback('文章标题和正文都不能为空。', 'error');
      return;
    }
    try {
      store.add('articles', {
        cat: cat || '极客随笔',
        title,
        body,
        date: new Date().toISOString().slice(0, 10)
      });
      closeForm();
      feedback('文章已保存为本机草稿。', 'success');
    } catch (error) {
      feedback(error.message || '文章保存失败。', 'error');
    }
  });

  function handleCardAction(event) {
    const remove = event.target.closest('[data-remove-article]');
    if (remove) {
      event.stopPropagation();
      const id = remove.getAttribute('data-remove-article');
      const isLocal = store.isLocal('articles', id);
      if (!window.confirm(isLocal ? '放弃这篇本机文章？' : '从本机隐藏这篇文章？可以重置草稿恢复。')) return;
      try {
        if (isLocal && store.isPublicItem('articles', id)) store.discardDraft('articles', id);
        else store.remove('articles', id);
        hideReader();
        feedback('已更新本机草稿。', 'success');
      } catch (error) {
        feedback(error.message || '操作失败。', 'error');
      }
      return;
    }
    const card = event.target.closest('[data-read-id]');
    if (card) openReader(card.getAttribute('data-read-id'));
  }

  container?.addEventListener('click', handleCardAction);

  function render() {
    if (!container) return;
    clear(container);
    const articles = store.get('articles');
    if (!articles.length) {
      container.appendChild(emptyState('还没有文章。点击「撰写新文章」写第一篇，或从控制台导入内容包。'));
      return;
    }
    for (const article of articles) {
      const card = h('article', 'article-card');
      card.dataset.readId = article.id;
      const meta = h('div', 'article-meta');
      meta.append(h('span', 'article-cat', article.cat), h('span', 'article-date', `${article.date} · 点击阅读全文 →`));
      const title = h('h4', 'article-title', article.title);
      const preview = h('p', 'article-preview', article.body || '');
      const footer = h('div', 'article-footer');
      if (store.isLocal('articles', article.id)) {
        footer.appendChild(h('span', 'local-tag', store.isPublicItem('articles', article.id) ? '本机修改' : '本机新增'));
      }
      const read = h('button', 'article-open-btn', '阅读全文 →');
      read.type = 'button';
      read.dataset.readId = article.id;
      read.setAttribute('aria-label', `阅读文章：${article.title}`);
      footer.appendChild(read);
      const remove = h('button', 'text-danger-btn', '从本机移除');
      remove.type = 'button';
      remove.dataset.removeArticle = article.id;
      footer.appendChild(remove);
      card.append(meta, title, preview, footer);
      container.appendChild(card);
    }
  }

  return { render, openReader, hideReader };
}
