import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SOUNDS, YOUTUBE_IDS } from './config.js';

const sceneEl = document.getElementById('scene');
const heartsEl = document.getElementById('hearts');
const videoEl = document.getElementById('video-container');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
sceneEl.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(2, 3, 4);
scene.add(dirLight);

let model = null;
let baseScale = 1;
let popTime = 0;

const loader = new GLTFLoader();
loader.load(
  `${import.meta.env.BASE_URL}model.glb`,
  (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    baseScale = 2.5 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(baseScale);
    scene.add(model);
  },
  undefined,
  (error) => {
    console.error('Failed to load model.glb', error);
    const fallback = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.2, 1),
      new THREE.MeshStandardMaterial({ color: 0xff6b9d, metalness: 0.3, roughness: 0.4 })
    );
    model = fallback;
    baseScale = 1;
    scene.add(model);
  }
);

const mouse = new THREE.Vector2();
const target = new THREE.Vector2();

addEventListener('pointermove', (event) => {
  mouse.x = (event.clientX / innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / innerHeight) * 2 + 1;
});

const raycaster = new THREE.Raycaster();

addEventListener('pointerdown', (event) => {
  if (!model) return;

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
  popTime = performance.now();
  spawnHearts();
  playRandomSound();
  showRandomVideo();
}

function spawnHearts() {
  const cx = innerWidth / 2;
  const cy = innerHeight / 2;

  for (let i = 0; i < 24; i++) {
    const heart = document.createElement('div');
    heart.className = 'heart';
    heart.textContent = '❤️';

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
  const src = SOUNDS[Math.floor(Math.random() * SOUNDS.length)];
  const audio = new Audio(`${import.meta.env.BASE_URL}${src}`);
  audio.volume = 0.7;
  audio.play().catch(() => {});
}

function showRandomVideo() {
  const id = YOUTUBE_IDS[Math.floor(Math.random() * YOUTUBE_IDS.length)];
  videoEl.innerHTML = `<iframe
    src="https://www.youtube.com/embed/${id}?autoplay=1"
    allow="autoplay; encrypted-media"
    allowfullscreen
  ></iframe>`;
  videoEl.classList.add('show');
}

function animate() {
  requestAnimationFrame(animate);

  if (model) {
    target.x += (mouse.x * 0.5 - target.x) * 0.05;
    target.y += (mouse.y * 0.3 - target.y) * 0.05;
    model.rotation.y = target.x;
    model.rotation.x = -target.y;

    const elapsed = (performance.now() - popTime) / 1000;
    const pop = elapsed < 0.3 ? 1 + Math.sin((elapsed / 0.3) * Math.PI) * 0.15 : 1;
    model.scale.setScalar(baseScale * pop);
  }

  renderer.render(scene, camera);
}

animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
