# A 方案 · 本地试玩

Open **http://127.0.0.1:4178/** on this computer. It is separate from the 4177 account preview and the public site. The September 10 local candidate includes all 10 user-supplied object-tap sounds; see `notes/nest-tap-audio-2026-09-10.md`. Enter the nest, leave arrangement mode, enable sound, then tap a resident, stove or arched window.

## What is real here

- Uses the current production UI components, model assets, card export/cache, photo capture, sounds, conditional animations and deferred media UI.
- Five visibly labelled sample toy types are pre-unlocked; crow and popcorn begin in the room. This is not a modification to any real account or task.
- Keep, layout/draft saving, scene-story metadata and actual captured photo Blobs persist to the separate `bc-local-play-a-v1` IndexedDB database at the 4178 browser origin. Refresh does not reset it. No reset/clear operation is run on earlier preview or production collections.
- A local story enters the sample draw pool only after its eligible scene has completed and its actual scene photo was saved. The sample story probability is 40%, matching the current rule. Story content remains unstamped. This playground does not post anything to a shared pool.

## What is deliberately not tested

This is a device-only behavioral sandbox, NOT the real Supabase `AccountProvider` or Edge Function. It has no login, cloud migration, API authentication or real network round trip. Small confirmation patches and the shared UI are exercised locally, but local speed cannot prove cloud latency, session reliability or production database behavior. Those remain publication gates.

The explicit build configuration does not load `.env` files and blanks all Supabase/asset environment values. The server binds only to 127.0.0.1, serves only the preview HTML and delivery assets, rejects other Host names and non-read methods, and uses a Content Security Policy that prevents remote connections. Local files/photos are not uploaded. This local audio candidate does not modify the public site or account Edge Function.

## Run / rebuild

From the project root:

1. `node node_modules/typescript/bin/tsc --noEmit --project review/tsconfig.local-play.json`
2. `node node_modules/vite/bin/vite.js build --config review/local-play.vite.config.ts`
3. `node scripts/serve-local-play.mjs`

Keep the last process running while playing. The output is `previews/local-play/local-play.html`, not `docs/index.html`. Never publish this fixture as the production entry. `localhost:4178` is a different browser storage origin from `127.0.0.1:4178`; use the exact latter link to keep the same local records.

## Acceptance

- 178 tests and local-play TypeScript/build passed.
- HTTP page 200; recorded ambience supports 206 byte ranges. Built fixture has no production project reference, account endpoint or publishable key.
- Browser: drew/opened/kept one sample capsule; count changed from five to six and remained six after reload. Saved room layout returned from editing to visit mode with the local confirmation. Room audio reported `playing`. Manual photograph visibly included the room plus crow/popcorn and produced a decoded 1080×1910 keepsake.
- The earlier physical-phone arrangement scrolling issue is still open. This local narrow/computer browser is not a real iPhone/WebView test.
