/**
 * 随记 + 留言板。坚持静态站边界：写入本机草稿，导出后由站长手动发布。
 */
import { h, clear, emptyState } from '../dom.js';

export function createNotesRenderer({ store, feedback }) {
  const notesBox = document.getElementById('notes-wall-container');
  const guestBox = document.getElementById('guestbook-container');
  const noteCount = document.getElementById('notes-wall-count');
  const guestCount = document.getElementById('guestbook-count');
  const noteForm = document.getElementById('form-public-note');
  const guestForm = document.getElementById('form-guestbook');

  function removeItem(collection, id, label) {
    const isLocal = store.isLocal(collection, id);
    if (!window.confirm(isLocal ? `放弃这条本机${label}？` : `从本机隐藏这条公共${label}？可以重置草稿恢复。`)) return;
    try {
      if (isLocal && store.isPublicItem(collection, id)) store.discardDraft(collection, id);
      else store.remove(collection, id);
      feedback('已更新本机草稿。', 'success');
    } catch (error) {
      feedback(error.message || '操作失败。', 'error');
    }
  }

  notesBox?.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-note]');
    if (remove) removeItem('notes', remove.getAttribute('data-remove-note'), '随记');
  });
  guestBox?.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-remove-guest]');
    if (remove) removeItem('guestbook', remove.getAttribute('data-remove-guest'), '留言');
  });

  noteForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.getElementById('inp-public-note-title')?.value.trim();
    const mood = document.getElementById('inp-public-note-mood')?.value.trim();
    const body = document.getElementById('inp-public-note-body')?.value.trim();
    if (!title || !body) {
      feedback('随记标题和内容不能为空。', 'error');
      return;
    }
    try {
      store.add('notes', { title, mood: mood || 'NOTE', body });
      noteForm.reset();
      feedback('随记已保存到本机草稿，可在控制台导出发布。', 'success');
    } catch (error) {
      feedback(error.message || '随记保存失败。', 'error');
    }
  });

  guestForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const title = document.getElementById('inp-guestbook-title')?.value.trim();
    const author = document.getElementById('inp-guestbook-author')?.value.trim();
    const body = document.getElementById('inp-guestbook-body')?.value.trim();
    if (!title || !body) {
      feedback('留言标题和内容不能为空。', 'error');
      return;
    }
    try {
      store.add('guestbook', { title, author: author || '匿名访客', mood: 'GUEST', body });
      guestForm.reset();
      feedback('留言已贴到本机留言板。静态站无法接收跨访客实时留言，发布需导出并提交数据文件。', 'success', 7000);
    } catch (error) {
      feedback(error.message || '留言保存失败。', 'error');
    }
  });

  function renderNotes() {
    if (!notesBox) return;
    clear(notesBox);
    const notes = store.get('notes');
    if (noteCount) noteCount.textContent = `${notes.length} 条`;
    if (!notes.length) {
      notesBox.appendChild(emptyState('还没有随记。写下第一条，或导入 content-export.json。'));
      return;
    }
    for (const note of notes) {
      const card = h('article', 'note-card');
      const meta = h('div', 'note-meta');
      meta.append(h('span', 'note-mood', note.mood || 'NOTE'), h('span', 'note-date', note.date || ''));
      const title = h('h4', 'note-title', note.title);
      const body = h('p', 'note-body', note.body);
      const footer = h('div', 'note-footer');
      if (store.isLocal('notes', note.id)) {
        footer.appendChild(h('span', 'local-tag', store.isPublicItem('notes', note.id) ? '本机修改' : '本机新增'));
      }
      const remove = h('button', 'text-danger-btn', '从本机移除');
      remove.type = 'button';
      remove.dataset.removeNote = note.id;
      footer.appendChild(remove);
      card.append(meta, title, body, footer);
      notesBox.appendChild(card);
    }
  }

  function renderGuestbook() {
    if (!guestBox) return;
    clear(guestBox);
    const messages = store.get('guestbook');
    if (guestCount) guestCount.textContent = `${messages.length} 条`;
    if (!messages.length) {
      guestBox.appendChild(emptyState('留言板还是空的。留下第一张便利贴吧。'));
      return;
    }
    for (const message of messages) {
      const card = h('article', 'guest-card');
      const meta = h('div', 'guest-meta');
      meta.append(h('span', 'guest-author', message.author || '匿名访客'), h('span', 'guest-date', message.date || ''));
      const title = h('h4', 'guest-title', message.title);
      const body = h('p', 'guest-body', message.body);
      const footer = h('div', 'note-footer');
      footer.append(h('span', 'guest-mood', message.mood || 'GUEST'));
      if (store.isLocal('guestbook', message.id)) {
        footer.appendChild(h('span', 'local-tag', store.isPublicItem('guestbook', message.id) ? '本机修改' : '本机新增'));
      }
      const remove = h('button', 'text-danger-btn', '移除');
      remove.type = 'button';
      remove.dataset.removeGuest = message.id;
      footer.appendChild(remove);
      card.append(meta, title, body, footer);
      guestBox.appendChild(card);
    }
  }

  function render() {
    renderNotes();
    renderGuestbook();
  }

  return { render };
}
