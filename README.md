# Creative Pitch frontend

Creative Pitch connects real Supabase email/password sign-in to a private
FastAPI workspace: My Concepts, New Concept, and one mutable Working Draft per
Concept. The approved Mantine + Tiptap canvas supplies the writing experience.
Save Draft keeps work private; it does not submit anything for review.

## Stack and setup

React 19, strict TypeScript 6, Vite 8, Mantine 9.6.1, Tabler icons, React Router
8.3.1, TanStack Query 5, and Tiptap 3.31.3 remain pinned. Supabase JS 2.116.0 is
the only added direct dependency. npm generates the lockfile.

Use Node 24 LTS, at least 24.15, and npm 11 or newer. CI and `.nvmrc` select
24.21.0. Local verification also works with the installed Node 25.2.1 runtime.

```bash
cd /Users/5177394/creative-pitch-frontend
npm ci
```

For a first setup only, copy `.env.example` to `.env`, then provide the approved
public configuration. Do not overwrite an existing `.env`.

```dotenv
VITE_BACKEND_URL=http://localhost:7084
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_public_key
```

All three values are required. They are public browser configuration. Backend
URLs must be absolute HTTP(S) without credentials, query, fragment, whitespace,
or backslashes. Supabase uses an HTTPS project origin and a publishable key.
No database or privileged keys belong in Vite. The ignored local environment is
never committed. Restart Vite after changes; production captures values at build
time.

## Everyday startup

Terminal 1:

```bash
cd /Users/5177394/creative-pitch-backend
./run.sh
```

Terminal 2:

```bash
cd /Users/5177394/creative-pitch-frontend
./run.sh
```

Open `http://localhost:3000/concepts`. A signed-out visitor is sent to the real
login form. Enter existing account credentials privately in the browser. FastAPI
must verify the account's active profile before the private workspace appears.

The launcher checks runtime, dependencies, and required public configuration. It
never installs packages, kills port owners, starts a database, or runs migrations.
If ports are occupied, leave those processes alone. Temporary matching overrides:

```bash
# Backend terminal
PORT=7085 ALLOWED_ORIGINS='["http://localhost:3001","http://localhost:3002"]' ./run.sh

# Frontend terminal
PORT=3001 VITE_BACKEND_URL=http://localhost:7085 ./run.sh
```

The backend must allow the exact browser origin, including hostname and port.
A successful curl request alone does not prove browser CORS.

## Routes and use

- `/`: Overview, with the real workspace/sign-in action and secondary diagnostics.
- `/login`: email/password sign-in and explicit access states.
- `/concepts`: My Concepts, in the backend's ordering.
- `/concepts/new`: an unsaved local editor; opening it creates no record.
- `/concepts/:conceptId`: the owner's current Working Draft.
- Unmatched paths keep the Page not found experience.
- `/spikes/writing-canvas`: development-only experiment.

Enter a title, optional free-text category, and formatted content. The first
explicit Save Draft sends POST, captures the returned ID, and replaces the URL
without replacing the editor. Later saves PUT the same ID. Leave via My Concepts
and use Open draft to reopen current backend data. Blank stored titles display
as Untitled concept without writing that fallback to the database.

Save feedback persists: Not saved yet, Unsaved changes, Saving, Saved, or Save
failed. The last-confirmed time comes from `draft.updated_at` in the browser's
local date/time format. Typing remains enabled during saving. A response confirms
only the detached request snapshot; newer typing stays unsaved and undo history
remains available. A failed list refresh does not reverse a successful save.

A lost create response may mean the Concept was created. Work stays in memory;
check My Concepts in a new tab before a deliberate retry, keeping this working
copy open. Retrying creation warns that it can
produce a duplicate. There is no idempotency key or exactly-once guarantee.

## Identity, privacy, and recovery

Supabase's SDK owns session persistence and refresh in its normal browser storage.
There is no second token store. FastAPI `/api/v1/me` supplies the application UUID,
display name, and Writer/Admin role. Session metadata grants no application role.
The profile UUID must match the current session's user. Both roles access only
their own Concepts through FastAPI; the frontend never calls Supabase tables/RPC.

Protected requests obtain current tokens at request time, omit cookies, refuse
redirects, and use only the configured backend origin. Public health/info requests
remain independent. Owner-scoped query keys include an account generation;
account changes and confirmed local-session logout cancel/remove private caches
and discard the previous editor. Same-account token refresh does not reset it.

Dirty in-app links, Back/Forward, and voluntary logout use one Mantine discard
confirmation. Refresh/tab close use beforeunload only while protection is needed;
browser support and warning wording vary. An in-flight write may finish after
leaving. Discard affects the local working copy, not the stored draft.

