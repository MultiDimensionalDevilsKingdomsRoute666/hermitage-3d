// src/assets/manifests.ts
/**
 * Room manifest fetching — design-staircase.md §8.1 (generated manifests) and §1.3 (a
 * manifest-only fetch is legal ahead of need; no decode). Runtime trusts content hashes —
 * CI verifies sha256 (DEC-016); this module fetches, shape-checks and caches per room id.
 *
 * fetch is injectable for node tests; no DOM, no timers.
 */
import { LIGHT_STATES } from '../content/lightmap-look';
import type { RoomManifest } from '../world/registry';

const cache = new Map<string, RoomManifest>();

const SHA_PATTERN = /^[0-9a-f]{64}$/;

const isIntensityRow = (value: unknown): value is RoomManifest['lightmaps']['intensity'] => {
  if (value === null) return true;
  if (typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return LIGHT_STATES.every((state) => {
    const entry = record[state];
    return typeof entry === 'number' && Number.isFinite(entry) && entry > 0;
  });
};

const isManifest = (value: unknown, id: string): value is RoomManifest => {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  if (m.id !== id || !Array.isArray(m.files) || m.files.length === 0) return false;
  const lightmaps = m.lightmaps as Record<string, unknown> | undefined;
  if (typeof lightmaps !== 'object' || lightmaps === null) return false;
  if (!('intensity' in lightmaps) || !isIntensityRow(lightmaps.intensity)) return false;
  const budget = m.budget as Record<string, unknown> | undefined;
  if (
    typeof budget !== 'object' ||
    budget === null ||
    !['trianglesMax', 'drawsMax', 'textureBytesMax', 'payloadBytesMax'].every(
      (k) =>
        typeof budget[k] === 'number' &&
        Number.isFinite(budget[k] as number) &&
        (budget[k] as number) > 0,
    )
  ) {
    return false;
  }
  return m.files.every((row) => {
    const r = row as Record<string, unknown>;
    return (
      typeof r.path === 'string' &&
      r.path.length > 0 &&
      typeof r.bytes === 'number' &&
      typeof r.sha256 === 'string' &&
      SHA_PATTERN.test(r.sha256) &&
      (r.kind === 'glb' || r.kind === 'ktx2')
    );
  });
};

export function fetchManifest(
  id: string,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<RoomManifest> {
  const cached = cache.get(id);
  if (cached) return Promise.resolve(cached);
  return fetchImpl(`/assets/${id}/manifest.json`, { signal }).then(async (res) => {
    if (!res.ok) throw new Error(`manifest: ${res.status} for ${id}`);
    const json: unknown = await res.json();
    if (!isManifest(json, id)) throw new Error(`manifest: bad shape for ${id}`);
    cache.set(id, json);
    return json;
  });
}
