/**
 * 世界 toast 与内容提示。两个区域分开，避免 3D 彩蛋和表单反馈互相覆盖。
 */
import { h } from './dom.js';

export function createToastController({ audio } = {}) {
  const worldToast = document.getElementById('room-easter-toast');
  const icon = document.getElementById('toast-icon');
  const title = document.getElementById('toast-title');
  const desc = document.getElementById('toast-desc');
  const close = document.getElementById('toast-close');
  const contentToast = document.getElementById('content-toast');
  let timer = null;
  let contentTimer = null;

  function hide() {
    if (!worldToast) return;
    worldToast.classList.remove('is-visible');
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function show({ icon: toastIcon = '✨', title: toastTitle = '', description = '', duration = 4200, tone = '' } = {}) {
    if (!worldToast) return;
    if (icon) icon.textContent = toastIcon;
    if (title) title.textContent = toastTitle;
    if (desc) desc.textContent = description;
    worldToast.dataset.tone = tone;
    worldToast.classList.add('is-visible');
    if (timer) clearTimeout(timer);
    timer = setTimeout(hide, duration);
  }

  close?.addEventListener('click', hide);

  function showContent(message, tone = 'info', duration = 4600) {
    if (!contentToast) return;
    contentToast.hidden = false;
    contentToast.dataset.tone = tone;
    contentToast.replaceChildren(
      h('span', 'content-toast-icon', tone === 'error' ? '!' : tone === 'success' ? '✓' : 'ⓘ'),
      h('span', 'content-toast-text', message)
    );
    if (contentTimer) clearTimeout(contentTimer);
    contentTimer = setTimeout(() => {
      contentToast.hidden = true;
    }, duration);
  }

  return { show, hide, showContent };
}
