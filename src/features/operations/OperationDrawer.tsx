import { useRef, useState } from 'react';
import type { DataSource, IngestionJob } from '../dashboard/types/dto';
import { Drawer } from '../../shared/components/Ui';
import { mutationBlock } from '../../shared/api/access';
import { ApiError } from '../../shared/api/client';
import { safeObject } from '../../shared/utils/format';
import { adminApi, useAdminMutation } from './api';
import { datasetTypes, sourceTypes, licenseStatuses, operations, type CreateIngestionJobRequest, type ManualIngestionRequest, type DataSourceRequest } from './contracts';
import { buildRequest, type FormValues } from './forms';

export type Operation = { kind: 'create-job' | 'manual-ingestion' | 'validate-pending' } | { kind: 'upsert-source'; source?: DataSource } | { kind: 'run-job' | 'activation'; job: IngestionJob } | { kind: 'validate-raw'; rawId: string };
const titles: Record<Operation['kind'], string> = { 'create-job': 'Create Ingestion Job', 'manual-ingestion': 'New Manual Ingestion', 'upsert-source': 'Save Data Source', 'run-job': 'Run Job Now', activation: 'Change Job Activation', 'validate-raw': 'Run Validation', 'validate-pending': 'Validate Pending Data' };
interface Field { key: string; label: string; options?: readonly string[]; type?: string; required?: boolean; readOnly?: boolean; hint?: string }

