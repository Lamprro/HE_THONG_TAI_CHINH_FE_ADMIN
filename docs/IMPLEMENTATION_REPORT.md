# Implementation report — 2026-10-15

## Update — 2026-10-18

At the user's direction, frontend execution locks and `VITE_ENABLE_ADMIN_MUTATIONS` were removed. All existing create/update/activation/manual-ingestion/validation actions are now available after request review and explicit confirmation. No role adapter is installed; Java authorization remains future work. The production build passed and the updated intercepted unit suite passed 11/11. The 2026-10-15 browser check below reflects the earlier build; the updated browser check was not run because Playwright was unavailable. Current live execution remains unverified.

## A. Features implemented

- Navigation separates Monitoring (Overview, Ingestion Runs) and Management (Ingestion Jobs, Data Sources, Data Quality).
- Existing live Overview and recent execution diagnostics remain; no fixture fallback exists.
- Job catalog retains search, dataset filter, sorting, details and related loaded runs. Added create form, run-now review/confirmation, activation review/confirmation and guarded API services.
- Create job validates required fields, dataset membership, JSON object, fixed retry policy of 10, positive timeout and basic Spring six-field cron structure. The server remains the authority for complete cron syntax. Omitted timeout uses Java's default of 120 seconds.
- Manual ingestion uses the Java operation enum and active API sources. Validates operation/provider compatibility, symbol, date validity/order/range, string-valued JSON parameters and operation-specific required parameters. Provider comes from the selected backend source.
- Data source add/edit uses the real upsert endpoint; edit prefills data and fixes the code. Existing code in Add is rejected locally; concurrent upserts still depend on Java semantics. Priority is display-only. Active-status changes require review and confirmation.
- Data Quality adds a real rules catalog and details, result-status filtering, raw validation from payload metadata, and pending validation with an integer limit of 1–100. Batch results display the returned result count. Existing severity/handling filters, observed/expected values, messages, versions and run links remain.
- Run details navigate to related job/source and matching loaded validation results. Missing sampled records are not declared nonexistent. Failed execution responses retain a run link and upstream HTTP status where returned.
- All operations use form → review → explicit confirmation → server result/error, with pending states and duplicate-submit protection. Failed submissions keep their request available. Successful operations expose the server response and run link when provided.
- TanStack mutation hooks disable retries and invalidate related caches after settlement, including failures with possible persisted effects.
- HTTP client supports future session/header integration, 401 expiry, 403 permission errors and unknown-outcome messaging after timeout/network loss. Public reads retain same-origin credentials until an auth integration is installed. No fake login or client role storage is added.

## B. API integration

The complete **Feature | Endpoint | Implemented | Source Verified | Runtime Tested | Notes** table is in [API_INTEGRATION_MATRIX.md](API_INTEGRATION_MATRIX.md), covering all 16 requested endpoints plus raw payload metadata.

Contracts were read from the existing Java checkout associated with the requested GitHub origin. Local master ref: `ec15639bc0160c0a2b9231907ed70aa2116e5e84`. This is local working-tree verification; remote freshness and deployed API behavior were not established.

## C. Mutation safety

| Operation | Full UI workflow | Typed API service | Current execution |
|---|---|---|---|
| Create job | Yes | Yes | Available; live execution unverified |
| Run job now | Yes | Yes | Available; live execution unverified |
| Change activation | Yes | Yes | Available; inactive jobs cannot be rediscovered from the current list |
| Manual ingestion | Yes | Yes | Available; live execution unverified |
| Upsert source | Yes | Yes | Available; live execution unverified |
| Validate raw payload | Yes | Yes | Available; live execution unverified |
| Validate pending payloads | Yes | Yes | Available; live execution unverified |

No frontend role gate is installed. The user must review and confirm each request before it is sent. Java must enforce authentication and roles if they are added later; frontend controls are not an API security boundary.

The 2026-10-15 unit and browser checks intercepted all API traffic. No POST/PATCH/PUT, seed, ingestion run or batch validation was sent to the shared database during those checks.

**Mutation UI is available. API contracts were verified from local Java source. Mutation runtime execution has not been tested against a database.**

## D. Backend gaps

[BACKEND_REQUIREMENTS.md](BACKEND_REQUIREMENTS.md) now contains BR-001 through BR-008: authentication/RBAC, all/inactive job retrieval, admin audit logs, run filters/pagination, quality resolution, component health, dashboard aggregates/trends and safe operation controls. No speculative endpoint is called. Operational history is not presented as actor-based audit history.

## E. Cleanup

