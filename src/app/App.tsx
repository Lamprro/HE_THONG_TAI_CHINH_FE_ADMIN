import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataScopePage } from '../features/data-scope/DataScopePage';
import { useScopeQueries } from '../features/data-scope/api';
import { RawPayloadDrawer } from '../features/ingestion/components/RawPayloadDrawer';
import { AdminLayout, type Section } from '../layouts/AdminLayout';
import { useDashboardQueries } from '../features/dashboard/api/queries';
import type { ValidationResult } from '../features/dashboard/types/dto';
import { Overview } from '../features/dashboard/components/Overview';
import { JobsPage } from '../features/ingestion/components/JobsPage';
import { RunDrawer, RunsPanel } from '../features/ingestion/components/Runs';
import { DataQualityPage, ValidationDrawer } from '../features/data-quality/components/QualityPage';
import { SourcesPage } from '../features/data-sources/components/SourcesPage';
import { dateTime } from '../shared/utils/format';
import { OperationDrawer, type Operation } from '../features/operations/OperationDrawer';
import { SessionGate } from '../shared/api/SessionGate';
import { CommandPage } from '../features/admin/CommandPage';
import { DataBrowser } from '../features/admin/DataBrowser';
import { NativeApiPage } from '../features/admin/NativeApiPage';
import { RuntimePage } from '../features/admin/RuntimePage';
import { WorkflowPage, type WorkflowSelection } from '../features/admin/WorkflowPage';
import { AiOperationsPage } from '../features/admin/AiOperationsPage';
import { OperationsHistory } from '../features/admin/OperationsHistory';
import { SchedulePanel } from '../features/admin/SchedulePanel';
import { SystemSummary } from '../features/admin/SystemSummary';

const titles: Record<Section, { title: string; description: string }> = {
  overview: { title: 'System Overview', description: 'Monitor service health, recent ingestion and validation issues.' },
  jobs: { title: 'Ingestion Jobs', description: 'Manage active jobs, schedules and ingestion execution.' },
  runs: { title: 'Ingestion Runs', description: 'Investigate recent executions and diagnostics.' },
  quality: { title: 'Data Quality', description: 'Review validation results and data versions.' },
  scope: { title: 'Data Scope', description: 'Manage companies and tracked securities.' },
  sources: { title: 'Data Sources', description: 'Manage configured financial data sources.' },
  console: { title: 'Điều hành tác vụ', description: 'Chạy job, kiểm tra raw và theo dõi kết quả từ luồng thật.' },
  data: { title: 'Tra cứu dữ liệu', description: 'Xem toàn bộ lịch sử, lỗi, phiên bản và bảng dữ liệu cuối có phân trang.' },
  native: { title: 'Luồng & API quản trị', description: 'Thao tác các API thực sự đang có trên backend, gồm LLM, forecast và recovery.' },
  runtime: { title: 'Hệ thống & độ phủ', description: 'Kiểm tra Java, database, Python, scheduler và các khoảng dữ liệu còn thiếu.' },
  workflow: { title: 'Luồng dữ liệu', description: 'Điều khiển lấy nguồn, validation và build đến bảng cuối theo phạm vi được chọn.' },
  ai: { title: 'Vận hành AI', description: 'Preview, thực thi, kiểm tra lại, quản lý prompt và duyệt recovery bằng luồng hiện có.' },
  history: { title: 'Điều tra & xử lý', description: 'Toàn bộ tác vụ, lượt chạy, lỗi và phiên bản; theo dõi hoặc xử lý tiếp từ bằng chứng đã lưu.' },
  audit: { title: 'Audit quản trị', description: 'Nhật ký tác động, lý do vận hành và kết quả HTTP; credential không được ghi vào audit.' },
};

