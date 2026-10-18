/**
 * 统一内容面板。负责 tab、开关、焦点管理、内容反馈与渲染器编排。
 */
import { createAboutRenderer } from './renderers/about.js';
import { createProjectsRenderer } from './renderers/projects.js';
import { createArticlesRenderer } from './renderers/articles.js';
import { createNotesRenderer } from './renderers/notes.js';
import { createToolboxRenderer } from './renderers/toolbox.js';
import { createLibraryRenderer } from './renderers/library.js';
import { createStudioRenderer } from './renderers/studio.js';
import { showInlineStatus } from './dom.js';

const TAB_IDS = ['about', 'projects', 'articles', 'notes', 'toolbox', 'library', 'studio'];

export function createSpaceModal({
  store,
  registry,
  toast,
  getEggState,
  onGuideSelect,
  onOpen,
  onClose
}) {
  const modal = document.getElementById('personal-space-modal');
  const closeButton = document.getElementById('btn-close-space');
  const backButton = document.getElementById('btn-back-to-room');
  const tabButtons = Array.from(document.querySelectorAll('[data-space-tab]'));
  const body = document.querySelector('.space-body');
  const contextLabel = document.getElementById('modal-context-label');
  const feedbackNode = document.getElementById('content-feedback');
  const logo = document.querySelector('.space-avatar');

  let currentTab = 'about';
  let open = false;
  let previousFocus = null;
  let closeTimer = null;
  let feedbackTimer = null;

  function feedback(message, tone = 'info', duration = 5200) {
    showInlineStatus(feedbackNode, message, tone);
    toast?.showContent?.(message, tone, duration);
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      if (feedbackNode) feedbackNode.hidden = true;
    }, duration);
  }

  const renderers = {
    about: createAboutRenderer({ store, registry, getEggState, onGuideSelect }),
    projects: createProjectsRenderer({ store, feedback }),
    articles: createArticlesRenderer({ store, feedback }),
    notes: createNotesRenderer({ store, feedback }),
    toolbox: createToolboxRenderer({ store, feedback }),
    library: createLibraryRenderer({ store, feedback }),
    studio: createStudioRenderer({ store, feedback })
  };

  function setTab(tab, { focus = false } = {}) {
    if (!TAB_IDS.includes(tab)) tab = 'about';
    currentTab = tab;
    tabButtons.forEach((button) => {
      const active = button.getAttribute('data-space-tab') === tab;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.tabIndex = active ? 0 : -1;
    });
    for (const id of TAB_IDS) {
      const panel = document.getElementById(`space-tab-${id}`);
      if (panel) panel.hidden = id !== tab;
    }
    if (body) body.scrollTop = 0;
    if (focus) {
      const active = tabButtons.find((button) => button.getAttribute('data-space-tab') === tab);
      active?.focus({ preventScroll: true });
    }
    // 切换栏目时让渲染器拿到最新数据。
    refresh();
  }

  function refresh() {
    if (!open) {
      // 控制台状态在面板打开后也需要是最新值，且初始化时 store 必须可用。
    }
    renderers.about.render();
    renderers.projects.render();
    renderers.articles.render();
    renderers.notes.render();
    renderers.toolbox.render();
    renderers.library.render();
    renderers.studio.render();
  }

  function setContext(label) {
    if (!contextLabel) return;
    if (label) contextLabel.textContent = `从「${label}」进入 · 数据只读 + 本机草稿`;
    else contextLabel.textContent = '个人空间导览 · 公开内容与本机草稿分离';
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !open) return;
    const focusable = Array.from(modal.querySelectorAll(
      'button:not([disabled]):not([hidden]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter((node) => node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openModal(tab = 'about', options = {}) {
    if (!modal) return;
    if (closeTimer) clearTimeout(closeTimer);
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    open = true;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    setContext(options.context || options.label || '');
    setTab(tab);
    requestAnimationFrame(() => {
      modal.classList.add('is-open');
      if (closeButton) closeButton.focus({ preventScroll: true });
    });
    if (options.source === 'guide') {
      // 导览跳转也会打开面板，但使用对应栏目。
    }
    onOpen?.({ tab, context: options.context || '' });
  }

  function closeModal({ restoreFocus = true } = {}) {
    if (!open) return;
    open = false;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    closeTimer = setTimeout(() => {
      modal.hidden = true;
    }, 190);
    onClose?.();
    if (restoreFocus && previousFocus && document.contains(previousFocus)) {
      previousFocus.focus({ preventScroll: true });
    }
    previousFocus = null;
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => setTab(button.getAttribute('data-space-tab')));
    button.addEventListener('keydown', (event) => {
      const index = tabButtons.indexOf(button);
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        const direction = event.key === 'ArrowRight' ? 1 : -1;
        const next = tabButtons[(index + direction + tabButtons.length) % tabButtons.length];
        setTab(next.getAttribute('data-space-tab'), { focus: true });
      }
    });
  });

  closeButton?.addEventListener('click', () => closeModal());
  backButton?.addEventListener('click', () => closeModal());
  document.querySelectorAll('[data-goto-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.getAttribute('data-goto-tab');
      setTab(tab);
      if (body) body.scrollTop = 0;
    });
  });
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  modal?.addEventListener('keydown', trapFocus);
  window.addEventListener('keydown', (event) => {
    if (!open || event.key !== 'Escape') return;
    const reader = document.getElementById('article-reader-box');
    if (reader && !reader.hidden) {
      event.preventDefault();
      renderers.articles.hideReader();
      return;
    }
    event.preventDefault();
    closeModal();
  });

  store.subscribe(() => {
    if (!open) return;
    refresh();
  });

  setTab('about');
  logo?.setAttribute('aria-hidden', 'true');

  return {
    open: openModal,
    close: closeModal,
    isOpen: () => open,
    getTab: () => currentTab,
    setTab,
    refresh,
    feedback,
    renderers
  };
}
