# Creative Pitch frontend

A workspace for creating, reviewing, and tracking content pitches. This new app
implements the frontend foundation: a responsive Mantine shell, real backend
health/readiness checks, and a clearly labeled static Design preview.

Authentication, product pitches, images, reviews, versions, and the pipeline
are not implemented. A development-only writing-canvas experiment evaluates
Mantine + Tiptap with one browser test snapshot. There are no stored product records.

## Stack and runtime

React 19, TypeScript 6, Vite 8, Mantine 9 (core/hooks), Tabler React icons,
React Router 8 in declarative SPA mode, and TanStack Query 5. Tests use Vitest 4,
jsdom 27, React Testing Library, jest-dom, and user-event. ESLint includes React,
TypeScript, and TanStack Query rules; Prettier handles formatting.

Use Node 24 LTS, at least 24.15, with npm 11 or newer. `.nvmrc` and CI select
24.21.0; no version manager is required. Newer dependency-compatible Node versions
can run locally. Direct packages are pinned; npm owns `package-lock.json`.
TypeScript 6 stays within typescript-eslint's supported range. Vitest 4 and
jsdom 27 also support the existing local Node 25 runtime; their newest majors do
not. Node 25 is not the supported project baseline.

## One-time setup

With Node and npm already installed:

```bash
cd /Users/5177394/creative-pitch-frontend
npm ci
cp .env.example .env
```

Do not overwrite an existing `.env` when repeating setup.

## Everyday startup

The backend is a separate process, normally at `http://localhost:7084`.

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

Open `http://localhost:3000`. The script binds to `127.0.0.1` by default, checks
runtime/dependencies/configuration, and fails if the port is occupied. It never
installs packages, kills a port owner, or starts the backend/database. Ctrl-C
stops the frontend process.

Explicit overrides work, for example:

```bash
HOST=127.0.0.1 PORT=3001 ./run.sh
```

If you use a different frontend origin, the separate backend must permit that
origin through CORS. A failed browser connection may mean the backend is stopped
or that its CORS configuration does not allow the frontend origin.

## Environment

The only application variable is public browser configuration:

```dotenv
VITE_BACKEND_URL=http://localhost:7084
```

Vite reads `.env`, `.env.local`, or an explicitly supplied environment variable.
Restart Vite after changing it. Production builds capture its value at build
time. The app requires an absolute HTTP(S) URL, rejects credentials, query
parameters, fragments, whitespace, and backslashes, and removes only one trailing
slash. There is no proxy or alternate API URL policy.

Never put passwords, database credentials, private tokens, or service-role keys
in `VITE_*` variables. No cookies or authentication headers are sent.

## Connection checks

Overview requests `/health`, `/ready`, and `/api/v1/info` when mounted. It displays
checking, API unavailable, API connected/database unavailable, or ready. An
unexpected readiness error is shown as unconfirmed, not a confirmed database
outage. Safe app information is independent of readiness.

Retry refetches all three endpoints. Requests time out after six seconds. There
is no polling, automatic retry, focus refetch, or reconnect loop. A one-minute
stale window avoids unnecessary remount requests. These are point-in-time
checks, not continuous monitoring.

## Quality checks and build

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
bash -n run.sh
```

Use `npm run format` to apply formatting and `npm run test:watch` while developing.
Tests mock fetch; CI needs no backend, database, credentials, or cloud service.
The GitHub Actions workflow mirrors the commands above. Build output goes to
ignored `dist/`. No production hosting is configured.

## Routes and next boundary

`/` renders the temporary FoundationPage; unmatched paths render Page not found.
Overview remains the production navigation item. Development builds also show
Writing Canvas Spike on desktop and in the mobile drawer. The FoundationPage
Design preview buttons demonstrate local interaction and never submit or save data.

Authentication/session transport and product API integration remain separately
scoped work. See [frontend architecture](docs/frontend-architecture.md)
for layer responsibilities and the proposed future boundaries.

## Writing-canvas development spike

This experiment tests document-style writing, structured JSON round trips,
read-only rendering, and editing a detached copy of a saved source. It is not
pitch management or a production editor rollout. Use synthetic sample content,
not confidential pitches. The experience still awaits Vyncent's evaluation.

No backend is needed. With the normal frontend environment configured:

```bash
./run.sh
```

Open `http://localhost:3000/spikes/writing-canvas`. If 3000 is occupied, leave
its process alone and use `PORT=3001 ./run.sh`, then open
`http://localhost:3001/spikes/writing-canvas`. Verification used 3001 because
3000 was occupied. No backend or CORS changes are needed for this route.

Start with **Load sample**, edit the title/body, then **Save test snapshot** →
**Reload test snapshot** → **Read-only preview** → **Clone snapshot to working
copy** → edit the copy. The document starts empty. Loading the synthetic sample
never saves automatically; replacing changed writing asks for confirmation.

