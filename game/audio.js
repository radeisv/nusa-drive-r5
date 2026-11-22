// audio.js — every sound is synthesized with WebAudio: engine hum, two-tone
// police siren, gunshots, chimes and a laid-back island music loop. No samples,
// nothing borrowed, nothing from any commercial game.
export function initAudio() {
  const api = { ctx: null, engine: null, engineGain: null, musicTimer: null, muted: false };
  api.ensure = () => {
    if (api.ctx) return true;
    try {
      api.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return false; }
    return !!api.ctx;
  };
  api.startEngine = () => {
    if (!api.ensure() || api.engine) return;
    const ctx = api.ctx;
    api.engine = ctx.createOscillator();
    api.engine.type = 'sawtooth';
    api.engine.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 320;
    api.engineGain = ctx.createGain();
    api.engineGain.gain.value = 0.05;
    api.engine.connect(filter); filter.connect(api.engineGain); api.engineGain.connect(ctx.destination);
    api.engine.start();
  };
  api.setEngineSpeed = (speed01) => {
    if (!api.engine || !api.ctx) return;
    api.engine.frequency.setTargetAtTime(52 + speed01 * 130, api.ctx.currentTime, 0.08);
    if (api.engineGain) api.engineGain.gain.setTargetAtTime(0.04 + speed01 * 0.05, api.ctx.currentTime, 0.1);
  };
  api.playSiren = () => {
    if (!api.ensure()) return;
    const ctx = api.ctx;
    const osc = ctx.createOscillator(); osc.type = 'triangle';
    const gain = ctx.createGain(); gain.gain.value = 0.045;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    let hi = true;
    const flip = () => { if (!api.ctx) return; osc.frequency.setTargetAtTime(hi ? 960 : 720, ctx.currentTime, 0.05); hi = !hi; };
    flip();
    const iv = setInterval(flip, 450);
    setTimeout(() => { clearInterval(iv); try { osc.stop(); } catch (e) {} }, 4000);
  };
  api.playGunshot = () => {
    if (!api.ensure()) return;
    const ctx = api.ctx;
    const len = ctx.sampleRate * 0.12;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const gain = ctx.createGain(); gain.gain.value = 0.22;
    src.connect(gain); gain.connect(ctx.destination);
    src.start();
  };
  api.playThud = () => {
    if (!api.ensure()) return;
    const ctx = api.ctx;
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(90, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.18);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.22);
  };
  api.playChime = () => {
    if (!api.ensure()) return;
    const ctx = api.ctx;
    [660, 880, 1320].forEach((f, i) => {
      const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = f;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.14, ctx.currentTime + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.5);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.09); osc.stop(ctx.currentTime + i * 0.09 + 0.55);
    });
  };
  // Island-pop loop: a warm I–V–vi–IV pad with a soft bass, scheduled live.
  api.startMusic = () => {
    if (!api.ensure() || api.musicTimer) return;
    const ctx = api.ctx;
    const chords = [[261.6, 329.6, 392.0], [196.0, 246.9, 293.7], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6]];
    let step = 0;
    api.musicTimer = setInterval(() => {
      if (api.muted) return;
      const chord = chords[step % 4];
      const bass = chord[0] / 2;
      chord.forEach((f) => {
        const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = f;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.3);
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.9);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(); osc.stop(ctx.currentTime + 2);
      });
      const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = bass;
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(0.06, ctx.currentTime);
      bg.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.9);
      b.connect(bg); bg.connect(ctx.destination);
      b.start(); b.stop(ctx.currentTime + 2);
      step++;
    }, 2000);
  };
  return api;
}
