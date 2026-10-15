# Hosting — Cloudflare Pages

PR previews and production both come from Cloudflare Pages' Git integration; the CI workflow runs checks only and does not deploy.

## One-time setup (dashboard steps, done by the owner)

1. Open **Workers & Pages** directly: <https://dash.cloudflare.com/?to=/:account/workers-and-pages> (or sidebar → **Compute** → **Workers & Pages**). Verified against Cloudflare docs, April 2026.
2. **Create application → Pages → Connect to Git**; authorise GitHub and select `vasyapym/hermitage-3d`.
3. Build settings: project name `hermitage-3d` · production branch `main` · build command `pnpm build` · output directory `dist`. The `packageManager` field in `package.json` makes the Pages build image use pnpm 9 through corepack. (Vite preset supplies the same values.)
4. Every pull request automatically gets a unique preview URL — that is what "every phase ends at a URL" runs on. Note: a Git-integrated Pages project cannot later be switched to Direct Upload; irrelevant for this repo, which is deployed from git on purpose.

## Known issue: `*.pages.dev` is blocked by some Russian ISPs

Confirmed 2026-10-15: Rostelecom intercepts TLS to `*.pages.dev` (self-signed certificate in place of Cloudflare's); the site opens only through a VPN. DNS and TCP reach Cloudflare fine — the block is domain-targeted (DPI).

Implications and plan:

- Development and CI are unaffected; the owner checks deploys via VPN until the mitigation is in.
- Mitigation before the v1 announcement (Phase 3): attach a **custom domain** to this same Pages project (free plan supports up to 100). With a custom domain the connection's SNI is the custom domain, not `pages.dev`, so this specific block does not apply. Cheap, no hosting change.
- The custom domain also protects against future single-provider subdomain blocks, which is the real point: a portfolio piece must be reachable from a mainstream connection.

## Notes

- **No wrangler commands are needed locally.** `npx wrangler deploy` / `preview` is the alternative Direct Upload path we deliberately do not use: deploys happen automatically from git (push to `main` → production, PR → preview). If the dashboard flow offers "Direct Upload" or asks to install wrangler, stop and go back via **Pages → Connect to Git**.
- **Dashboard gotcha (2026):** the create panel highlights **Workers** as Cloudflare's recommended path; that form asks for Deploy/Preview commands (wrangler) and needs a `wrangler.jsonc` in the repo. Our static site belongs to **Pages**: in **Create application** choose the **Pages** tab — it has no deploy/preview command fields at all. Workers path is a workable fallback (3-line wrangler config) only if Pages creation disappears.
- First production URL: `https://hermitage-3d.pages.dev` once Pages is connected and `main` has a green build. The page already renders the Phase 0 placeholder (a white massing box under a plain sky) after the scaffold commit.
- WebGL2 is served as-is; no special headers are needed yet. When the app ships, headers (strict CSP) will be added via a `_headers` file in `public/`.
