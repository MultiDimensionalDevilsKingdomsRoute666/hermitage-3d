# Hosting — Cloudflare Pages

PR previews and production both come from Cloudflare Pages' Git integration; the CI workflow runs checks only and does not deploy.

## One-time setup (dashboard steps, done by the owner)

1. dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git**.
2. Select the GitHub repository `vasyapym/hermitage-3d`.
3. Build settings: framework preset **Vite** · build command `pnpm build` · output directory `dist`. The `packageManager` field in `package.json` makes the Pages build image use pnpm 9 through corepack.
4. Production branch: `main`. Every pull request automatically gets a unique preview URL — that is what "every phase ends at a URL" runs on.

## Notes

- First production URL: `https://hermitage-3d.pages.dev` once Pages is connected and `main` has a green build. The page already renders the Phase 0 placeholder (a white massing box under a plain sky) after the scaffold commit.
- WebGL2 is served as-is; no special headers are needed yet. When the app ships, headers (strict CSP) will be added via a `_headers` file in `public/`.