export function App() {
  return <SessionGate><Dashboard/></SessionGate>;
}
function Dashboard() {
  const [section, setSection] = useState<Section>('overview');
  const [workflow, setWorkflow] = useState<WorkflowSelection>({});
  const [historyKind, setHistoryKind] = useState<'commands' | 'runs' | 'quality'>('commands');
  const [dark, setDark] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [issue, setIssue] = useState<ValidationResult | null>(null);
  const [operation, setOperation] = useState<Operation | null>(null);
  const [jobLink, setJobLink] = useState<string | null>(null);
  const [sourceLink, setSourceLink] = useState<number | null>(null);
  const [rawId, setRawId] = useState<string | null>(null);
  const [qualityView, setQualityView] = useState<'validation' | 'versions'>('validation');
  const [qualityRaw, setQualityRaw] = useState<string | null>(null);
  const [qualityRun, setQualityRun] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const scopeQueries = useScopeQueries(section === 'scope');
  const q = useDashboardQueries(section, true, !!runId || !!rawId);
  const { javaHealth: health, jobs, sources, runs, openIssues: issues, results, versions } = q;
  const activeQueries = section === 'scope'
    ? [q.javaHealth, scopeQueries.companies, scopeQueries.securities]
    : section === 'overview'
      ? [q.javaHealth, q.jobs, q.sources, q.runs, q.openIssues]
      : section === 'jobs'
        ? [q.javaHealth, q.jobs, q.sources]
        : section === 'runs'
          ? [q.javaHealth, q.runs, q.jobs, q.sources]
          : section === 'quality'
            ? [q.javaHealth, q.openIssues, q.results, q.versions, q.rules]
            : [q.javaHealth, q.sources, q.jobs];
  const refreshing = activeQueries.some(query => query.isFetching);
  const latest = (() => {
    const timestamp = activeQueries.map(query => query.dataUpdatedAt).filter(Boolean).sort((a, b) => b - a)[0];
    return timestamp ? new Date(timestamp).toISOString() : undefined;
  })();
  const connection = health.isPending ? 'Checking' : health.isError || health.data?.data.status !== 'UP' ? 'Backend Not Connected' : 'Connected';

  return <AdminLayout section={section} setSection={setSection} dark={dark} setDark={setDark}>
    <div className="topline">
      <div className="breadcrumb">{['jobs', 'sources', 'scope', 'quality'].includes(section) ? 'Management' : 'Monitoring'} <span>/</span> {titles[section].title}</div>
      <span className="read-only">ADMIN OPERATIONS</span>
    </div>
    <div className="content">
      <header className="page-header">
        <div>
          <div className="eyebrow">TOKEN BURNER / ADMIN CONSOLE</div>
          <h1>{titles[section].title}</h1>
          <p>{titles[section].description}</p>
          <p className="last-updated">Last updated {dateTime(latest)}</p>
        </div>
        <div className="header-actions">
          <button className="primary-button" disabled={refreshing} onClick={() => queryClient.invalidateQueries({ type: 'active' })}>
            <RefreshCw size={15}/>{refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>
      <div className="connection-strip"><div><span className={`signal ${connection === 'Connected' ? 'online' : connection === 'Checking' ? '' : 'offline'}`}/><b>Java Backend</b><span>{connection}</span></div></div>
      {section === 'overview' && <Overview health={health} jobs={jobs} sources={sources} runs={runs} issues={issues} onRun={setRunId} onIssue={setIssue} onRuns={() => setSection('runs')} onQuality={() => setSection('quality')}/>}
      {section === 'console' && <CommandPage jobs={jobs.data ?? []}/>}
      {section === 'data' && <DataBrowser onRun={setRunId} onRaw={setRawId}/>}
      {section === 'native' && <NativeApiPage/>}
      {section === 'runtime' && <RuntimePage/>}
      {section === 'overview' && <SystemSummary/>}
      {section === 'runtime' && <SchedulePanel/>}
      {section === 'workflow' && <WorkflowPage key={JSON.stringify(workflow)} initial={workflow} onRun={setRunId}/>}
      {section === 'ai' && <AiOperationsPage onRun={setRunId}/>}
      {section === 'history' && <><div className="toolbar">{(['commands', 'runs', 'quality'] as const).map(kind => <button key={kind} className={historyKind === kind ? 'primary-button' : 'light-button'} onClick={() => setHistoryKind(kind)}>{kind === 'commands' ? 'Tác vụ nền' : kind === 'runs' ? 'Lượt chạy nguồn' : 'Validation & version'}</button>)}</div><OperationsHistory key={historyKind} kind={historyKind} onRun={setRunId} onWorkflow={selection => { setWorkflow(selection); setSection('workflow'); }}/></>}
      {section === 'audit' && <OperationsHistory kind="audit" onRun={setRunId} onWorkflow={selection => { setWorkflow(selection); setSection('workflow'); }}/>}
      {['jobs', 'runs', 'quality', 'sources'].includes(section) && <div className="management-toolbar">
        <div className="header-actions">
          {section === 'jobs' && <button className="primary-button" onClick={() => setOperation({ kind: 'create-job' })}>Create Job</button>}
          {['jobs', 'runs'].includes(section) && <button className="light-button" onClick={() => setOperation({ kind: 'manual-ingestion' })}>New Manual Ingestion</button>}
          {section === 'sources' && <button className="primary-button" onClick={() => setOperation({ kind: 'upsert-source' })}>Add Data Source</button>}
          {section === 'quality' && <button className="light-button" onClick={() => setOperation({ kind: 'validate-pending' })}>Validate Pending Data</button>}
        </div>
        <span className="subtle">Review the request before executing</span>
      </div>}
      {section === 'scope' && <DataScopePage companies={scopeQueries.companies} securities={scopeQueries.securities}/>}
      {section === 'jobs' && <JobsPage onSource={id => { setSourceLink(id); setSection('sources'); }} jobs={jobs} sources={sources.data} runs={runs.data} onRun={setRunId} onOperation={setOperation} linkedId={jobLink}/>}
      {section === 'runs' && <RunsPanel runs={runs} jobs={jobs.data} sources={sources.data} onSelect={setRunId}/>}
      {section === 'quality' && <DataQualityPage key={`${qualityRun}-${qualityRaw}-${qualityView}`} initialTab={qualityView} rawFilter={qualityRaw} onRaw={setRawId} openIssues={issues} results={results} versions={versions} rules={q.rules} enabled onSelect={setIssue} onRun={setRunId} runFilter={qualityRun} clearRunFilter={() => { setQualityRun(null); setQualityRaw(null); }}/>}
      {section === 'sources' && <SourcesPage onJob={id => { setJobLink(id); setSection('jobs'); }} sources={sources} jobs={jobs.data} runs={runs.data} onRun={setRunId} onOperation={setOperation} linkedId={sourceLink}/>}
    </div>
    <RunDrawer onRaw={id => { setRunId(null); setRawId(id); }} onIssue={value => { setRunId(null); setIssue(value); }} id={runId} onClose={() => setRunId(null)} validation={results.data} enabled onOperation={setOperation} onJob={id => { setRunId(null); setJobLink(id); setSection('jobs'); }} onSource={id => { setRunId(null); setSourceLink(id); setSection('sources'); }} onQuality={id => { setRunId(null); setQualityRun(id); setQualityRaw(null); setQualityView('validation'); setSection('quality'); }}/>
    <ValidationDrawer onRaw={id => { setIssue(null); setRawId(id); }} issue={issue} onClose={() => setIssue(null)} onRun={setRunId}/>
    <RawPayloadDrawer id={rawId} onClose={() => setRawId(null)} validation={results} versions={versions} onRun={id => { setRawId(null); setRunId(id); }} onIssue={value => { setRawId(null); setIssue(value); }} onOperation={value => { setRawId(null); setOperation(value); }} onQuality={(payloadId, ingestionRunId) => { setRawId(null); setQualityRaw(payloadId); setQualityRun(ingestionRunId); setQualityView('validation'); setSection('quality'); }} onVersions={id => { setRawId(null); setQualityRaw(null); setQualityRun(id); setQualityView('versions'); setSection('quality'); }}/>
    {operation && <OperationDrawer operation={operation} sources={sources.data} onClose={() => setOperation(null)} onRun={setRunId}/>}
  </AdminLayout>;
}
