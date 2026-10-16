// Sky rig gates — design-sky-time.md §7/§11: one draw call, one triangle, one custom material,
// zero textures; the three tail chunks appear exactly once and in the required order
// (tone mapping → output colour space → dithering). Node-only: the module must import and the
// factory must build without any WebGL context.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { sampleSky } from '../src/sky/appearance';
import { createSkyRig, SKY_FRAGMENT_SHADER, SKY_VERTEX_SHADER } from '../src/sky/rig';

const countOccurrences = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

describe('sky rig shader sources', () => {
  it('closes the fragment body with the three chunks exactly once, in order', () => {
    const includeOf = (name: string): string => `#include <${name}>`;
    for (const name of ['tonemapping_fragment', 'colorspace_fragment', 'dithering_fragment']) {
      expect(countOccurrences(SKY_FRAGMENT_SHADER, includeOf(name))).toBe(1);
    }
    const tonemappingAt = SKY_FRAGMENT_SHADER.indexOf(includeOf('tonemapping_fragment'));
    const colorspaceAt = SKY_FRAGMENT_SHADER.indexOf(includeOf('colorspace_fragment'));
    const ditheringAt = SKY_FRAGMENT_SHADER.indexOf(includeOf('dithering_fragment'));
    expect(tonemappingAt).toBeLessThan(colorspaceAt);
    expect(colorspaceAt).toBeLessThan(ditheringAt);
  });

  it('never repeats the pars chunks three already injects', () => {
    expect(countOccurrences(SKY_FRAGMENT_SHADER, 'tonemapping_pars_fragment')).toBe(0);
    expect(countOccurrences(SKY_FRAGMENT_SHADER, 'colorspace_pars_fragment')).toBe(0);
  });

  it('supplies rand() through <common> before the dithering pars', () => {
    const commonAt = SKY_FRAGMENT_SHADER.indexOf('#include <common>');
    const parsAt = SKY_FRAGMENT_SHADER.indexOf('#include <dithering_pars_fragment>');
    expect(commonAt).toBeGreaterThan(-1);
    expect(commonAt).toBeLessThan(parsAt);
  });

  it('mixes palette before the tail and writes gl_FragColor exactly once', () => {
    expect(countOccurrences(SKY_FRAGMENT_SHADER, 'gl_FragColor =')).toBe(1);
    expect(countOccurrences(SKY_FRAGMENT_SHADER, 'uGlow * g')).toBe(1);
  });

  it('uses GLSL1 varying plumbing consistent with three prefix injection', () => {
    expect(SKY_VERTEX_SHADER).toContain('varying vec2 vNdc;');
    expect(SKY_FRAGMENT_SHADER).toContain('varying vec2 vNdc;');
    expect(SKY_VERTEX_SHADER).not.toContain('projectionMatrixInverse');
  });
});

describe('sky rig factory', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 2, 0.1, 2000);
  const rig = createSkyRig(scene, camera);

  it('adds one full-screen triangle mesh behind the scene', () => {
    expect(rig.mesh.parent).toBe(scene);
    expect(rig.mesh.renderOrder).toBe(-1);
    expect(rig.mesh.frustumCulled).toBe(false);
    const position = rig.mesh.geometry.getAttribute('position');
    expect(position.count).toBe(3);
  });

  it('pins the dome render state (depth off, dithering on, opaque)', () => {
    const material = rig.mesh.material as THREE.ShaderMaterial;
    expect(material.depthTest).toBe(false);
    expect(material.depthWrite).toBe(false);
    expect(material.transparent).toBe(false);
    expect(material.dithering).toBe(true);
    expect(material.toneMapped).toBe(true);
    expect(material.precision).toBe('highp');
  });

  it('owns no textures anywhere in its uniforms', () => {
    const material = rig.mesh.material as THREE.ShaderMaterial;
    for (const uniform of Object.values(material.uniforms)) {
      const value: unknown = uniform.value;
      const isTexture = typeof value === 'object' && value !== null && 'isTexture' in value;
      expect(isTexture).toBe(false);
    }
  });

  it('applies a live sample without allocation-sensitive state churn', () => {
    const sample = sampleSky(1782036000000); // June solstice 13:00 reference vector
    rig.apply(sample);
    const material = rig.mesh.material as THREE.ShaderMaterial;
    const zenith = material.uniforms.uZenith?.value as THREE.Color;
    const horizon = material.uniforms.uHorizon?.value as THREE.Color;
    const glow = material.uniforms.uGlow?.value as number;
    const sun = material.uniforms.uHorizonSun?.value as THREE.Vector3;
    expect(zenith.r).toBeCloseTo(sample.atmosphere.zenithRgb[0], 12);
    expect(zenith.g).toBeCloseTo(sample.atmosphere.zenithRgb[1], 12);
    expect(zenith.b).toBeCloseTo(sample.atmosphere.zenithRgb[2], 12);
    expect(horizon.r).toBeCloseTo(sample.atmosphere.horizonRgb[0], 12);
    expect(glow).toBe(sample.atmosphere.glowStrength);
    expect(sun.x).toBe(sample.horizonSunDirection[0]);
    expect(sun.y).toBe(sample.horizonSunDirection[1]);
    expect(sun.z).toBe(sample.horizonSunDirection[2]);
  });

  it('reconstructs the camera basis and ray extents from fov/aspect/zoom', () => {
    camera.position.set(0, 1.7, 4);
    camera.lookAt(0, 0.3, 0);
    rig.updateCamera(camera);
    const material = rig.mesh.material as THREE.ShaderMaterial;
    const right = material.uniforms.uCamRight?.value as THREE.Vector3;
    const up = material.uniforms.uCamUp?.value as THREE.Vector3;
    const forward = material.uniforms.uCamForward?.value as THREE.Vector3;
    expect(right.x).toBeCloseTo(1, 9);
    expect(right.y).toBeCloseTo(0, 9);
    expect(right.z).toBeCloseTo(0, 9);
    expect(forward.z).toBeLessThan(0);
    expect(forward.y).toBeLessThan(0);
    expect(right.length()).toBeCloseTo(1, 9);
    expect(up.length()).toBeCloseTo(1, 9);
    expect(forward.length()).toBeCloseTo(1, 9);
    const tanHalfFov = Math.tan((0.5 * 55 * Math.PI) / 180);
    expect(material.uniforms.uRayTanY?.value).toBeCloseTo(tanHalfFov, 12);
    expect(material.uniforms.uRayTanX?.value).toBeCloseTo(tanHalfFov * 2, 12);
  });

  it('disposes its geometry and material and leaves the scene', () => {
    rig.dispose();
    expect(rig.mesh.parent).toBeNull();
    expect(rig.mesh.geometry.index).toBeNull();
  });
});