- Removed `src/features/dashboard/data/demo.ts`, including its LLM fixture.
- Removed the demo toggle, demo state, fixture substitutions and demo styling/configuration.
- Removed the LLM diagnostic field and unsupported validation target/round/snapshot fields from frontend display types after checking the actual Java entity.
- Replaced read-only navigation labels and outdated read-only documentation.
- Removed obsolete AI-related backend backlog entries; no AI routes, components, forms or API clients were added.
- No Java or Python file was edited. No commit or push was made. The repository's existing files were already untracked at task start; that state was preserved.

## F. Verification

| Check | Result |
|---|---|
| npm install | Passed |
| npm run typecheck | Passed |
| npm run build | Passed; Vite ignores upstream TanStack `use client` directives |
| npm test | 12/12 passed after the additional scope extension |
| Isolated headless Chrome UI | Passed; zero API writes and no page errors |
| Live Java GET requests | Not tested in this task |
| Live Java mutation execution | Not tested |

The 2026-10-15 unit/browser coverage checked DTO serialization, field validation, source rename/duplicate prevention, HTTP/run diagnostic parsing, review/confirmation, navigation and mobile layout. Current action availability is reflected in the test source. Success/pending/error behavior for writes is implemented, but has not been exercised through a live backend.

The normal sandbox prevented Vite realpath resolution and Chrome loopback access during the 2026-10-15 checks. Build and isolated browser checks passed outside that sandbox.

## G. Additional requirements extension

Existing completed monitoring/management workflows were retained. One additional navigation item, **Data Scope**, contains Companies and Securities tabs rather than separate menus for each master entity.

- Company list supports loaded-data search, active/industry filters, detail fields and related securities. The detail drawer fetches real company aliases. Add/Edit Company and Add Alias use typed Java requests, field validation, request review, explicit confirmation, pending/error/server-result states and duplicate-submit protection.
- Securities are explicitly fetched with activeOnly=false, so both active and inactive rows can be found. Symbol search and active/exchange/type filters are local to the returned records. Details link the actual owning company ID. Add/Edit Security preserves all supported request fields, including nullable dates/numeric values and primary/active. Security activation has its own reviewed workflow.
- Security changes visibly warn that the backend can synchronize/create/deactivate jobs and upsert data sources. MasterDataService invokes provisioning for create/update/activation, and provisioning calls ensureSources even for deactivation. There are no automatic provisioning calls from page open or detail views. A manual Provision Jobs product action is intentionally omitted because the current master workflows already invoke it and no separate repair use case was established.
- Six master write services use the shared TanStack hook; PUT joins POST/PATCH. They are available after review and confirmation. Companies, securities, aliases, jobs and sources are invalidated after settlement along with the existing operational caches.
- Added the verified single-payload metadata GET endpoint with includeBody=false. Run/raw/result/version drawers navigate using actual rawPayloadId/ingestionRunId/parentDataVersionId, with sampled-data limits explicit. Payload validation results and related versions are never inferred from matching timestamps or symbols.
- Validation details now retain raw/run links, existing reviewer/resolution timestamps and resolution notes. Version details show checksum, parent/effective times and links to actual loaded parents. Duplicate checksum is shown only when the execution response supplies duplicateChecksum; raw checksum alone is not called a duplicate or revision decision.
- Job configuration remains distinct from scheduler enabled/healthy/running states. No scheduler switch, promised next execution, audit-log façade or unsupported quarantine/resolution/revision action was added.

| Additional operation | UI and typed service | Execution |
|---|---|---|
| Create / Update company | Implemented | Available |
| Add company alias | Implemented | Available |
| Create / Update security | Implemented, with provisioning/source-impact warning | Available |
| Security activation | Implemented, with provisioning/source-impact warning | Available |

Additional Java source verification covered CompanyController, SecurityController, CompanyRequest/Response, CompanyAliasRequest/Response, SecurityRequest/Response, UpdateActivationRequest, MasterDataService, SecurityJobProvisioningService and their enum sets. The actual CompanyResponse/SecurityResponse omit entity timestamps; the frontend does not invent them. Numeric inputs beyond conservative JS serialization safety are rejected instead of silently rounding a PUT.

The 2026-10-15 extended unit suite passed 12/12. Isolated headless Chrome checks covered existing workflows plus company prefill/aliases, security prefill and activation warnings, and raw → validation → raw → versions → loaded-parent navigation. No page errors or API writes occurred. These checks still do not establish live Java runtime behavior. No Java/Python files were edited; no commit or push was made.

The requested use-case table is in [USE_CASE_TRACEABILITY.md](USE_CASE_TRACEABILITY.md), distinguishing business reference, local Java contract, frontend integration and runtime evidence for UC-A01–A05 and UC-S01. Additional backend gaps BR-009–011 document quarantine, duplicate/revision/restatement and complete lineage retrieval; BR-003/006 now include richer audit/scheduler requirements. All remain in docs, outside product UI.
