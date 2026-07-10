const BAR_COUNT = 48;

let container = null;
let idleLayer = null;
let equalizerLayer = null;
let mode = 'idle';

export function initBackground() {
  container = document.getElementById('bg-animation');

  idleLayer = document.createElement('div');
  idleLayer.className = 'bg-idle';

  for (let i = 0; i < 4; i++) {
    const orb = document.createElement('div');
    orb.className = 'bg-orb';
    orb.style.setProperty('--x', `${15 + i * 22}%`);
    orb.style.setProperty('--y', `${20 + (i % 2) * 35}%`);
    orb.style.setProperty('--size', `${220 + i * 60}px`);
    orb.style.setProperty('--delay', `${i * -2.5}s`);
    orb.style.setProperty('--duration', `${10 + i * 2}s`);
    idleLayer.appendChild(orb);
  }

  equalizerLayer = document.createElement('div');
  equalizerLayer.className = 'bg-equalizer';

  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement('div');
    bar.className = 'eq-bar';
    bar.style.setProperty('--min', `${0.08 + Math.random() * 0.12}`);
    bar.style.setProperty('--max', `${0.35 + Math.random() * 0.55}`);
    bar.style.setProperty('--dur', `${0.35 + Math.random() * 0.55}s`);
    bar.style.setProperty('--delay', `${Math.random() * -1}s`);
    equalizerLayer.appendChild(bar);
  }

  container.append(idleLayer, equalizerLayer);
  setBackgroundMode('idle');
}

export function setBackgroundMode(nextMode) {
  if (!container || mode === nextMode) return;
  mode = nextMode;
  container.dataset.mode = nextMode;
}
