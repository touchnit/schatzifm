const BAR_COUNT = 48;

let container = null;
let idleLayer = null;
let equalizerLayer = null;
let mode = 'idle';

export function initBackground() {
  container = document.getElementById('bg-animation');

  idleLayer = document.createElement('div');
  idleLayer.className = 'bg-idle';

  const gradientPulse = document.createElement('div');
  gradientPulse.className = 'bg-gradient-pulse';
  idleLayer.appendChild(gradientPulse);

  const lightSweep = document.createElement('div');
  lightSweep.className = 'bg-light-sweep';
  idleLayer.appendChild(lightSweep);

  const centerGlow = document.createElement('div');
  centerGlow.className = 'bg-center-glow';
  idleLayer.appendChild(centerGlow);

  for (let i = 0; i < 6; i++) {
    const orb = document.createElement('div');
    orb.className = `bg-orb${i % 2 === 0 ? '' : ' bg-orb--alt'}`;
    orb.style.setProperty('--x', `${8 + i * 16}%`);
    orb.style.setProperty('--y', `${12 + (i % 3) * 28}%`);
    orb.style.setProperty('--size', `${180 + i * 45}px`);
    orb.style.setProperty('--delay', `${i * -3.2}s`);
    orb.style.setProperty('--duration', `${12 + i * 2.5}s`);
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
  if (!container) return;
  mode = nextMode;
  container.dataset.mode = nextMode;
}
