# Backend requirements

Developer backlog only. These capabilities are not implemented or advertised as endpoints in the product. The browser integrates Java Spring Boot only.

| ID | Priority | Capability | Acceptance criteria |
|---|---|---|---|
| BR-001 | P0 | Admin Authentication & RBAC | Define login/logout, session or JWT lifecycle, current-user permissions, expiry/refresh, CSRF and CORS policies. Enforce permissions on every mutation in Java. No shared secret in React or VITE variables. Publish a browser-safe contract and verify unauthorized/forbidden responses. |
| BR-002 | P0 | List All Ingestion Jobs | Support all/active/inactive retrieval and a job-by-ID lookup. Publish actual routes before FE integration. A disabled job must be discoverable and re-enabled after reload and from another browser. Current GET lists active jobs only. |
| BR-003 | P1 | Admin Audit Logs | Persist actor, action, target/entity, old/new values, IP, user agent, timestamp, result and request/correlation ID on Java. Support authorized search/pagination. Ingestion runs and validation history do not establish who changed configuration. |
| BR-004 | P1 | Ingestion Runs Filtering & Pagination | Add documented job/source/status/trigger/date filters, stable sorting, pagination and totals. Current FE searches only the latest 20 loaded runs. |
| BR-005 | P2 | Data Quality Resolution | If required, add authorized resolve with resolution note and immutable history. Define transitions and permissions. No resolve, approve/reject, delete or version-activation action is currently implemented in FE. |
| BR-006 | P1 | System Component Health | Java reports actual PostgreSQL, Redis, scheduler and Python collector probes or heartbeats, with check time and errors. Scheduler diagnostics must distinguish enabled configuration, heartbeat, last sweep, actual running executions and last recorded run; publish concurrency/queue state and authoritative schedule diagnostics where available. Current /api/health proves Java responsiveness only. Browser must not call Python. |
| BR-007 | P1 | Dashboard Summary & Run Trends | Publish server aggregate counts, time ranges, timezone and trend buckets. Distinguish snapshot vs period totals and cover records beyond recent samples. |
| BR-008 | P0 | Safe Admin Operation Controls | Enforce backend operation permissions when roles are introduced, duplicate-request controls, concurrency limits, audit trail and retry rules. Establish endpoint timeouts and unknown-outcome recovery. Frontend confirmation is not an API security boundary. |

Operations are currently available through the frontend after review and confirmation. No auth adapter is installed, and no frontend role is claimed. Java authentication and permissions remain a future backend requirement. Disabling a job is available, but the active-only list cannot show that job after reload; BR-002 addresses this gap. Nothing in this backlog is rendered as a placeholder panel or inactive feature page.

Operation/provider constraints are checked from the current Java adapter. A future capability catalog would remove the need to synchronize these constants when Java changes; no such API is invented here.

## Additional business gaps

| ID | Priority | Capability | Acceptance criteria |
|---|---|---|---|
| BR-009 | P2 | Quarantine Management | Publish authorized queries for quarantined records and record details, including source/raw/run/validation relations, actual status and reason. Define Resolve/Reject/Reprocess transitions, reviewer, required resolution note, timestamps and immutable action history. A table/entity alone is not proof of an API. Revalidation is not reprocessing or resolving an issue. No routes are assumed by FE. |
| BR-010 | P2 | Duplicate / Revision / Restatement | Separate exact duplicate evidence from revised/restated reports, rejected records and accepted version state. Publish duplicate groups, comparison/history and parent/revision relationships. Any merge/delete/official-version selection/restore/report-replacement operation needs an explicit authorized workflow, concurrency controls, impact review and audit. FE currently displays only actual checksum/duplicateChecksum and returned version fields. |
| BR-011 | P2 | Full Data Lineage Retrieval | Support documented lookup/filter/pagination for validation by rawPayloadId/ingestionRunId and versions by ingestionRunId, plus version-by-ID and parent retrieval. Return authoritative relationship IDs and timestamps. Current sampled results/versions cannot prove absence or completion. Do not infer a direct raw→version relation when only the run relation exists. |

Company/security DTOs do not return createdAt/updatedAt despite entity timestamps; add those to response contracts if master-change timestamps are required. Establish lossless BigDecimal JSON representation for master numeric values; current FE blocks numbers beyond its conservative safe serialization range instead of silently rounding them on update. Keep these business validation/representation decisions explicit in the backend contract.

Security create/update/activation can provision jobs and upsert sources. Document transaction failure semantics, symbol-renaming effects on prior deterministic job codes, and operator permissions for these combined effects when roles are introduced. No manual provision button is exposed in the current product because master changes already invoke the workflow.
