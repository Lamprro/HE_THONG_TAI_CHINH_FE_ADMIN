import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, jsonObject } from '../src/features/operations/forms.ts';
import { adminApi } from '../src/features/operations/api.ts';
import { installAuthIntegration, mutationBlock, sessionExpired } from '../src/shared/api/access.ts';
import { requestJson, ApiError } from '../src/shared/api/client.ts';

const originalFetch = globalThis.fetch;
globalThis.window = globalThis;
afterEach(() => { globalThis.fetch = originalFetch; globalThis.__testEnv = {}; installAuthIntegration(); });
const source = { id: 1, code: 'VN', name: 'Market', provider: 'vnstock', sourceType: 'API', active: true, official: false, licenseStatus: 'FREE', baseUrl: null, priority: 1 };
const values = { dataSourceCode: 'VN', code: 'price', name: 'Prices', datasetType: 'MARKET_PRICE', cronExpression: '0 0 * * * *', parameters: '{}', maxRetries: '10', timeoutSeconds: '', active: 'true' };
const authorize = (inactive = false) => {
  installAuthIntegration({ authorize: () => true, headers: () => ({}), inactiveJobsAccessible: () => inactive, onUnauthorized: () => {} });
};

test('write actions are available before an auth integration is configured', () => {
  for (const action of ['create-job', 'run-job', 'activation', 'manual-ingestion', 'upsert-source', 'validate-raw', 'validate-pending']) assert.equal(mutationBlock(action, true), null);
});
test('a future auth integration can deny actions and session expiry keeps it denied', () => {
  authorize(); assert.equal(mutationBlock('run-job'), null);
  assert.match(mutationBlock('activation', true), /inactive/);
  authorize(true); assert.equal(mutationBlock('activation', true), null);
  sessionExpired(); assert.match(mutationBlock('run-job'), /session/);
});
test('job serialization preserves server defaults and validates retry, JSON, cron and timeout', () => {
  const valid = buildRequest('create-job', values, [source]);
  assert.deepEqual(valid.errors, {});
  assert.equal(valid.body.code, 'PRICE'); assert.equal(valid.body.maxRetries, 10);
  assert.equal('timeoutSeconds' in valid.body, false);
  for (const [key, value] of [['maxRetries', '3'], ['timeoutSeconds', '0'], ['parameters', '[]'], ['datasetType', 'AI'], ['cronExpression', '* * * * *']]) {
    assert.ok(buildRequest('create-job', { ...values, [key]: value }, [source]).errors[key]);
  }
  assert.throws(() => jsonObject('{"apiKey":"secret"}'), /server/);
});
test('source upsert excludes response-only fields and prevents accidental rename or duplicate add', () => {
  const v = { code: 'VN', name: 'Market', sourceType: 'API', baseUrl: '', provider: 'vnstock', official: 'false', licenseStatus: 'FREE', active: 'true' };
  const edit = buildRequest('upsert-source', v, [source], source);
  assert.deepEqual(edit.errors, {}); assert.equal('priority' in edit.body, false); assert.equal('id' in edit.body, false);
  assert.ok(buildRequest('upsert-source', v, [source]).errors.code);
  assert.ok(buildRequest('upsert-source', { ...v, code: 'NEW' }, [source], source).errors.code);
  assert.ok(buildRequest('upsert-source', { ...v, baseUrl: 'https://u:p@example.org' }, [source], source).errors.baseUrl);
});
test('manual ingestion enforces API source, provider, symbol, dates and string parameters', () => {
  const v = { operation: 'OHLCV', dataSourceCode: 'VN', symbol: 'fpt', parameters: '{}', startDate: '2026-01-01', endDate: '2026-01-02' };
  const valid = buildRequest('manual-ingestion', v, [source]); assert.deepEqual(valid.errors, {}); assert.equal(valid.body.symbol, 'FPT');
  assert.ok(buildRequest('manual-ingestion', v, [{ ...source, sourceType: 'WEB' }]).errors.dataSourceCode);
  assert.ok(buildRequest('manual-ingestion', { ...v, symbol: '' }, [source]).errors.symbol);
  assert.ok(buildRequest('manual-ingestion', { ...v, endDate: '2025-01-01' }, [source]).errors.endDate);
  assert.ok(buildRequest('manual-ingestion', { ...v, startDate: '2026-02-30' }, [source]).errors.startDate);
  assert.ok(buildRequest('manual-ingestion', { ...v, parameters: '{"limit":2}' }, [source]).errors.parameters);
  assert.ok(buildRequest('manual-ingestion', { ...v, operation: 'FINANCIAL_STATEMENT' }, [source]).errors.parameters);
});
test('all mutation endpoint methods and bodies serialize against intercepted fetch only', async () => {
  authorize(true); const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, ...init }); return new Response('{}', { status: 200 }); };
  await adminApi.createJob(buildRequest('create-job', values, [source]).body);
  await adminApi.runJob('a/b'); await adminApi.activation({ jobId: 'j', active: false });
  await adminApi.manual({ operation: 'HEALTH' }); await adminApi.upsertSource({ code: 'A' });
  await adminApi.validateRaw('raw'); await adminApi.validatePending(100);
  assert.deepEqual(calls.map(x => [x.method, new URL(x.url).pathname + new URL(x.url).search]), [
    ['POST', '/api/ingestion-jobs'], ['POST', '/api/ingestion-jobs/a%2Fb/run'], ['PATCH', '/api/ingestion-jobs/j/activation'], ['POST', '/api/ingestions/manual'], ['POST', '/api/data-sources'], ['POST', '/api/admin/validation/raw-payloads/raw'], ['POST', '/api/admin/validation/pending?limit=100'],
  ]);
  assert.equal(calls[1].body, undefined); assert.deepEqual(JSON.parse(calls[2].body), { active: false });
  assert.throws(() => adminApi.validatePending(101), /1 to 100/);
});
test('HTTP failure preserves run diagnostics, handles 401/403 and never retries', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response(JSON.stringify({ message: 'Provider failed', runId: '00000000-0000-0000-0000-000000000001', upstreamStatus: 500 }), { status: 502 }); };
  await assert.rejects(() => requestJson('', '/api/test', 'POST'), e => e instanceof ApiError && e.runId.endsWith('1') && e.upstreamStatus === 500);
  assert.equal(calls, 1);
  for (const status of [401, 403]) {
    globalThis.fetch = async () => new Response('{}', { status });
    await assert.rejects(() => requestJson('', '/api/test'), e => e.status === status && /Session|permission/.test(e.message));
  }
});
