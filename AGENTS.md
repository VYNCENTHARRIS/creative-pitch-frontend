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
- Only infrastructure endpoints exist. Never invent authentication or persisted
  product behavior. Label static examples as Design preview.
- Use the shared fetch client and validated VITE_BACKEND_URL. Vite variables
  are public. Send no credentials or auth headers until transport is scoped.
  Preserve structured errors internally; never render raw stack traces or HTML.
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
