# API integration matrix

Verified on 2026-10-15 against the existing local checkout at D:/HeThongDataTaiChinh/HE_THONG_DATA_TAI_CHINH_BACKEND_TEST. Its origin is https://github.com/Lamprro/HE_THONG_DATA_TAI_CHINH_BACKEND_TEST.git; local master ref is ec15639bc0160c0a2b9231907ed70aa2116e5e84. Verification reflects local working-tree source, not a guarantee of remote freshness or deployed behavior. The remote page was unavailable during this task.

Source verification included controllers, request/response DTOs (or returned entities), services, AppParams, ExternalOperation, ExternalFetchRequest and PythonExternalFinancialDataAdapter. Java/Python source was not changed.

| Feature | Endpoint | Implemented | Source Verified | Runtime Tested | Notes |
|---|---|---|---|---|---|
| Java health | GET /api/health | Yes | HealthController | Intercepted UI only | Java status/service, not component health |
| Active jobs | GET /api/ingestion-jobs | Yes | IngestionJobController / IngestionJobService / IngestionJobResponse | Intercepted UI only | Active jobs only; local search/dataset/sort/details |
| Create job | POST /api/ingestion-jobs | Yes | Controller / CreateIngestionJobRequest / service | Intercepted serialization only; live execution unverified | 10 retries fixed; timeout defaults to 120 when omitted; JSON object; supported dataset set; Spring cron |
| Run job now | POST /api/ingestion-jobs/{jobId}/run | Yes | Controller / service / IngestionExecutionResponse | Intercepted serialization only; live execution unverified | New execution, not retry of an old run; confirmation and failed-run diagnostics |
| Job activation | PATCH /api/ingestion-jobs/{jobId}/activation | Yes | Controller / UpdateIngestionJobActivationRequest / service | Intercepted serialization only; live execution unverified | Body active:boolean; disabled jobs disappear from active-only list |
| Manual ingestion | POST /api/ingestions/manual | Yes | IngestionController / ManualIngestionRequest / IngestionService / ExternalFetchRequest / adapter | Intercepted serialization only; live execution unverified | Actual ExternalOperation enum; active API source; provider from source; date/symbol/parameter checks |
| Recent runs | GET /api/ingestions?limit=20 | Yes | IngestionController / IngestionReadService / IngestionRunResponse | Intercepted UI only | Loaded sample, no global totals or audit-log claims |
| Run detail | GET /api/ingestions/{runId} | Yes | Same controller / read service / DTO | Intercepted UI only | Direct ID lookup; copy ID; counts, diagnostics and navigation |
| Payload metadata | GET /api/raw-payloads?runId={runId}&includeBody=false | Yes | RawPayloadController / read service / RawPayloadResponse | Intercepted UI only | Body never requested |
| Source list | GET /api/data-sources | Yes | DataSourceController / DataSourceService / DataSourceResponse | Intercepted UI only | Search/filter/sort/details; priority display only |
| Save source | POST /api/data-sources | Yes | Controller / DataSourceRequest / service | Intercepted serialization only; live execution unverified | Upsert; fixed code in edit; existing code rejected in Add; priority/id excluded |
| Validation rules | GET /api/admin/validation/rules | Yes | ValidationAdminController / ValidationRuleCatalogService / ValidationRuleEntity | Intercepted UI only | Read-only catalog and rule details; no seed action |
| Validation results | GET /api/admin/validation/results?limit=50 | Yes | ValidationAdminController / ValidationResultEntity / repository | Intercepted UI only | Severity/result/handling filters and run links; no unsupported target or LLM fields |
| Open issues | GET /api/admin/validation/results/open?limit=50 | Yes | Same controller / entity / repository | Intercepted UI only | Backend status FAIL and handling OPEN |
| Validate raw | POST /api/admin/validation/raw-payloads/{rawPayloadId} | Yes | Controller / ValidationJobService / ValidationExecutionResponse | Intercepted serialization only; live execution unverified | Metadata action; status/counts/version/alreadyProcessed response |
| Validate pending | POST /api/admin/validation/pending?limit={limit} | Yes | Same controller / service / response list | Intercepted serialization only; live execution unverified | Integer 1–100; default 50; confirmation; returned count |
| Data versions | GET /api/admin/validation/data-versions?limit=50 | Yes | ValidationAdminController / DataVersionEntity / repository | Intercepted UI only | Version diagnostics and linked ingestion run; no activation action |

No live Java API execution was tested in this task. In particular, mutation runtime execution was not tested against any database. Test-only fixtures and intercepted fetch responses do not prove deployed integration.

