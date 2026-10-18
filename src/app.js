/**
 * app.js
 * 启动、场景路由、模块组合与游戏循环。
 */
import { createContentStore } from './content-store.js';
import { createAudioEngine } from './audio.js';
import { createSceneRuntime } from './scene/scene-runtime.js';
import { createInteractionRegistry } from './scene/interaction-registry.js';
import { buildWorld } from './scene/world-builder.js';
import { createPlayerController } from './scene/player-controller.js';
import { createAssetFactory } from './scene/assets/materials.js';
import { createIdeIntro } from './ui/ide-intro.js';
import { createHotspotLayer } from './ui/hotspots.js';
import { createSpaceModal } from './ui/space-modal.js';
import { createToastController } from './ui/toast.js';

const EGG_KEY = 'm1ghty_2wy_eggs_v1';
const EGG_KEYS = ['coder', 'coffee', 'cat', 'server', 'portal'];
const TIME_LABELS = { night: '🌙 夜晚', dusk: '🌅 黄昏', day: '☀️ 白天' };
const WEATHER_LABELS = { clear: '🌤️ 晴天', rain: '🌧️ 雨天', snow: '❄️ 雪花' };
const ZONE_LABELS = {
  courtyard: { title: '庭院入口', kicker: 'COURTYARD · 01' },
  studio: { title: '室内工作室', kicker: 'STUDIO · 02' }
};
const EGG_INFO = {
  coder: {
    duration: 5.2,
    icon: '⚡',
    title: '彩蛋 #1：狂暴敲代码模式 (APM 999+)',
    description: '三联屏与水冷机箱 RGB 全开！只要我敲得够快，产品经理就改不了需求。',
    frequencies: [329.63, 440, 554.37, 659.25]
  },
  coffee: {
    duration: 4.6,
    icon: '☕',
    title: '彩蛋 #2：注入灵魂特浓冰美式',
    description: '咖啡机全功率运转，血液咖啡因浓度突破 120%，今日发际线防守成功！',
    frequencies: [261.63, 392, 523.25]
  },
  cat: {
    duration: 4.2,
    icon: '🐱',
    title: '彩蛋 #3：橘猫 NullPointer 空翻卖萌',
    description: '喵呜！橘猫摇着尾巴开心起跳，还趁你不注意帮你按下了 Ctrl + S。',
    frequencies: [523.25, 659.25, 783.99]
  },
  server: {
    duration: 5.4,
    icon: '🖥️',
    title: '彩蛋 #4：HomeLab 全息超频',
    description: '机柜启动全息矩阵：0 Error，0 Warning，猫毛覆盖率正常，稳如老狗。',
    frequencies: [196, 293.66, 392, 587.33]
  },
  portal: {
    duration: 4.8,
    icon: '🌀',
    title: '彩蛋 #5：空间传送门已开启',
    description: '内外环开始旋转，个人空间的金色灯光从门缝里漏了出来。',
    frequencies: [293.66, 440, 587.33, 880]
  }
};

function detectQuality() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('quality');
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 8;
  const memory = navigator.deviceMemory || 8;
  const width = window.innerWidth;
  let tier = 'high';
  if (width < 1024 || coarse) tier = 'medium';
  if (width < 760 || (coarse && width < 900)) tier = 'low';
  if (width < 480 || cores <= 2) tier = 'low';
  if (memory <= 4 && tier === 'high') tier = 'medium';
  if (requested === 'low' || requested === 'medium' || requested === 'high') tier = requested;

  if (tier === 'low') {
    return {
      tier,
      antialias: false,
      shadows: false,
      shadowMapSize: 512,
      pixelRatio: 1,
      maxPixelRatio: 1,
      maxFPS: 30,
      detail: 0,
      roundedSegments: 1,
      cylinderSegments: 7,
      sphereSegments: 8
    };
  }
  if (tier === 'medium') {
    return {
      tier,
      antialias: true,
      shadows: true,
      shadowMapSize: 1024,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 1.4),
      maxPixelRatio: 1.6,
      maxFPS: 45,
      detail: 1,
      roundedSegments: 2,
      cylinderSegments: 10,
      sphereSegments: 12
    };
  }
  return {
    tier,
    antialias: true,
    shadows: true,
    shadowMapSize: 2048,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    maxPixelRatio: 2,
    maxFPS: 60,
    detail: 2,
    roundedSegments: 3,
    cylinderSegments: 14,
    sphereSegments: 18
  };
}

function loadEggs() {
  const unlocked = { coder: false, coffee: false, cat: false, server: false, portal: false };
  try {
    const raw = JSON.parse(localStorage.getItem(EGG_KEY) || 'null');
    if (raw && typeof raw === 'object') {
      for (const key of EGG_KEYS) unlocked[key] = Boolean(raw[key]);
    }
  } catch (error) {
    // ignore malformed state
  }
  return unlocked;
}

