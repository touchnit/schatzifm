import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SOUNDS, YOUTUBE_IDS } from './config.js';
import { initBackground, setBackgroundMode } from './background.js';

function updateBackgroundMode(mode) {
  setBackgroundMode(easterEggActive ? 'bubbles' : mode);
}

const sceneEl = document.getElementById('scene');
const heartsEl = document.getElementById('hearts');
const videoEl = document.getElementById('video-container');

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setClearColor(0x000000, 0);
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.6;
sceneEl.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffe0e0, 2.5);
hemiLight.position.set(0, 10, 5);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(0, 4, 8);
dirLight.target.position.set(0, 0, 0);
scene.add(dirLight.target);
scene.add(dirLight);

const fillLight = new THREE.PointLight(0xffffff, 2, 30, 1);
fillLight.position.set(0, 2, 6);
scene.add(fillLight);

let model = null;
let baseScale = 1;
let popTime = 0;
let modelY = 0;
let modelYTarget = 0;
let videoOpen = false;
let ytPlayer = null;
let ytApiPromise = null;
let introActive = false;
let introStartTime = 0;
const INTRO_DURATION = 1.4;
const INTRO_START_Y = 2.8;
const INTRO_START_Z = 1.2;
const INTRO_START_SCALE = 1.85;
const HEARTBEAT_INTERVAL_MS = 2200;
const HEARTBEAT_PULSE_MS = 605;
const recentVideos = [];
const recentSounds = [];
let heartbeatActive = false;
let heartbeatStartTime = 0;
const GLINT_INTERVAL_MS = 10000;
const GLINT_DURATION_MS = 650;
const SPIN_DURATION_MS = 4000;
const SPIN_TURNS = 2;
let glintState = null;
let spinActive = false;
let spinStartTime = 0;
let easterEggActive = false;
const clickTimestamps = [];
const EASTER_EGG_CLICKS = 10;
const EASTER_EGG_WINDOW_MS = 5000;

