/**
 * 内容控制台：本机草稿、导出、导入、重置与发布边界说明。
 */
import { h, clear, downloadJson } from '../dom.js';
import { COLLECTIONS, COLLECTION_META, CONTENT_SCHEMA_VERSION } from '../../content-store.js';

const COLLECTION_ORDER = ['projects', 'articles', 'notes', 'guestbook', 'tools', 'library'];

export function createStudioRenderer({ store, feedback }) {
  const exportButton = document.getElementById('btn-export-content');
  const copyButton = document.getElementById('btn-copy-export');
  const resetButton = document.getElementById('btn-reset-drafts');
  const importInput = document.getElementById('content-import-input');
  const draftStatus = document.getElementById('draft-status');
  const draftOverview = document.getElementById('draft-overview');
  const notesContainer = document.getElementById('notes-container');
  const libraryContainer = document.getElementById('draft-library-container');
  const toolsContainer = document.getElementById('draft-tools-container');
  const notesCount = document.getElementById('notes-count');
  const libraryCount = document.getElementById('draft-library-count');
  const toolsCount = document.getElementById('draft-tools-count');
  const noteForm = document.getElementById('form-new-note');
  const libraryForm = document.getElementById('form-new-library');
  const toolForm = document.getElementById('form-new-tool');

  function exportData({ copy = false } = {}) {
    try {
      const bundle = store.exportBundle();
      const stamp = new Date().toISOString().slice(0, 10);
      if (copy) {
        navigator.clipboard.writeText(JSON.stringify(bundle, null, 2))
          .then(() => feedback('导出 JSON 已复制到剪贴板。', 'success'))
          .catch(() => feedback('无法访问剪贴板，请使用「导出内容 JSON」。', 'error'));
      } else {
        downloadJson(`m1ghty-2wy-content-${stamp}.json`, bundle);
        feedback('内容已导出。把对应数组写回 data/ 并提交仓库后，访客才能看到更新。', 'success', 6500);
      }
      updateStatusText();
    } catch (error) {
      feedback(error.message || '导出失败。', 'error');
    }
  }

  exportButton?.addEventListener('click', () => exportData());
  copyButton?.addEventListener('click', () => exportData({ copy: true }));

  resetButton?.addEventListener('click', () => {
    if (!window.confirm('重置后，本机所有集合的草稿与隐藏记录都会被清除，公共内容将恢复显示。继续吗？')) return;
    store.resetAllDrafts();
    feedback('本机草稿已全部重置，当前显示公开数据。', 'success');
  });

  importInput?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      feedback('导入文件超过 4MB，请确认导出文件是否正确。', 'error');
      event.target.value = '';
      return;
    }
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const report = store.importBundle(payload);
      const imported = Object.entries(report.imported).map(([key, count]) => `${COLLECTION_META[key]?.label || key} ${count}`).join('、');
      if (report.errors.length) {
        feedback(`已导入：${imported || '无'}。${report.errors.join('；')}`, 'error', 8000);
      } else {
        feedback(`导入成功：${imported}。内容已保存为本机草稿。`, 'success');
      }
      if (report.storageError) feedback(report.storageError, 'error', 8000);
    } catch (error) {
      feedback(error.message ? `导入失败：${error.message}` : '导入失败：JSON 格式无效。', 'error', 7000);
    } finally {
      event.target.value = '';
    }
  });

  function updateStatusText() {
    if (!draftStatus) return;
    const status = store.getStatus();
    const totalDrafts = Object.values(status.drafts).reduce((sum, item) => sum + item.total, 0);
    const messages = [];
    if (status.storageError) messages.push(status.storageError);
    if (status.usingFallback) messages.push('当前部分内容使用了内置回退数据（可能是 data/ 未加载成功）。');
    if (status.loadError) messages.push(status.loadError);
    if (totalDrafts > 0) {
      messages.push(`当前有 ${totalDrafts} 项本机草稿/隐藏记录。导出 JSON 后覆盖 data/ 文件并提交 GitHub，公开访客才能看到更新。`);
    } else {
      messages.push('当前显示公开数据。网页中的编辑只保存到本机，不会自动修改仓库。');
    }
    draftStatus.textContent = messages.join(' ');
    draftStatus.dataset.tone = status.storageError ? 'error' : totalDrafts ? 'warn' : 'info';
  }

  function renderOverview() {
    if (!draftOverview) return;
    clear(draftOverview);
    for (const key of COLLECTION_ORDER) {
      const counts = store.countDraft(key);
      const totalPublic = store.get(key).length;
      const row = h('div', `draft-overview-row ${counts.total ? 'has-draft' : ''}`);
      const left = h('div', 'draft-overview-name');
      left.append(h('span', `status-dot ${counts.total ? 'is-dirty' : ''}`), h('span', '', COLLECTION_META[key].label));
      const right = h('div', 'draft-overview-counts');
      right.append(
        h('span', 'count-pill', `公开 ${Math.max(0, totalPublic - counts.upserts - counts.deleted)}`),
        h('span', 'count-pill', `草稿 ${counts.upserts}`)
      );
      if (counts.deleted) right.appendChild(h('span', 'count-pill count-danger', `隐藏 ${counts.deleted}`));
      row.append(left, right);
      draftOverview.appendChild(row);
    }
  }

  function renderDraftList(collection, container, countNode, emptyText) {
    if (!container) return;
    clear(container);
    const items = store.getDraftItems(collection);
    if (countNode) countNode.textContent = `${items.length} 条`;
    if (!items.length) {
      container.appendChild(h('div', 'draft-empty', emptyText));
      return;
    }
    for (const item of items) {
      const row = h('div', 'draft-row');
      const copy = h('div', 'draft-row-copy');
      const title = item.title || item.name || '未命名条目';
      copy.append(h('strong', '', title), h('span', '', item.description || item.body || ''));
      const meta = h('div', 'draft-row-meta');
      meta.append(h('span', `local-tag ${item.__localKind === 'override' ? 'is-override' : ''}`, item.__localKind === 'override' ? '修改公共内容' : '本机新增'));
      const remove = h('button', 'text-danger-btn', '放弃修改');
      remove.type = 'button';
      remove.dataset.discardCollection = collection;
      remove.dataset.discardId = item.id;
      meta.appendChild(remove);
      row.append(copy, meta);
      container.appendChild(row);
    }
  }

  function render() {
    updateStatusText();
    renderOverview();
    renderDraftList('notes', notesContainer, notesCount, '还没有本机随记草稿。');
    renderDraftList('library', libraryContainer, libraryCount, '还没有本机素材草稿。');
    renderDraftList('tools', toolsContainer, toolsCount, '还没有本机工具草稿。');
  }

  document.querySelector('.studio-grid')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-discard-collection]');
    if (!button) return;
    const collection = button.getAttribute('data-discard-collection');
    const id = button.getAttribute('data-discard-id');
    try {
      store.discardDraft(collection, id);
      feedback('已放弃这条本机修改。', 'success');
    } catch (error) {
      feedback(error.message || '无法放弃修改。', 'error');
    }
  });

  noteForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.getElementById('inp-note-title')?.value.trim();
    const body = document.getElementById('inp-note-body')?.value.trim();
    if (!title || !body) {
      feedback('标题和内容不能为空。', 'error');
      return;
    }
    try {
      store.add('notes', { title, body, mood: 'NOTE' });
      noteForm.reset();
      feedback('随记草稿已保存。', 'success');
    } catch (error) {
      feedback(error.message || '保存失败。', 'error');
    }
  });

  libraryForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.getElementById('inp-lib-title')?.value.trim();
    const type = document.getElementById('inp-lib-type')?.value || 'idea';
    const url = document.getElementById('inp-lib-url')?.value.trim();
    const description = document.getElementById('inp-lib-desc')?.value.trim();
    if (!title || !description) {
      feedback('素材名称和描述不能为空。', 'error');
      return;
    }
    try {
      store.add('library', { type, title, url, description, tags: [] });
      libraryForm.reset();
      feedback('素材草稿已保存。', 'success');
    } catch (error) {
      feedback(error.message || '保存失败。', 'error');
    }
  });

  toolForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('inp-tool-name')?.value.trim();
    const category = document.getElementById('inp-tool-category')?.value.trim();
    const url = document.getElementById('inp-tool-url')?.value.trim();
    const description = document.getElementById('inp-tool-desc')?.value.trim();
    if (!name || !category || !url || !description) {
      feedback('工具名称、分类、链接和用途均不能为空。', 'error');
      return;
    }
    try {
      store.add('tools', { name, category, url, description, tags: [], favorite: false });
      toolForm.reset();
      feedback('工具草稿已保存。', 'success');
    } catch (error) {
      feedback(error.message || '保存失败。', 'error');
    }
  });

  // 首次渲染，让控制台在 modal 打开前也显示正确状态。
  render();

  return { render, exportData, updateStatusText };
}
