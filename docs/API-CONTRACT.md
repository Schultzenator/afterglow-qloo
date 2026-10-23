# API contract and activation

Reviewed 2026-10-23 against Qloo's [public documentation mirror](https://github.com/qloo/docs-public), specifically [search](https://github.com/qloo/docs-public/blob/main/reference/get-search.md) and [Insights parameter definitions](https://github.com/qloo/docs-public/blob/main/reference/insights-api-deep-dive.md). Mistral loop follows the [official tool-calling quickstart](https://docs.mistral.ai/getting-started/quickstarts/developer/build-an-agent).

This is documentation/contract verification, **not a successful credentialed Qloo test**. Unit tests use representative response fixtures, not recordings from Qloo.

| Purpose | REST request / behavior |
| --- | --- |
| Resolve a favorite | `GET /search?query=<encoded name>&take=5` |
| Recommend a category | `GET /v2/insights?filter.type=urn:entity:<artist/place/movie>&signal.interests.entities=<resolved IDs>&filter.exclude.entities=<seeds + rejects>&feature.explainability=true&take=8` |
| Dining location | `filter.location.query=<city>` and `filter.location.radius=0` (strict locality boundary) |
| Dining budget signal | `filter.price_level.max=1..4`, derived from the suggested dining allocation per person; not a quote or budget guarantee |
| Less mainstream | `filter.popularity.max=0.9`; not a novelty metric |
| Authentication | `X-Api-Key` header, server only |
| Failures | 12s Qloo timeout, explicit upstream status, no live-to-fixture substitution |

Search accepts either a `results` array or `results.entities`; Insights expects `results.entities`. Entity mapping recognizes `entity_id`/`id`, `type`/`types`, tags, description, geocode, numeric affinity and explainability. Unknown entity categories are filtered. If search has several matches, only an exact case/accent-insensitive name is chosen; a non-exact singleton is accepted, while multiple non-exact candidates are reported as ambiguous. A response schema mismatch fails explicitly.

Mistral receives the brief and tool schemas; it never receives the API keys. Each tool result is appended as a tool message, then the next model request continues the loop. At most 8 model turns, 4 calls per response and 65 seconds overall are allowed. `compose_plan` checks all IDs against previously discovered candidates. Browser-local demo data and real Qloo data use one `TasteProvider` interface; their raw upstream payloads are not claimed to be identical.

## Qloo activation checklist

1. PW joins the hackathon and requests API access using the [organizer's instructions](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide#getting-your-api-key).
2. Set `QLOO_API_KEY` in `.env` locally or `wrangler secret put QLOO_API_KEY` on the host. Never paste it into source or a client-side variable.
3. Optionally set `MISTRAL_API_KEY` for natural-language favorite extraction and actual model-directed tool calls. Without it, quote favorite names for the rule planner.
4. Run `npm run build && npm run server`. Confirm `GET /api/health` reports `provider: qloo`.
5. Create a plan using `I love "Khruangbin" and "The Grand Budapest Hotel".` and inspect all three discovery results. Confirm IDs are Qloo IDs, source labels read **Qloo result**, and the venue fits the requested locality. Adjust response mapping if the actual credential tier differs from the documented schema.
6. Swap a result; verify the previous ID is in `filter.exclude.entities` and no seed is recommended back to the user. Inspect per-entity explainability if the API tier returns it.
7. Deploy the same build with server secrets. Confirm public end-to-end access from a fresh browser with no login. Update the Devpost demo URL and `SUBMISSION-KIT.md`.
8. Record the live test date/result in `WORK-STATE.md`. Retain only non-secret evidence. Keep the demo available through November 5, 2026.

## Current scope limits

The UI offers three cities. It does not resolve date-specific events, book anything, or infer dietary/medical restrictions. The prompt is for favorite entities; explicit controls govern practical constraints. Recommendations are cultural candidates, not current inventory. We do not infer demographic attributes. Affinities are not shown as probabilities of liking a result.
