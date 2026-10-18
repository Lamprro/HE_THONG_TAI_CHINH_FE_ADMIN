import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { scopeApi } from '../src/features/data-scope/api.ts';
import { scopeRequest, companyFields, securityFields } from '../src/features/data-scope/forms.ts';
import { installAuthIntegration } from '../src/shared/api/access.ts';
const originalFetch = globalThis.fetch; globalThis.window = globalThis;
afterEach(() => { globalThis.fetch = originalFetch; globalThis.__testEnv = {}; installAuthIntegration(); });
const company = { id: 'company-1', companyCode: 'ACME', legalName: 'Acme Company', taxCode: '123', shortName: null, englishName: 'Acme', industryCode: 'IT', industryName: 'Technology', sectorName: 'Services', website: 'https://example.org', headquarters: 'Hanoi', foundedDate: '2000-01-01', listingStatus: 'LISTED', description: 'Company description', active: true };
const values = Object.fromEntries(Object.entries(company).map(([key, value]) => [key, value == null ? '' : String(value)]));
test('company full update preserves nullable fields and excludes response-only fields', () => {
  const result = scopeRequest('company', values);
  assert.deepEqual(result.errors, {}); const { id, ...expected } = company;
  assert.deepEqual(result.body, expected); assert.equal('id' in result.body, false);
  assert.equal(companyFields.length, Object.keys(expected).length);
  assert.ok(scopeRequest('company', { ...values, legalName: '' }).errors.legalName);
  assert.ok(scopeRequest('company', { ...values, foundedDate: '2026-02-30' }).errors.foundedDate);
});
test('security classification, owner, decimal safety and booleans are checked and serialized', () => {
  const v = { companyId: company.id, symbol: 'fpt', exchange: 'HOSE', securityType: 'STOCK', isin: '', currency: 'vnd', listedDate: '', delistedDate: '', sharesOutstanding: '1500000', parValue: '10000.5', primary: 'false', active: 'false' };
  const valid = scopeRequest('security', v, [company]); assert.deepEqual(valid.errors, {});
  assert.equal(valid.body.symbol, 'FPT'); assert.equal(valid.body.currency, 'VND'); assert.equal(valid.body.primary, false); assert.equal(valid.body.active, false); assert.equal(valid.body.parValue, 10000.5); assert.equal(valid.body.isin, null);
  assert.equal(securityFields.length, Object.keys(valid.body).length);
  for (const [key, value] of [['companyId', 'unknown'], ['exchange', 'INVALID'], ['securityType', 'INVALID'], ['currency', 'VIETNAM'], ['sharesOutstanding', '9007199254740993'], ['parValue', 'NaN']]) assert.ok(scopeRequest('security', { ...v, [key]: value }, [company]).errors[key]);
});
test('aliases use actual catalog and require alias text', () => {
  assert.deepEqual(scopeRequest('alias', { alias: 'Former Name', aliasType: 'FORMER_NAME' }).body, { alias: 'Former Name', aliasType: 'FORMER_NAME' });
  assert.ok(scopeRequest('alias', { alias: '', aliasType: 'FAKE' }).errors.alias);
  assert.ok(scopeRequest('alias', { alias: 'Name', aliasType: 'FAKE' }).errors.aliasType);
});
test('master endpoint serialization uses only supported bodies and no automatic provision call', async () => {
  installAuthIntegration({ authorize: () => true, headers: () => ({}), inactiveJobsAccessible: () => false, onUnauthorized: () => {} });
  const calls = []; globalThis.fetch = async (url, init) => { calls.push({ path: new URL(url).pathname, method: init.method, body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); };
  const body = scopeRequest('company', values).body;
  await scopeApi.createCompany(body); await scopeApi.updateCompany({ companyId: 'a/b', body });
  await scopeApi.addAlias({ companyId: 'c', body: { alias: 'Acme', aliasType: 'SHORT_NAME' } });
  await scopeApi.createSecurity({ symbol: 'FPT' }); await scopeApi.updateSecurity({ securityId: 's', body: { symbol: 'FPT' } }); await scopeApi.activation({ securityId: 's', active: false });
  assert.deepEqual(calls.map(c => [c.method, c.path]), [['POST', '/api/companies'], ['PUT', '/api/companies/a%2Fb'], ['POST', '/api/companies/c/aliases'], ['POST', '/api/securities'], ['PUT', '/api/securities/s'], ['PATCH', '/api/securities/s/activation']]);
  assert.deepEqual(calls[5].body, { active: false }); assert.deepEqual(calls[1].body, body);
});
