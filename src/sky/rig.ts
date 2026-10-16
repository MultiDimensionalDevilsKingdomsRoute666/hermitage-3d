// Sky dome rig — design-sky-time.md §7 (dome shading), DEC-009 (Phase 0: one custom material,
// one fullscreen triangle, zero textures, zero render targets).
//
// The fragment reconstructs an exact per-pixel world ray from the camera basis and mixes the §7
// palette in scene-linear space. three.js injects AgX tone mapping, output colour-space
// conversion and the DITHERING define through the material prefix (toneMapped stays true).

import * as THREE from 'three';
import { PALETTE } from '../content/sky-time';
import type { SkySample } from './appearance';

export type SkyRig = Readonly<{
  mesh: THREE.Mesh;
  apply: (sample: SkySample) => void;
  updateCamera: (camera: THREE.PerspectiveCamera) => void;
  dispose: () => void;
}>;

type Triple = readonly [number, number, number];

const TRIANGLE_NDC: readonly number[] = [-1, -1, 0, 3, -1, 0, -1, 3, 0];

// Clip z sits on the far plane: harmless with depthTest off, still behind everything if a later
// pass depth-tests the dome. w = 1 at all three vertices, so vNdc interpolates linearly and is
// exactly the fragment's NDC position.
export const SKY_VERTEX_SHADER = /* glsl */ `
varying vec2 vNdc;

void main() {
  vNdc = position.xy;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

// <common> supplies rand() for the dithering chunk. The tonemapping/colorspace pars chunks and
// toneMapping()/linearToOutputTexel() are already injected by three and are never repeated here.
export const SKY_FRAGMENT_SHADER = /* glsl */ `
#include <common>
#include <dithering_pars_fragment>

uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uWarm;
uniform float uGlow;
uniform vec3 uHorizonSun;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamForward;
uniform float uRayTanX;
uniform float uRayTanY;

varying vec2 vNdc;

float smootherStep(float x) {
  float t = clamp(x, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec3 d = normalize(vNdc.x * uRayTanX * uCamRight + vNdc.y * uRayTanY * uCamUp + uCamForward);

  float v = smootherStep((d.y + 0.08) / 1.08);
  vec3 base = mix(uHorizon, uZenith, v);

  float band = d.y / 0.22;
  float facing = max(dot(d, uHorizonSun), 0.0);
  float facing2 = facing * facing;
  float g = exp(-band * band) * facing2 * facing2 * facing2;

  gl_FragColor = vec4(mix(base, uWarm, uGlow * g), 1.0);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <dithering_fragment>
}
`;

function setRgb(target: THREE.Color, rgb: Triple): void {
  target.setRGB(rgb[0], rgb[1], rgb[2]);
}

export function createSkyRig(scene: THREE.Scene, camera: THREE.PerspectiveCamera): SkyRig {
  const uniforms = {
    uZenith: { value: new THREE.Color(0, 0, 0) },
    uHorizon: { value: new THREE.Color(0, 0, 0) },
    uWarm: { value: new THREE.Color(0, 0, 0) },
    uGlow: { value: 0 },
    uHorizonSun: { value: new THREE.Vector3(0, 0, -1) },
    uCamRight: { value: new THREE.Vector3(1, 0, 0) },
    uCamUp: { value: new THREE.Vector3(0, 1, 0) },
    uCamForward: { value: new THREE.Vector3(0, 0, -1) },
    uRayTanX: { value: 1 },
    uRayTanY: { value: 1 },
  };
  setRgb(uniforms.uWarm.value, PALETTE.warmHorizon);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(TRIANGLE_NDC, 3));

  const material = new THREE.ShaderMaterial({
    name: 'SkyDome',
    uniforms,
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    dithering: true,
    precision: 'highp',
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'SkyDome';
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  mesh.raycast = () => {
    // The triangle lives in NDC, not world space; it must never answer scene picking.
  };
  scene.add(mesh);

  const apply = (sample: SkySample): void => {
    const { atmosphere, horizonSunDirection: sun } = sample;
    setRgb(uniforms.uZenith.value, atmosphere.zenithRgb);
    setRgb(uniforms.uHorizon.value, atmosphere.horizonRgb);
    uniforms.uGlow.value = atmosphere.glowStrength;
    uniforms.uHorizonSun.value.set(sun[0], sun[1], sun[2]);
  };

  const updateCamera = (cam: THREE.PerspectiveCamera): void => {
    // render() is what normally refreshes matrixWorld; without this a call made before render
    // would read last frame's pose and the dome would trail the scene by one frame.
    cam.updateWorldMatrix(true, false);
    const basis = cam.matrixWorld;
    uniforms.uCamRight.value.setFromMatrixColumn(basis, 0).normalize();
    uniforms.uCamUp.value.setFromMatrixColumn(basis, 1).normalize();
    uniforms.uCamForward.value.setFromMatrixColumn(basis, 2).normalize().negate();
    const tanHalfFov = Math.tan(0.5 * cam.fov * THREE.MathUtils.DEG2RAD) / cam.zoom;
    uniforms.uRayTanY.value = tanHalfFov;
    uniforms.uRayTanX.value = tanHalfFov * cam.aspect;
  };
  updateCamera(camera);

  const dispose = (): void => {
    scene.remove(mesh);
    geometry.dispose();
    material.dispose();
  };

  return { mesh, apply, updateCamera, dispose };
}