| Action                         | Meaning                                                                                                                                  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Save test snapshot             | Saves title and `editor.getJSON()` to one browser key. Replacing different stored content requires confirmation.                         |
| Reload test snapshot           | Reads and validates storage again, then creates a fresh editor with empty undo history. Confirms before discarding changed writing.      |
| Read-only preview              | Shows the saved snapshot while keeping the working editor mounted separately. Text can be selected/copied; safe links open in a new tab. |
| Clone snapshot to working copy | Creates a detached editable copy with empty undo history. Does not save or alter its source; confirms before replacing changed writing.  |
| Inspect saved JSON             | Collapsed, escaped view of the actual stored envelope, not unsaved writing.                                                              |
| Clear working copy             | Confirms before clearing title/body. Leaves the saved snapshot alone.                                                                    |
| Delete test snapshot           | Confirms before removing only this spike's storage key. Keeps the working copy and unrelated storage.                                    |
| Check browser storage          | Reads storage again, including after a controlled local storage change.                                                                  |

Only explicitly saved snapshots survive refresh. After refresh, select **Reload
test snapshot** to restore one. Storage uses
`creative-pitch:writing-canvas-spike:v1`; it belongs to the browser profile and
origin. `localhost:3001`, `localhost:3000`, and `127.0.0.1:3001` have separate
storage. There is no autosave, API persistence, file import, or history database.
Invalid/incompatible stored values are kept until explicitly replaced or deleted.
Storage failures do not produce a success message. Another tab's changes are
checked before replacement/deletion; this is not a collaborative storage system.

The paragraph selector offers H1/H2/H3 and an explicit return to paragraph.
The toolbar supports bold, italic, bullet/numbered lists, add/edit/remove link,
undo and redo. Supported Tiptap keyboard shortcuts remain local to the editor.
Links require complete HTTP(S) addresses. Images, tables, code, blockquotes,
underline, strike, and other excluded structures are not registered. Pasting
unsupported HTML keeps available text and supported marks; image content and
original table layout are lost. Complex external paste sources are not exhaustively
verified.

### Versions and implementation notes

Added `@mantine/tiptap` **9.6.1**, matching core/hooks, and `@tiptap/core`,
`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-link`,
`@tiptap/extension-placeholder` at **3.31.3**. The Link package satisfies
Mantine's peer requirement; core and ProseMirror are directly imported for
schema validation and read-only protection. No existing stack versions changed.
All are exact npm-managed dependencies; no paid extensions or services are used.

StarterKit's Link is disabled for Mantine's Link, excluded extensions are disabled,
and only StarterKit supplies undo history. `shouldRerenderOnTransaction` updates
controls within the writing component. Reload/clone reset its React key instead
of calling `setContent` on every keystroke. A small Mantine link dialog supplies
explicit URL errors and accessible controls. Editor styles load with the lazy
feature after core styles; the shared theme/resolver is unchanged.

Official references: [Mantine integration](https://mantine.dev/x/tiptap/),
[Tiptap 3 migration](https://mantine.dev/guides/tiptap-3-migration/),
[Tiptap React](https://tiptap.dev/docs/editor/getting-started/install/react),
[persistence](https://tiptap.dev/docs/editor/core-concepts/persistence),
[editor instance](https://tiptap.dev/docs/editor/api/editor),
[setContent](https://tiptap.dev/docs/editor/api/commands/content/set-content),
[StarterKit](https://tiptap.dev/docs/editor/extensions/functionality/starterkit),
[Link](https://tiptap.dev/docs/editor/extensions/marks/link), and
[invalid content](https://tiptap.dev/docs/guides/invalid-schema).
[Glean Canvas](https://docs.glean.com/user-guide/assistant/glean-chat/canvas)
informed the document-first direction only; no assets, branding, AI, or proprietary
code were copied.

### Verification and limits

The foundation and spike have 46 passing Vitest tests, including complete
normalized document comparisons, source-byte immutability, storage failures,
confirmations, and route guards. Tests use real Tiptap/ProseMirror. Shared setup
uses jsdom's Storage rather than Node 25's global storage and small font/layout
stubs; paste tests supply a missing event constructor. These do not simulate
visual layout or native selection.

Isolated local Chrome checks at 1440 × 900 and 390 × 844 cover formatting,
selection, paste, links, reload/full refresh, read-only behavior, copying,
cloning, scrolling, responsive navigation, and focus. Editor checks showed no
console warnings, runtime errors, or backend/content requests. Physical mobile
keyboards, touch selection, and virtual-keyboard occlusion are unverified.
Screenshots and temporary verification scripts are in ignored `.verification/`.
No remote CI or hosted deployment ran.

The production preview on temporary port 3002 keeps Overview and not-found
behavior, hides spike navigation, and does not touch the spike storage key.
A literal Vite development guard removes the lazy editor import and its assets
from the production build. The dev route itself does not mount system-status.
