import type { Operation } from '../../operations/OperationDrawer';
import { useMemo, useState } from 'react';
import { ArrowDownUp, ArrowUpRight, ChevronRight, Copy, RefreshCw } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DataSource, IngestionJob, IngestionRun, ValidationResult } from '../../dashboard/types/dto';
import { useRunDetail } from '../../dashboard/api/queries';
import { Badge, Drawer, Panel, QueryState } from '../../../shared/components/Ui';
import { dateTime, duration, safeObject, safeText, safeUrl } from '../../../shared/utils/format';

const statuses = ['ALL', 'PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED'];
export const statusTone = (status: string) => status === 'SUCCESS' ? 'green' : status === 'PARTIAL_SUCCESS' ? 'amber' : status === 'FAILED' ? 'red' : status === 'RUNNING' ? 'blue' : 'neutral';

export function RunDrawer({ id, onClose, validation, enabled, onOperation, onJob, onSource, onQuality, onRaw, onIssue }: { id: string | null; onClose: () => void; validation?: ValidationResult[]; enabled?: boolean; onOperation?: (operation: Operation) => void; onJob: (id: string) => void; onSource: (id: number) => void; onQuality: (id: string) => void; onRaw: (id: string) => void; onIssue: (issue: ValidationResult) => void }) {
  const [copied, setCopied] = useState(false);
  const detail = useRunDetail(id, enabled);
  const run = detail.run;
  const payloads = detail.payloads;
  if (!id) return null;
  const related = validation?.filter(item => item.ingestionRunId === id) || [];
  const copy = async () => { try { await navigator.clipboard.writeText(id); setCopied(true); window.setTimeout(() => setCopied(false), 2000); } catch { setCopied(false); } };
  return <Drawer title="Ingestion Run" subtitle={id} onClose={onClose}><button className="light-button" onClick={copy}><Copy size={14}/>{copied ? 'Copied Run ID' : 'Copy Run ID'}</button><QueryState query={run}>{run.data && <>
    <div className="detail-section"><div className="eyebrow">OVERVIEW</div><div className="detail-grid"><div><span>Status</span><Badge tone={statusTone(run.data.status)}>{run.data.status}</Badge></div><div><span>Trigger</span><b>{run.data.triggerType}</b></div><div><span>Job ID</span><b className="break">{run.data.ingestionJobId || '—'}</b></div><div><span>Data Source ID</span><b>{run.data.dataSourceId}</b></div></div></div>
    <div className="operation-actions">{run.data.ingestionJobId && <button className="light-button" onClick={() => onJob(run.data!.ingestionJobId!)}>View related job</button>}<button className="light-button" onClick={() => onSource(run.data!.dataSourceId)}>View data source</button><button className="light-button" onClick={() => onQuality(id)}>View validation results</button></div><div className="detail-section"><div className="eyebrow">EXECUTION</div><p>Started: {dateTime(run.data.startedAt)}</p><p>Finished: {dateTime(run.data.finishedAt)}</p><p>Duration: {duration(run.data.startedAt, run.data.finishedAt)}</p></div>
    <div className="detail-section"><div className="eyebrow">RECORD COUNTS</div><div className="count-grid">{[['Fetched', run.data.fetchedCount], ['Inserted', run.data.insertedCount], ['Updated', run.data.updatedCount], ['Rejected', run.data.rejectedCount], ['Errors', run.data.errorCount]].map(([label, value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div></div>
    <div className="detail-section"><div className="eyebrow">REQUEST / RESPONSE</div><p>Method: {run.data.requestMethod || '—'}</p><p>URL: {safeUrl(run.data.requestUrl)}</p><p>HTTP status: {run.data.responseHttpStatus ?? '—'}</p><p>Content type: {run.data.responseContentType || '—'}</p><pre>{safeObject(run.data.requestQueryParams)}</pre></div>
    <div className="detail-section"><div className="eyebrow">DIAGNOSTICS</div><p>{run.data.errorMessage ? safeText(run.data.errorMessage) : 'No error message returned.'}</p><pre>{safeObject(run.data.metadata)}</pre></div>
    <div className="detail-section"><div className="eyebrow">RAW PAYLOAD METADATA · BODY EXCLUDED</div><QueryState query={payloads} empty="No raw payload metadata returned.">{payloads.data?.map(payload => <div className="mini-record" key={payload.id}><b>{payload.externalKey || payload.id}</b><span>{payload.entityType || '—'} · {payload.sourceSymbol || '—'} · {payload.contentType || '—'}</span><span>Payload ID: {payload.id}</span><button className="light-button" onClick={() => onRaw(payload.id)}>View Raw Payload Metadata</button><span>Checksum: {payload.checksumSha256 || '—'}</span><span>Fetched: {dateTime(payload.fetchedAt)} · Created: {dateTime(payload.createdAt)}</span>{onOperation && <button className="light-button" onClick={() => { onClose(); onOperation({ kind: 'validate-raw', rawId: payload.id }); }}>Run Validation</button>}</div>)}</QueryState></div>
    <div className="detail-section"><div className="eyebrow">RELATED VALIDATION · LOADED RESULTS ONLY</div>{related.length ? related.map(item => <button className="mini-record mini-action" key={item.id} onClick={() => onIssue(item)}><b>{item.ruleCode} · {item.rawPayloadId || '—'}</b><span>{item.status} · {item.handlingStatus} · {dateTime(item.checkedAt)}</span><span>{safeText(item.message)}</span></button>) : <p>No matching ingestionRunId in the loaded validation results. Other results may exist outside this sample.</p>}</div>
  </>}</QueryState></Drawer>;
}

export function RunsPanel({ runs, jobs, sources, onSelect, compact = false, onViewAll }: { runs: UseQueryResult<IngestionRun[]>; jobs?: IngestionJob[]; sources?: DataSource[]; onSelect: (id: string) => void; compact?: boolean; onViewAll?: () => void }) {
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [descending, setDescending] = useState(true);
  const rows = useMemo(() => [...(runs.data || [])].filter(run => {
    const job = jobs?.find(item => item.id === run.ingestionJobId);
    const source = sources?.find(item => item.id === run.dataSourceId);
    return (status === 'ALL' || run.status === status) && `${run.id} ${job?.name || ''} ${job?.code || ''} ${run.ingestionJobId || ''} ${source?.name || ''}`.toLowerCase().includes(search.toLowerCase());
  }).sort((a, b) => (new Date(a.startedAt || a.createdAt).getTime() - new Date(b.startedAt || b.createdAt).getTime()) * (descending ? -1 : 1)), [runs.data, jobs, sources, status, search, descending]);
  const visible = compact ? rows.slice(0, 6) : rows;
  return <Panel eyebrow="EXECUTION LOG" title={compact ? 'Recent ingestion runs' : 'Ingestion Runs'} note={compact ? 'Latest 20 loaded · showing up to 6' : 'Latest 20 loaded · search, sort and filters apply only to these runs'} action={compact ? <button className="text-button" onClick={onViewAll}>View all <ArrowUpRight size={14}/></button> : <button className="text-button" disabled={runs.isFetching} onClick={() => runs.refetch()}><RefreshCw size={14}/>{runs.isFetching ? 'Refreshing…' : 'Refresh'}</button>}>
    {!compact && <div className="toolbar filters"><label>Search <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Job, source or run ID"/></label><label>Status <select value={status} onChange={event => setStatus(event.target.value)}>{statuses.map(value => <option key={value} value={value}>{value === 'ALL' ? 'All loaded statuses' : value}</option>)}</select></label><button className="light-button" onClick={() => setDescending(!descending)}><ArrowDownUp size={14}/> {descending ? 'Newest first' : 'Oldest first'}</button><span className="subtle">{runs.data ? `${rows.length} of ${runs.data.length} loaded` : '—'}</span></div>}
    <QueryState query={runs} empty="No ingestion runs found."><div className="table-scroll"><table><thead><tr><th>Job / Source</th><th>Status</th>{!compact && <th>Trigger</th>}<th>Started</th><th>Duration</th><th>Fetched</th>{!compact && <th>Inserted</th>}<th>Errors</th><th></th></tr></thead><tbody>{visible.map(run => { const job = jobs?.find(item => item.id === run.ingestionJobId); const source = sources?.find(item => item.id === run.dataSourceId); return <tr key={run.id} tabIndex={0} onClick={() => onSelect(run.id)} onKeyDown={event => event.key === 'Enter' && onSelect(run.id)}><td><strong>{job?.name || run.ingestionJobId || 'No job ID'}</strong><small>{source?.name || `Source #${run.dataSourceId}`}</small></td><td><Badge tone={statusTone(run.status)}>{run.status}</Badge></td>{!compact && <td>{run.triggerType}</td>}<td>{dateTime(run.startedAt)}</td><td>{duration(run.startedAt, run.finishedAt)}</td><td>{run.fetchedCount}</td>{!compact && <td>{run.insertedCount}</td>}<td>{run.errorCount}</td><td><ChevronRight size={16}/></td></tr>; })}</tbody></table></div>{rows.length === 0 && <div className="state-empty">No loaded runs match these filters.</div>}</QueryState>
  </Panel>;
}
