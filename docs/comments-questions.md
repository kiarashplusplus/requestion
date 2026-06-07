# Comments & Questions — Scoping / Design

Status: **proposal / not built.** This scopes adding discussion (comments and
questions) to stickers. It is intentionally a plan, not an implementation —
this is the largest feature on the table and has real identity, moderation, and
App Store implications that need decisions before code.

## 0. Why this is bigger than it looks

Two hard prerequisites the current app does not have:

1. **No user identity.** The app is fully anonymous — there are no accounts and
   no auth anywhere in the client or functions. Comments/questions need at least
   a stable, abuse-controllable identity per author.
2. **The database is wide open.** `firestore.rules` today is:
   ```
   match /{document=**} { allow read, write; }
   ```
   i.e. anyone can read or write **any** document. This is already a security
   problem (cache/sticker tampering) and is a non-starter the moment we store
   user-generated content (UGC). **Locking down these rules is a prerequisite,
   and arguably should ship on its own regardless of this feature.**

## 1. Product shape

The name *Requestion* (request + question) + the local-news direction points at:
each sticker (a news item / fact) can host a lightweight **thread** —

- **Questions**: a user asks something about the story ("is this lane funded?").
- **Comments / answers**: replies on the question or the sticker itself.

One data model covers both: a thread of posts attached to a `stickerId`, where a
post may be a top-level question/comment or a reply (`parentId`).

## 2. Data model (Firestore)

`stickers/{stickerId}/posts/{postId}` (subcollection keeps reads scoped & cheap):

| field | type | notes |
|---|---|---|
| `id` | string | doc id |
| `stickerId` | string | denormalized for collection-group queries |
| `parentId` | string \| null | null = top-level; else the post it replies to |
| `kind` | `"question" \| "comment"` | top-level questions vs comments/answers |
| `authorId` | string | Firebase Auth uid |
| `authorName` | string | display name / generated handle |
| `body` | string | trimmed, length-capped (e.g. ≤ 1000) |
| `createdAt` | timestamp | server timestamp |
| `status` | `"visible" \| "flagged" \| "removed"` | moderation state |
| `replyCount` | number | maintained via trigger |
| `reportCount` | number | auto-hide past a threshold |

`reports/{reportId}`: `{ postId, stickerId, reporterId, reason, createdAt }`.
`users/{uid}`: `{ handle, createdAt, blockedUids: [], strikes }` (for block/mute).

Indexes: composite on `posts` by (`stickerId`, `parentId`, `createdAt`) for
threaded, paginated reads; collection-group index on `posts.authorId` for
"my activity" and moderation.

## 3. Identity — recommended path

- **Firebase Auth, Anonymous sign-in by default** (zero-friction: a uid is
  minted on first launch, no login wall to *read*).
- **Upgrade to Sign in with Apple** required before *posting* — gives a durable
  identity, supports blocking/strikes, and Apple requires Sign in with Apple if
  you offer third-party login. Anonymous accounts can be linked/upgraded in
  place, preserving history.
- Client: `firebase/auth` (or `expo-firebase-*` / `@react-native-firebase`).
  Decide the SDK as part of M0.

## 4. Endpoints (Cloud Functions, 1st-gen, matching existing style)

All writes verify a Firebase ID token (`admin.auth().verifyIdToken`) — never
trust a client-supplied `authorId`.

- `GET  /posts?stickerId=&parentId=&cursor=` → paginated thread (public read).
- `POST /posts` `{ stickerId, parentId?, kind, body }` → create (auth required;
  server sets `authorId`, `createdAt`, `status`).
- `POST /report` `{ postId, reason }` → file a report; increments `reportCount`.
- `POST /block` `{ uid }` → add to caller's `blockedUids`.
- Trigger `onPostCreate` → run the content filter, bump `replyCount`, and
  auto-hide if `reportCount` crosses the threshold.

## 5. Security rules (replaces the open rule)

- `cache`, `stickers`: **read-only** to clients (only Functions/Admin write).
  This closes the current world-writable hole.
- `posts`: public `read` of `status == "visible"`; `create` only if
  `request.auth != null`, `authorId == request.auth.uid`, body length valid, and
  `status == "visible"`; **no client `update`/`delete`** of others' posts
  (author may soft-delete own). All moderation transitions happen via Functions
  (Admin bypasses rules).
- `reports`: `create` only when authed; no client reads.

## 6. Moderation & safety (App Store gate)

Local news threads can get heated/defamatory, and **App Store Guideline 1.2
requires UGC apps to**: filter objectionable content, provide a **report**
mechanism, allow **blocking** abusive users, publish an EULA with a
zero-tolerance policy, and act on reports (remove content + eject user) within
24h. Plan must include:

- Server-side profanity/zero-tolerance filter on create (e.g. a wordlist or a
  moderation API) → set `status` accordingly.
- Report + auto-hide threshold + a minimal admin review surface (even a Firestore
  console query to start).
- Rate limiting / spam control per uid (e.g. N posts / minute via a counter doc
  or App Check).
- **Firebase App Check** to block non-app clients from hitting the endpoints.

## 7. Client UX (StickerDetails)

- Add a **Discussion** section below the sticker on the details screen: a thread
  list (top-level questions, expandable replies) + a composer.
- Reading is open; tapping "Post" triggers Sign in with Apple if not signed in.
- Each post has overflow actions: **Report**, **Block author**, and (own posts)
  **Delete**.
- Live updates via Firestore `onSnapshot` (the app already uses snapshots for
  sticker alternatives), with pagination for long threads.
- Optional later: `expo-notifications` to ping a user when their question gets an
  answer.

## 8. Milestones

- **M0 — Foundations:** lock down `firestore.rules`; add Firebase Auth
  (anonymous + Apple); App Check. *(Ship the rules fix even if the rest slips.)*
- **M1 — Read-only:** data model + `GET /posts` + Discussion UI rendering
  existing threads (seedable).
- **M2 — Posting:** `POST /posts`, auth-gated composer, optimistic + snapshot
  updates.
- **M3 — Moderation:** report/block, content filter, auto-hide, rate limiting,
  EULA — the App-Store-required set.
- **M4 — Notifications & polish:** reply notifications, "my activity", counts.

## 9. Rough effort

M0–M2 (a usable, safe MVP) is the bulk: ~Auth integration + 4 endpoints + rules +
one new client section. M3 is non-optional for shipping UGC to the App Store and
is its own meaningful chunk (moderation is a product, not a checkbox). Net:
substantially larger than the rendering/sharing fixes — recommend building behind
a flag and launching to one locality first.

## 10. Open decisions (need product input)

- Questions-and-answers vs. flat comments vs. both? (model supports both; UX
  cost differs.)
- Real names (Apple) vs. generated handles for display?
- How much moderation to automate vs. manual at launch volume?
- Is discussion per-sticker, or per-underlying-story (dedupe across stickers)?
