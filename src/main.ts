// Phase 0 scaffold placeholder. This proves the dev/build/test/CI pipeline
// end to end; the real boot sequence (FSM: boot → arriving → …) replaces it.
import './style.css';
import * as THREE from 'three';

const canvas = document.querySelector('#scene');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#scene canvas missing');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fa8bf); // placeholder sky

const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);

// Placeholder massing: one white box standing in for the palace.
const massing = new THREE.Mesh(
  new THREE.BoxGeometry(2.15, 0.24, 0.55),
  new THREE.MeshBasicMaterial({ color: 0xf4f1ea }),
);
massing.position.y = 0.12;
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.MeshBasicMaterial({ color: 0x7d7f81 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(massing, ground);

camera.position.set(0, 1.7, 4);
camera.lookAt(0, 0.3, 0);

const resize = () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
};
window.addEventListener('resize', resize);
resize();

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
