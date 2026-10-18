# Frontend architecture

React → typed Java HTTP client → TanStack Query cache → monitoring and management screens. Java owns PostgreSQL/Redis/Python access. The sole browser API origin is VITE_API_BASE_URL (default http://localhost:8080).

Monitoring navigation contains Overview and Ingestion Runs. Management contains Ingestion Jobs, Data Sources, Data Scope and Data Quality. Data Scope uses two tabs for Companies/Securities, with alias and mutation drawers. App coordinates navigation and detail/action drawers. No empty audit, backend-requirements or unsupported-feature page is provided.

Monitoring queries remain in src/features/dashboard/api/queries.ts; master queries and services live in src/features/data-scope/api.ts. The operation module contains Java DTOs/constants (contracts.ts), pure form validation and serialization (forms.ts), API services/mutation hooks (api.ts), and the reusable form → review → explicit confirmation → result workflow (OperationDrawer.tsx). Components do not construct write endpoints.

src/shared/api/access.ts is an optional integration seam for later authentication. No adapter is installed, so current operations are available without a frontend role check. There is no fake login or stored browser role. If a future adapter is installed, it can supply headers and per-action checks; Java must enforce authorization independently. The active-only jobs API currently makes disabled jobs undiscoverable after reload.

The typed client has 8-second GET and 180-second mutation timeouts, JSON/HTTP/network parsing, safe diagnostic messages, session credentials and 401/403 handling. Mutation outcome may be unknown after connection loss: the client never retries automatically and asks the operator to inspect history. A failed execution may already have created a run; its runId is preserved when Java returns it.

Live queries never fall back to fixtures. Test fixtures live only under tests. Health/runs/open issues/catalog/version polling only performs GET. Raw payload calls explicitly exclude body. Forms send nothing until explicit confirmation. A ref lock plus pending state prevents duplicate form submissions. Invalidation occurs after settled operations, including failures with possible persisted effects.

Run/source/job relationships are resolved only from actual loaded catalogs. A missing active job or sampled run is not treated as nonexistent. Quality navigation filters the loaded result sample by ingestionRunId. Recent runs (20) and quality/version rows (50) are explicitly sampled; they are operational history, not admin audit logs. System health reflects Java responsiveness only.

See API_INTEGRATION_MATRIX.md for source evidence and BACKEND_REQUIREMENTS.md for missing contracts.

The Data Scope forms preserve every supported CompanyRequest/SecurityRequest field during PUT and keep alias creation scoped by company ID. Security create/update/activation warns about automatic job provisioning and source upserts; none is triggered from GET views. A separate provision action is deliberately not exposed. Master values beyond conservative safe decimal serialization are blocked, pending a lossless backend representation contract.

The independent RawPayloadDrawer retrieves metadata with includeBody=false and navigates by rawPayloadId to validation and ingestionRunId to sampled versions. Version details expose checksum, parent/effective timestamps and only open actual loaded parents. No duplicate/revision outcome is inferred from checksum or run status. See USE_CASE_TRACEABILITY.md for relationship evidence and business/API/runtime distinctions.