const glintTexture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}glint-bg.png`);

function startClickSpin() {
  spinActive = true;
  spinStartTime = performance.now();
}

function getSpinOffset(now) {
  const t = Math.min((now - spinStartTime) / SPIN_DURATION_MS, 1);
  return easeOutCubic(t) * Math.PI * 2 * SPIN_TURNS;
}

function attachGlint(targetModel) {
  const material = new THREE.SpriteMaterial({
    map: glintTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.4, 1.4, 1);
  sprite.visible = false;
  sprite.position.z = 0.5;
  targetModel.add(sprite);

  return {
    sprite,
    animating: false,
    startTime: 0,
    nextTime: performance.now() + GLINT_INTERVAL_MS,
  };
}

function updateGlint(now) {
  if (!glintState || introActive) return;

  if (!glintState.animating && now >= glintState.nextTime) {
    glintState.animating = true;
    glintState.startTime = now;
    glintState.sprite.visible = true;
  }

  if (!glintState.animating) return;

  const t = (now - glintState.startTime) / GLINT_DURATION_MS;
  if (t >= 1) {
    glintState.animating = false;
    glintState.sprite.visible = false;
    glintState.sprite.material.opacity = 0;
    glintState.nextTime = now + GLINT_INTERVAL_MS;
    return;
  }

  const sweep = easeOutCubic(Math.min(t * 1.25, 1));
  glintState.sprite.position.x = THREE.MathUtils.lerp(-0.6, 0.6, sweep);
  glintState.sprite.position.y = THREE.MathUtils.lerp(-0.4, 0.4, sweep);
  glintState.sprite.material.opacity = Math.sin(t * Math.PI) * 0.95;

  const scale = 1.1 + Math.sin(t * Math.PI) * 0.5;
  glintState.sprite.scale.set(scale, scale, 1);
}

function getHeartbeatScale(now) {
  const elapsed = (now - heartbeatStartTime) % HEARTBEAT_INTERVAL_MS;
  if (elapsed > HEARTBEAT_PULSE_MS) return 1;

  const t = elapsed / HEARTBEAT_PULSE_MS;

  if (t < 0.22) {
    return 1 + Math.sin((t / 0.22) * Math.PI) * 0.1;
  }

  if (t < 0.38) {
    return 1;
  }

  if (t < 0.58) {
    return 1 + Math.sin(((t - 0.38) / 0.2) * Math.PI) * 0.07;
  }

  return 1;
}

function startHeartbeat() {
  heartbeatActive = true;
  heartbeatStartTime = performance.now();
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function startIntro() {
  introActive = true;
  introStartTime = performance.now();
  model.position.y = INTRO_START_Y;
  model.position.z = INTRO_START_Z;
  model.scale.setScalar(baseScale * INTRO_START_SCALE);
  model.rotation.set(0, 0, 0);
}

function setupModel(loadedModel, scale, { runIntro = true } = {}) {
  model = loadedModel;
  baseScale = scale;
  scene.add(model);
  glintState = attachGlint(model);

  if (runIntro) {
    startIntro();
  } else {
    introActive = false;
    model.position.z = 0;

    if (videoOpen) {
      liftModelForVideo();
    } else {
      modelYTarget = 0;
    }

    modelY = modelYTarget;
    model.scale.setScalar(baseScale);
  }
}

function playChampagneSound() {
  const audio = new Audio(`${import.meta.env.BASE_URL}sounds/champagne.mp3`);
  audio.volume = 0.91;
  audio.play().catch(() => {});
}

function swapToBottleModel() {
  if (model) {
    scene.remove(model);
  }

  loader.load(`${import.meta.env.BASE_URL}rottkapchen.glb`, (gltf) => {
    const bottleModel = gltf.scene;
    matteifyMaterials(bottleModel);
    const box = new THREE.Box3().setFromObject(bottleModel);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    bottleModel.position.sub(center);
    const scale = (2.5 / Math.max(size.x, size.y, size.z)) * 0.5;
    setupModel(bottleModel, scale, { runIntro: false });
  });
}

function activateEasterEgg() {
  easterEggActive = true;
  spinActive = false;
  heartbeatActive = false;
  videoOpen = false;
  modelYTarget = 0;

  videoEl.classList.remove('show', 'loading');
  videoEl.innerHTML = '';

  if (ytPlayer) {
    ytPlayer.destroy();
    ytPlayer = null;
  }

  playChampagneSound();
  setBackgroundMode('bubbles');
  swapToBottleModel();
}

function trackClickForEasterEgg() {
  if (easterEggActive) return false;

  const now = performance.now();
  clickTimestamps.push(now);

  while (clickTimestamps.length && clickTimestamps[0] < now - EASTER_EGG_WINDOW_MS) {
    clickTimestamps.shift();
  }

  if (clickTimestamps.length > EASTER_EGG_CLICKS) {
    activateEasterEgg();
    return true;
  }

  return false;
}

function pickFromPool(pool, recent, historySize = 3) {
  const recentSet = new Set(recent.slice(-historySize));
  const candidates = pool.filter((item) => !recentSet.has(item));
  const choices = candidates.length > 0 ? candidates : pool;
  const pick = choices[Math.floor(Math.random() * choices.length)];

  recent.push(pick);
  if (recent.length > historySize) {
    recent.shift();
  }

  return pick;
}

function pickRandomVideoId() {
  return pickFromPool(YOUTUBE_IDS, recentVideos);
}

function pickRandomSound() {
  return pickFromPool(SOUNDS, recentSounds);
}

function getVideoLiftY() {
  const gap = 32;
  let videoTop;

  if (videoEl.classList.contains('show')) {
    videoTop = videoEl.getBoundingClientRect().top;
  } else {
    const videoHeight = Math.min(innerWidth * 0.8, 640) * (9 / 16);
    const videoBottom = innerHeight * 0.12;
    videoTop = innerHeight - videoBottom - videoHeight;
  }

  const desiredCenterY = (videoTop - gap) / 2;
  const pixelShift = innerHeight / 2 - desiredCenterY;

  const vFov = (camera.fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
  return (pixelShift / innerHeight) * visibleHeight;
}

function liftModelForVideo() {
  modelYTarget = getVideoLiftY();
}

function matteifyMaterials(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) {
      if (material.metalness !== undefined) material.metalness = 0;
      if (material.roughness !== undefined) material.roughness = 3;
      if (material.shininess !== undefined) material.shininess = 1;
      if (material.clearcoat !== undefined) material.clearcoat = 0;
      if (material.envMap) material.envMap = null;
      material.needsUpdate = true;
    }
  });
}

const loader = new GLTFLoader();
loader.load(
  `${import.meta.env.BASE_URL}schatzi.glb`,
  (gltf) => {
    model = gltf.scene;
    matteifyMaterials(model);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    baseScale = (2.5 / Math.max(size.x, size.y, size.z)) * 0.5;
    setupModel(model, baseScale);
  },
  undefined,
  (error) => {
    console.error('Failed to load model.glb', error);
    const fallback = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.2, 1),
      new THREE.MeshStandardMaterial({ color: 0xff6b9d, metalness: 0, roughness: 0.95 })
    );
    setupModel(fallback, 0.75);
  }
);

const pointerInput = new THREE.Vector2();
const orientationInput = new THREE.Vector2();
const target = new THREE.Vector2();
const modelScreenPos = new THREE.Vector3();
const isMobile = window.matchMedia('(pointer: coarse)').matches;
let orientationEnabled = false;
let isTouching = false;

function clampInput(value) {
  return THREE.MathUtils.clamp(value, -1, 1);
}

function handleOrientation(event) {
  if (event.gamma == null || event.beta == null) return;

  orientationInput.x = clampInput(event.gamma / 40);
  orientationInput.y = clampInput((event.beta - 45) / 40);
}

function getTiltInput() {
  if (isMobile && orientationEnabled && !isTouching) {
    return orientationInput;
  }

  return pointerInput;
}

async function enableOrientation() {
  if (!isMobile || orientationEnabled) return orientationEnabled;

  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    try {
      const permission = await DeviceOrientationEvent.requestPermission();
      if (permission !== 'granted') return false;
    } catch {
      return false;
    }
  } else if (typeof DeviceOrientationEvent === 'undefined') {
    return false;
  }

  window.addEventListener('deviceorientation', handleOrientation, true);
  orientationEnabled = true;
  return true;
}

if (isMobile && typeof DeviceOrientationEvent?.requestPermission !== 'function') {
  window.addEventListener('deviceorientation', handleOrientation, true);
  orientationEnabled = true;
}

function getModelScreenPosition() {
  if (!model) {
    return { x: innerWidth / 2, y: innerHeight / 2 };
  }

  model.getWorldPosition(modelScreenPos);
  modelScreenPos.project(camera);

  return {
    x: (modelScreenPos.x * 0.5 + 0.5) * innerWidth,
    y: (-modelScreenPos.y * 0.5 + 0.5) * innerHeight,
  };
}

addEventListener('pointermove', (event) => {
  pointerInput.x = (event.clientX / innerWidth) * 2 - 1;
  pointerInput.y = -(event.clientY / innerHeight) * 2 + 1;
});

addEventListener('pointerup', () => {
  isTouching = false;
});

addEventListener('pointercancel', () => {
  isTouching = false;
});

const raycaster = new THREE.Raycaster();

addEventListener('pointerdown', async (event) => {
  if (isMobile) {
    isTouching = true;
    await enableOrientation();
  }

  if (!model || introActive) return;

  const pointer = new THREE.Vector2(
    (event.clientX / innerWidth) * 2 - 1,
    -(event.clientY / innerHeight) * 2 + 1
  );
  raycaster.setFromCamera(pointer, camera);

  if (raycaster.intersectObject(model, true).length > 0) {
    onModelClick();
  }
});

function onModelClick() {
  if (trackClickForEasterEgg()) return;

  popTime = performance.now();
  startClickSpin();
  spawnHearts();
  playRandomSound();
  showRandomVideo();
}

function spawnHearts() {
  const { x: cx, y: cy } = getModelScreenPosition();

  for (let i = 0; i < 24; i++) {
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.textContent = easterEggActive ? '🍾' : '❤️';

    const angle = Math.random() * Math.PI * 2;
    const distance = 200 + Math.random() * 400;

    heart.style.left = `${cx}px`;
    heart.style.top = `${cy}px`;
    heart.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    heart.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
    heart.style.setProperty('--rot', `${Math.random() * 720 - 360}deg`);
    heart.style.fontSize = `${18 + Math.random() * 28}px`;

    heartsEl.appendChild(heart);
    setTimeout(() => heart.remove(), 1700);
  }
}

function playRandomSound() {
  const src = pickRandomSound();
  const audio = new Audio(`${import.meta.env.BASE_URL}${src}`);
  audio.volume = 0.91;
  audio.play().catch(() => {});
}

function loadYouTubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      window.onYouTubeIframeAPIReady = resolve;
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    });
  }

  return ytApiPromise;
}

function onPlayerStateChange(event) {
  if (event.data !== YT.PlayerState.PLAYING) return;

  videoEl.classList.remove('loading');
  videoEl.querySelector('.video-loader')?.remove();
  updateBackgroundMode('playing');
  startHeartbeat();
}

function showRandomVideo() {
  const id = pickRandomVideoId();

  videoEl.classList.add('show', 'loading');
  videoEl.innerHTML = `
    <div class="video-loader">
      <div class="video-loader__spinner"></div>
      <p class="video-loader__text">Dein Schatzi lädt ❤️</p>
    </div>
    <div id="yt-player"></div>
  `;
  videoOpen = true;
  liftModelForVideo();
  updateBackgroundMode('idle');
  heartbeatActive = false;

  loadYouTubeApi().then(() => {
    if (ytPlayer) {
      ytPlayer.destroy();
      ytPlayer = null;
    }

    ytPlayer = new YT.Player('yt-player', {
      width: '100%',
      height: '100%',
      videoId: id,
      playerVars: {
        autoplay: 1,
        rel: 0,
      },
      events: {
        onStateChange: onPlayerStateChange,
      },
    });
  });
}

function animate() {
  requestAnimationFrame(animate);

  if (model) {
    if (introActive) {
      const t = Math.min((performance.now() - introStartTime) / (INTRO_DURATION * 1000), 1);
      const eased = easeOutCubic(t);

      model.position.y = THREE.MathUtils.lerp(INTRO_START_Y, modelYTarget, eased);
      model.position.z = THREE.MathUtils.lerp(INTRO_START_Z, 0, eased);
      model.scale.setScalar(baseScale * THREE.MathUtils.lerp(INTRO_START_SCALE, 1, eased));

      if (t >= 1) {
        introActive = false;
        model.position.z = 0;
        modelY = modelYTarget;
        if (glintState) {
          glintState.nextTime = performance.now() + GLINT_INTERVAL_MS;
        }
      }
    } else {
      modelY += (modelYTarget - modelY) * 0.08;
      model.position.y = modelY;

      const tiltInput = getTiltInput();
      target.x += (tiltInput.x * 0.5 - target.x) * 0.05;
      target.y += (tiltInput.y * 0.3 - target.y) * 0.05;

      if (spinActive) {
        const now = performance.now();
        const t = Math.min((now - spinStartTime) / SPIN_DURATION_MS, 1);
        model.rotation.y = target.x + getSpinOffset(now);

        if (t >= 1) {
          spinActive = false;
          model.rotation.y = target.x;
        }
      } else {
        model.rotation.y = target.x;
      }

      model.rotation.x = -target.y;

      const elapsed = (performance.now() - popTime) / 1000;
      let scaleMult = 1;

      if (elapsed < 0.3) {
        scaleMult *= 1 + Math.sin((elapsed / 0.3) * Math.PI) * 0.15;
      }

      if (heartbeatActive) {
        scaleMult *= getHeartbeatScale(performance.now());
      }

      model.scale.setScalar(baseScale * scaleMult);
      updateGlint(performance.now());
    }
  }

  renderer.render(scene, camera);
}

animate();

initBackground();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (videoOpen) liftModelForVideo();
});
