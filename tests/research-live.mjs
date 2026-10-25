/** Real Chrome -> localhost Java -> stored DB. Requires read-only DB and disabled workers. No model calls. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.ADMIN_API_BASE || 'http://127.0.0.1:8094';
const token = process.env.ADMIN_API_TOKEN;
assert.ok(token?.length >= 32, 'ADMIN_API_TOKEN required');
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname), 'This acceptance only targets localhost');
async function get(path, authenticated = true) {
  const response = await fetch(base + path, { headers: authenticated ? { Authorization: `Bearer ${token}` } : {}, redirect: 'error' });
  return { status: response.status, body: await response.json() };
}
assert.equal((await get('/api/admin/console/datasets', false)).status, 403);
const runtime = await get('/api/admin/console/runtime');
assert.equal(runtime.status, 200);
assert.equal(runtime.body.adminWorkers.commandsEnabled, false);
assert.equal(runtime.body.adminWorkers.scheduleEnabled, false);
const catalog = (await get('/api/admin/console/datasets')).body;
const names = ['local_ai_packages', 'local_ai_package_inputs', 'local_ai_package_runs', 'local_ai_package_predictions', 'financial_disclosure_documents'];
for (const name of names) assert.equal(catalog.find(d => d.name === name)?.available, true, name);
const inputs = await get('/api/admin/console/data/local_ai_package_inputs?size=1&ticker=FPT');
assert.equal(inputs.status, 200); assert.ok(inputs.body.rows.length);
const input = inputs.body.rows[0];
assert.equal(input.ticker, 'FPT'); assert.equal('input_payload' in input, false);
const root = resolve('dist');
const server = createServer(async (req, res) => {
  const path = resolve(root, '.' + (req.url === '/' ? '/index.html' : req.url.split('?')[0]));
  if (!path.startsWith(root + sep)) return res.writeHead(403).end();
  try { res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[extname(path)] || 'application/octet-stream'); res.end(await readFile(path)); }
  catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(5173, '127.0.0.1', r));
let browser;
const errors = [], requests = [], failures = [];
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().startsWith(base)) requests.push({ path: new URL(request.url()).pathname, method: request.method() }); });
  page.on('response', response => { if (response.url().startsWith(base) && response.status() >= 400) failures.push({ path: new URL(response.url()).pathname, status: response.status() }); });
  const button = name => page.getByRole('button', { name, exact: true });
  await page.goto('http://127.0.0.1:5173');
  await page.getByLabel('Địa chỉ backend').fill(base); await page.getByLabel('Token admin', { exact: true }).fill(token);
  await button('Kết nối').click(); await button('Tra cứu dữ liệu').click();
  await page.getByLabel('Bảng dữ liệu').selectOption('local_ai_package_inputs');
  await page.getByText('Lọc chính xác nguồn gốc / ID', { exact: true }).click();
  await page.getByLabel('ticker', { exact: true }).fill('FPT');
  await page.getByLabel('model_id', { exact: true }).fill(input.model_id);
  await button('Áp dụng bộ lọc').click();
  await page.getByText('1 bản ghi · Trang 1', { exact: true }).waitFor();
  await page.locator('td').getByText('FPT', { exact: true }).waitFor();
  await button('Chi tiết').click();
  assert.equal(await page.getByRole('dialog').getByText('input payload', { exact: true }).count(), 0);
  await button('Close').click();
  await page.getByLabel('ticker', { exact: true }).fill('ZZMISSING');
  // Draft input must not silently replace the applied filter or result set.
  assert.match(await page.locator('[aria-live="polite"]').textContent(), /ticker: FPT/);
  await button('Áp dụng bộ lọc').click(); await page.getByText('0 bản ghi · Trang 1', { exact: true }).waitFor();
  await button('Xóa bộ lọc').click(); await button('Trang sau').waitFor();
  await button('Trang sau').click(); await page.getByText(/bản ghi · Trang 2$/).waitFor();
  for (const table of ['local_ai_package_runs', 'local_ai_package_predictions', 'financial_disclosure_documents']) {
    await page.getByLabel('Bảng dữ liệu').selectOption(table);
    await page.getByText(/bản ghi · Trang 1$/).waitFor();
    await button('Chi tiết').first().click(); await page.getByRole('dialog').waitFor(); await button('Close').click();
  }
  if (process.env.ADMIN_SCREENSHOT) await page.screenshot({ path: process.env.ADMIN_SCREENSHOT, fullPage: true });
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0);
  await button('Ngắt kết nối').click(); await page.getByRole('heading', { name: 'Kết nối quản trị' }).waitFor();
  assert.deepEqual(errors, []); assert.deepEqual(failures, []);
  assert.ok(requests.every(r => ['GET', 'OPTIONS'].includes(r.method)));
  console.log(JSON.stringify({ status: 'PASS', requests: requests.length, datasets: names.length, filteredTicker: input.ticker, writes: 0, modelCalls: 0 }));
} finally { await browser?.close(); await new Promise(r => server.close(r)); }
