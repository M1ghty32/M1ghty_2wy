/**
 * IDE 打字开场。用两段示例代码把访客从加载状态带入可探索空间。
 */
const SEEN_KEY = 'm1ghty_2wy_seen_intro_v1';

const STAGES = [
  {
    badge: 'STEP 1/2 · 初始化个人站点',
    button: '继续 → 进入可探索空间 (Enter)',
    console: '> [INFO] 正在加载场景配置、内容集合与交互注册表…',
    code: [
      '// ================================================================',
      '// FILE: PersonalSite.java — 站点结构与内容装配',
      '// ================================================================',
      'package dev.m1ghty.site;',
      '',
      'public class PersonalSite {',
      '',
      '    private final ContentStore content = ContentStore.load("data/");',
      '    private final SceneRuntime world   = SceneRuntime.create(quality());',
      '',
      '    public Portfolio compose() {',
      '        // 每个物件都注册统一的交互描述，避免各写一套逻辑。',
      '        world.register(courtyard());',
      '        world.register(studio());',
      '',
      '        // 内容与场景解耦：替换 JSON 即可更新项目与文章。',
      '        return new Portfolio(content.projects(), content.articles());',
      '    }',
      '}'
    ].join('\n')
  },
  {
    badge: 'STEP 2/2 · 进入可探索空间',
    button: '进入站点 (Enter)',
    console: '> [READY] 庭院与工作室已就绪，靠近物件按 E 打开内容。',
    code: [
      '    // [STAGE 02] 启动可探索的 3D 空间',
      '    public static void main(String[] args) {',
      '        PersonalSite site = new PersonalSite();',
      '        MiniWorld world = site.compose().mount("courtyard");',
      '',
      '        world.spawnVisitor("从院门走向工作台");',
      '        world.enableInteractions("E");',
      '        world.start();',
      '    }',
      '}'
    ].join('\n')
  }
];

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightJava(raw) {
  return escapeHtml(raw).split('\n').map((line) => {
    if (line.trim().startsWith('//')) return `<span class="tok-cmt">${line}</span>`;
    const strings = [];
    let processed = line.replace(/"([^"]*)"/g, (match) => {
      strings.push(match);
      return `___S${strings.length - 1}___`;
    });
    processed = processed.replace(/\b(package|public|private|class|extends|static|void|int|double|boolean|if|return|new|true|false)\b/g, '<span class="tok-kw">$1</span>');
    processed = processed.replace(/\b(String|PersonalSite|ContentStore|SceneRuntime|Portfolio|MiniWorld|Integer)\b/g, '<span class="tok-type">$1</span>');
    processed = processed.replace(/___S(\d+)___/g, (_, index) => `<span class="tok-str">${strings[Number(index)]}</span>`);
    return processed;
  }).join('\n');
}

function hasSeenIntro() {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch (error) {
    return false;
  }
}

function rememberIntro() {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch (error) {
    // 隐私模式下忽略。
  }
}

