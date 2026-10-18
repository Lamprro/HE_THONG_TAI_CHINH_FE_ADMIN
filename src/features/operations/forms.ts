import type { DataSource } from '../dashboard/types/dto';
import { datasetTypes, sourceTypes, licenseStatuses, operations, type CreateIngestionJobRequest, type DataSourceRequest, type ManualIngestionRequest, type ExternalOperation } from './contracts';
export type FormValues = Record<string, string>;
export function jsonObject(value: string, stringsOnly = false): Record<string, unknown> {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error('Enter valid JSON.'); }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Enter a JSON object.');
  if (stringsOnly && Object.values(parsed).some(v => typeof v !== 'string')) throw new Error('All parameter values must be strings.');
  if (/"[^"\n]*(?:secret|password|token|api[_-]?key|authorization|credential)[^"\n]*"\s*:/i.test(value)) throw new Error('Credentials must be configured on the server.');
  return parsed as Record<string, unknown>;
}
export function buildRequest(kind: 'create-job' | 'manual-ingestion' | 'upsert-source', v: FormValues, sources: DataSource[], editing?: DataSource): { body?: CreateIngestionJobRequest | ManualIngestionRequest | DataSourceRequest; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const required = (key: string) => { if (!v[key]?.trim()) errors[key] = 'This field is required.'; return v[key]?.trim() ?? ''; };
  const object = (key: string, strings = false) => { try { return jsonObject(v[key], strings); } catch (e) { errors[key] = (e as Error).message; return {}; } };
  if (kind === 'create-job') {
    const dataSourceCode = required('dataSourceCode'), code = required('code').toUpperCase(), name = required('name');
    if (!sources.some(s => s.code === dataSourceCode)) errors.dataSourceCode = 'Select a loaded data source.';
    if (!datasetTypes.includes(v.datasetType as typeof datasetTypes[number])) errors.datasetType = 'Select a supported dataset type.';
    if (v.maxRetries !== '10') errors.maxRetries = 'The server retry policy requires 10.';
    const timeout = v.timeoutSeconds ? Number(v.timeoutSeconds) : undefined;
    if (timeout !== undefined && (!Number.isInteger(timeout) || timeout <= 0 || timeout > 2147483647)) errors.timeoutSeconds = 'Enter a positive 32-bit integer.';
    const cron = v.cronExpression?.trim();
    if (cron && !/^@(yearly|annually|monthly|weekly|daily|midnight|hourly)$/.test(cron) && (cron.split(/\s+/).length !== 6 || !/^[\dA-Za-z*?,/\s#LWC-]+$/.test(cron))) errors.cronExpression = 'Use Spring six-field cron syntax or a supported @macro. The server validates the full expression.';
    const parameters = object('parameters');
    return { errors, body: { dataSourceCode, code, name, datasetType: v.datasetType as CreateIngestionJobRequest['datasetType'], cronExpression: cron || null, parameters, maxRetries: 10, ...(timeout === undefined ? {} : { timeoutSeconds: timeout }), active: v.active === 'true' } };
  }
  if (kind === 'upsert-source') {
    const code = required('code').toUpperCase(), name = required('name');
    if (editing && code !== editing.code) errors.code = 'Source code cannot be renamed.';
    if (!editing && sources.some(s => s.code.toUpperCase() === code)) errors.code = 'This code already exists. Use Edit Data Source.';
    if (!sourceTypes.includes(v.sourceType as typeof sourceTypes[number])) errors.sourceType = 'Select a supported source type.';
    if (!licenseStatuses.includes(v.licenseStatus as typeof licenseStatuses[number])) errors.licenseStatus = 'Select a supported license status.';
    if (v.baseUrl) { try { const url = new URL(v.baseUrl); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || /token|key|password|secret/i.test(url.search)) throw new Error(); } catch { errors.baseUrl = 'Enter an HTTP(S) URL without credentials.'; } }
    return { errors, body: { code, name, sourceType: v.sourceType as DataSourceRequest['sourceType'], baseUrl: v.baseUrl || null, provider: v.provider || null, official: v.official === 'true', licenseStatus: v.licenseStatus as DataSourceRequest['licenseStatus'], active: v.active === 'true' } };
  }
  const operation = required('operation') as ExternalOperation;
  if (!operations.includes(operation)) errors.operation = 'Select a supported operation.';
  const source = sources.find(s => s.code === v.dataSourceCode && s.active && s.sourceType === 'API');
  if (!source) errors.dataSourceCode = 'Select an active API data source.';
  const provider = source?.provider?.toLowerCase() || '';
  const noProvider = ['HEALTH', 'PROVIDERS', 'NEWS_STATUS', 'NEWS_SITES', 'NEWS_LATEST', 'NEWS_HISTORY', 'NEWS_COMPANY', 'PROXY_PROVIDERS', 'FETCH_URL'];
  if (!noProvider.includes(operation) && !provider) errors.dataSourceCode = 'This operation requires a source with a provider.';
  if (operation.startsWith('INDEX_') && provider !== 'vnstock') errors.dataSourceCode = 'Index operations require provider vnstock.';
  if (['QUOTE', 'OHLCV', 'COMPANY', 'FINANCIAL_STATEMENT', 'RATIO'].includes(operation) && !['vnstock', 'vndirect', 'cafef'].includes(provider)) errors.dataSourceCode = 'Select a vnstock, vndirect or cafef API source.';
  if (operation === 'RATIO' && provider === 'cafef') errors.dataSourceCode = 'CafeF does not support ratios.';
  if (['MANAGEMENT', 'SUBSIDIARIES', 'NEWS', 'EVENTS'].includes(operation) && provider !== 'cafef') errors.dataSourceCode = 'Select a cafef API source for this operation.';
  if (operation === 'RAW_PROXY' && !['vndirect', 'cafef', 'cafef-financial'].includes(provider)) errors.dataSourceCode = 'Select a supported proxy source.';
  if (operation === 'MACRO_OBSERVATIONS' && !['worldbank', 'bis'].includes(provider)) errors.dataSourceCode = 'Select a worldbank or bis API source.';
  const symbol = v.symbol?.trim().toUpperCase();
  if (['QUOTE', 'OHLCV', 'INDEX_OHLCV', 'INDEX_LATEST', 'INDEX_MEMBERS', 'COMPANY', 'FINANCIAL_STATEMENT', 'RATIO', 'MANAGEMENT', 'SUBSIDIARIES', 'NEWS', 'EVENTS', 'NEWS_COMPANY'].includes(operation) && !symbol) errors.symbol = 'Symbol is required for this operation.';
  if (symbol && !/^[A-Z0-9._-]{1,20}$/.test(symbol)) errors.symbol = 'Use 1–20 letters, digits, dot, underscore or hyphen.';
  for (const field of ['startDate', 'endDate']) if (v[field] && (!/^\d{4}-\d{2}-\d{2}$/.test(v[field]) || Number.isNaN(Date.parse(v[field])) || new Date(v[field]).toISOString().slice(0, 10) !== v[field])) errors[field] = 'Enter a valid date.';
  if (v.startDate && v.endDate) {
    if (v.startDate > v.endDate) errors.endDate = 'End date must be on or after start date.';
    const max = new Date(v.startDate); max.setUTCFullYear(max.getUTCFullYear() + (operation === 'MACRO_OBSERVATIONS' ? 20 : 10));
    if (new Date(v.endDate) > max) errors.endDate = 'Date range exceeds the operation limit.';
  }
  const parameters = object('parameters', true) as Record<string, string>;
  for (const [op, key] of [['FINANCIAL_STATEMENT', 'statement'], ['RAW_PROXY', 'upstream_path'], ['FETCH_URL', 'url']] as const) if (operation === op && !parameters[key]?.trim()) errors.parameters = `Include the required string parameter "${key}".`;
  if (operation === 'FINANCIAL_STATEMENT' && parameters.statement && !['balance_sheet', 'income_statement', 'cash_flow'].includes(parameters.statement.trim().toLowerCase().replaceAll('-', '_'))) errors.parameters = 'Statement must be balance_sheet, income_statement or cash_flow.';
  if (operation === 'RAW_PROXY' && parameters.upstream_path && (parameters.upstream_path.startsWith('/') || parameters.upstream_path.includes('..'))) errors.parameters = 'upstream_path must be a safe relative path.';
  return { errors, body: { operation, dataSourceCode: v.dataSourceCode, ...(provider ? { provider } : {}), ...(symbol ? { symbol } : {}), ...(v.startDate ? { startDate: v.startDate } : {}), ...(v.endDate ? { endDate: v.endDate } : {}), ...(v.interval ? { interval: v.interval } : {}), parameters } };
}