export function OperationDrawer({ operation, sources = [], onClose, onRun }: { operation: Operation; sources?: DataSource[]; onClose: () => void; onRun: (id: string) => void }) {
  const source = operation.kind === 'upsert-source' ? operation.source : undefined;
  const [values, setValues] = useState<FormValues>(() => ({ code: source?.code || '', name: source?.name || '', sourceType: source?.sourceType || 'API', baseUrl: source?.baseUrl || '', provider: source?.provider || '', official: String(source?.official ?? false), licenseStatus: source?.licenseStatus || 'UNKNOWN', active: String(source?.active ?? true), dataSourceCode: '', datasetType: '', cronExpression: '', parameters: '{}', maxRetries: '10', timeoutSeconds: '', operation: '', symbol: '', startDate: '', endDate: '', interval: '', limit: '50' }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState(false);
  const [body, setBody] = useState<unknown>();
  const [result, setResult] = useState<unknown>();
  const submitting = useRef(false);
  const mutation = useAdminMutation(async (input: unknown): Promise<unknown> => {
    switch (operation.kind) {
      case 'create-job': return adminApi.createJob(input as CreateIngestionJobRequest);
      case 'manual-ingestion': return adminApi.manual(input as ManualIngestionRequest);
      case 'upsert-source': return adminApi.upsertSource(input as DataSourceRequest);
      case 'run-job': return adminApi.runJob(operation.job.id);
      case 'activation': return adminApi.activation({ jobId: operation.job.id, active: !operation.job.active });
      case 'validate-raw': return adminApi.validateRaw(operation.rawId);
      case 'validate-pending': return adminApi.validatePending(Number(values.limit));
    }
  });
  const deactivating = operation.kind === 'activation' && operation.job.active;
  const blocked = mutationBlock(operation.kind, deactivating);
  const title = source ? 'Edit Data Source' : operation.kind === 'upsert-source' ? 'Add Data Source' : titles[operation.kind];
  const fields: Field[] = operation.kind === 'create-job' ? [
    { key: 'dataSourceCode', label: 'Data Source', options: sources.map(s => s.code), required: true },
    { key: 'code', label: 'Job Code', required: true }, { key: 'name', label: 'Job Name', required: true },
    { key: 'datasetType', label: 'Dataset Type', options: datasetTypes, required: true },
    { key: 'cronExpression', label: 'Cron Expression', hint: 'Spring cron: seconds minutes hours day month weekday, evaluated in UTC. Full syntax is validated by Java.' },
    { key: 'parameters', label: 'Parameters (JSON object)', type: 'json', required: true },
    { key: 'maxRetries', label: 'Max Retries', type: 'number', readOnly: true, hint: 'Fixed at 10 by the Java retry policy.' },
    { key: 'timeoutSeconds', label: 'Timeout Seconds', type: 'number', hint: 'Leave blank for the server default of 120 seconds.' },
    { key: 'active', label: 'Active', options: ['true', 'false'], hint: 'Inactive jobs cannot currently be retrieved from the active jobs list.' },
  ] : operation.kind === 'upsert-source' ? [
    { key: 'code', label: 'Code', required: true, readOnly: !!source }, { key: 'name', label: 'Name', required: true },
    { key: 'sourceType', label: 'Source Type', options: sourceTypes, required: true }, { key: 'baseUrl', label: 'Base URL', type: 'url' },
    { key: 'provider', label: 'Provider', hint: 'Use the provider configured on Java. No credentials.' },
    { key: 'official', label: 'Official', options: ['true', 'false'] }, { key: 'licenseStatus', label: 'License Status', options: licenseStatuses }, { key: 'active', label: 'Active', options: ['true', 'false'] },
  ] : operation.kind === 'manual-ingestion' ? [
    { key: 'operation', label: 'Operation', options: operations, required: true },
    { key: 'dataSourceCode', label: 'Data Source', options: sources.filter(s => s.active && s.sourceType === 'API').map(s => s.code), required: true, hint: 'Only active API sources. Provider is taken from the selected source.' },
    { key: 'symbol', label: 'Symbol' }, { key: 'startDate', label: 'Start Date', type: 'date' }, { key: 'endDate', label: 'End Date', type: 'date' },
    { key: 'interval', label: 'Interval' }, { key: 'parameters', label: 'Additional Parameters (JSON object of strings)', type: 'json', hint: 'Financial statements require "statement"; raw proxy requires "upstream_path"; URL fetch requires "url".' },
  ] : operation.kind === 'validate-pending' ? [{ key: 'limit', label: 'Maximum payloads to process', type: 'number', required: true, hint: 'From 1 to 100. This batch can change multiple records.' }] : [];
  const prepare = () => {
    if (operation.kind === 'create-job' || operation.kind === 'manual-ingestion' || operation.kind === 'upsert-source') {
      const checked = buildRequest(operation.kind, values, sources, source);
      setErrors(checked.errors);
      if (Object.keys(checked.errors).length) return;
      setBody(checked.body);
    } else if (operation.kind === 'validate-pending') {
      if (!Number.isInteger(Number(values.limit)) || Number(values.limit) < 1 || Number(values.limit) > 100) { setErrors({ limit: 'Enter an integer from 1 to 100.' }); return; }
      setBody({ limit: Number(values.limit) });
    } else if (operation.kind === 'activation') setBody({ jobId: operation.job.id, active: !operation.job.active });
    else if (operation.kind === 'run-job') setBody({ jobId: operation.job.id, jobCode: operation.job.code, jobName: operation.job.name, dataSourceCode: operation.job.dataSourceCode });
    else if (operation.kind === 'validate-raw') setBody({ rawPayloadId: operation.rawId });
    setReview(true);
  };
  const execute = async () => {
    if (blocked || submitting.current || mutation.isPending) return;
    submitting.current = true;
    try { setResult(await mutation.mutateAsync(body)); } catch { /* The form stays open and the mutation error is shown. */ }
    finally { submitting.current = false; }
  };
  const response = result && typeof result === 'object' ? result as Record<string, unknown> : undefined;
  const runId = response?.runId || response?.ingestionRunId;
  return <Drawer title={title} onClose={() => { if (!submitting.current) onClose(); }}>
    {result !== undefined ? <div role="status"><h3>Server response received</h3>{operation.kind === 'upsert-source' && <p>Source configuration saved. This endpoint uses upsert semantics.</p>}{Array.isArray(result) && <p>{result.length} validation results returned.</p>}<pre>{safeObject(result)}</pre>{typeof response?.duplicateChecksum === 'boolean' && <p>Duplicate checksum reported by Java: {response.duplicateChecksum ? 'Yes' : 'No'}</p>}{typeof runId === 'string' && <button className="primary-button" onClick={() => { onClose(); onRun(runId); }}>View Run Details</button>}<button className="light-button" onClick={onClose}>Done</button></div> : <>
      {blocked && <p className="operation-lock" role="status">{blocked}</p>}
      {!review ? <form className="admin-form" noValidate onSubmit={e => { e.preventDefault(); prepare(); }}>
        {fields.map(field => <div className="form-field" key={field.key}><label htmlFor={`op-${field.key}`}>{field.label}{field.required && ' *'}</label>
          {field.options ? <select id={`op-${field.key}`} value={values[field.key]} aria-invalid={!!errors[field.key]} aria-describedby={`hint-${field.key}`} onChange={e => setValues({ ...values, [field.key]: e.target.value })}><option value="" disabled>Select…</option>{field.options.map(option => <option key={option}>{option}</option>)}</select> : field.type === 'json' ? <textarea id={`op-${field.key}`} rows={7} spellCheck={false} value={values[field.key]} aria-invalid={!!errors[field.key]} aria-describedby={`hint-${field.key}`} onChange={e => setValues({ ...values, [field.key]: e.target.value })}/> : <input id={`op-${field.key}`} type={field.type || 'text'} readOnly={field.readOnly} value={values[field.key]} aria-invalid={!!errors[field.key]} aria-describedby={`hint-${field.key}`} onChange={e => setValues({ ...values, [field.key]: e.target.value })}/>}
          <small id={`hint-${field.key}`} className={errors[field.key] ? 'field-error' : 'subtle'}>{errors[field.key] || field.hint}</small>
        </div>)}
        <div className="operation-actions"><button type="button" className="light-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Review request</button></div>
      </form> : <div className="confirmation"><h3>Confirm {title}</h3>
        {'job' in operation && <p><strong>{operation.job.name}</strong> · {operation.job.code} · {operation.job.dataSourceCode}</p>}
        {operation.kind === 'run-job' || operation.kind === 'manual-ingestion' ? <p>This operation can call external services, consume resources and write data. It creates a new execution.</p> : operation.kind === 'validate-pending' ? <p>This batch may process up to {values.limit} payloads and update validation results and data versions.</p> : operation.kind === 'activation' ? <p>{deactivating ? 'Disabling removes this job from the active jobs list. The current API cannot list inactive jobs to re-enable them later.' : 'Enabling makes the job eligible for scheduling and resets its retry budget.'}</p> : operation.kind === 'upsert-source' && source && source.active !== (values.active === 'true') ? <p>The source active status will change. This can affect ingestion.</p> : <p>This request writes configuration or validation data.</p>}
        <pre>{safeObject(body)}</pre>
        {mutation.isError && <div className="field-error" role="alert"><p>{mutation.error.message}</p>{mutation.error instanceof ApiError && mutation.error.upstreamStatus != null && <p>Upstream HTTP status: {mutation.error.upstreamStatus}</p>}{mutation.error instanceof ApiError && mutation.error.runId && <button className="light-button" onClick={() => { onClose(); onRun((mutation.error as ApiError).runId!); }}>View failed run</button>}</div>}
        <div className="operation-actions"><button className="light-button" disabled={mutation.isPending} onClick={() => { setReview(false); mutation.reset(); }}>Back</button><button className="primary-button" disabled={!!blocked || mutation.isPending} onClick={execute}>{mutation.isPending ? 'Executing…' : 'Confirm and execute'}</button></div>
      </div>}
    </>}
  </Drawer>;
}
