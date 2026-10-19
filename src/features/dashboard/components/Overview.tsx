import { Activity, ArrowUpRight, Clock3, Database, Server, ShieldAlert } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DataSource, IngestionJob, IngestionRun, JavaHealth, ValidationResult } from '../types/dto';
import { Badge, Panel } from '../../../shared/components/Ui';
import { dateTime } from '../../../shared/utils/format';
import { RunsPanel } from '../../ingestion/components/Runs';
import { IssuesPreview } from '../../data-quality/components/QualityPage';

type HealthObservation = { data: JavaHealth; latencyMs: number; checkedAt: string };
function value<T>(query: UseQueryResult<T[]>, calculate: (rows: T[]) => number): number | string {
  if (query.data) return calculate(query.data);
  if (query.isError) return 'Error';
  return '—';
}
function Metric({ label, value: numberOrText, scope, icon }: { label: string; value: number | string; scope: string; icon: React.ReactNode }) {
  return <div className="metric"><div className="metric-icon">{icon}</div><strong className={numberOrText === 'Error' ? 'metric-error' : ''}>{numberOrText}</strong><span>{label}</span><small>{scope}</small></div>;
}
const statuses = ['SUCCESS', 'PARTIAL_SUCCESS', 'FAILED', 'RUNNING', 'PENDING', 'CANCELLED'] as const;
export function StatusChart({ runs }: { runs: UseQueryResult<IngestionRun[]> }) {
  const counts = statuses.map(status => ({ status, count: runs.data?.filter(run => run.status === status).length ?? 0 }));
  const total = runs.data?.length ?? 0;
  return <Panel eyebrow="RECENT ACTIVITY" title="Ingestion status distribution" note="Only the latest 20 loaded runs" action={<Badge tone="neutral">{runs.data ? `${total} loaded` : '—'}</Badge>}>
    {runs.isPending ? <div className="skeleton-stack"><div/><div/><div/></div> : runs.isError && !runs.data ? <div className="state-error" role="alert">Failed to load ingestion runs. <button className="light-button" onClick={() => runs.refetch()}>Retry</button></div> : total === 0 ? <div className="state-empty">No ingestion runs found.</div> : <><div className="stack-bar" aria-label="Status distribution">{counts.filter(item => item.count > 0).map(item => <span key={item.status} className={`bar-${item.status.toLowerCase()}`} style={{ width: `${item.count / total * 100}%` }} title={`${item.status}: ${item.count}`}/>)}</div><div className="chart-legend">{counts.map(item => <div key={item.status}><i className={`dot-${item.status.toLowerCase()}`}/><span>{item.status.replace('_', ' ')}</span><b>{item.count}</b></div>)}</div></>}
  </Panel>;
}

export function Overview({ health, jobs, sources, runs, issues, onRun, onIssue, onRuns, onQuality }: { health: UseQueryResult<HealthObservation>; jobs: UseQueryResult<IngestionJob[]>; sources: UseQueryResult<DataSource[]>; runs: UseQueryResult<IngestionRun[]>; issues: UseQueryResult<ValidationResult[]>; onRun: (id: string) => void; onIssue: (issue: ValidationResult) => void; onRuns: () => void; onQuality: () => void }) {
  const status = health.isPending ? 'Checking' : health.isError || health.data?.data.status !== 'UP' ? 'Offline' : 'Online';
  const metrics = [
    { label: 'Active Jobs', value: value(jobs, rows => rows.filter(job => job.active).length), scope: 'Active jobs returned by API', icon: <Activity size={18}/> },
    { label: 'Active Data Sources', value: value(sources, rows => rows.filter(source => source.active).length), scope: 'Current source configuration', icon: <Database size={18}/> },
    { label: 'Recent Runs', value: value(runs, rows => rows.length), scope: 'Last 20 loaded runs', icon: <Clock3 size={18}/> },
    { label: 'Successful Runs', value: value(runs, rows => rows.filter(run => run.status === 'SUCCESS').length), scope: 'Last 20 loaded runs', icon: <Activity size={18}/> },
    { label: 'Failed Runs', value: value(runs, rows => rows.filter(run => run.status === 'FAILED').length), scope: 'Last 20 loaded runs', icon: <ShieldAlert size={18}/> },
    { label: 'Open Validation Issues', value: value(issues, rows => rows.length), scope: 'Latest 50 issues returned', icon: <ShieldAlert size={18}/> },
  ];
  return <>
    <div className="section-title"><div><span className="eyebrow">SYSTEM STATUS</span><h2>At a glance</h2></div><p>Live data from Java Spring Boot</p></div>
    <div className="health-summary"><div className="health-summary-main"><span className="health-icon"><Server size={20}/></span><div><strong>Java Backend</strong><small>{health.data?.data.service || 'financial-data-api'}</small></div><Badge tone={status === 'Online' ? 'green' : status === 'Offline' ? 'red' : 'neutral'}>{status}</Badge></div><div className="health-summary-meta"><span>Client-observed latency <b>{health.data ? `${health.data.latencyMs} ms` : '—'}</b></span><span>Last successful check <b>{dateTime(health.data?.checkedAt)}</b></span>{health.isError && <span className="health-error">{health.error.message} <button onClick={() => health.refetch()}>Retry</button></span>}</div></div>
    <div className="metrics-grid six">{metrics.map(metric => <Metric key={metric.label} {...metric}/>)}</div>
    <div className="overview-grid"><StatusChart runs={runs}/><IssuesPreview issues={issues} onSelect={onIssue} onViewAll={onQuality}/></div>
    <RunsPanel compact runs={runs} jobs={jobs.data} sources={sources.data} onSelect={onRun} onViewAll={onRuns}/>
    <div className="overview-links"><button onClick={onRuns}>Investigate all loaded runs <ArrowUpRight size={14}/></button><button onClick={onQuality}>Review data quality <ArrowUpRight size={14}/></button></div>
  </>;
}
