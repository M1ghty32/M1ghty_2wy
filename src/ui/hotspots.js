/**
 * 把 3D 热点投影成可点击 / 可 Tab 聚焦的 DOM 标签。
 */
import { h } from './dom.js';

export function createHotspotLayer({ container, registry, onActivate }) {
  let buttons = new Map();
  let activeZone = null;
  let suspended = false;
  let visible = true;
  let isNarrow = window.matchMedia('(max-width: 820px)').matches;

  function makeButton(entry) {
    const node = h('button', 'hotspot-marker');
    node.type = 'button';
    node.tabIndex = -1;
    node.dataset.hotspotId = entry.id;
    node.setAttribute('aria-label', entry.aria || `${entry.label}，${entry.prompt || '按 E 互动'}`);
    const icon = h('span', 'hotspot-icon', entry.icon);
    icon.setAttribute('aria-hidden', 'true');
    const label = h('span', 'hotspot-label', entry.label);
    const key = h('kbd', 'hotspot-key', 'E');
    key.setAttribute('aria-hidden', 'true');
    node.append(icon, label, key);
    node.addEventListener('click', (event) => {
      event.stopPropagation();
      onActivate?.(entry);
    });
    node.addEventListener('pointerdown', (event) => event.stopPropagation());
    return node;
  }

  function rebuild(zoneId) {
    activeZone = zoneId;
    container.replaceChildren();
    buttons = new Map();
    const entries = registry.getZoneEntries(zoneId);
    for (const entry of entries) {
      const node = makeButton(entry);
      buttons.set(entry.id, node);
      container.appendChild(node);
    }
    container.classList.add('is-hidden');
  }

  function update(camera, { highlightedId = null, introOpen = false, modalOpen = false } = {}) {
    if (!buttons.size) return;
    if (!camera || suspended || introOpen || modalOpen || !visible) {
      container.classList.add('is-hidden');
      return;
    }
    container.classList.remove('is-hidden');
    const width = window.innerWidth;
    const height = window.innerHeight;
    const anchors = registry.getScreenAnchors(width, height);
    const seen = new Set();
    const placed = [];
    const topSafe = isNarrow ? 142 : 106;
    const bottomSafe = isNarrow ? 250 : 190;
    const ordered = anchors.slice().sort((a, b) => {
      const nearA = a.entry.id === highlightedId ? 1 : 0;
      const nearB = b.entry.id === highlightedId ? 1 : 0;
      if (nearA !== nearB) return nearB - nearA;
      const priority = (b.entry.priority || 0) - (a.entry.priority || 0);
      return priority || a.y - b.y;
    });
    for (const anchor of ordered) {
      const node = buttons.get(anchor.entry.id);
      if (!node) continue;
      const buttonWidth = node.offsetWidth || 120;
      const buttonHeight = node.offsetHeight || 24;
      const centerX = Math.min(width - buttonWidth / 2 - 8, Math.max(buttonWidth / 2 + 8, anchor.x));
      let top = Math.min(height - bottomSafe, Math.max(topSafe + buttonHeight, anchor.y));
      let candidate = {
        left: centerX - buttonWidth / 2,
        right: centerX + buttonWidth / 2,
        top: top - buttonHeight,
        bottom: top
      };
      let attempts = 0;
      while (placed.some((rect) => overlaps(candidate, rect)) && attempts < 5) {
        top -= buttonHeight + 6;
        candidate = { left: candidate.left, right: candidate.right, top: top - buttonHeight, bottom: top };
        attempts += 1;
      }
      if (candidate.top < topSafe) {
        top = Math.max(topSafe + buttonHeight, anchor.y);
        candidate = { left: candidate.left, right: candidate.right, top: top - buttonHeight, bottom: top };
        let downAttempts = 0;
        while (placed.some((rect) => overlaps(candidate, rect)) && downAttempts < 3) {
          top += buttonHeight + 6;
          candidate = { left: candidate.left, right: candidate.right, top: top - buttonHeight, bottom: top };
          downAttempts += 1;
        }
      }
      if (candidate.top < topSafe || candidate.bottom > height - bottomSafe + 4 || placed.some((rect) => overlaps(candidate, rect))) {
        node.classList.remove('is-visible');
        node.tabIndex = -1;
        continue;
      }
      seen.add(anchor.entry.id);
      placed.push(candidate);
      node.style.left = `${centerX}px`;
      node.style.top = `${top}px`;
      node.classList.add('is-visible');
      node.tabIndex = 0;
      node.classList.toggle('is-near', highlightedId === anchor.entry.id);
    }
    for (const [id, node] of buttons) {
      if (!seen.has(id)) {
        node.classList.remove('is-visible');
        node.tabIndex = -1;
      }
    }
  }

  function overlaps(a, b) {
    return !(a.right < b.left - 6 || a.left > b.right + 6 || a.bottom < b.top - 6 || a.top > b.bottom + 6);
  }

  function setSuspended(value) {
    suspended = Boolean(value);
    container.setAttribute('aria-hidden', suspended ? 'true' : 'false');
    if (suspended) {
      container.classList.add('is-hidden');
      for (const node of buttons.values()) node.tabIndex = -1;
    }
  }

  function setVisible(value) {
    visible = Boolean(value);
    if (!visible) {
      container.classList.add('is-hidden');
      for (const node of buttons.values()) node.tabIndex = -1;
    }
  }

  function handleResize() {
    isNarrow = window.matchMedia('(max-width: 820px)').matches;
  }

  window.addEventListener('resize', handleResize);

  return {
    rebuild,
    update,
    setSuspended,
    setVisible,
    isVisible: () => visible,
    dispose() {
      window.removeEventListener('resize', handleResize);
      container.replaceChildren();
    }
  };
}
