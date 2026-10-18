import { aliasTypes, exchanges, securityTypes, type Company, type CompanyRequest, type CompanyAliasRequest, type SecurityRequest } from './contracts';
export interface ScopeField { key: string; label: string; required?: boolean; type?: string; options?: readonly string[] }
export const companyFields: ScopeField[] = [
  { key: 'companyCode', label: 'Company Code', required: true }, { key: 'legalName', label: 'Legal Name', required: true },
  ...[['taxCode', 'Tax Code'], ['shortName', 'Short Name'], ['englishName', 'English Name'], ['industryCode', 'Industry Code'], ['industryName', 'Industry Name'], ['sectorName', 'Sector Name'], ['website', 'Website'], ['headquarters', 'Headquarters'], ['listingStatus', 'Listing Status']].map(([key, label]) => ({ key, label })),
  { key: 'foundedDate', label: 'Founded Date', type: 'date' }, { key: 'description', label: 'Description', type: 'textarea' }, { key: 'active', label: 'Active', options: ['true', 'false'] },
];
export const securityFields: ScopeField[] = [
  { key: 'companyId', label: 'Company', required: true }, { key: 'symbol', label: 'Symbol', required: true },
  { key: 'exchange', label: 'Exchange', options: exchanges, required: true }, { key: 'securityType', label: 'Security Type', options: securityTypes, required: true },
  { key: 'isin', label: 'ISIN' }, { key: 'currency', label: 'Currency', required: true },
  { key: 'listedDate', label: 'Listed Date', type: 'date' }, { key: 'delistedDate', label: 'Delisted Date', type: 'date' },
  { key: 'sharesOutstanding', label: 'Shares Outstanding', type: 'text' }, { key: 'parValue', label: 'Par Value', type: 'text' },
  { key: 'primary', label: 'Primary', options: ['true', 'false'] }, { key: 'active', label: 'Active', options: ['true', 'false'] },
];
export const aliasFields: ScopeField[] = [{ key: 'alias', label: 'Alias', required: true }, { key: 'aliasType', label: 'Alias Type', options: aliasTypes, required: true }];
export function scopeRequest(kind: 'company' | 'security' | 'alias', values: Record<string, string>, companies: Company[] = []) {
  const errors: Record<string, string> = {};
  const fields = kind === 'company' ? companyFields : kind === 'security' ? securityFields : aliasFields;
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.key]?.trim() ?? '';
    if (field.required && !value) errors[field.key] = 'This field is required.';
    if (field.options && !field.options.includes(value)) errors[field.key] = 'Select a supported value.';
    if (field.type === 'date' && value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) errors[field.key] = 'Enter a valid date.';
    body[field.key] = ['active', 'primary'].includes(field.key) ? value === 'true' : value || null;
  }
  if (kind === 'company') {
    body.companyCode = values.companyCode?.trim().toUpperCase() ?? '';
    if (values.website?.trim()) { try { const url = new URL(values.website); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(); } catch { errors.website = 'Enter an HTTP(S) URL without credentials.'; } }
  }
  if (kind === 'security') {
    if (!companies.some(c => c.id === values.companyId)) errors.companyId = 'Select a loaded company.';
    body.symbol = values.symbol?.trim().toUpperCase() ?? '';
    body.currency = values.currency?.trim().toUpperCase() ?? '';
    if (values.currency && !/^[A-Z]{3}$/.test(String(body.currency))) errors.currency = 'Use a three-letter currency code.';
    for (const key of ['sharesOutstanding', 'parValue']) {
      const value = values[key]?.trim(); const number = Number(value);
      if (value && (!/^-?\d+(\.\d+)?$/.test(value) || !Number.isFinite(number) || Math.abs(number) > Number.MAX_SAFE_INTEGER || value.replace(/[^\d]/g, '').replace(/^0+/, '').length > 15)) errors[key] = 'Enter a decimal with at most 15 significant digits within the safe numeric range.';
      body[key] = value ? number : null;
    }
  }
  if (kind === 'alias') body.aliasType = values.aliasType;
  return { errors, body: body as unknown as CompanyRequest | SecurityRequest | CompanyAliasRequest };
}