A save 401 disables protected actions while retaining the editor in memory.
Reauthentication must verify the same user to resume that buffer. A different
account clears it. Missing/inactive profiles show access denied; backend/service
outages do not become wrong-password errors. Local-session logout is checked,
and failure is reported truthfully. Already-issued JWTs can remain valid until
expiry; backend expiration behavior is unchanged.

No autosave, offline queue, or local/sessionStorage recovery of private documents
exists. Refreshing without a successful save can lose work. There is no backend
revision or conditional-save field: two tabs can overwrite each other's saves.
Publishing, Pitch Versions, reviews, uploads, deletion, shared browsing, and the
pipeline remain unsupported.

## API and document contract

Authenticated routes are `GET /api/v1/me`, `POST /api/v1/concepts`,
`GET /api/v1/concepts/mine`, `GET /api/v1/concepts/{id}`, and
`PUT /api/v1/concepts/{id}/draft`. POST (201) and PUT (200) send only:

```json
{
  "title": "",
  "category": null,
  "written_content": { "type": "doc", "content": [{ "type": "paragraph" }] }
}
```

Detail is `{id, created_at, draft: {title, category, written_content, created_at,
updated_at}}`. List summaries are `{id, title, category, created_at,
draft_updated_at}`; listing does not fetch document bodies.

Titles are trimmed, may be blank, and allow 200 Unicode characters. Categories
are trimmed, optional, and allow 80 characters; blank becomes null. The document
limit is 256 KiB of compact UTF-8 JSON. NUL, invalid Unicode, unsupported data,
and over-limit input produce safe feedback. Backend 401/403/404/422/503 and
malformed responses remain distinct, with raw error details kept out of the UI.

Before loading, the configured editor schema and safe-link policy validate
nested content. Unknown nodes, marks, fields, or attributes cannot be silently
stripped and then saved over the original. An incompatible draft has no enabled
save action. JSONB key reordering does not cause false dirty state.

## Development spike

The spike consumes the Concepts feature's single editor/schema/styles through
its public export. It retains its own synthetic sample, read-only snapshot view,
JSON inspector, clone/reload controls, and isolated storage key:
`creative-pitch:writing-canvas-spike:v1`. No snapshot is imported into an account.

Load sample → Save test snapshot → Reload test snapshot → Read-only preview →
Clone snapshot to working copy remains the experiment sequence. Replacement and
deletion are explicit and confirmed. Clearing a working copy leaves the snapshot;
deleting a snapshot leaves unrelated storage. Use synthetic content only.

Supported formatting remains paragraphs, H1–H3, bold, italic, bullet/ordered lists,
hard breaks, safe HTTP(S) links, and undo/redo. No images or new extensions were
added. Unsupported pasted HTML retains only text and supported formatting.

Production contains the real editor, but excludes the spike route, snapshot
storage/tooling, and sample. `demo.html` remains a read-only visual reference and
is not a production asset.

## Verification

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
bash -n run.sh
git diff --check
```

Tests use fabricated public configuration and mocked Auth/fetch boundaries with
real Tiptap/ProseMirror. CI needs no live backend, credentials, or database.
Automated account-isolation tests do not verify hosted cross-owner authorization.

Browser verification uses isolated Chrome with synthetic network responses at
1440 × 900 and 390 × 844. Screenshots are kept in ignored
`.verification/product-slice/`. Resized desktop checks do not verify physical
phone keyboards, touch selection, or virtual-keyboard occlusion.

Real Supabase login and the hosted create/save/reopen round trip require private
user credential entry. Native Chrome control was unavailable because Computer Use
permissions were not granted. No real acceptance Concept has been created in this
frontend implementation run. No remote CI or deployment is claimed.

Live browser checks against the temporarily launched backend on port 7085 observed
200 for health/info, 503 `database_unavailable` for readiness, and 401 for requests
using an intentionally invalid token. Browser-generated Authorization/Content-Type
preflights for GET, POST, and PUT returned 200. These checks prove CORS and rejection,
not successful application access or persisted writes. Database connectivity was
not investigated or changed as part of this frontend task.

For production preview, build with the intended backend URL before starting:

```bash
VITE_BACKEND_URL=http://localhost:7084 npm run build
npm run preview -- --port 3002
```

Use `http://localhost:3002/concepts`; the backend must allow that origin.
See [frontend architecture](docs/frontend-architecture.md) for ownership and
[Supabase session guidance](https://supabase.com/docs/reference/javascript/auth-getsession),
[local sign-out scope](https://supabase.com/docs/reference/javascript/auth-signout),
[React Router blocking](https://reactrouter.com/how-to/navigation-blocking),
[TanStack cancellation](https://tanstack.com/query/latest/docs/framework/react/guides/query-cancellation),
[Mantine Tiptap](https://mantine.dev/x/tiptap/), and
[Tiptap persistence](https://tiptap.dev/docs/editor/core-concepts/persistence).
