# Creative Pitch frontend

Build the internal Creative Pitch foundation in this repository. The sibling
`leadership-dashboard-app-frontend` is a read-only engineering reference. Never
change its files or branch. The backend is separate and must not be modified
as part of frontend work.

- Use React, strict TypeScript, Vite, Mantine, and Tabler React icons. No emojis
  in code, comments, fixtures, docs, UI, or work reports.
- Keep direct dependency versions exact and let npm generate package-lock.json.
- Pages compose features and shared UI. Features own their API, behavior,
  types, components, and nearby tests. Other layers consume a feature through
  its index. Shared code must be generic, with no future product types.
- Imports flow from app to pages to features to shared. Features must not import
  pages or app. Test helpers may compose the real theme and test providers.
- TanStack Query owns server state. Keep small UI state local. Do not duplicate
  server records in React contexts. No Redux or other store without a separately
  agreed need.
- The backend owns identity, permissions, workflow, versions, review locks,
  scoring, official results, and pipeline advancement. Display its responses;
  do not reconstruct its product rules in the client.
- Supabase Auth owns browser sessions. FastAPI `/api/v1/me` owns application
  identity and role. Concepts use only the four verified FastAPI endpoints;
  Writer and Admin both have owner-only private workspaces. Label static
  examples as Design preview. Do not invent publishing, versions, or reviews.
- The development-only Mantine/Tiptap writing-canvas spike may keep one explicit
  browser test snapshot in its feature. This is disposable experiment storage,
  not product persistence; keep its route and navigation out of production.
- Use the shared fetch client and the three validated public Vite values:
  VITE_BACKEND_URL, VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY. Supabase is
  Auth-only. Product requests use current Bearer tokens only at the trusted
  backend origin, omit cookies, and refuse redirects. Preserve structured
  errors internally; never render raw stack traces or HTML.
- Keep private query keys scoped to identity and session generation. Cancel and
  remove private queries/mutations on account changes. Late responses must not
  repopulate another account. Same-account token refresh preserves the editor.
- First explicit Save Draft creates a Concept; later saves replace its one
  Working Draft. Keep a detached request snapshot and acknowledge only confirmed
  writes. Preserve newer typing, undo history, and unsaved work on failures.
- Validate saved JSON against the actual supported editor schema before editing.
  Never silently strip unknown data and overwrite the stored document. Use
  structural comparisons, UTF-8 byte limits, and backend text normalization.
- One shared navigation guard covers dirty routes and voluntary logout. Retain
  expired-auth writing only in memory for the same verified account. No autosave,
  offline private-draft storage, automatic write retry, or invented concurrency
  protection. Product editor code must not import spike persistence/tooling.
- Use Mantine directly. Keep the theme small, blue/gray, and readable. Reserve
  semantic colors for status. Use text with icons; never color alone.
- Support narrow screens, keyboard use, visible focus, labeled controls, and
  reasonable touch targets. Use semantic buttons, links, and headings.
- Write clear names and short plain-English comments explaining non-obvious
  decisions. Do not narrate ordinary code.
- Keep behavior tests beside the implementation. Shared setup belongs in
  src/test. Each test render gets a fresh QueryClient.
- Run lint, format:check, typecheck, test, and build for meaningful changes.
  Verify run.sh when startup changes. Report actual results and limitations.
- Never commit, push, deploy, change Git branches/configuration, or create cloud
  resources automatically. Do not stop processes owned by the user. Stop only
  temporary processes you started for verification.
- Maintain README.md and docs/frontend-architecture.md. Report findings in chat;
  do not create summary, audit, completion, or research report files.
