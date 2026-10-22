You are the specialist of a relay. You have no tools, no repo access and no prior context; the orchestrator integrates your reply into the repository and validates it. This is a MECHANICAL-tier relay: every contract is pinned below — do not redesign interfaces; if a pinned contract seems wrong, say so in CHALLENGES and emit the pinned shape anyway unless the orchestrator's text is impossible to satisfy. Numerals in verbatim material can be MASKED by the transport: never guess a restored value — emit `MASKED-IN-BRIEF: keep the <name> value`.

TASK (R-UX1, slice 2 of 2 — the walkthrough UX pass's prefetch chain; design-walkthrough-ux.md §4.6 + §12). Slice 1 (already integrated) made the transit depart → card → arrive. Your slice delivers the prefetch that empties the card's wait:

- NEW src/world/prefetch.ts — the PURE prefetch scheduler law.
- EXTEND src/assets/loaders.ts — the per-session byte+texture cache and the one-unit staging call.
- NEW tests/prefetch.test.ts; extend tests/assets.test.ts for the cache laws.

The orchestrator wires src/main.ts (the idle ticks, the ensureRoom interplay), updates docs and runs every gate. Do NOT write main.ts, manifests.ts, blend-gl.ts, rooms/*, i18n, e2e or docs.

DESIGN RULING — §4.6 of docs/design-walkthrough-ux.md, VERBATIM:

    6. **Prefetch** (the pause's real fix): at every arrival-settle, fetch
       manifest + lazy chunk + GLB + KTX2 rows of every non-resident neighbour and
       transcode ahead (staggered, one row per idle frame — the 2-core stutter guard);
       per-session cache keyed by room id, never evicted in-session (≈ 10 MB RAM
       declared; the §8.3 ledger still registers only on load). The black card then owns
       only GPU upload + compile + PMREM. Never prefetch while the current chain is
       pending; also unserialise manifest ∧ chunk. Cold deep links keep today's shape:
       card first, then the arrival glide.

CURRENT CODE — src/assets/loaders.ts, VERBATIM (you extend createLoaders; the exported Loaders interface and every existing law survive):

    // src/assets/loaders.ts
    /**
     * Three-bound loader service — docs/design-staircase.md §8.2 (fetch/decode off the render
     * path; parse + GPU upload inside the hold), §8.3 (dispose once, in exit), §8.4 (no GPU
     * allocation in the frame loop). Implements RoomAssetService from src/world/registry.
     *
     * Laws: fetchRoom never touches the renderer; mountParsed is hold-only and uploads every
     * texture before returning; blob URLs live until disposeParsed, never revoked per frame.
     */
    import {
      LoadingManager,
      type Material,
      type Mesh,
      type Object3D,
      PMREMGenerator,
      type Texture,
      type WebGLRenderer,
      type WebGLRenderTarget,
    } from 'three';
    import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
    import { type GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
    import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
    import type {
      RoomAssetService,
      RoomId,
      RoomLedger,
      RoomObject,
      RoomPayload,
    } from '../world/registry';

    export interface Loaders extends RoomAssetService {
      dispose(): void;
    }

    const materialsOf = (object: Object3D): Material[] => {
      const mesh = object as Mesh;
      if (mesh.isMesh !== true) return [];
      return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    };
    const texturesOf = (material: Material): Texture[] =>
      Object.values(material as unknown as Record<string, unknown>).filter(
        (v): v is Texture => typeof v === 'object' && v !== null && (v as Texture).isTexture === true,
      );

    /** §4.3: the honest GPU size — compressed textures carry their mip chain in image.data;
     * uncompressed textures estimate width × height × 4 B × 1.33 (the mip chain). */
    const vramBytes = (texture: Texture): number => {
      const image = texture.image as
        | { width?: number; height?: number; data?: { byteLength?: number } }
        | undefined;
      const data = image?.data;
      if (data && typeof data.byteLength === 'number') return data.byteLength;
      if (image?.width === undefined || image?.height === undefined) return 0;
      return Math.ceil(image.width * image.height * 4 * (4 / 3));
    };

    export function createLoaders(renderer: WebGLRenderer, ledger: RoomLedger): Loaders {
      MeshoptDecoder.useWorkers(1);
      const ktx2 = new KTX2Loader()
        .setTranscoderPath('/basis/')
        .setWorkerLimit(1)
        .detectSupport(renderer);
      const gltf = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
      const blobsByRoot = new WeakMap<Object3D, string[]>();
      const envByRoom = new Map<string, WebGLRenderTarget>(); // §5/ADR-0013: one bake per mount
      const pmrem = new PMREMGenerator(renderer);
      const parseGlb = (data: ArrayBuffer, path: string): Promise<GLTF> =>
        new Promise((resolve, reject) => gltf.parse(data, path, resolve, reject));
      return {
        async fetchRoom(manifest, signal) {
          const rows = await Promise.all(
            manifest.files.map(async (row) => {
              const res = await fetch(`/assets/${manifest.id}/${row.path}`, { signal });
              if (!res.ok) throw new Error(`fetchRoom: ${res.status} for ${row.path}`);
              const bytes = await res.arrayBuffer();
              if (bytes.byteLength !== row.bytes)
                throw new Error(`fetchRoom: size mismatch ${row.path}`);
              return [row, bytes] as const;
            }),
          );
          const glbRow = rows.find(([row]) => row.kind === 'glb');
          if (!glbRow) throw new Error(`fetchRoom: manifest ${manifest.id} has no glb row`);
          const ktx2Map = new Map<string, ArrayBuffer>();
          for (const [row, bytes] of rows) if (row.kind === 'ktx2') ktx2Map.set(row.path, bytes);
          return { glb: glbRow[1], ktx2: ktx2Map };
        },
        /** §4: decode only the lm rows — the glb's own ktx2 albedos already decoded inside parse. */
        async decodeRoomTextures(roomId, payload) {
          const out = new Map<string, RoomObject>();
          await Promise.all(
            [...payload.ktx2]
              .filter(([path]) => path.startsWith('lm/'))
              .map(
                ([path, bytes]) =>
                  new Promise<void>((resolve, reject) => {
                    ktx2.parse(
                      bytes,
                      (texture: unknown) => {
                        out.set(path, texture);
                        resolve();
                      },
                      reject,
                    );
                  }),
              ),
          );
          if (out.size === 0) throw new Error(`decodeRoomTextures: ${roomId} has no lm rows`);
          return out;
        },
        async mountParsed(roomId: RoomId, payload: RoomPayload): Promise<RoomObject> {
          const blobUrls = new Map<string, string>();
          for (const [key, bytes] of payload.ktx2) {
            blobUrls.set(key, URL.createObjectURL(new Blob([bytes])));
          }
          const manager = new LoadingManager();
          manager.setURLModifier((url) => {
            for (const [key, blob] of blobUrls) {
              if (url === key || url.endsWith(`/${key}`)) return blob;
            }
            return url;
          });
          // Holds are serialized, so rebinding the shared loaders' manager per call is race-free.
          // KTX2 bytes are fetched by KTX2Loader's own FileLoader, which consults the KTX2Loader's
          // manager — both are rebound, not just GLTFLoader's.
          gltf.manager = manager;
          ktx2.manager = manager;
          const parsed = await parseGlb(payload.glb, `/assets/${roomId}/`);
          const root = parsed.scene;
          // §8.3 layer 1: every decoded asset registers its honest GPU size — textures from the
          // transcoded mip data, geometries from their attribute + index arrays.
          root.traverse((obj) => {
            const mesh = obj as Mesh;
            if (mesh.isMesh === true) {
              let geometryBytes = 0;
              for (const attribute of Object.values(mesh.geometry.attributes)) {
                const array = attribute as { array: { byteLength: number } };
                geometryBytes += array.array.byteLength;
              }
              const index = mesh.geometry.index as { array: { byteLength: number } } | null;
              if (index !== null) geometryBytes += index.array.byteLength;
              ledger.register(roomId, 'geometry', geometryBytes, `geo/${mesh.uuid}`);
            }
            for (const material of materialsOf(obj)) {
              for (const texture of texturesOf(material)) {
                renderer.initTexture(texture);
                ledger.register(roomId, 'texture', vramBytes(texture), `tex/${texture.uuid}`);
              }
            }
          });
          blobsByRoot.set(root, [...blobUrls.values()]);
          return root;
        },
        /** §5/ADR-0013: decode the dusk probe, bake PMREM once — inside the hold, never per frame. */
        async mountEnvironment(roomId, payload) {
          const probe = [...payload.ktx2].find(([path]) => path.startsWith('probe/'));
          if (probe === undefined) throw new Error(`mountEnvironment: ${roomId} has no probe row`);
          const source = await new Promise<Texture>((resolve, reject) =>
            ktx2.parse(probe[1], resolve, reject),
          );
          const rt = pmrem.fromEquirectangular(source);
          source.dispose(); // baked into the RT; the equirect is never sampled again
          envByRoom.set(roomId, rt);
          const image = rt.texture.image as { width: number; height: number };
          ledger.register(roomId, 'renderTarget', image.width * image.height * 8, 'pmrem-probe');
          return rt.texture;
        },
        disposeEnvironment(roomId) {
          envByRoom.get(roomId)?.dispose();
          envByRoom.delete(roomId);
        },
        disposeParsed(object) {
          const root = object as Object3D;
          root.traverse((obj) => {
            const mesh = obj as Mesh;
            if (mesh.isMesh === true) mesh.geometry.dispose();
            for (const material of materialsOf(obj)) {
              for (const texture of texturesOf(material)) texture.dispose();
              material.dispose();
            }
          });
          for (const url of blobsByRoot.get(root) ?? []) URL.revokeObjectURL(url);
          blobsByRoot.delete(root);
        },
        dispose() {
          pmrem.dispose();
          ktx2.dispose();
        },
      };
    }

INTERFACES (src/world/registry.ts; type-only imports):

    export type RoomId = 'rastrelli-gallery' | 'jordan';
    export type NodeHandle = RoomId | 'square';
    export type Vec3 = readonly [number, number, number];
    export type RoomPayload = Readonly<{ glb: ArrayBuffer; ktx2: ReadonlyMap<string, ArrayBuffer> }>;
    export type RoomFileRow = Readonly<{ path: string; bytes: number; sha256: string; kind: 'glb' | 'ktx2' }>;
    export type RoomNeighbor = Readonly<{ to: NodeHandle | null; airlock: AirlockId }>;
    // AirlockId = 'arch-portal' | 'gallery-airlock' | 'landing-airlock'
    export type RoomManifest = Readonly<{
      id: string;
      files: readonly RoomFileRow[];   // kind 'glb' exactly once; kind 'ktx2' = lm/* + probe/* rows
      lightmaps: ...; budget: ...; toolchain: ...;
    }>;
    export interface RoomAssetService { fetchRoom(...); mountParsed(...); decodeRoomTextures(...); mountEnvironment(...); disposeEnvironment(...); disposeParsed(...); }

The manifest fetcher (src/assets/manifests.ts) ALREADY caches per room id, session-lived, never evicted — the scheduler's 'manifest' action resolves to a plain fetchManifest(id, signal) call; nothing new there. The lazy chunk's import is the browser's module cache — the scheduler's 'chunk' action resolves to the room entry's thunk() call; nothing new there either. YOUR two modules own the BYTES and the DECODED LIGHTMAPS.

PINNED FACTS (the orchestrator verified them against the tree; rely on them):
- fetchRoom today fetches EVERY manifest row in one Promise.all and returns {glb, ktx2 map}; the staging needs FINER granularity — one file per call.
- decodeRoomTextures today decodes every lm/* row via ktx2.parse in one Promise.all; the staging decodes ONE row per call.
- disposeTechnique (src/assets/blend-gl.ts) does NOT dispose the decoded lm textures — they are session-lived by construction today; a re-mounted room decodes fresh objects (ktx2.parse again). The dev memory assert (renderer.info.memory at post-boot baseline on exits to the resident) is the guard that this stays true.
- The coordinator serializes transits (one open transit at a time; the host gates staging on: settled, no open transit, no pending ensureRoom chain). The scheduler may assume its caller honours that gate.
- The ledger registers payload bytes ONLY in a room's load (module.load) — the cache and the staging NEVER touch the ledger (the ≈10 MB decoded-ahead RAM is off-ledger by design).
- The house purity gate (regex after stripping comments and string literals): no three import, no node:, no document/window/localStorage, no performance/Date/setTimeout/Math.random, no fetch, no timers — src/world/prefetch.ts must pass the scan. loaders.ts is already three-bound and is NOT scanned by the purity fence; its fetches may stay (the cache consults happen before any fetch).

MODULE 1 — src/world/prefetch.ts (the pure law). Pinned shape (argue inside CHALLENGES, emit the shape):

    export type PrefetchUnit =
      | Readonly<{ kind: 'glb'; roomId: RoomId }>
      | Readonly<{ kind: 'ktx2'; roomId: RoomId; path: string }>
      | Readonly<{ kind: 'decode'; roomId: RoomId; path: string }>;   // one lm/* row transcode
    // ('manifest' and 'chunk' actions resolve outside this module — see above.)
    export type RoomStage = Readonly<{
      manifest: boolean;             // the manifest is fetched
      files: ReadonlyMap<string, 'pending' | 'fetched'>;   // per manifest row (built as rows arrive)
      decodes: ReadonlyMap<string, 'pending' | 'decoded'>; // per lm/* row
    }>;
    export type PrefetchState = Readonly<{ rooms: ReadonlyMap<RoomId, RoomStage> }>;
    export const emptyPrefetchState: PrefetchState;
    export function planPrefetch(
      state: PrefetchState,
      input: Readonly<{ settled: NodeHandle; neighbors: readonly RoomNeighbor[]; busy: boolean }>,
    ): Readonly<{ state: PrefetchState; unit: PrefetchUnit | null }>;
    export function noteManifest(state: PrefetchState, roomId: RoomId, paths: readonly string[]): PrefetchState;
    // noteManifest: the host reports the fetched manifest's row paths; the state grows the
    // room's stage. A room NOT in the neighbours is never planned (only door-adjacent rooms).

Laws: exactly ONE unit per planPrefetch call; the order per room is glb → the ktx2 fetches in manifest order → the decodes in manifest order; rooms in the neighbours' order; `busy: true` yields no unit; a room with everything fetched+decoded yields no unit; a neighbour with `to: null` is skipped (a dead end has no room to prefetch); the square is never planned (a resident); the state never shrinks (never evict); malformed input fails loud (an unknown roomId in noteManifest, a non-finite anything, a duplicate note).

MODULE 2 — the loaders' session cache. Extend createLoaders with (pinned):
- A module-level-NO — a closure-level `Map<RoomId, {glb: ArrayBuffer | null; ktx2: Map<string, ArrayBuffer>; decoded: Map<string, RoomTexture>}>` session cache, never evicted (the loader's dispose() clears it — the session ends with the loaders).
- fetchRoom: consult the cache first — a full hit returns the cached payload WITHOUT fetching; partial hits reuse the cached rows and fetch only the missing ones (and a size-mismatch row re-fetches); every fetch fills the cache. The AbortSignal semantics unchanged.
- decodeRoomTextures: rows already in `decoded` return as-is; missing rows decode and fill.
- NEW method `stageUnit(unit: PrefetchUnit, manifest: RoomManifest): Promise<void>` — performs EXACTLY ONE unit against the manifest: 'glb' fetches the glb row (cache fill); 'ktx2' fetches that one row (cache fill); 'decode' decodes that one lm/* row from the CACHED bytes into `decoded` (throws loud if the bytes are absent — decode never fetches). It NEVER touches the ledger, never parses the glb, never initialises GPU memory, never creates blob URLs.
- The existing mountParsed/mountEnvironment/dispose laws are UNTOUCHED (the card still owns parse + initTexture + PMREM; the payload bytes now come from the cache).

TESTS (Vitest node style, no jsdom, tests live in tests/):
- tests/prefetch.test.ts: the one-unit-per-call law; the per-room and per-file order; busy yields nothing; done yields nothing; the dead-end and the resident are skipped; never-evict (a state never shrinks); noteManifest's loud failures; determinism (the same inputs → the same unit); the purity fence scanning src/world/prefetch.ts (the airlock test's fence pattern: readFileSync + the strip regexes + no three/node/document/window/localStorage/performance/Date/setTimeout/Math.random/fetch).
- tests/assets.test.ts (extend): the cache's fetch laws — a full hit fetches nothing (inject a fetchImpl spy that throws on a second call), partial hits fetch only the missing rows, a size mismatch re-fetches; stageUnit's one-unit law (a glb unit fills the cache and fetches nothing else; a decode unit throws loud without cached bytes; a decode unit never calls fetch); the decoded rows survive a re-decode call (a hit returns the SAME object — reference identity); the ledger receives NOTHING from stageUnit (the spy ledger stays empty).

HOUSE STYLE (binds every file): leading block comment citing the design sections implemented (design-walkthrough-ux.md §4.6 + §12 R-UX1); named exports only, no default exports; no enums; `satisfies` over `as` where a literal object is typed; `import type` for type-only imports; strict TS — noUncheckedIndexedAccess (index access yields T | undefined — handle it), exactOptionalPropertyTypes (use `| null`, never optional-undefined), noUnusedLocals/Parameters; biome single quotes, space indent, lines ≤ 100; state laws in comments once, plain declarative style; pure modules are three-free and DOM-free (regex-scannable).

FORBIDDEN in this slice: src/main.ts, src/assets/manifests.ts, src/assets/blend-gl.ts, rooms/*, src/i18n/*, the e2e specs, docs, CSS; the §8 weight law, the URL grammar, tier semantics, budgets (fixed by art/tier only), Blender-in-CI, the basis row; ANY ledger write outside a room's load; ANY eviction from the session cache; GPU work in stageUnit.

OUTPUT CONTRACT — numbered fenced code blocks, one per file, in this order:
1. src/world/prefetch.ts — the complete file;
2. src/assets/loaders.ts — the complete file (the current laws + the cache; do not abbreviate);
3. tests/prefetch.test.ts — the complete file;
4. tests/assets.test.ts — ONLY the added/changed describe blocks (the file exists; mark each block with the exact context line it follows);
each preceded by a one-line rationale. After the blocks: CHALLENGES — bullets (challenge assumptions, the credible alternative, uncertainties). Reply budget ≈ 450 lines; if a whole file does not fit, end with `TRUNCATED-HERE: <next file>` and never cut mid-file.

Before answering, challenge key assumptions, consider a credible alternative, and check likely failure cases; give the requested output with concise rationale and any material uncertainties.
