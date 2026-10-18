/**
 * IDE 打字开场。保留两位程序员段子、跳过、瞬间敲完、终端输入与右上角重播。
 */
const SEEN_KEY = 'm1ghty_2wy_seen_intro_v1';

const STAGES = [
  {
    badge: 'STEP 1/2 · 程序员日常防秃自检中',
    button: '▶ 没毛病！编译并加载 3D 小站 (Enter)',
    console: '> [WARNING] HairLossException: 检测到发际线正在尝试向后逃逸，已靠冰美式强行镇压！',
    code: [
      '// ================================================================',
      '// FILE: M1ghty_2wy_DailyLife.java — 祖传屎山与防秃指南',
      '// ================================================================',
      'package dev.m1ghty2wy.sanctuary;',
      '',
      'public class M1ghty_2wy extends Programmer {',
      '',
      '    private int hairCount        = Integer.MAX_VALUE; // 每次改需求发量自动 -1024',
      '    private double bloodCaffeine = 0.99;              // 血管里流淌的不是血，是冰美式',
      '    private boolean worksOnMyPC  = true;              // “奇怪，在我电脑上明明是好的啊！”',
      '',
      '    public String handleBug(String bugReport) {',
      '        if (bugReport.contains("紧急")) {',
      '            // 只要我不看报错日志，Bug 就处于薛定谔的修复状态',
      '            return "这不是 Bug，这是我精心设计的隐藏 Feature！";',
      '        }',
      '        return "重启试试？清下缓存？换个姿势点？";',
      '    }'
    ].join('\n')
  },
  {
    badge: 'STEP 2/2 · 正在唤醒【转角的 M1ghty_2wy】可探索世界',
    button: '🚀 推开院门！进入 M1ghty_2wy 的小站 (Enter)',
    console: '> [BUILD SUCCESS] 庭院、工作台、橘猫 NullPointer 与传送门已全部就位！',
    code: [
      '    // [STAGE 02] 启动转角的 M1ghty_2wy · 可探索 3D 世界',
      '    public static void main(String[] args) {',
      '        M1ghty_2wy me = new M1ghty_2wy();',
      '        MiniWorld world = new MiniWorld("庭院 / 工作室 / HomeLab");',
      '',
      '        world.spawnExplorer(me, "从院门走到工作台");',
      '        world.brewCoffee("特浓冰美式", 999);',
      '        world.spawnCat("橘猫·NullPointer", "正在长椅上晒太阳");',
      '',
      '        // 靠近任何发光物件，按 E 打开真实内容，而不是只看装饰。',
      '        world.launchInteractiveWorld();',
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
    processed = processed.replace(/\b(String|M1ghty_2wy|Programmer|Integer|MiniWorld)\b/g, '<span class="tok-type">$1</span>');
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
    if (reducedMotion) {
      typed = target.length;
      typing = false;
      renderText(target);
      return;
    }
    // 进入下一段时，前一段代码已经完整显示，只打新内容。
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
    const charsPerSecond = 255;
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
    if (rafId || reducedMotion) return;
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
    if (consoleStatus) consoleStatus.textContent = '> [COFFEE INJECTED] 冰美式续杯成功！今日写 Bug 概率降低 99.9%！';
  });
  hairButton?.addEventListener('click', () => {
    audio?.chime([392, 493.88, 587.33]);
    if (consoleStatus) consoleStatus.textContent = '> [HAIR GUARD] try { 保住发量 } catch (OvertimeException e) { 颜值依旧在线 }';
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
