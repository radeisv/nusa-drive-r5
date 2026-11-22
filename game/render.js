// render.js — renderer setup and the chase camera: low and close behind the
// car when driving, over-the-shoulder on foot, with smooth lag and a slight
// speed kick so motion reads on screen.
import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  return renderer;
}

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
  return camera;
}

// Chase camera: behind the heading, height and distance by mode, eased.
export function updateCamera(camera, state, dt) {
  const p = state.playerPos;
  const heading = state.playerHeading || 0;
  const speed01 = Math.min(1, Math.abs(state.carSpeed || state.walkSpeed || 0) / 28);
  const dist = state.inCar ? 11.5 + speed01 * 3.5 : 7.5;
  const height = state.inCar ? 4.6 + speed01 * 0.8 : 3.4;
  const bx = p.x - Math.sin(heading) * dist;
  const bz = p.z - Math.cos(heading) * dist;
  const k = 1 - Math.pow(0.001, dt); // frame-rate independent ease
  camera.position.x += (bx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (bz - camera.position.z) * k;
  // look slightly ahead of the player, lower when driving fast
  const lx = p.x + Math.sin(heading) * (state.inCar ? 9 : 5);
  const lz = p.z + Math.cos(heading) * (state.inCar ? 9 : 5);
  camera.lookAt(lx, state.inCar ? 1.2 : 1.5, lz);
  // subtle speed shake at high speed
  if (speed01 > 0.75 && state.inCar) {
    camera.position.x += (Math.random() - 0.5) * 0.06;
    camera.position.y += (Math.random() - 0.5) * 0.05;
  }
}