export function createIdeIntro({ audio, reducedMotion = false, onEnterWorld, autoStart = true, onOpen }) {
  const overlay = document.getElementById('ide-intro-overlay');
  const codeDisplay = document.getElementById('ide-code-display');
  const lineNums = document.getElementById('ide-line-nums');
  const scrollBox = document.getElementById('ide-scroll-box');
  const stageBadge = document.getElementById('ide-stage-badge');
  const consoleStatus = document.getElementById('ide-console-status');
  const nextButton = document.getElementById('btn-ide-next');
  const skipButton = document.getElementById('btn-ide-skip');
  const instantButton = document.getElementById('btn-ide-instant');
  const coffeeButton = document.getElementById('btn-ide-coffee');
  const hairButton = document.getElementById('btn-ide-hair');
  const terminalForm = document.getElementById('ide-input-form');
  const terminalInput = document.getElementById('ide-terminal-input');
  const replayButton = document.getElementById('btn-top-ide');

  let stage = 0;
  let target = '';
  let typed = 0;
  let typing = false;
  let open = false;
  let rafId = null;
  let lastTime = 0;
  let closeTimer = null;
  let entered = false;
  let displayedText = '';

  function renderText(text) {
    displayedText = text;
    if (codeDisplay) codeDisplay.innerHTML = highlightJava(text);
    if (lineNums) {
      const count = Math.max(1, text.split('\n').length);
      lineNums.innerHTML = Array.from({ length: count }, (_, index) => String(index + 1)).join('<br/>');
    }
    if (scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;
  }

  function stagePrefix(index) {
    let prefix = '';
    for (let i = 0; i < index; i++) prefix += `${STAGES[i].code}\n\n`;
    return prefix;
  }

  function loadStage(index) {
    stage = index;
    const item = STAGES[index];
    if (stageBadge) stageBadge.textContent = item.badge;
    if (nextButton) nextButton.textContent = item.button;
    if (consoleStatus) consoleStatus.textContent = item.console;
    const prefix = stagePrefix(index);
    target = prefix + item.code;
    // 打字动画是开场体验的核心，即使系统开启“减少动态效果”也照常播放，
    // 只用更快的速度减少等待（原先会直接整段渲染，看起来像卡住了）。
    if (index > 0) renderText(prefix);
    else renderText('');
    typed = prefix.length;
    typing = true;
    startLoop();
  }

  function updateLoop(now) {
    if (!open || !typing) {
      rafId = null;
      return;
    }
    if (!lastTime) lastTime = now;
    const dt = Math.min(0.08, (now - lastTime) / 1000);
    lastTime = now;
    const charsPerSecond = reducedMotion ? 480 : 255;
    typed = Math.min(target.length, typed + Math.max(1, Math.round(dt * charsPerSecond)));
    renderText(target.slice(0, typed));
    audio?.playKeyTick();
    if (typed >= target.length) {
      typing = false;
      rafId = null;
      return;
    }
    rafId = requestAnimationFrame(updateLoop);
  }

  function startLoop() {
    if (rafId) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(updateLoop);
  }

  function stopLoop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function completeTyping() {
    typing = false;
    stopLoop();
    typed = target.length;
    renderText(target);
  }

  function advance() {
    if (!open) return;
    if (stage === 0) {
      completeTyping();
      loadStage(1);
      audio?.chime([329.63, 392, 523.25]);
      return;
    }
    closeAndEnter();
  }

  function openIntro({ auto = false } = {}) {
    if (!overlay) return;
    open = true;
    entered = false;
    overlay.hidden = false;
    overlay.classList.add('is-open');
    document.body.classList.add('intro-open');
    if (closeTimer) clearTimeout(closeTimer);
    loadStage(0);
    setTimeout(() => nextButton?.focus({ preventScroll: true }), auto ? 550 : 80);
    onOpen?.();
  }

  function closeAndEnter() {
    if (!open) return;
    open = false;
    typing = false;
    stopLoop();
    rememberIntro();
    overlay.classList.remove('is-open');
    document.body.classList.remove('intro-open');
    closeTimer = setTimeout(() => {
      overlay.hidden = true;
    }, 430);
    if (!entered) {
      entered = true;
      onEnterWorld?.(stage);
    }
    audio?.chime([293.66, 369.99, 440, 587.33]);
  }

  function skip() {
    if (!open) return;
    closeAndEnter();
  }

  nextButton?.addEventListener('click', advance);
  skipButton?.addEventListener('click', skip);
  instantButton?.addEventListener('click', () => {
    if (!open) return;
    completeTyping();
    audio?.chime([523.25, 659.25]);
  });
  coffeeButton?.addEventListener('click', () => {
    audio?.chime([349.23, 440, 523.25]);
    if (consoleStatus) consoleStatus.textContent = '> [STATUS] 站点持续维护中，最近更新：庭院地坪、门廊铺装与内容结构。';
  });
  hairButton?.addEventListener('click', () => {
    audio?.chime([392, 493.88, 587.33]);
    if (consoleStatus) consoleStatus.textContent = '> [GUIDE] WASD 或方向键移动，靠近物件按 E；Esc 关闭面板。';
  });
  terminalForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (terminalInput) terminalInput.value = '';
    advance();
  });
  replayButton?.addEventListener('click', () => {
    if (open) return;
    openIntro({ auto: true });
  });

  window.addEventListener('keydown', (event) => {
    if (!open) return;
    const targetTag = event.target?.tagName;
    const isTypingTarget = targetTag === 'INPUT' || targetTag === 'TEXTAREA' || targetTag === 'SELECT' || event.target?.isContentEditable;
    if (event.key === 'Tab') {
      const focusable = Array.from(overlay.querySelectorAll('button:not([disabled]), input:not([disabled]), [href]'))
        .filter((node) => node.offsetParent !== null);
      if (focusable.length) {
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
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      skip();
      return;
    }
    if (event.key === 'Enter' && !isTypingTarget) {
      event.preventDefault();
      advance();
    }
  });

  // 首次访问自动播放；deep-link 由 app 决定是否强制打开。
  if (overlay) {
    if (!autoStart) {
      overlay.hidden = true;
      overlay.classList.remove('is-open');
    } else if (hasSeenIntro()) {
      overlay.hidden = true;
      overlay.classList.remove('is-open');
    } else {
      openIntro({ auto: true });
    }
  }

  return {
    open: openIntro,
    close: skip,
    isOpen: () => open,
    hasSeen: hasSeenIntro,
    isTyping: () => typing,
    getDisplayedText: () => displayedText,
    dispose() {
      stopLoop();
      if (closeTimer) clearTimeout(closeTimer);
    }
  };
}
