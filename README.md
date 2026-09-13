# Creative Pitch frontend

A workspace for creating, reviewing, and tracking content pitches. This new app
implements the frontend foundation: a responsive Mantine shell, real backend
health/readiness checks, and a clearly labeled static Design preview.

Authentication, pitches, the writing editor, images, reviews, versions, and the
pipeline are not implemented. There are no fake users or stored product records.

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

The frontend requests `/health`, `/ready`, and `/api/v1/info` on load. It displays
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
Overview is the only navigation item. The Design preview buttons demonstrate
local interaction and never submit or save data.

Authentication/session transport, an editor spike, and product API integration
must be scoped separately. See [frontend architecture](docs/frontend-architecture.md)
for layer responsibilities and the proposed future boundaries.
