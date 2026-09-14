# Frontend architecture

## Implemented scope and authority

Creative Pitch implements Supabase sign-in, backend-confirmed application access,
My Concepts, and one private Working Draft per Concept. A Concept is the long-lived
container; a Working Draft is its mutable unpublished document. Repeated saves
never create a Pitch Version or display a version counter.

The backend [product contract](../../creative-pitch-backend/docs/product-contract.md)
and actual schemas/routes remain authoritative. Writer and Admin both have
owner-only private workspace access. Backend ownership checks, profile status,
roles, and future workflow rules are not reconstructed in the client.
The Leadership Dashboard repository and `demo.html` are read-only references.

## Layers

- `app`: stable providers, React Router data router, access boundary, shell, theme,
  account menu, and global styles.
- `pages`: compose Overview, LoginPage, MyConceptsPage, and ConceptEditorPage.
- `features/auth`: SDK session integration, current-user query, safe login/access
  states, return-route validation, and public exports.
- `features/concepts`: API shapes, query keys, list presentation, working buffer,
  save behavior, document validation, and the production editor.
- `features/writing-canvas-spike`: dev-only sample, snapshot storage, read-only
  snapshot presentation, JSON inspector, and experiment controls.
- `features/system-status`: independent infrastructure requests and presentation.
- `shared`: generic HTTP/errors, public configuration, structural JSON helpers,
  and the generic navigation confirmation.
- `test`: shared providers and fabricated Auth fixtures. Behavior tests stay
  beside their implementation; each render creates a fresh QueryClient.

Imports flow app → pages → features → shared. Features expose their public index
to other layers. Cross-feature dependencies are one-way: spike → Concepts → Auth.
Auth imports neither Concepts nor the app. Shared transport accepts a small
request-access interface and never imports an Auth React hook.

## Session and application access

One lazy, stable Supabase browser client uses supported SDK persistence and token
refresh. Only Auth is used; there are no Supabase table/RPC/Data API operations.
No second token storage or private-document recovery storage exists.

`SessionController` publishes an external session snapshot consumed with
useSyncExternalStore. Its auth callback only updates session state synchronously.
Queries and cache cleanup run outside that callback. Subscription cleanup handles
StrictMode; a later auth event wins over an older initial getSession result.
An account epoch changes on identity replacement or confirmed explicit logout,
but does not change for same-account refresh events.

`AuthProvider` owns the current-user query, not a copied profile record. The SDK
session permits requesting `GET /api/v1/me`; only a valid response with the same
UUID permits entering private routes. The backend supplies display name and
Writer/Admin role. Client metadata supplies neither role nor access.

Explicit access states are checking session, signed out, checking application
access, authenticated, access denied, unavailable, and reauthentication required.
Temporary Auth/backend outages are separate from bad credentials and missing or
inactive profiles. Safe invalid-credential feedback does not enumerate accounts.

The login form validates email shape and nonempty password, leaves password text
unaltered, blocks duplicate submissions, and uses email/current-password
autocomplete. There are no account creation or recovery workflows. Recovery login
uses the same account; deliberate account switching requires confirmed sign-out.

Logout passes `scope: 'local'`, checks the SDK session afterward, and reports
failures. It does not clear unrelated browser storage or claim immediate JWT
revocation. An already-issued token can remain valid until backend expiry.

## HTTP and cache isolation

The three required public configuration values are VITE_BACKEND_URL,
VITE_SUPABASE_URL, and VITE_SUPABASE_PUBLISHABLE_KEY. Validation never echoes
rejected values. The launcher checks presence through Vite's environment loader
without sourcing shell text. Production values are baked into the bundle.

The generic fetch client supports GET, POST JSON, and PUT JSON. It obtains the
current bearer token immediately before each protected request. Fixed relative
paths are restricted to the configured backend; redirects are refused, cookies
are omitted, and HTTP caching is disabled. Caller cancellation and the six-second
timeout cover fetch/body reading. Supabase HTTP requests have a twelve-second
per-request bound through the SDK's supported custom fetch option.

ApiError preserves status, backend code, and internal message. Product UI uses
safe status/code mappings; it does not render arbitrary backend messages, raw
HTML, SQL, or stack traces. Feature API functions validate response shapes.

Private query keys are:

- `['current-user', userId, epoch]`
- `['concepts', userId, 'mine', epoch]`
- `['concepts', userId, 'detail', conceptId, epoch]`

No token appears in a key. Query metadata marks private records and their owner/
epoch. Session loss, account replacement, and confirmed logout cancel and remove
applicable private queries and mutation-cache entries. The shared request access
object checks the captured identity/epoch before sending and after reading.
Editor callbacks also check identity and mount lifetime before applying results.
A late account-A result cannot populate account B. No previous-user placeholder
data or persisted Query cache is used.

Queries own fetched records; the editor owns only its working copy. Current
documents request fresh data on reopening and disable focus/reconnect refetch.
An initialized editor does not absorb query refreshes. Mutations have no retries,
no offline queue, and networkMode always, so a write is not silently replayed
when connectivity returns. Summary invalidation is independent of write success.

## Backend contract

`GET /api/v1/me` returns `{id, email, display_name, role}`.
The Concept endpoints are exactly:

| Method and route                | Response                           |
| ------------------------------- | ---------------------------------- |
| POST /api/v1/concepts           | 201 Concept detail                 |
| GET /api/v1/concepts/mine       | 200 summary array, server ordering |
| GET /api/v1/concepts/{id}       | 200 owned Concept detail           |
| PUT /api/v1/concepts/{id}/draft | 200 replaced Working Draft detail  |

