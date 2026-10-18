/**
 * 项目面板。新增项目写入本机草稿，删除公共项目只是本机隐藏。
 */
import { h, clear, emptyState, badge } from '../dom.js';

export function createProjectsRenderer({ store, feedback }) {
  const form = document.getElementById('form-new-project');
  const container = document.getElementById('projects-container');
  const toggle = document.getElementById('btn-toggle-new-project');
  const cancel = document.getElementById('btn-cancel-project');

  function closeForm() {
    if (form) form.hidden = true;
    form?.reset();
  }

  toggle?.addEventListener('click', () => {
    if (!form) return;
    const willShow = form.hidden;
    form.hidden = !willShow;
    if (willShow) document.getElementById('inp-proj-name')?.focus();
  });
  cancel?.addEventListener('click', closeForm);
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const ver = document.getElementById('inp-proj-ver')?.value.trim();
    const name = document.getElementById('inp-proj-name')?.value.trim();
    const desc = document.getElementById('inp-proj-desc')?.value.trim();
    if (!name) {
      feedback('项目名称不能为空。', 'error');
      return;
    }
    try {
      store.add('projects', {
        ver: ver || 'NEW',
        name,
        desc,
        date: 'JUST NOW'
      });
      closeForm();
      feedback('项目已保存为本机草稿。到控制台导出后即可发布。', 'success');
    } catch (error) {
      feedback(error.message || '项目保存失败。', 'error');
    }
  });

  container?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-project]');
    if (!removeButton) return;
    const id = removeButton.getAttribute('data-remove-project');
    const isLocal = store.isLocal('projects', id);
    const message = isLocal
      ? '放弃这条本机项目修改？'
      : '从本机隐藏这个公共项目？可以通过「重置本机草稿」恢复。';
    if (!window.confirm(message)) return;
    try {
      if (isLocal && store.isPublicItem('projects', id)) store.discardDraft('projects', id);
      else store.remove('projects', id);
      feedback('已更新本机草稿。', 'success');
    } catch (error) {
      feedback(error.message || '操作失败。', 'error');
    }
  });

  function render() {
    if (!container) return;
    clear(container);
    const projects = store.get('projects');
    if (!projects.length) {
      container.appendChild(emptyState('还没有项目。点击右上角「发布项目更新」，第一条项目就会出现在本机草稿里。'));
      return;
    }
    for (const project of projects) {
      const card = h('article', 'project-card');
      const top = h('div', 'project-top');
      top.append(badge(project.ver || 'NEW', 'sky'), h('span', 'project-date', project.date || ''));
      const title = h('h4', 'project-title', project.name);
      const desc = h('p', 'project-desc', project.desc || '这个项目还没有写下描述。');
      const footer = h('div', 'project-footer');
      if (store.isLocal('projects', project.id)) {
        footer.appendChild(h('span', 'local-tag', store.isPublicItem('projects', project.id) ? '本机修改' : '本机新增'));
      } else {
        footer.appendChild(h('span', 'local-tag local-tag-muted', '公开内容'));
      }
      const remove = h('button', 'text-danger-btn', '从本机移除');
      remove.type = 'button';
      remove.dataset.removeProject = project.id;
      footer.appendChild(remove);
      card.append(top, title, desc, footer);
      container.appendChild(card);
    }
  }

  return { render };
}
