# Admin control update — 2026-10-19

Java source: `Lamprro/HE_THONG_DATA_TAI_CHINH_BACKEND_TEST`, branch `fix/admin`
from main `c0df424`. Python is a separate stateless source API.
The uncommitted Local AI training work in the original Java checkout is excluded.

## Operator surfaces

- Connect to Java with its dedicated admin bearer token. Token stays in memory;
  no browser storage, Vite secret, account-login simulation or verified human identity.
- Jobs includes inactive jobs (`activeOnly=false`), re-enable, edit definition,
  schedule, source, parameters and timeout. A one-off run does not enable cron.
- Long ingestion/validation calls use a durable command ID, idempotency key,
  reason, server polling and history. Retrying the exact submission keeps its key.
- Native API catalog is discovered from the deployed Spring MVC mappings. Forms
  reflect path/query/body fields, enums, booleans, dates and arrays. It covers
  source/master management, builders, validation, metrics, macro/indexes,
  LLM prompts/candidates/preview/execute/results/revalidation, financial forecasts
  and news recovery proposal/review/analysis. It does not imply every provider is up.
- Market-price versions can be built individually through the existing native
  writer, preserving unrelated pending versions. Global builder jobs still sweep
  their configured backlog; inspect scope before running them.
- Data browser pages directly through allowlisted database tables, with server
  search/status/run filters and actual totals. It distinguishes historical rows
  from canonical data. Decimal values remain strings. Nested credentials are redacted.
- Raw body is fetched only when requested; exact raw validation can be read
  independently of the dashboard's old latest-50 sample. Full pagination is in
  the data browser. Times display in Asia/Ho_Chi_Minh.
- Runtime separately checks database, Java→Python adapter, provider registration,
  deployed source contracts and financial/macro coverage. Scheduler enabled flags
  are configuration, not invented heartbeat evidence.

## Result semantics and limits

`SUCCEEDED` means a native invocation returned. Its result may still be
`COMPLETED_WITH_REJECTIONS`, `NO_CHANGE`, or another domain status. Inspect the
validation and final data version. `ACTIVE` is validated; `ACTIVATED` is built.
`UNKNOWN` after a lost worker lease requires reviewing original runs before an
explicit acknowledgement unlocks the resource. No automatic business replay.

Running provider/AI calls cannot be safely interrupted by the current services;
the dashboard does not pretend that disabling cron cancels an in-flight run.
Existing raw validation is idempotent; it does not erase prior audits to force PASS.
Re-fetch uses the saved source request and creates a new ingestion run. Internal
builder replays require reviewing the current job definition.

Dedicated AI screens are represented by native contract forms rather than
separate custom editors for every endpoint. Future Local AI APIs appear only when
their controller is deployed; this change does not deploy unfinished Local AI code.

## Verification

Unit fetch/form serialization uses intercepted transport. Two browser suites
cover legacy operations and confirmed asynchronous commands, denied login,
inactive jobs, double-submit protection, polling, pagination, exact decimal text,
typed forecast preview, mobile layout and logout. All browser fixture suites
intercept every API; they never write fake business data or invoke LLMs.

Java acceptance separately exercises the real FPT historical source request,
validation and selected-version native build, plus database reads. See Java's
`docs/ADMIN_CONTROL_20261019.md` for evidence and deployment details.

On 2026-10-19 the user explicitly requested **merge FE code only**, without
creating a new hosting project. A Vite production build can be served locally
with `npm run preview -- --host 127.0.0.1 --port 5173`. Never put the admin token
in a `VITE_*` variable. Enter it in the connection screen.