POST and PUT send the complete `{title, category, written_content}` representation.
No ownership, role, timestamps, status, version, or snapshot-envelope fields are
sent. Detail contains `id`, `created_at`, and `draft` with editable fields plus
`created_at`/`updated_at`. Summary contains `id`, `title`, `category`,
`created_at`, and `draft_updated_at`. Lists do not request each body or re-sort.

Title is trimmed and permits blank text up to 200 Unicode code points. Optional
category is trimmed to null when blank, with an 80-character maximum. Text
normalization matches Python str.strip, including differences from JavaScript
trim. Documents have a type=doc object root, optional content array, and a
256 KiB compact UTF-8 JSON limit. NUL and unpaired surrogates are rejected safely.
An empty document remains a valid incomplete draft.

401 requires reauthentication; 403 denies application access; 404 means Concept
unavailable without ownership speculation; 422 reports validation failure; 503
and network failures report unavailable service. Malformed success responses do
not manufacture empty records. No revision field, stale-save 409, or conditional
write endpoint exists.

## Working buffer and navigation

`DraftBuffer` holds the working fields, last-confirmed baseline, Concept ID,
server timestamp, validation/save error, and in-flight state. Opening New Concept
only initializes memory. The first explicit Save Draft captures a detached,
normalized request and sends POST. A synchronous guard prevents overlapping
writes, including duplicate clicks. The response is checked against the sent
representation before acknowledgement.

On success the baseline and server cache advance. The current writing does not
get replaced; newer typing and undo history survive. First-save navigation uses
replacement history and preserves the original editor entry key. Subsequent saves
PUT that returned ID. Reopening a different route creates a fresh editor.

Feedback is persistent: Not saved yet, Unsaved changes, Saving, Saved, Save failed.
The last-confirmed timestamp is separate. Failed writes retain all working fields.
An ambiguous POST failure explains possible creation and opens My Concepts in a
new tab so the working copy stays available;
another POST requires a duplicate-risk confirmation. There is no exactly-once
guarantee and no attempt to infer identity by matching titles.

One generic NavigationGuard wraps the data-router shell. The active editor
registers its dirty/in-flight check. useBlocker covers links and Back/Forward;
the same Mantine confirmation handles voluntary logout. First-save URL replacement
has one exact internal exception. A beforeunload listener is mounted only while
needed. Keep editing preserves the route/buffer; Leave without saving discards
the memory copy. A request already received by the backend may still commit.

RequireAccess retains only an already-admitted editor at the same location and
identity epoch during auth loss. A 401 disables saving and offers inline
reauthentication without a redirect that destroys writing. The same verified user
can recover the in-memory buffer. Explicit logout or identity replacement unmounts
it; no other account receives it. New private pages remain protected during
restoration, profile checks, and recovery.

This protects one tab's unsaved work. It is not optimistic concurrency:
two tabs may overwrite the same Working Draft. No autosave, private local storage,
offline recovery, publishing, version history, uploads, deletion, review, or
pipeline implementation is included.

## Editor, styling, and production

The Concepts editor owns the extracted extension configuration, safe-link dialog,
writing component, and document CSS. The spike consumes these through public
exports and keeps its snapshot envelope/key/controls isolated. Its read-only
snapshot renderer remains dev-only because the product does not need it.

Supported structures remain paragraph, H1–H3, bold, italic, bullet/ordered lists,
hard breaks, and safe HTTP(S) links with protected new-tab attributes. StarterKit
provides the only undo history. Unknown JSON fields/attributes are rejected before
ProseMirror nodeFromJSON/check; schema loading cannot silently discard opaque
backend content. Empty roots receive a blank paragraph for editing, with equivalent
dirty comparison. Structural comparison ignores JSONB property order.
Incompatible stored content stays untouched and cannot be saved by this editor.

There is one prominent editable title, an optional free-text category, and the
existing toolbar/document. Tiptap is not reset by save feedback or query updates.
Product Save Draft is separate from formatting. The product action bar stays
below the fixed shell header; the product toolbar is static to avoid overlapping
sticky layers. The spike retains its original desktop sticky toolbar.

Mantine, system fonts, the small blue/gray theme, deep-blue headings, pale
surroundings, white paper, and soft depth follow the approved reference. The
document retains its comfortable line length and responsive wrapping toolbar.
Status has text; controls have labels and visible keyboard focus.

React Router uses createBrowserRouter/RouterProvider only for SPA navigation
blocking. No loaders, SSR, or framework mode were added. Production supports
Overview, login, Concepts, editor, and not-found routes. The literal Vite DEV
guard removes the lazy spike route and its storage/tooling/sample. The production
editor is now expected in the bundle. demo.html is excluded from build input.

## Verification boundary

Run the commands in README: lint, format:check, typecheck, test, build, bash syntax,
and git diff --check. Vitest uses fabricated configuration, mocked Auth/network
boundaries, and real Tiptap integration. Each app render has a fresh QueryClient.
Tests cover save races, schema safety, identity isolation, access failures,
navigation, and recovery. They do not prove hosted ownership enforcement.

Isolated Chrome tests cover desktop/narrow rendering and synthetic end-to-end
flows. Screenshots live in ignored .verification/product-slice. Physical phone
keyboards and touch selection are unverified. Native Chrome control reported
missing Computer Use permission, so real Supabase login and hosted Concept
acceptance await private user credential entry. Backend files, schema, users,
profiles, and the reference repositories remain outside this frontend change.

The temporary live backend returned readiness 503 `database_unavailable`.
Health/info returned 200; intentionally invalid-token GET/POST/PUT requests were
rejected with 401 after successful browser-generated 200 CORS preflights.
No real Concept was created, and hosted connectivity was not changed or investigated.
