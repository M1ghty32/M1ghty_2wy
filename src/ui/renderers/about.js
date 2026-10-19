/**
 * 介绍面板渲染器。
 */
import { h, clear, badge, link } from '../dom.js';

const EGG_META = [
  { key: 'coder', label: '工作台专注模式', icon: '⚡' },
  { key: 'coffee', label: '庭院咖啡角', icon: '☕' },
  { key: 'cat', label: '长椅上的猫', icon: '🐱' },
  { key: 'server', label: 'HomeLab 机柜', icon: '🖥️' },
  { key: 'portal', label: '空间传送门', icon: '🌀' }
];

export function createAboutRenderer({ store, registry, getEggState, onGuideSelect }) {
  function renderLinks(site) {
    const box = document.getElementById('about-links');
    if (!box) return;
    clear(box);
    const github = site.links?.github;
    const email = site.links?.email;
    if (github) {
      const anchor = link('about-link', 'GitHub ↗', github);
      box.appendChild(anchor);
    }
    if (email) {
      const anchor = h('a', 'about-link', `✉ ${email}`);
      anchor.href = `mailto:${email}`;
      box.appendChild(anchor);
    }
    if (!github && !email) {
      box.appendChild(h('span', 'about-link-muted', '可在 data/site.json 的 links 中填写 GitHub 与邮箱。'));
    }
  }

  function renderHero(site) {
    const chips = document.getElementById('about-focus-chips');
    if (chips) {
      clear(chips);
      (site.focus || []).slice(0, 4).forEach((item, index) => {
        chips.appendChild(h('span', `hero-chip tone-${index % 4}`, item));
      });
    }
    const terminal = document.getElementById('about-hero-terminal');
    if (terminal) {
      clear(terminal);
      const rows = [
        ['$', 'whoami'],
        ['', `${site.name} · ${site.tagline}`],
        ['$', 'cat motto.txt'],
        ['', `“${site.motto}”`],
        ['$', 'status --now'],
        ['', site.status]
      ];
      rows.forEach(([prompt, text]) => {
        const row = h('div', 'hero-terminal-row');
        if (prompt) row.appendChild(h('span', 'hero-terminal-prompt', prompt));
        row.appendChild(h('span', 'hero-terminal-text', text));
        terminal.appendChild(row);
      });
    }
  }

  function renderGuide() {
    const box = document.getElementById('world-guide');
    if (!box) return;
    clear(box);
    const guide = registry.getGuide();
    for (const group of guide) {
      const section = h('div', 'guide-group');
      section.appendChild(h('div', 'guide-group-title', group.title));
      const grid = h('div', 'guide-grid');
      for (const entry of group.entries) {
        const button = h('button', 'guide-item');
        button.type = 'button';
        button.dataset.guideId = entry.id;
        button.dataset.zone = group.zone;
        const icon = h('span', 'guide-icon', entry.icon);
        icon.setAttribute('aria-hidden', 'true');
        const copy = h('span', 'guide-copy');
        copy.append(h('strong', '', entry.label), h('small', '', entry.prompt));
        button.append(icon, copy, h('span', 'guide-arrow', '⌖'));
        button.addEventListener('click', () => onGuideSelect?.(entry.id, group.zone));
        grid.appendChild(button);
      }
      section.appendChild(grid);
      box.appendChild(section);
    }
  }

  function render() {
    const site = store.getSite();
    const name = document.getElementById('profile-name');
    const tagline = document.getElementById('profile-tagline');
    const heading = document.getElementById('about-heading');
    const bio = document.getElementById('about-bio');
    const location = document.getElementById('about-location');
    const status = document.getElementById('about-status');
    const motto = document.getElementById('about-motto');
    if (name) name.textContent = `${site.name} · 个人网站`;
    if (tagline) tagline.textContent = `${site.tagline} · 欢迎浏览`;
    if (heading) heading.textContent = `你好，我是 ${site.name} 👋`;
    if (bio) bio.textContent = site.bio;
    if (location) location.textContent = site.location;
    if (status) status.textContent = site.status;
    if (motto) motto.textContent = `“${site.motto}”`;
    renderLinks(site);
    renderHero(site);

    const focusBox = document.getElementById('focus-list');
    if (focusBox) {
      clear(focusBox);
      (site.focus || []).forEach((item, index) => {
        const chip = h('div', `focus-chip tone-${index % 4}`, item);
        focusBox.appendChild(chip);
      });
    }

    const skillsBox = document.getElementById('skills-list');
    if (skillsBox) {
      clear(skillsBox);
      (site.skills || []).forEach((skill) => {
        const row = h('div', 'skill-row');
        const left = h('div', 'skill-name');
        left.append(h('i', `skill-dot tone-${skill.color || 'sky'}`), h('span', '', skill.name));
        row.append(left, h('span', 'skill-level', skill.level));
        skillsBox.appendChild(row);
      });
    }

    const timelineBox = document.getElementById('timeline-list');
    if (timelineBox) {
      clear(timelineBox);
      (site.timeline || []).forEach((item) => {
        const row = h('div', 'timeline-item');
        const dot = h('span', 'timeline-dot');
        const copy = h('div', 'timeline-copy');
        copy.append(h('span', 'timeline-year', item.year), h('strong', '', item.title), h('p', '', item.desc));
        row.append(dot, copy);
        timelineBox.appendChild(row);
      });
    }

    const eggs = getEggState();
    const count = Object.values(eggs.unlocked).filter(Boolean).length;
    const eggCount = document.getElementById('about-egg-count');
    if (eggCount) eggCount.textContent = `${count} / ${EGG_META.length}`;
    const eggBox = document.getElementById('about-eggs-badges');
    if (eggBox) {
      clear(eggBox);
      EGG_META.forEach((item) => {
        const unlocked = Boolean(eggs.unlocked[item.key]);
        const egg = h('div', `egg-badge ${unlocked ? 'is-unlocked' : ''}`);
        egg.append(h('span', 'egg-icon', item.icon), h('span', '', item.label), h('span', 'egg-status', unlocked ? '✓' : '?'));
        eggBox.appendChild(egg);
      });
    }
    renderGuide();
  }

  return { render };
}