function saveEggs(unlocked) {
  try {
    localStorage.setItem(EGG_KEY, JSON.stringify(unlocked));
  } catch (error) {
    // ignore
  }
}

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  if (raw.startsWith('space/')) {
    const tab = raw.slice('space/'.length).split(/[/?]/)[0] || 'about';
    return { type: 'space', tab };
  }
  if (raw.startsWith('world/')) {
    const zone = raw.slice('world/'.length).split(/[/?]/)[0];
    return { type: 'world', zone: zone === 'studio' ? 'studio' : 'courtyard' };
  }
  return { type: 'world', zone: 'courtyard' };
}

function applySiteMeta(site) {
  document.title = site.title || document.title;
  const description = document.querySelector('meta[name="description"]');
  if (description && site.bio) description.setAttribute('content', site.bio);
}

function setLoading(status) {
  const node = document.getElementById('world-loading-status');
  if (node) node.textContent = status;
}

function hideLoading() {
  const loading = document.getElementById('scene-loading');
  if (!loading) return;
  loading.classList.add('is-done');
  setTimeout(() => loading.setAttribute('hidden', ''), 380);
}

function showFallback(reason) {
  console.error('[M1 world] fallback:', reason);
  document.body.classList.add('no-webgl');
  hideLoading();
  const fallback = document.getElementById('webgl-fallback');
  fallback?.classList.add('is-visible');
  const overlay = document.getElementById('ide-intro-overlay');
  if (overlay) overlay.hidden = true;
}

