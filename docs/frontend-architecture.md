# Frontend architecture

## Scope and references

Creative Pitch is a clean frontend application. The Leadership Dashboard is a
read-only engineering reference, not the base app. Its strict TypeScript and
simple formatting/fetch organization informed this foundation. Its MUI theme,
charts, Scorecard models, contexts, navigation, and stored-user authentication
are not carried over. Mantine is the primary UI system for a lighter workspace.

Only the backend infrastructure endpoints exist. FoundationPage and its local
Design preview establish the shell without pretending product APIs exist.
Deployment is not configured.

## Layers and imports

This is feature-based organization inspired by Feature-Sliced Design, not a
claim of full FSD compliance.

- `app`: provider composition, router, theme, shell, and global styles.
- `pages`: compose features and generic UI; avoid domain behavior.
- `features/system-status`: owns infrastructure API contracts, queries,
  presentation, and nearby behavior tests. It is the only current feature.
- `shared/api`: fetch transport and structured errors.
- `shared/config`: early public environment validation.
- `shared/lib`: genuinely generic helpers used by multiple layers.
- `test`: shared setup/render helpers only. Tests live beside behavior.

Imports flow app → pages → features → shared. Pages and app consume features
through their public index. Features do not import app or pages. Shared does not
import higher layers or contain future Pitch/Review/PipelineStage types. Add
shared UI helpers only when they provide real value; use Mantine directly.

## State and routing

One stable QueryClient is created in the application provider. TanStack Query
owns backend state. Small UI state stays local; later browsing filters may use
URL search parameters. There is no Redux or duplicate server-state context.
Each test render creates a fresh QueryClient.

React Router uses declarative BrowserRouter/Routes/Route imports from
`react-router`. This is an ordinary SPA, with no framework/SSR stack.
Current routes are `/` (FoundationPage) and `*` (NotFoundPage).

Proposed future routes, not implemented:

- `/login`: real sign-in after authentication is selected.
- `/pitches`: browse submitted pitches, with future URL-visible filters.
- `/pitches/new`: create a pitch after product APIs exist.
- `/pitches/:id`: detail, with backend-authorized visibility.
- `/admin/reviews`: the authorized review queue.

Future authentication integration owns session transport. Unsaved editor state
belongs to the future editor/form integration. A form strategy is not selected.

## API boundary and connection state

VITE_BACKEND_URL is required public configuration, normally
`http://localhost:7084`. The browser calls it directly, without a Vite proxy.
The backend must allow the frontend origin through CORS. `/health`, `/ready`,
and `/api/v1/info` are the only requests. No credentials or auth headers are sent.

Environment validation rejects invalid HTTP(S) addresses, credentials, query
parameters, fragments, whitespace, and backslashes. Only one trailing slash is
removed; other URL text is preserved. Invalid configuration produces a clear
developer-facing error without echoing the supplied value.

Feature API functions use the shared fetch client. ApiError retains HTTP status,
backend code, and backend message. Non-JSON/network errors get safe summaries.
The client supports caller cancellation and a six-second timeout, including body
reading. Response shapes are validated before they become status data.

Status queries have explicit keys under `system-status`, no automatic retries,
no polling, a one-minute stale window, and no focus/reconnect refetch. Network
mode `always` ensures a manual retry attempts the local API even when the browser
reports no internet connection. Retry refetches all three endpoints.

The UI derives infrastructure presentation from endpoint outcomes:

- Pending health/readiness: checking.
- Failed or invalid health: API unavailable.
- Valid health plus `database_unavailable`: API connected, database unavailable.
- Valid health plus another readiness failure: readiness unconfirmed.
- Valid health and readiness: ready.

Application information is independent: its failure does not claim the database
is down. Display only the expected app name and allowlisted public environment
labels. Never render backend error bodies verbatim; the known database-unavailable
code maps to its safe public message. Unknown errors never reveal paths, stack
traces, credentials, or raw HTML. Query data is a point-in-time check, not a
continuous health monitor.

## Theme, shell, and accessibility

Mantine core CSS, MantineProvider, and the documented PostCSS preset/simple-vars
setup provide the foundation. The shared `cssVariablesResolver` in `app/theme.ts`
sets body, text, muted text, and default control colors through Mantine's supported
API; do not override these scheme variables with competing `:root` rules.
Application and test providers use the same resolver.
Paper, the shell header, and drawer surfaces explicitly stay white instead of
inheriting the page background.
A ten-shade brand palette places `#004990` at
primary shade 7. The interface uses `#F8FAFC` background, white surfaces,
`#0F172A` text, `#64748B` muted text, and `#E2E8F0` borders. Light blue
`#6BA3D6` is a restrained accent; cyan `#0891B2` is reserved for occasional
future emphasis. Green `#2E7D32` belongs to Approved; amber to Needs Work, red
to Rejected, and slate to No image submitted. These are static design examples,
not stored reviews or finalized product tokens. Live ready uses brand blue.

Use system fonts, moderate radii, subtle borders, generous spacing, and minimal
shadows. Tabler React icons support text; no emojis in any project content.

Mantine AppShell provides the fixed top header and main region. Desktop has one
Overview link, not a large sidebar. A labeled mobile control opens a Mantine
Drawer with focus management, Escape dismissal, and a close control. Content
stacks through Mantine responsive props. Preserve visible keyboard focus,
semantic headings/controls, a skip link, readable text, and usable touch targets.
Connection changes are announced through a live status region. Verify desktop
and narrow layouts in a real browser when tooling allows; jsdom is not visual QA.

## Tests and checks

Vitest/jsdom plus React Testing Library, jest-dom, and user-event exercise
observable behavior. Mock fetch directly for controlled connection failures.
Do not create a fake backend server or add MSW for this small foundation.
Tests cover routing, navigation, preview labeling, connection states, retry,
public info, structured errors, cancellation, timeouts, and URL validation.
Avoid assertions about Mantine-generated classes or internal hook calls.

Strict TypeScript, ESLint recommended React/TypeScript/Query rules, Prettier,
tests, and production build run locally and in CI. Exact direct dependencies and
npm's lockfile make installs reproducible. CI selects Node 24 LTS and uses only
a safe fabricated backend URL; no backend service or secrets are required.

## Synchronized product assumptions

The backend business product contract remains the primary source of truth.
These frontend visibility assumptions summarize the confirmed contract; this
document is not a second full business contract. None are implemented yet.

Shared writer views may eventually receive title, the full submitted pitch,
optional image, category, and general status. Other writers must not receive
writer identity, private review comments, detailed scores, or private version
history. Owner/admin private views may receive relevant feedback, detailed
scores, and version history. Visibility must be enforced by backend responses,
not by hiding already-received private fields in the UI.

The backend owns verified identity, roles, authorization, immutable published
versions, Make Live meaning submit for review, review locks with one active
owner, at most one completed official result per published version, optional
visual scoring, red/yellow/green official results, and pipeline advancement.
The working post-approval stages are Writer's Room, Creative Review, VP Pitch,
and Final Creator Pitch. The frontend displays state and sends authorized
actions; it must not recreate workflow/scoring/permissions as a second engine.

## Future editor and integration boundary

Scope an editor spike separately. Start with Mantine's Tiptap integration;
compare BlockNote if needed. Prove rich typing, serialization, save/reload,
read-only rendering, cloning old content into a new draft, and mobile behavior.
The persisted editor format is not selected. No editor, form, Dropzone, auth,
storage, upload, or AI packages are installed. Mantine Dropzone remains a likely
future image-input primitive, not a current implementation. Authentication,
editor work, and product integration each need their own scoped task.