All thirteen implemented write services use TanStack useMutation with retry:false. The current frontend allows execution after explicit confirmation; no role adapter is installed. The workflow shows pending/error/server-confirmed result states, blocks double submits and keeps failed forms open. Settled operations invalidate jobs, sources, runs, run detail, payload metadata, companies, securities, aliases, validation results, open issues and versions because even failed requests can persist a run or consume a retry budget. No mutation runs from polling or effects.

The source response is an upsert result, not evidence that a record was newly created. Execution responses expose runId, rawPayloadId, status, upstreamStatus, contentType, checksumSha256 and duplicateChecksum. ApiErrorResponse can expose runId and upstreamStatus on failures; both are retained. ValidationExecutionResponse exposes rawPayloadId, ingestionRunId, status, passed, failed, skipped, dataVersionId and alreadyProcessed.

Authentication remains a backend gap. The API client accepts a future auth adapter, includes session credentials, handles 401/403, revokes its adapter on 401 and reports unknown outcomes on timeout/network failure. No fake login, browser role store or shared admin token exists.

## Additional scope and lineage contracts

Verified from CompanyController, SecurityController, their request/response DTOs, UpdateActivationRequest, MasterDataService, SecurityJobProvisioningService and AppParams in the same local Java checkout.

| Feature | Endpoint | Implemented | Source Verified | Runtime Tested | Notes |
|---|---|---|---|---|---|
| Company list | GET /api/companies | Yes | CompanyController / MasterDataService / CompanyResponse | Intercepted UI only | Local search/status/industry filters and details; no invented pagination |
| Create company | POST /api/companies | Yes | Controller / CompanyRequest / service | Intercepted serialization; shared form/lock UI | companyCode/legalName required; optional fields and active preserved |
| Update company | PUT /api/companies/{companyId} | Yes | Same controller / request / service | Intercepted serialization only; live execution unverified | Full request includes all editable DTO fields; no partial-update assumptions |
| Company aliases | GET /api/companies/{companyId}/aliases | Yes | Controller / CompanyAliasResponse / service | Intercepted UI only | Fetches on company details, uses actual parent ID |
| Add alias | POST /api/companies/{companyId}/aliases | Yes | Controller / CompanyAliasRequest / service | Intercepted serialization only; live execution unverified | alias + actual aliasType set; no edit/delete API invented |
| Security list | GET /api/securities?activeOnly=false | Yes | SecurityController / MasterDataService / SecurityResponse | Intercepted UI only | Includes inactive securities, unlike the active-only job catalog; filter symbol/exchange/type/status |
| Create security | POST /api/securities | Yes | Controller / SecurityRequest / service / provisioning | Intercepted serialization; shared form/lock UI | Company required; enum classifications; nullable numeric/date fields; job/source side effects warned |
| Update security | PUT /api/securities/{securityId} | Yes | Same controller / request / services | Intercepted serialization only; live execution unverified | Full prefill; job/source provisioning can run; no unrelated response fields sent |
| Security activation | PATCH /api/securities/{securityId}/activation | Yes | Controller / UpdateActivationRequest / services | Intercepted serialization only; live execution unverified | active:boolean; job/source side effects; inactive security discoverable via activeOnly=false |
| Manual job provisioning | POST /api/securities/{securityId}/ingestion-jobs/provision | Intentionally not exposed | SecurityController.JobProvisionResponse / MasterDataService / provisioning | Not executed | Returns securityId/affectedJobCount. Automatic provisioning already occurs during master changes; no page-open calls or dead button |
| Raw metadata by ID | GET /api/raw-payloads/{rawPayloadId}?includeBody=false | Yes | RawPayloadController / IngestionReadService / RawPayloadResponse | Intercepted UI only | Independent metadata drawer; exact rawPayloadId validation join and ingestionRunId version join |

Master queries are in data-scope/api.ts; its six mutation services share the TanStack hook. PUT joins POST/PATCH with no automatic retry. Master changes invalidate companies/securities/aliases/jobs/sources and operational caches after settlement, including failures. Security provisioning first upserts the built-in source configurations and may then synchronize or deactivate deterministic jobs. This is not represented as isolated CRUD.

All additional operations are available after review and confirmation. No live GET, POST, PUT or PATCH was exercised for this extension. Browser fixtures prove frontend behavior only. See [use-case traceability](USE_CASE_TRACEABILITY.md) for the phase-1 business coverage and explicit missing backend capabilities.
