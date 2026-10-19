import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve('dist');
const server = createServer(async (req, res) => {
  const path = resolve(root, `.${req.url === '/' ? '/index.html' : req.url.split('?')[0]}`);
  if (!path.startsWith(root + '/') && !path.startsWith(root + '\\')) return res.writeHead(403).end();
  try { res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(path)] || 'application/octet-stream'); res.end(await readFile(path)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const writes = [], errors = []; const token = 'isolated-browser-admin-fixture-at-least-32-characters';
const job = { id: '00000000-0000-0000-0000-000000000001', code: 'MARKET_PRICE_BUILD', name: 'Build canonical prices', datasetType: 'MARKET_PRICE', dataSourceCode: 'VN', dataSourceId: 1, active: false, maxRetries: 10, timeoutSeconds: 120, parameters: {}, createdAt: '2026-10-19T00:00:00Z' };
const commandId = '00000000-0000-0000-0000-000000000002';
let command, polls = 0;
const forecast = { id: 'POST /api/admin/forecasts/preview', method: 'POST', path: '/api/admin/forecasts/preview', operation: 'preview', controller: 'FinancialForecastAdminController', inputs: [{ name: 'body', type: 'object', location: 'body', fields: [{ name: 'securityId', type: 'string', format: 'uuid' }, { name: 'asOfDate', type: 'string', format: 'date' }, { name: 'horizonQuarters', type: 'number' }, { name: 'targets', type: 'array', items: { type: 'string', enum: ['STOCK_PRICE', 'TOTAL_ASSETS'] } }, { name: 'requireMacro', type: 'boolean' }] }] };
page.on('pageerror', e => errors.push(e.message));
await page.route('**/api/**', async route => {
  const request = route.request(), url = new URL(request.url()), path = url.pathname;
  const reply = (body, status = 200) => route.fulfill({ status, json: body, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS' } });
  if (request.method() === 'OPTIONS') return reply({});
  if (path !== '/api/health' && request.headers().authorization !== `Bearer ${token}`) return reply({ message: 'Admin credential required' }, 403);
  if (request.method() !== 'GET') {
    const body = request.postDataJSON(); writes.push({ path, method: request.method(), body });
    if (path === '/api/admin/console/commands') { command = { id: commandId, status: 'QUEUED', ...body }; return reply(command, 202); }
    if (path === '/api/admin/forecasts/preview') return reply({ eligible: false, missing: ['Verified publication dates'], llmCalled: false });
    return reply({ message: 'Unexpected mutation in test' }, 400);
  }
  if (path === '/api/admin/console/session') return reply({ authenticated: true });
  if (path === '/api/health') return reply({ status: 'UP', service: 'Fixture Java' });
  if (path === '/api/ingestion-jobs') { assert.equal(url.searchParams.get('activeOnly'), 'false'); return reply([job]); }
  if (path === '/api/data-sources') return reply([{ id: 1, code: 'VN', name: 'Source', active: true }]);
  if (path === '/api/admin/console/catalog') return reply([forecast]);
  if (path === '/api/admin/console/datasets') return reply([{ name: 'ingestion_runs', available: true, columns: ['id', 'status', 'ingestion_run_id'] }, { name: 'financial_metrics', available: true, columns: ['id', 'value'] }, { name: 'llm_validation_rounds', available: false, columns: [] }]);
  if (path === `/api/admin/console/commands/${commandId}`) { polls++; return reply({ ...command, status: polls > 1 ? 'SUCCEEDED' : 'RUNNING', result_json: { status: 'NO_CHANGE', runId: 'native-run-id' } }); }
  if (path.endsWith('/data/admin_commands')) return reply({ rows: command ? [command] : [], total: command ? 1 : 0 });
  if (path.includes('/data/')) return reply({ rows: [{ id: 'row-1', status: 'FAILED', message: 'Source quota 429', value: '12345678901234567890.125', request_query_params: { symbol: 'FPT', operation: 'OHLCV', provider: 'vndirect' } }], total: 51, page: Number(url.searchParams.get('page')), size: 25 });
  return reply([]);
});
const button = name => page.getByRole('button', { name, exact: true });
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByLabel('Token admin', { exact: true }).fill('wrong-credential-at-least-32-characters'); await button('Kết nối').click();
  await page.getByRole('alert').waitFor(); assert.equal(writes.length, 0);
  await page.getByLabel('Token admin', { exact: true }).fill(token); await button('Kết nối').click();
  await button('Điều hành tác vụ').click(); await page.getByLabel('Job', { exact: true }).selectOption(job.id);
  await page.getByLabel('Lý do vận hành', { exact: true }).fill('Rebuild reviewed prices'); await button('Xem lại yêu cầu').click();
  await button('Xác nhận gửi tác vụ').dblclick(); await page.getByText('SUCCEEDED', { exact: true }).first().waitFor({ timeout: 10000 });
  assert.equal(writes.length, 1); assert.equal(writes[0].body.action, 'RUN_JOB'); assert.equal(writes[0].body.input.jobId, job.id);
  assert.match(writes[0].body.idempotencyKey, /^[a-f\d-]{36}$/); assert.equal(writes[0].body.reason, 'Rebuild reviewed prices');
  await button('Tra cứu dữ liệu').click(); await page.getByText('12345678901234567890.125', { exact: true }).waitFor();
  await page.getByText('FPT', { exact: true }).waitFor(); await page.getByText('OHLCV', { exact: true }).waitFor();
  await button('Trang sau').click(); await page.getByText('51 bản ghi · Trang 2', { exact: true }).waitFor();
  await button('Chi tiết').click(); await page.getByRole('dialog').getByText('Source quota 429', { exact: true }).waitFor(); await button('Close').click();
  await button('Luồng & API quản trị').click(); await page.getByLabel('Chức năng cần thao tác', { exact: true }).selectOption(forecast.id);
  await page.getByLabel('Chứng khoán ID', { exact: true }).fill(job.id); await page.getByLabel('Ngày chốt dữ liệu', { exact: true }).fill('2026-10-16');
  await page.getByLabel('Số quý dự báo (1–8)', { exact: true }).fill('4'); await page.getByLabel('Chỉ tiêu dự báo', { exact: true }).selectOption(['STOCK_PRICE']);
  await page.getByLabel('Yêu cầu dữ liệu vĩ mô', { exact: true }).selectOption('true'); await page.getByLabel('Lý do kiểm tra / vận hành', { exact: true }).fill('Preview only');
  await button('Xem lại thao tác').click(); await button('Xác nhận thực hiện').click();
  await page.getByRole('heading', { name: 'Kết quả từ backend', exact: true }).waitFor();
  await page.getByText('Xem nội dung', { exact: true }).click(); await page.getByText('Verified publication dates', { exact: false }).waitFor();
  assert.equal(writes.length, 2); assert.equal(writes[1].path, '/api/admin/forecasts/preview');
  assert.deepEqual(writes[1].body.targets, ['STOCK_PRICE']); assert.equal(writes[1].body.horizonQuarters, 4); assert.equal(writes[1].body.requireMacro, true);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await button('Ngắt kết nối').click(); await page.getByRole('heading', { name: 'Kết nối quản trị' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('ADMIN UI PASS: denied login, token-only memory, disabled-job command, double-submit guard, polling, exact decimals, pagination, error details, typed forecast preview, mobile and logout. All API responses are intercepted fixtures; no provider/LLM/database writes.');
} finally { await browser.close(); await new Promise(r => server.close(r)); }
