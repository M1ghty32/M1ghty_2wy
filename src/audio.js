/**
 * 轻量 Web Audio 合成器：环境底噪、雨声、键盘、脚步和交互提示音。
 * 默认关闭，必须由用户手势开启；不依赖外部音频文件。
 */
export function createAudioEngine() {
  let enabled = false;
  let context = null;
  let master = null;
  let padGain = null;
  let rainGain = null;
  let rainFilter = null;
  let noiseBuffer = null;
  let weather = 'clear';
  let zone = 'courtyard';
  let lastKey = 0;
  let lastStep = 0;

  function makeNoise(ctx) {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    return buffer;
  }

  function createContext() {
    if (context) return context;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    noiseBuffer = makeNoise(context);

    // 柔和的房间低音垫
    const padFilter = context.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 420;
    padFilter.Q.value = 0.4;
    padGain = context.createGain();
    padGain.gain.value = 0.045;
    padFilter.connect(padGain);
    padGain.connect(master);
    [55, 82.41, 110].forEach((frequency, index) => {
      const osc = context.createOscillator();
      osc.type = index === 1 ? 'triangle' : 'sine';
      osc.frequency.value = frequency;
      osc.detune.value = index * 3 - 3;
      const gain = context.createGain();
      gain.gain.value = index === 0 ? 0.4 : 0.16;
      osc.connect(gain);
      gain.connect(padFilter);
      osc.start();
    });

    // 雨声 noise
    const rainSource = context.createBufferSource();
    rainSource.buffer = noiseBuffer;
    rainSource.loop = true;
    rainFilter = context.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1600;
    rainFilter.Q.value = 0.45;
    rainGain = context.createGain();
    rainGain.gain.value = 0;
    rainSource.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(master);
    rainSource.start();
    return context;
  }

  function applyWeather() {
    if (!context || !rainGain) return;
    const now = context.currentTime;
    const rainTarget = weather === 'rain' ? (zone === 'studio' ? 0.055 : 0.105) : 0;
    const snowTarget = weather === 'snow' ? 0.018 : 0;
    rainGain.gain.cancelScheduledValues(now);
    rainGain.gain.linearRampToValueAtTime(rainTarget + snowTarget, now + 0.8);
    rainFilter.frequency.setTargetAtTime(weather === 'snow' ? 600 : 1600, now, 0.8);
    padGain.gain.setTargetAtTime(zone === 'studio' ? 0.055 : 0.035, now, 0.8);
  }

  function setEnabled(next) {
    enabled = Boolean(next);
    if (enabled) {
      const ctx = createContext();
      if (!ctx) return false;
      if (ctx.state === 'suspended') ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.3);
      applyWeather();
    } else if (context && master) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.linearRampToValueAtTime(0, context.currentTime + 0.25);
    }
    return enabled;
  }

  function toggle() {
    return setEnabled(!enabled);
  }

  function ensure() {
    if (!enabled) return null;
    return createContext();
  }

  function playKeyTick() {
    const ctx = ensure();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - lastKey < 0.045) return;
    lastKey = now;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620 + Math.random() * 220, now);
    gain.gain.setValueAtTime(0.014, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.024);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.03);
  }

  function chime(frequencies = [392, 523.25, 659.25]) {
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    frequencies.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = index % 2 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(frequency, now + index * 0.065);
      gain.gain.setValueAtTime(0.0001, now + index * 0.065);
      gain.gain.linearRampToValueAtTime(0.07, now + index * 0.065 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0004, now + index * 0.065 + 0.55);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + index * 0.065);
      osc.stop(now + index * 0.065 + 0.58);
    });
  }

  function playStep() {
    const ctx = ensure();
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    if (now - lastStep < 0.14) return;
    lastStep = now;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0002, now + 0.08);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(now);
    source.stop(now + 0.09);
  }

  function playInteract() {
    chime([523.25, 659.25]);
  }

  function playError() {
    const ctx = ensure();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.0003, now + 0.2);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  function setSceneMood({ weather: nextWeather, zone: nextZone } = {}) {
    if (nextWeather) weather = nextWeather;
    if (nextZone) zone = nextZone;
    applyWeather();
  }

  function dispose() {
    if (context && context.state !== 'closed') context.close();
    context = null;
  }

  return {
    toggle,
    setEnabled,
    isEnabled: () => enabled,
    playKeyTick,
    chime,
    playStep,
    playInteract,
    playError,
    setSceneMood,
    getContextState: () => context?.state || 'uninitialized',
    dispose
  };
}
