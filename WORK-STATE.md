# Work state — Afterglow

## Session 2026-10-23

### Delivered

- One-flow TypeScript MVP: favorites → music + dinner + film; New York/London/Warsaw; total group budget, party size and a discovery toggle.
- Responsive React UI, original CSS/SVG artwork, source labels, explanations, raw tool trace, single-pick swaps and Markdown export.
- Shared `TasteProvider` interface with hand-authored mock catalog and a real Qloo REST adapter. No Qloo key was available.
- Shared tool registry and deterministic planner; optional bounded Mistral function-calling loop with candidate-ID validation.
- Node API/static server, Cloudflare Worker entry point/configuration, non-root Dockerfile, MIT license, README and submission kit.
- Public repository created: https://github.com/Schultzenator/afterglow-qloo
- GitHub Pages published: https://schultzenator.github.io/afterglow-qloo/ (publication validation recorded below).

### Validation evidence

- 11 logic/provider/API tests passed, including fixture revisions, city constraints, ambiguous names, ungrounded IDs, empty results, request size validation and Qloo request mapping.
- TypeScript checking and production Vite build passed.
- 2 Chromium browser tests passed: full judging flow and mobile/error recovery; 390px viewport overflow fixed. UI regression tests explicitly select the key-free demo.
- Actual local Mistral API smoke test: HTTP 200, 3.848s, five successful tool calls (`resolve_tastes`, three `discover`, `compose_plan`), fixture provider. Picks: Men I Trust, Diner, Perfect Days. No credentials recorded.
- Screenshots visually inspected for desktop, results and mobile. After the inspection, mobile budget fields were expanded for readability; screenshots refreshed before delivery.
- Qloo contract checked against its public docs. **No successful live Qloo test is claimed.**

### Remaining dependencies

1. PW: join Devpost and request Qloo API access via the organizer's form.
2. With key: perform the checklist in `docs/API-CONTRACT.md`, deploy a credentialed backend and update the demo URL/status in the submission kit.
3. PW: create and submit the Devpost project. No Devpost account action or API-access form was performed in this session.

Cloudflare CLI reports no authenticated account; no Worker deployment was attempted with an ephemeral account. Public Pages demo is intentionally fixtures + rules. The existing environment's Mistral key was used only for a local runtime test and was not copied to source or GitHub.

### Filesystem and commands

Requested destination `/home/schultze/Factory/HCTN/qloo-agentic-2026/` is outside this session's writable roots. Source was created in `/home/schultze/Factory/workspaces/qloo-agentic-20261030/repo/qloo-agentic-2026/`. The submission kit includes a clone command for the requested destination.

This environment has stale npm-cache/TMPDIR defaults. Installation used `--cache /tmp/afterglow-npm-cache`; runtime tests used `TMPDIR=/tmp`. The project does not depend on those environment-specific paths. Default backend port is 4317 because another service already occupied 3001.

### Publication validation

- Public URL returns HTTP 200 and works without credentials or a local server.
- Latest application commit: `3159aa103beddbe069bdddfca5d7a968cf15df0c`.
- GitHub Actions build, 11 tests, 2 browser tests and deployment all passed: https://github.com/Schultzenator/afterglow-qloo/actions/runs/39995086014
- Both browser tests also passed against the actual public URL after that deployment (4.8s). Public mobile planner visually checked at 390px; no horizontal overflow; budget and party controls remain legible.
- GitHub API confirms repository visibility is public and detected license is MIT.
- `wrangler deploy --dry-run` passed: Worker bundle 24.37 KiB, static-assets binding recognized. No live Worker was deployed, and no credentials were uploaded.
- Final source Docker image `afterglow-qloo:mvp-3159aa1` built successfully. Container ran as `node`; `/` and `/api/health` returned 200, and `/api/plan` returned a five-step fixture/rules plan with Bibenda in Warsaw. Test container was stopped after verification. No image registry push is claimed.
- Application sources and documentation are pushed to `main`. Documentation-only commits intentionally do not rebuild the unchanged Pages application.

### Follow-up verification — 2026-10-23

- Reused the completed project and public deployment; no duplicate app or repository created.
- Re-ran all 11 logic/provider/API tests and the TypeScript/production build successfully.
- Re-ran both Chromium tests against `https://schultzenator.github.io/afterglow-qloo/`: both passed (13.5 seconds), covering the judging flow and mobile/error recovery.
- Confirmed the GitHub repository remains public using the GitHub API.
- The first test invocation hit the already documented invalid environment temporary-directory setting; rerunning with `TMPDIR=/tmp` passed. No source change was needed.
- Rechecked the organizer's overview and rules: the public-hosting and Qloo-integration requirements remain relevant. The fixture demo is ready for review; credentialed Qloo verification is still pending PW's API access.

## Live Qloo handoff — 2026-10-29

### Completed in this session

- Read the supplied runtime-only Qloo credentials from `/home/schultze/Factory/secrets/qloo.env`; no key was copied into the repository, build output, or commit.
- Confirmed a live smoke request against `https://hackathon.api.qloo.com`: `/search` and `/v2/insights` both returned HTTP 200 with the expected `results` / `results.entities` shape and entity IDs.
- Made `QLOO_BASE_URL=https://hackathon.api.qloo.com` the documented/default backend variable; the legacy `QLOO_API_URL` remains accepted for compatibility.
- Preserved live Qloo whenever a key is present. Added graceful, clearly labelled fixture fallback only for Qloo HTTP 429; authentication, timeout, and schema errors remain explicit.
- Updated the API contract and handoff documentation. No UI or application scope change was made.

### Required actions for PW (do not skip)

1. Push the local commit to `main` (this session intentionally did not push).
2. Verify the GitHub Actions Pages workflow completes and the Pages deployment is healthy at `https://schultzenator.github.io/afterglow-qloo/`. The Pages workflow is intentionally key-free; for live recommendations, deploy the Worker/backend with `QLOO_API_KEY` as a server secret and point the public app to that backend, never to the key.
3. Run one fresh-browser live plan and confirm the badge says **Live Qloo**, result cards say **Qloo result**, and the trace contains successful search/discover calls. If rate limited, confirm the visible warning says curated demo fixtures.
4. Update Devpost submission `#1268254` with the deployed live URL/status and add: “Live Qloo API is in use; the key is server-side and never shipped to the browser.”

### Validation evidence

- `npm test`: 11 tests expected to pass.
- `npm run build`: TypeScript check and Vite production build expected to pass.

## PW completion — 2026-10-29 (afternoon)

1. Pushed the live endpoint commit (8374028) and Actions 'Test and publish demo' run 40858502945 completed success; GitHub Pages healthy (HTTP 200).
2. Fixed a critical live-flow bug the smoke test missed: /v2/insights returns type 'urn:entity' without a category, so normalizeEntity dropped every entity and each live plan failed with 502 'No artist matches'. Commit b7c82c0 'Accept category-less urn:entity types from live insights responses'; 11/11 tests pass after the fix.
3. Verified a full live plan locally with the key server-side: plan 200, picks Michael Kiwanuka / One World Trade Center / Her from live Qloo, 'Live Qloo' badge, three 'Qloo result' cards, trace resolve+discover+discover+discover+compose all ok. Screenshots: live-check-1-home.png, live-check-2-results.png, live-check-3-trace.png.
4. Updated Devpost submission #1268254 (afterglow-kshgyt) description with the 'Live Qloo API update (Oct 29)' section; verified live on the project page.
The local verification backend was stopped after evidence capture; restart with TMPDIR=/tmp npm run server (reads .env, gitignored). Public deploy decision (credentialed backend) is with the owner.
