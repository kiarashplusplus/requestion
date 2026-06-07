# Requestion → Local News: Revival Plan

> Status: **Proposal** · No application code changed yet · Target branch: `claude/local-news-idea-revival-d8LNc`

## 1. The idea, revived

Requestion already is a small news engine wearing a "fact sticker" costume. You
type a topic, and the backend turns fresh news articles into shareable card
images. The revival keeps that machine intact and **narrows the lens to local
news**: instead of returning the world's coverage of a free-text topic, results
are restricted to a curated set of **local-news outlets** for a chosen locality.

Concretely, the search box stays. What changes is *which* sources are allowed to
answer. A search for `school board budget` in *Austin* returns Austin-American
Statesman / KUT / Austin Monitor coverage — not national wire stories.

This is the **"local source filtering"** direction: lowest-risk, no location
permissions, no new infrastructure. It reuses the existing NewsAPI integration
by adding its `sources` / `domains` parameters.

## 2. Where this lands in the current code

The whole change is contained to the news-fetch path; the sticker rendering,
caching, and client carousels are untouched.

| Concern | File / symbol today | Change |
| --- | --- | --- |
| News fetch | `functions/results.js` → `generateNewsResults(query, fresh)` calls `newsapi.v2.everything({ q, language, sortBy, page })` | Add a `locality` argument; pass `domains` (or `sources`) for that locality. |
| Query endpoint | `functions/index.js` → `exports.query` reads `request.query.q` | Also read `request.query.locality` (or `loc`); thread it into `generateNewsResults` and the cache key. |
| Cache | `functions/utils.js` → `getCache/setCache` keyed by `kind + ":" + key` | Cache key becomes locality-scoped, e.g. `query:<locality>:<q>`, so Austin and Boston don't collide. |
| Featured | `functions/index.js` → `exports.featured` (hardcoded World Cup) | Becomes "what's happening near you": top headlines for the locality's sources, no query needed. |
| Localities registry | *(new)* `functions/localities.js` | Maps a locality id → display name + list of NewsAPI source ids / domains. |
| Card source label | `functions/templates/newsArticle.handlebars` → `{{source}}` | Already renders the outlet name; no change needed, just becomes more meaningful. |

### NewsAPI mechanics this relies on

- `newsapi.v2.everything({ q, domains, sources, language, sortBy })` — `domains`
  is a comma-separated host list (e.g. `statesman.com,kut.org`); `sources` is a
  comma-separated NewsAPI source-id list. **You cannot combine `sources` with
  `domains` in the same call** — pick one per locality (domains is more flexible
  for true local outlets, since most local papers are not first-class NewsAPI
  "sources").
- `newsapi.v2.topHeadlines({ sources })` powers the new "near you" featured row.
- `formatNewsAPI()` in `results.js` already keeps only items with
  `urlToImage && title && description` — good, because stickers need an image.
  Local outlets vary in image quality, so expect a lower yield per call; raise
  `maxNewsResponseLength` headroom by over-fetching (see Risks).

## 3. The locality registry

A small, hand-curated config is the heart of "local." Start with 3–5 metros we
can vouch for, each a list of outlet domains.

```js
// functions/localities.js  (illustrative)
module.exports = {
  austin:  { name: "Austin, TX",   domains: ["statesman.com", "kut.org", "austinmonitor.com"] },
  boston:  { name: "Boston, MA",   domains: ["bostonglobe.com", "wbur.org", "universalhub.com"] },
  sf:      { name: "San Francisco, CA", domains: ["sfchronicle.com", "sfstandard.com", "kqed.org"] },
};
```

Why a hand-curated registry rather than auto-detecting local sources:
- NewsAPI has no "give me local outlets near lat/long" capability; the allow-list
  *is* the product's editorial point of view.
- It is trivially reviewable, testable, and explainable.
- It keeps this session's change small and reversible.

A locality id is the only new piece of state the client must hold.

## 4. API shape after the change

```
GET /query?q=<text>&locality=<id>
  → same response envelope { query, sections } as today,
    but news section is restricted to that locality's domains.

GET /featured?locality=<id>
  → top headlines for the locality (no q required); replaces the
    hardcoded World Cup entry.

GET /localities
  → [ { id: "austin", name: "Austin, TX" }, ... ]   (new, tiny)
```

Backward compatibility: if `locality` is omitted, behavior is exactly today's
(global `everything` search), so nothing existing breaks during rollout.

## 5. Client changes (requestion-react-native) — later session

Kept out of scope for the plan-only step, but for completeness the client work is
small and isolated to `App.js`:

1. Fetch `/localities` on mount; store a selected `locality` in state
   (default to the first, or persist last choice via `AsyncStorage`).
2. Add a locality picker in the header (a simple dropdown / segmented control
   next to the existing `SearchBar`).
3. Append `&locality=<id>` to the existing `requestionQuery` and
   `requestionFeatured` fetch URLs.
4. Relabel "Featured Topics" → "Near you"; the carousel rendering is unchanged.

No new native modules, no location permission prompts.

## 6. Risks & mitigations

- **Thin local coverage / low image yield.** Local outlets publish fewer
  image-bearing articles, and `formatNewsAPI` drops imageless ones. *Mitigation:*
  over-fetch (`pageSize` up; we currently take only `maxNewsResponseLength = 4`),
  and fall back to a locality-scoped topic blend before falling back to global.
- **NewsAPI free-tier limits & domain support.** Some local domains return
  little or nothing. *Mitigation:* validate each domain at registry-curation time
  with a one-off script; only ship domains that actually return image articles.
- **Cache key collisions across localities.** *Mitigation:* include locality in
  the cache key (Section 2). Cheap and prevents cross-city bleed.
- **Source quality / trust.** The allow-list is editorial. *Mitigation:* keep the
  registry in version control so changes are reviewed like code.

## 7. Milestones

1. **M0 – Curate** (no code): pick 3 metros, validate domains return
   image-bearing articles against NewsAPI. Output: the `localities.js` content.
2. **M1 – Backend slice**: add `localities.js`, thread `locality` through
   `generateNewsResults` + `exports.query`, locality-scoped cache keys, and the
   `/localities` endpoint. Backward compatible.
3. **M2 – Featured "near you"**: rewrite `exports.featured` to use
   `topHeadlines({ sources/domains })` for the locality.
4. **M3 – Client**: locality picker + URL wiring in `App.js`; relabel featured row.
5. **M4 – Polish**: over-fetch tuning, fallback chain, and a small admin script to
   re-validate registry domains.

## 8. Open questions for the next session

- Which 3–5 localities to launch with first?
- `domains` (any local site) vs. NewsAPI `sources` (curated but sparse for local)
  as the primary mechanism per locality — recommendation: **domains**.
- Is auto-detecting the user's locality (IP/GPS) desired *later*, or do we stay
  with explicit user choice permanently? (`exports.featured` already logs client
  IP, so IP-based defaulting is a low-effort future option.)
