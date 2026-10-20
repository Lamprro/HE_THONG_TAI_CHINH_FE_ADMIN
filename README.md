# TOKEN BURNER Admin Console

Financial data monitoring and administration with React 19, TypeScript, Vite, TanStack Query and Lucide. Integrates Java Spring Boot only.

- Monitoring: overview, recent ingestion runs, diagnostics, payload metadata and related validation.
- Management: job creation/run/activation workflows, manual ingestion, source add/edit, validation rules and raw/pending validation. Data Scope adds Companies/Securities lists, details, company aliases and reviewed master-data forms.
- Forms include field validation, request review, explicit confirmation, pending/error/server-result states and cache invalidation.

## Development

```sh
npm install
# Copy .env.example to .env and point VITE_API_BASE_URL to Java
npm run dev
npm run typecheck
npm test
npm run build
```

Default Java origin: http://localhost:8080. API errors stay visible; the application does not substitute mock data. No fake login is provided.

## Admin operations

Connect to Java with its dedicated admin bearer token, kept only in memory. Java enforces access; the shared token does not identify an individual human. `VITE_API_BASE_URL` points only to Java and must never contain credentials. Jobs includes inactive definitions and reviewed edit/enable/one-off actions.

Structured data workflows run source → validation → selected-version canonical build, or resume a saved source. Durable commands expose progress, native diagnostics, queued cancellation and reviewed retries. Dedicated AI screens expose forecast preview, NEWS, recovery review/analysis and immutable prompt versions. Admin history, audit, exact data filters and scoped scheduling supplement the native API catalog. Scheduling defaults off. See [October 20 workflow report](docs/ADMIN_FLOWS_20261020.md) for actual evidence and boundaries.

## Tests

npm test uses Node 24 synchronous loader hooks and the installed TypeScript compiler; tests intercept fetch and make no network requests. They cover the write services, Java request serialization, validation and HTTP errors.

For isolated browser checks, build first, then install the browser with `npx playwright install chromium`. Playwright is pinned in devDependencies. `npm run test:ui` runs three suites against dist and intercepts every API request; `PLAYWRIGHT_CHANNEL=chromium` selects bundled Chromium, otherwise installed Chrome is used. Fixtures never enter the production bundle or business database. Native source/API acceptance is recorded separately from these mocked suites.

## Integration limits

Legacy monitoring cards retain recent samples. System summary counts, operations history and the data browser query actual database totals with pagination. Java health alone does not prove provider availability; runtime views separately check the Java→Python adapter, capabilities and data coverage. New scoped scheduling has real heartbeat/sweep evidence; legacy scheduler flags remain configuration-only. Management/subsidiaries/events remain raw-only native operations. This release does not certify training data completeness or point-in-time accuracy.

Documentation: [API matrix](docs/API_INTEGRATION_MATRIX.md), [backend gaps](docs/BACKEND_REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [implementation report](docs/IMPLEMENTATION_REPORT.md), [use-case traceability](docs/USE_CASE_TRACEABILITY.md).
# Admin control update (2026-10-19)

Read [current admin capabilities and verification](docs/ADMIN_CONTROL_20261019.md).
Connect with the backend origin and its dedicated admin token. The token is kept
only in browser memory. New hosting is intentionally not created; the user's
instruction is to merge the FE changes only.
