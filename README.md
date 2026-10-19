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

Create, update, activation, manual ingestion and validation actions are available after form review and explicit confirmation. There is currently no frontend role gate or fake login. `VITE_API_BASE_URL` points only to Java. A later authorization design must be enforced by Java; hiding buttons in React cannot secure an API. Disabling a job removes it from the current active-only list, so the existing API cannot rediscover it for re-enabling after reload.

Actual mutation execution against a running Java backend remains unverified. This change does not itself send a write; a user must press Confirm and execute.

## Tests

npm test uses Node 24 synchronous loader hooks and the installed TypeScript compiler; tests intercept fetch and make no network requests. They cover the write services, Java request serialization, validation and HTTP errors.

For isolated browser checks, build first and make Playwright available (npm install --no-save --package-lock=false playwright in a disposable test environment, or set PLAYWRIGHT_MODULE to an existing Playwright module path). npm run test:ui launches headless Chrome, serves dist locally and intercepts every /api request. PLAYWRIGHT_CHANNEL can select another installed channel. No live backend is accessed. Master-data, aliases and raw → validation → version navigation are included. Test fixtures never enter the production source or bundle.

## Integration limits

Jobs lists are active-only. Runs are the latest 20; validation and data versions the latest 50. Search/filter/counts describe those samples. Java health does not prove database, Redis, scheduler or collector health. Operational history does not replace actor-based admin audit logs.

Documentation: [API matrix](docs/API_INTEGRATION_MATRIX.md), [backend gaps](docs/BACKEND_REQUIREMENTS.md), [architecture](docs/ARCHITECTURE.md), [implementation report](docs/IMPLEMENTATION_REPORT.md), [use-case traceability](docs/USE_CASE_TRACEABILITY.md).
# Admin control update (2026-10-19)

Read [current admin capabilities and verification](docs/ADMIN_CONTROL_20261019.md).
Connect with the backend origin and its dedicated admin token. The token is kept
only in browser memory. New hosting is intentionally not created; the user's
instruction is to merge the FE changes only.
