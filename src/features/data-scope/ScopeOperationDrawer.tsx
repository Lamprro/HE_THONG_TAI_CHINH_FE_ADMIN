import { useRef, useState } from 'react';
import { Drawer } from '../../shared/components/Ui';
import { mutationBlock } from '../../shared/api/access';
import { safeObject } from '../../shared/utils/format';
import { useAdminMutation } from '../operations/api';
import { scopeApi } from './api';
import { companyFields, securityFields, aliasFields, scopeRequest } from './forms';
import type { Company, Security, CompanyRequest, SecurityRequest, CompanyAliasRequest } from './contracts';

export type ScopeOperation = { kind: 'create-company' } | { kind: 'update-company' | 'add-alias'; company: Company } | { kind: 'create-security' } | { kind: 'update-security' | 'security-activation'; security: Security };
const titles: Record<ScopeOperation['kind'], string> = { 'create-company': 'Add Company', 'update-company': 'Edit Company', 'add-alias': 'Add Alias', 'create-security': 'Add Security', 'update-security': 'Edit Security', 'security-activation': 'Change Security Activation' };
export function ScopeOperationDrawer({ operation, companies, onClose }: { operation: ScopeOperation; companies: Company[]; onClose: () => void }) {
  const isSecurity = ['create-security', 'update-security', 'security-activation'].includes(operation.kind);
  const category = operation.kind === 'add-alias' ? 'alias' : isSecurity ? 'security' : 'company';
  const record = 'security' in operation ? operation.security : 'company' in operation && operation.kind !== 'add-alias' ? operation.company : undefined;
  const fields = category === 'alias' ? aliasFields : category === 'security' ? securityFields : companyFields;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map(field => [field.key, record && field.key in record ? String((record as unknown as Record<string, unknown>)[field.key] ?? '') : ['active', 'primary'].includes(field.key) ? 'true' : ''])));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState(false);
  const [body, setBody] = useState<CompanyRequest | SecurityRequest | CompanyAliasRequest | { active: boolean }>();
  const [result, setResult] = useState<unknown>();
  const busy = useRef(false);
  const mutation = useAdminMutation(async () => {
    switch (operation.kind) {
      case 'create-company': return scopeApi.createCompany(body as CompanyRequest);
      case 'update-company': return scopeApi.updateCompany({ companyId: operation.company.id, body: body as CompanyRequest });
      case 'add-alias': return scopeApi.addAlias({ companyId: operation.company.id, body: body as CompanyAliasRequest });
      case 'create-security': return scopeApi.createSecurity(body as SecurityRequest);
      case 'update-security': return scopeApi.updateSecurity({ securityId: operation.security.id, body: body as SecurityRequest });
      case 'security-activation': return scopeApi.activation({ securityId: operation.security.id, active: !operation.security.active });
    }
  });
  const blocked = mutationBlock(operation.kind);
  const prepare = () => {
    if (operation.kind === 'security-activation') setBody({ active: !operation.security.active });
    else {
      const checked = scopeRequest(category, values, companies); setErrors(checked.errors);
      if (Object.keys(checked.errors).length) return;
      setBody(checked.body);
    }
    setReview(true);
  };
  const execute = async () => {
    if (busy.current || blocked) return;
    busy.current = true;
    try { setResult(await mutation.mutateAsync()); } catch { /* Keep the review and server error visible. */ }
    finally { busy.current = false; }
  };
  const title = titles[operation.kind];
  return <Drawer title={title} onClose={() => { if (!busy.current) onClose(); }}>
    {blocked && <p className="operation-lock">{blocked}</p>}
    {isSecurity && <p className="operation-impact">Saving or changing this security can create, synchronize or deactivate ingestion jobs and update data source configuration. Review the company, symbol and active status before confirming.</p>}
    {'company' in operation && operation.kind === 'add-alias' && <p>Company: {operation.company.legalName} · {operation.company.companyCode} · {operation.company.id}</p>}
    {result !== undefined ? <div role="status"><h3>Server response received</h3><pre>{safeObject(result)}</pre><button className="light-button" onClick={onClose}>Done</button></div> : !review ? <form className="admin-form" noValidate onSubmit={event => { event.preventDefault(); prepare(); }}>
      {operation.kind === 'security-activation' ? <p>{operation.security.symbol} · {operation.security.id}: {operation.security.active ? 'Active → Inactive' : 'Inactive → Active'}</p> : fields.map(field => <div className="form-field" key={field.key}><label htmlFor={`scope-${field.key}`}>{field.label}{field.required ? ' *' : ''}</label>
        {field.key === 'companyId' ? <select id={`scope-${field.key}`} value={values.companyId} onChange={event => setValues({ ...values, companyId: event.target.value })} aria-invalid={!!errors.companyId} aria-describedby="scope-error-companyId"><option value="">Select company…</option>{companies.map(company => <option key={company.id} value={company.id}>{company.companyCode} · {company.legalName}</option>)}</select> : field.options ? <select id={`scope-${field.key}`} value={values[field.key]} onChange={event => setValues({ ...values, [field.key]: event.target.value })} aria-invalid={!!errors[field.key]} aria-describedby={`scope-error-${field.key}`}><option value="" disabled>Select…</option>{field.options.map(value => <option key={value}>{value}</option>)}</select> : field.type === 'textarea' ? <textarea id={`scope-${field.key}`} value={values[field.key]} rows={4} onChange={event => setValues({ ...values, [field.key]: event.target.value })}/> : <input id={`scope-${field.key}`} type={field.type || 'text'} value={values[field.key]} onChange={event => setValues({ ...values, [field.key]: event.target.value })} aria-invalid={!!errors[field.key]} aria-describedby={`scope-error-${field.key}`}/>}
        <small id={`scope-error-${field.key}`} className="field-error">{errors[field.key]}</small>
      </div>)}
      <div className="operation-actions"><button type="button" className="light-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button">Review request</button></div>
    </form> : <div className="confirmation"><h3>Confirm {title}</h3>{'security' in operation && <p>{operation.security.symbol} · {operation.security.id}</p>}{'company' in operation && <p>{operation.company.legalName} · {operation.company.id}</p>}<p>This request changes master data{isSecurity ? ' and can change ingestion jobs and source configuration' : ''}.</p><pre>{safeObject(body)}</pre>{mutation.isError && <p className="field-error" role="alert">{mutation.error.message}</p>}<div className="operation-actions"><button className="light-button" disabled={mutation.isPending} onClick={() => { setReview(false); mutation.reset(); }}>Back</button><button className="primary-button" disabled={!!blocked || mutation.isPending} onClick={execute}>{mutation.isPending ? 'Saving…' : 'Confirm and execute'}</button></div></div>}
  </Drawer>;
}
