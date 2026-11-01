# Frontend Test Suites

Frontend unit, schema, API client, and component tests reside alongside the Next.js application in [`apps/web`](../../apps/web) and are executed with **Vitest**. Cross-application end-to-end (E2E) test suites introduced in later milestones may be placed in this directory.

## Running Frontend Quality Gates & Tests

From `apps/web`:
```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```