async function boot() {
  setLoading('读取 site.json 与内容集合…');
  const store = createContentStore();
  await store.init();
  const site = store.getSite();
  applySiteMeta(site);

  const params = new URLSearchParams(window.location.search);
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    ready: false,
    quality: detectQuality(),
    reducedMotion: reducedMotionQuery.matches || params.get('reduced') === '1',
    zone: 'courtyard',
    timeOfDay: 'night',
    weather: 'clear',
    markersVisible: !params.has('nomarkers'),
    follow: true,
    eggs: loadEggs(),
    nearby: null,
    introOpen: false,
    modalOpen: false,
    saveCount: 0
  };
  const audio = createAudioEngine();
  const toast = createToastController({ audio });
  const factory = createAssetFactory(state.quality);

  let runtime = null;
  let world = null;
  let registry = null;
  let player = null;
  let spaceModal = null;
  let ideIntro = null;
  let hotspots = null;
  let ready = false;
  let applyingRoute = false;
  let nearbyEntry = null;
  let nearbyId = null;
  let preferredHotspotId = null;
  let preferredUntil = 0;
  let interactionLockedUntil = 0;

  function updateSaveBadge() {
    const total = Object.values(store.draftSummary()).reduce((sum, item) => sum + item.total, 0);
    state.saveCount = total;
    const badge = document.getElementById('hud-save-badge');
    if (badge) badge.textContent = total ? `本机草稿 ${total}` : '本机草稿 0';
    if (spaceModal?.isOpen()) spaceModal.renderers.studio.updateStatusText();
  }

  function updateEggHUD() {
    const count = EGG_KEYS.filter((key) => state.eggs[key]).length;
    const counter = document.getElementById('hud-egg-counter');
    if (counter) counter.textContent = `🎁 彩蛋 ${count} / ${EGG_KEYS.length}`;
  }

  function unlockEgg(key) {
    if (!EGG_KEYS.includes(key)) return false;
    const isNew = !state.eggs[key];
    state.eggs[key] = true;
    saveEggs(state.eggs);
    updateEggHUD();
    return isNew;
  }

  function getEggState() {
    return { unlocked: state.eggs, count: EGG_KEYS.filter((key) => state.eggs[key]).length };
  }

  function updateEnvLabels() {
    const env = document.getElementById('hud-env-status');
    if (env) {
      const night = document.createElement('span');
      night.textContent = TIME_LABELS[state.timeOfDay];
      const sep = document.createElement('span');
      sep.className = 'sep';
      sep.textContent = '·';
      const weather = document.createElement('span');
      weather.textContent = WEATHER_LABELS[state.weather];
      env.replaceChildren(night, sep, weather);
    }
    document.querySelectorAll('.time-btn').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-time') === state.timeOfDay);
      button.setAttribute('aria-pressed', button.getAttribute('data-time') === state.timeOfDay ? 'true' : 'false');
    });
    document.querySelectorAll('.weather-btn').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-weather') === state.weather);
      button.setAttribute('aria-pressed', button.getAttribute('data-weather') === state.weather ? 'true' : 'false');
    });
    audio.setSceneMood({ weather: state.weather, zone: state.zone });
  }

  function updateZoneHUD() {
    const meta = ZONE_LABELS[state.zone] || ZONE_LABELS.courtyard;
    const label = document.getElementById('hud-scene-label');
    if (label) label.textContent = `${meta.kicker} / ${meta.title}`;
    const switchButton = document.getElementById('btn-switch-zone');
    if (switchButton) switchButton.textContent = state.zone === 'courtyard' ? '🚪 进入工作室' : '🌿 回到庭院';
    const objective = document.getElementById('hud-objective');
    if (objective) {
      objective.textContent = state.zone === 'courtyard'
        ? '从院门出发，靠近发光物件按 E；先去看看工作室吧。'
        : '工作台、书架、咖啡角、留言板和传送门都能打开真实内容。';
    }
    const roofButton = document.getElementById('btn-toggle-roof');
    if (roofButton) {
      roofButton.classList.toggle('is-disabled', state.zone === 'studio');
      roofButton.setAttribute('aria-disabled', state.zone === 'studio' ? 'true' : 'false');
    }
  }

  function updateFollowButtons() {
    const follow = state.follow;
    [document.getElementById('btn-top-follow'), document.getElementById('btn-toggle-follow')].forEach((button) => {
      if (!button) return;
      button.classList.toggle('is-active', follow);
      button.setAttribute('aria-pressed', follow ? 'true' : 'false');
    });
    const bottom = document.getElementById('btn-toggle-follow');
    if (bottom) bottom.textContent = follow ? '🎥 跟随镜头' : '🔭 自由观察';
    const top = document.getElementById('btn-top-follow');
    if (top) top.title = follow ? '切换为自由观察' : '恢复跟随镜头';
  }

  function setFollow(enabled, { announce = true } = {}) {
    state.follow = Boolean(enabled);
    runtime?.cameraRig.setFreeLook(!state.follow);
    updateFollowButtons();
    if (announce) {
      toast.show({
        icon: state.follow ? '🎥' : '🔭',
        title: state.follow ? '镜头恢复跟随' : '自由观察模式',
        description: state.follow ? '镜头会继续平滑跟随角色，拖拽仍可旋转。' : '镜头目标暂时固定，方便环顾房间；再次点击恢复跟随。',
        duration: 2800
      });
    }
  }

  function resetCamera({ announce = false } = {}) {
    if (!runtime || !player) return;
    runtime.cameraRig.reset(player.getPosition(), player.getHeading());
    if (!state.follow) setFollow(true, { announce: false });
    if (announce) toast.show({ icon: '📷', title: '镜头已复位', description: '回到角色的第三人称跟随视角。', duration: 2200 });
  }

  function setTimeOfDay(mode, { announce = false } = {}) {
    if (!TIME_LABELS[mode]) return;
    state.timeOfDay = mode;
    world?.environment.setTimeOfDay(mode);
    updateEnvLabels();
    if (announce) toast.show({ icon: mode === 'night' ? '🌙' : mode === 'dusk' ? '🌅' : '☀️', title: `环境切换：${TIME_LABELS[mode]}`, description: '灯光、天空和雾一起调整，但深色 HUD 保持不变。', duration: 2400 });
  }

  function setWeather(mode, { announce = false } = {}) {
    if (!WEATHER_LABELS[mode]) return;
    state.weather = mode;
    world?.environment.setWeather(mode);
    updateEnvLabels();
    if (announce) toast.show({ icon: mode === 'rain' ? '🌧️' : mode === 'snow' ? '❄️' : '🌤️', title: `天气：${WEATHER_LABELS[mode]}`, description: mode === 'clear' && state.zone === 'courtyard' ? '庭院里会飘下樱花花瓣。' : '雨雪在庭院里可见，室内会保留窗外氛围与声音。', duration: 2600 });
  }

  function setHash(value, { replace = false } = {}) {
    const target = `#/${value}`;
    if (window.location.hash === target) return;
    if (replace) history.replaceState(null, '', target);
    else window.location.hash = target;
  }

  function openSpace(tab = 'about', context = '') {
    if (!spaceModal) return;
    const safeTab = ['about', 'projects', 'articles', 'notes', 'toolbox', 'library', 'studio'].includes(tab) ? tab : 'about';
    spaceModal.open(safeTab, { context });
    if (!applyingRoute) setHash(`space/${safeTab}`);
  }

  function closeSpace() {
    spaceModal?.close();
  }

  function switchZone(zoneId, { navigate = true, announce = true } = {}) {
    if (!world || !player || !runtime) return;
    const zone = world.getZone(zoneId);
    if (!zone) return;
    if (state.zone === zoneId && announce === false) {
      // 仍然允许重新定位镜头
    }
    state.zone = zoneId;
    world.setActiveZone(zoneId);
    player.setZone(zone, zone.spawn);
    player.setEnabled(!state.introOpen && !state.modalOpen);
    runtime.cameraRig.setZone(zoneId, player.getPosition(), player.getHeading(), { immediate: true });
    if (!state.follow) setFollow(true, { announce: false });
    hotspots?.rebuild(zoneId);
    updateZoneHUD();
    updateEnvLabels();
    nearbyEntry = null;
    nearbyId = null;
    preferredHotspotId = null;
    registry?.updateNearby(null, 0);
    hideInteractionHint();
    const transition = document.getElementById('scene-transition');
    if (transition) {
      transition.classList.add('is-active');
      setTimeout(() => transition.classList.remove('is-active'), 380);
    }
    if (navigate) setHash(`world/${zoneId}`, { replace: true });
    if (announce) {
      toast.show({
        icon: zoneId === 'studio' ? '🏠' : '🌿',
        title: zoneId === 'studio' ? '进入室内工作室' : '回到庭院',
        description: zoneId === 'studio' ? '工作台、咖啡角、书架和 HomeLab 都在等你。靠近物件按 E。' : '暖色花园、咖啡车与晒太阳的橘猫，院门在身后。',
        duration: 3000
      });
    }
    runtime.renderOnce();
  }

  function triggerEgg(eggKey, entry) {
    const info = EGG_INFO[eggKey];
    if (!info) return;
    world?.triggerEgg(eggKey, info.duration);
    unlockEgg(eggKey);
    audio.chime(info.frequencies);
    if (entry && runtime) {
      runtime.cameraRig.focusOn(registry.getCameraTarget(entry), 2.6);
    }
    toast.show({ icon: info.icon, title: info.title, description: info.description, duration: Math.max(3200, info.duration * 700) });
  }

  function hideInteractionHint() {
    const hint = document.getElementById('world-interaction-hint');
    hint?.classList.remove('is-visible');
    const mobile = document.getElementById('btn-mobile-interact');
    mobile?.classList.remove('is-ready');
    if (mobile) mobile.setAttribute('aria-disabled', 'true');
    const objective = document.getElementById('hud-objective');
    if (objective && state.ready) {
      objective.textContent = state.zone === 'courtyard'
        ? '从院门出发，靠近发光物件按 E；先去看看工作室吧。'
        : '工作台、书架、咖啡角、留言板和传送门都能打开真实内容。';
    }
  }

  function updateInteractionHint(entry) {
    const hint = document.getElementById('world-interaction-hint');
    const label = document.getElementById('world-interaction-label');
    const icon = document.getElementById('world-interaction-icon');
    const mobile = document.getElementById('btn-mobile-interact');
    if (!hint) return;
    if (!entry || state.modalOpen || state.introOpen) {
      hideInteractionHint();
      return;
    }
    if (label) label.textContent = `${entry.label} · ${entry.prompt || '按 E 互动'}`;
    if (icon) icon.textContent = entry.icon;
    hint.classList.add('is-visible');
    hint.dataset.hotspotId = entry.id;
    mobile?.classList.add('is-ready');
    mobile?.setAttribute('aria-disabled', 'false');
    const objective = document.getElementById('hud-objective');
    if (objective) objective.textContent = `附近：${entry.label} · ${entry.prompt || '按 E 互动'}`;
  }

  function handleInteraction(entry, { source = 'world' } = {}) {
    if (!entry || !state.ready) return;
    const now = performance.now();
    if (now < interactionLockedUntil) return;
    interactionLockedUntil = now + 260;
    preferredHotspotId = null;
    const interaction = entry.interaction || { kind: 'toast' };
    if (interaction.kind === 'modal') {
      if (interaction.egg) triggerEgg(interaction.egg, entry);
      else audio.playInteract();
      if (runtime) runtime.cameraRig.focusOn(registry.getCameraTarget(entry), 2.4);
      openSpace(interaction.tab || 'about', entry.label);
      return;
    }
    if (interaction.kind === 'switch-zone') {
      audio.playInteract();
      switchZone(interaction.zone, { navigate: true, announce: true });
      return;
    }
    if (interaction.kind === 'egg') {
      triggerEgg(interaction.egg, entry);
      return;
    }
    toast.show({ icon: entry.icon, title: entry.label, description: entry.prompt || '这里暂时只是一件好看的家具。', duration: 2600 });
  }

  function interactWithNearby() {
    if (nearbyEntry) handleInteraction(nearbyEntry, { source: 'key' });
  }

  function findApproach(zoneId, target, maxRadius = 2.2) {
    const zone = world.getZone(zoneId);
    if (!zone || !player) return { x: target.x, z: target.z + 1.8, heading: Math.PI };
    const spawn = zone.spawn;
    const preferred = Math.atan2(spawn.x - target.x, spawn.z - target.z);
    const radii = [1.25, 1.5, 1.75, 2.0].filter((radius) => radius <= maxRadius);
    if (!radii.length) radii.push(Math.max(0.9, maxRadius));
    const offsets = [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, Math.PI];
    for (const radius of radii) {
      for (const offset of offsets) {
        const angle = preferred + offset;
        const x = target.x + Math.sin(angle) * radius;
        const z = target.z + Math.cos(angle) * radius;
        const distance = Math.hypot(x - target.x, z - target.z);
        if (distance > maxRadius + 0.01) continue;
        if (!player.collisionAt(x, z)) {
          const heading = Math.atan2(target.x - x, target.z - z);
          return { x, z, heading };
        }
      }
    }
    return { x: spawn.x, z: spawn.z, heading: spawn.heading };
  }

  function focusGuideEntry(id, zoneId) {
    const entry = registry.getEntry(id);
    if (!entry || !world || !player) return;
    spaceModal.close();
    if (state.zone !== zoneId) switchZone(zoneId, { navigate: false, announce: false });
    const target = registry.getCameraTarget(entry);
    const approach = findApproach(zoneId, target, Math.max(1.25, entry.radius - 0.2));
    player.placeAt(approach.x, approach.z, approach.heading);
    preferredHotspotId = id;
    preferredUntil = performance.now() + 6000;
    nearbyEntry = null;
    nearbyId = null;
    runtime.cameraRig.setZone(zoneId, player.getPosition(), player.getHeading(), { immediate: true });
    runtime.cameraRig.focusOn(target, 3.4);
    hotspots.rebuild(zoneId);
    setHash(`world/${zoneId}`, { replace: true });
    toast.show({
      icon: entry.icon,
      title: entry.label,
      description: `已走到「${entry.label}」附近。靠近后按 E，或直接点击物件标签。`,
      duration: 3200
    });
  }

  let toastWelcomeShown = false;
  function onEnterWorld() {
    state.introOpen = false;
    player?.setEnabled(!state.modalOpen);
    hotspots?.setSuspended(state.modalOpen);
    if (runtime) runtime.resume('intro');
    if (!state.modalOpen) runtime?.resume('boot');
    if (!toastWelcomeShown) {
      toastWelcomeShown = true;
      let firstVisit = true;
      try {
        firstVisit = !localStorage.getItem('m1ghty_2wy_welcome_shown_v1');
        localStorage.setItem('m1ghty_2wy_welcome_shown_v1', '1');
      } catch (error) {
        firstVisit = true;
      }
      if (!state.modalOpen) {
        toast.show({
          icon: '🗺️',
          title: firstVisit ? '欢迎来到转角的 M1ghty_2wy' : '欢迎回来',
          description: 'WASD / 方向键移动，靠近物件按 E；点击标签或物件也能直接打开内容。',
          duration: 5200
        });
      }
    }
  }

  function onIntroOpen() {
    state.introOpen = true;
    nearbyEntry = null;
    nearbyId = null;
    player?.setEnabled(false);
    runtime?.pause('intro');
    hotspots?.setSuspended(true);
    hideInteractionHint();
  }

  function onModalOpen() {
    state.modalOpen = true;
    nearbyEntry = null;
    nearbyId = null;
    player?.setEnabled(false);
    runtime?.pause('modal');
    hotspots?.setSuspended(true);
    hideInteractionHint();
  }

  function onModalClose() {
    state.modalOpen = false;
    player?.setEnabled(!state.introOpen);
    hotspots?.setSuspended(state.introOpen);
    if (runtime) {
      runtime.resume('modal');
      if (!state.introOpen) runtime.resume('boot');
    }
    if (!applyingRoute && window.location.hash.startsWith('#/space')) {
      setHash(`world/${state.zone}`, { replace: true });
    }
  }

  // -----------------------------------------------------------------------
  // 场景初始化
  // -----------------------------------------------------------------------
  const loadingFallbackTimer = setTimeout(() => {
    if (!ready) showFallback('场景初始化超时');
  }, 25000);

  try {
    setLoading('搭建庭院、工作台与 HomeLab…');
    runtime = createSceneRuntime({
      container: document.getElementById('webgl-container'),
      quality: state.quality,
      onFrame: (dt, elapsed) => {
        if (!ready) return;
        world.update(dt, elapsed);
        player.update(dt, elapsed, runtime.cameraRig.getAzimuth());
        runtime.cameraRig.update(dt, player.getPosition(), state.reducedMotion);
        updateProximity(dt, elapsed);
        hotspots.update(runtime.camera, {
          highlightedId: nearbyEntry?.id || null,
          introOpen: state.introOpen,
          modalOpen: state.modalOpen
        });
      },
      onContextLost: () => {
        showFallback('WebGL context lost');
        toast.showContent('3D 场景上下文丢失，刷新页面可重新进入。', 'error', 8000);
      }
    });
    runtime.pause('boot');

    const scene = runtime.scene;
    const camera = runtime.camera;
    const canvas = runtime.renderer.domElement;

    registry = createInteractionRegistry({
      scene,
      camera,
      onTrigger: (entry) => handleInteraction(entry, { source: 'registry' })
    });

    world = buildWorld({ scene, factory, quality: state.quality, registry });
    player = createPlayerController({
      scene,
      factory,
      reducedMotion: state.reducedMotion,
      onInteract: interactWithNearby,
      onFootstep: () => audio.playStep(),
      onProximityDirty: () => hideInteractionHint()
    });
    player.setReducedMotion(state.reducedMotion);
    world.setReducedMotion(state.reducedMotion);

    hotspots = createHotspotLayer({
      container: document.getElementById('hotspots-layer'),
      registry,
      onActivate: (entry) => handleInteraction(entry, { source: 'marker' })
    });

    spaceModal = createSpaceModal({
      store,
      registry,
      toast,
      getEggState,
      onGuideSelect: focusGuideEntry,
      onOpen: onModalOpen,
      onClose: onModalClose
    });
    document.getElementById('btn-fallback-space')?.addEventListener('click', () => {
      document.getElementById('webgl-fallback')?.classList.remove('is-visible');
      spaceModal.open('about', { context: 'WebGL 回退' });
    });

    // 初始区域：优先 query zone，其次 hash，最后庭院。
    const paramsZone = params.get('zone');
    const hashRoute = parseHash();
    const initialZone = paramsZone === 'studio' || hashRoute.type === 'world' && hashRoute.zone === 'studio' ? 'studio' : 'courtyard';
    state.zone = initialZone;
    const initialZoneData = world.getZone(initialZone);
    world.setActiveZone(initialZone);
    player.setZone(initialZoneData, initialZoneData.spawn);
    runtime.cameraRig.setZone(initialZone, player.getPosition(), player.getHeading(), { immediate: true });
    updateZoneHUD();
    updateEnvLabels();
    updateEggHUD();
    updateSaveBadge();
    setTimeOfDay('night');
    setWeather('clear');
    updateFollowButtons();
    hotspots.rebuild(initialZone);

    // 首次进入时 IDE 自动播放；deep-link 到内容时不播放。
    const deepLinkSpace = hashRoute.type === 'space';
    const skipIntro = params.get('skipintro') === '1' || deepLinkSpace;
    ideIntro = createIdeIntro({
      audio,
      reducedMotion: state.reducedMotion,
      autoStart: !skipIntro,
      onOpen: onIntroOpen,
      onEnterWorld
    });
    if (ideIntro.isOpen()) {
      state.introOpen = true;
      player.setEnabled(false);
    } else {
      state.introOpen = false;
      player.setEnabled(true);
      hotspots.setSuspended(false);
    }

    // 相机拖拽、滚轮、双指缩放、点击拾取
    setupPointerControls(canvas, runtime, registry, handleInteraction);

    ready = true;
    state.ready = true;
    world.update(0, 0);
    runtime.cameraRig.update(0.016, player.getPosition(), state.reducedMotion);
    runtime.renderOnce();
    hideLoading();
    clearTimeout(loadingFallbackTimer);
    runtime.resume('boot');
    if (state.introOpen) runtime.pause('intro');
    else runtime.start();

    // 绑定 HUD / 控件
    bindUI();
    updateInteractionHint(null);

    // 路由：hash -> modal / zone
    const route = parseHash();
    if (route.type === 'space') {
      openSpace(route.tab, '链接入口');
    } else {
      // 没有 hash 时尊重 ?zone=studio 之类的查询参数。
      const desiredZone = window.location.hash ? route.zone : state.zone;
      if (desiredZone !== state.zone) switchZone(desiredZone, { navigate: false, announce: false });
      if (!window.location.hash) setHash(`world/${state.zone}`, { replace: true });
    }

    window.addEventListener('hashchange', () => {
      if (!ready) return;
      applyRoute();
    });

    // 当前状态挂到 window 方便验证与调试（不包含任何凭证）。
    window.__M1_WORLD__ = {
      ready: true,
      quality: state.quality,
      state,
      store,
      registry,
      world,
      player,
      runtime,
      spaceModal,
      switchZone,
      openSpace,
      handleInteraction,
      focusGuideEntry,
      getNearby: () => nearbyEntry,
      sampleCanvas() {
        try {
          runtime.renderOnce();
          const gl = runtime.renderer.getContext();
          const width = gl.drawingBufferWidth;
          const height = gl.drawingBufferHeight;
          const pixels = new Uint8Array(4 * 9);
          const points = [
            [0.5, 0.5], [0.25, 0.5], [0.75, 0.5], [0.5, 0.25], [0.5, 0.75],
            [0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]
          ];
          points.forEach(([px, py], index) => {
            const buffer = new Uint8Array(4);
            gl.readPixels(Math.floor(width * px), Math.floor(height * py), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
            pixels.set(buffer, index * 4);
          });
          const unique = new Set();
          for (let i = 0; i < points.length; i++) unique.add(pixels.slice(i * 4, i * 4 + 3).join(','));
          return { pixels: Array.from(pixels), uniqueColors: unique.size, width, height };
        } catch (error) {
          return { error: String(error) };
        }
      }
    };
  } catch (error) {
    clearTimeout(loadingFallbackTimer);
    runtime?.stop();
    showFallback(error);
    // 即使 WebGL 失败，也让内容面板可用。
    const stubRegistry = {
      getGuide: () => [],
      getCameraTarget: () => null,
      getEntry: () => null,
      register: () => null
    };
    spaceModal = createSpaceModal({
      store,
      registry: stubRegistry,
      toast,
      getEggState,
      onGuideSelect: () => {},
      onOpen: () => {},
      onClose: () => {}
    });
    const fallbackButton = document.getElementById('btn-fallback-space');
    fallbackButton?.addEventListener('click', () => {
      document.getElementById('webgl-fallback')?.classList.remove('is-visible');
      spaceModal.open('about', { context: 'WebGL 回退' });
    });
    window.__M1_WORLD__ = { ready: false, error: String(error), store, spaceModal, state };
    hideLoading();
    return;
  }

  function setupPointerControls(canvas, runtime, registry, interact) {
    canvas.style.touchAction = 'none';
    const pointers = new Map();
    let dragPointerId = null;
    let dragDistance = 0;
    let pinchDistance = 0;
    let hadPinch = false;

    function blocked() {
      return state.modalOpen || state.introOpen;
    }

    function pointerDown(event) {
      if (blocked()) return;
      if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return;
      canvas.setPointerCapture?.(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        dragPointerId = event.pointerId;
        dragDistance = 0;
        hadPinch = false;
      } else if (pointers.size === 2) {
        hadPinch = true;
        const [a, b] = Array.from(pointers.values());
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
        dragPointerId = null;
      }
    }

    function pointerMove(event) {
      const pointer = pointers.get(event.pointerId);
      if (!pointer || blocked()) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      if (pointers.size === 2) {
        hadPinch = true;
        const [a, b] = Array.from(pointers.values());
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance) runtime.cameraRig.pinchZoom(pinchDistance - distance);
        pinchDistance = distance;
        return;
      }
      if (dragPointerId !== event.pointerId) return;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      if (dragDistance > 2) runtime.cameraRig.rotate(dx, dy);
    }

    function pointerUp(event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      if (pointers.size === 1) {
        const [id, pointer] = Array.from(pointers.entries())[0];
        dragPointerId = id;
        dragDistance = 0;
        void pointer;
      }
      if (pointers.size === 0) {
        const rect = canvas.getBoundingClientRect();
        const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
        const canPick = !blocked() && !hadPinch && dragDistance < 6 && inside;
        dragPointerId = null;
        hadPinch = false;
        if (canPick) {
          const entry = registry.pick(event.clientX, event.clientY, canvas);
          if (entry) interact(entry, { source: 'canvas' });
        }
      }
    }

    canvas.addEventListener('pointerdown', pointerDown);
    window.addEventListener('pointermove', pointerMove, { passive: true });
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    canvas.addEventListener('wheel', (event) => {
      if (blocked()) return;
      event.preventDefault();
      runtime.cameraRig.zoom(event.deltaY);
    }, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  function updateProximity(dt, elapsed) {
    if (!ready || !player || state.modalOpen || state.introOpen) {
      nearbyEntry = null;
      nearbyId = null;
      registry.updateNearby(null, elapsed);
      updateInteractionHint(null);
      return;
    }
    const found = registry.findNearby(player.getPosition());
    let candidate = found?.entry || null;
    if (preferredHotspotId && performance.now() < preferredUntil) {
      const preferred = registry.getEntry(preferredHotspotId);
      if (preferred && preferred.zone === state.zone) {
        const target = registry.getCameraTarget(preferred);
        const distance = Math.hypot(target.x - player.getPosition().x, target.z - player.getPosition().z);
        if (distance <= preferred.radius + 0.05) candidate = preferred;
        else preferredHotspotId = null;
      } else {
        preferredHotspotId = null;
      }
    }
    nearbyEntry = candidate;
    const nextId = nearbyEntry?.id || null;
    if (nextId !== nearbyId) {
      nearbyId = nextId;
      updateInteractionHint(nearbyEntry);
    }
    registry.updateNearby(nearbyEntry, elapsed);
  }

  function bindUI() {
    document.querySelectorAll('.time-btn').forEach((button) => {
      button.addEventListener('click', () => setTimeOfDay(button.getAttribute('data-time'), { announce: true }));
    });
    document.querySelectorAll('.weather-btn').forEach((button) => {
      button.addEventListener('click', () => setWeather(button.getAttribute('data-weather'), { announce: true }));
    });
    document.getElementById('btn-rainy-night')?.addEventListener('click', () => {
      setTimeOfDay('night');
      setWeather('rain');
      toast.show({ icon: '🌧️', title: '已切换至「深夜听雨敲代码」模式', description: '雨声、屋檐和暖光都准备好了。室内外都可以继续探索。', duration: 3600 });
    });
    document.getElementById('btn-top-audio')?.addEventListener('click', (event) => {
      const enabled = audio.toggle();
      const button = event.currentTarget;
      button.textContent = enabled ? '🔊' : '🔇';
      button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      if (enabled) {
        audio.setSceneMood({ weather: state.weather, zone: state.zone });
        toast.showContent('环境音效已开启：键盘、脚步、合成器与雨声。', 'success', 2600);
      } else {
        toast.showContent('环境音效已关闭。', 'info', 1800);
      }
    });
    document.getElementById('btn-top-reset-cam')?.addEventListener('click', () => resetCamera({ announce: true }));
    document.getElementById('btn-top-follow')?.addEventListener('click', () => setFollow(!state.follow));
    document.getElementById('btn-toggle-follow')?.addEventListener('click', () => setFollow(!state.follow));
    document.getElementById('btn-top-markers')?.addEventListener('click', (event) => {
      state.markersVisible = !state.markersVisible;
      hotspots.setVisible(state.markersVisible);
      const button = event.currentTarget;
      button.classList.toggle('is-active', state.markersVisible);
      button.setAttribute('aria-pressed', state.markersVisible ? 'true' : 'false');
      toast.showContent(state.markersVisible ? '物件标签已显示。' : '物件标签已隐藏，仍可点击物件或按 E 互动。', 'info', 2400);
    });
    document.getElementById('btn-switch-zone')?.addEventListener('click', () => {
      switchZone(state.zone === 'courtyard' ? 'studio' : 'courtyard', { navigate: true, announce: true });
    });
    document.getElementById('btn-toggle-roof')?.addEventListener('click', () => {
      if (state.zone === 'studio') {
        toast.showContent('室内使用剖切视角，屋顶已经收起。', 'info', 2200);
        return;
      }
      const open = world.toggleRoof();
      toast.showContent(open ? '屋顶已展开。' : '屋顶已收起，方便观察小屋剖面。', 'info', 2200);
    });
    document.getElementById('btn-open-personal-space')?.addEventListener('click', () => openSpace('about', '入口按钮'));
    document.getElementById('btn-mobile-space')?.addEventListener('click', () => openSpace('about', '移动端入口'));
    document.getElementById('btn-back-to-room')?.addEventListener('click', closeSpace);
    document.getElementById('world-interaction-hint')?.addEventListener('click', () => {
      if (nearbyEntry) handleInteraction(nearbyEntry, { source: 'hint' });
    });
    document.getElementById('btn-close-space')?.addEventListener('click', closeSpace);
    store.subscribe(() => updateSaveBadge());

    // 顶部代码开场由 ide-intro 模块绑定，因为它是唯一的播放入口。
    updateSaveBadge();
    updateEggHUD();
    updateFollowButtons();
    updateZoneHUD();
    updateEnvLabels();
    updateEggHUD();

    if (!state.markersVisible) {
      hotspots.setVisible(false);
      document.getElementById('btn-top-markers')?.classList.remove('is-active');
    }

    const clock = () => {
      const node = document.getElementById('hud-clock');
      if (!node) return;
      node.textContent = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    };
    clock();
    setInterval(clock, 30000);

    reducedMotionQuery.addEventListener?.('change', (event) => {
      state.reducedMotion = event.matches;
      player?.setReducedMotion(event.matches);
      world?.setReducedMotion(event.matches);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !state.modalOpen && !state.introOpen) {
        // 没有 modal 时，Esc 关闭提示。
        toast.hide();
      }
      if ((event.key === 'm' || event.key === 'M') && !event.target?.matches?.('input, textarea, select')) {
        document.getElementById('btn-top-markers')?.click();
      }
    });

    window.addEventListener('beforeunload', () => {
      // 不写任何凭据；只停止音频与渲染资源。
      audio.dispose();
    });
  }

  function applyRoute() {
    if (!ready || applyingRoute) return;
    const route = parseHash();
    applyingRoute = true;
    try {
      if (route.type === 'space') {
        if (!spaceModal.isOpen()) spaceModal.open(route.tab, { context: '链接入口' });
        else if (spaceModal.getTab() !== route.tab) spaceModal.setTab(route.tab);
      } else {
        if (spaceModal.isOpen()) spaceModal.close();
        if (route.zone !== state.zone) switchZone(route.zone, { navigate: false, announce: false });
      }
    } finally {
      applyingRoute = false;
    }
  }
}

boot().catch((error) => {
  console.error('[M1 boot] failed', error);
  showFallback(error);
  const status = document.getElementById('world-loading-status');
  if (status) status.textContent = '启动失败，请查看控制台或换用支持 WebGL 的浏览器。';
});
